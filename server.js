'use strict';
const http = require('http');
const fs = require('fs');

const index_html = fs.readFileSync('index.html');
const robots_txt = fs.readFileSync('robots.txt');
const favicon_ico = fs.readFileSync('favicon.ico');
const PORT = 5017;

let LAST_BATTERY_INFO = '{}';

http.createServer(app).listen(PORT);

function app(req, res)
{
	let now = new Date();
	console.log('*******' + now.toLocaleString('ru-RU', { hour: 'numeric', minute: 'numeric', second: 'numeric' }) + '*******');
	const url = req.url.split('?')[0];
	console.log(url);
	//console.log(req.headers);
	if (url === '/')
	{
		res.writeHead(200,
			{
				'Content-Length': index_html.length,
				'Content-Type': 'text/html; charset=utf-8'
			});
		res.end(index_html);
	}
	else if (url === '/favicon.ico')
	{
		res.writeHead(200,
			{
				'Content-Length': favicon_ico.length,
				'Content-Type': 'image/x-icon'
			});
		res.end(favicon_ico);
	}
	else if (url === '/robots.txt')
	{
		res.writeHead(200,
			{
				'Content-Length': robots_txt.length,
				'Content-Type': 'text/plain; charset=utf-8'
			});
		res.end(robots_txt);
	}
	else if (url === '/startCharge')
	{
		res.writeHead(204);
		res.end();
	}
	else if (url === '/stopCharge')
	{
		res.writeHead(204);
		res.end();
	}
	else if (url === '/setBatteryInfo')
	{
		if (req.method !== 'POST')
		{
			res.writeHead(400);
			res.end();
		}
		else if (req.headers['content-type'] !== 'application/json')
		{
			res.writeHead(400);
			res.end();
		}
		else if (!req.headers['content-length'])
		{
			res.writeHead(411);
			res.end();
		}
		else
		{
			const contentLength = Number(req.headers['content-length']);
			if (contentLength > 10000)
			{
				res.writeHead(400);
				res.end();
			}
			else
			{
				streamToCallback((err, body) =>
				{
					if (err)
					{
						res.writeHead(400);
						res.end();
					}
					else
					{
						//console.log(body);
						try
						{
							LAST_BATTERY_INFO = JSON.stringify(JSON.parse(body));
							res.writeHead(204);
							res.end();
						}
						catch (e)
						{
							res.writeHead(400);
							res.end();
						}
					}
				}, req, contentLength);
			}
		}
	}
	else if (url === '/getBatteryInfo')
	{
		res.writeHead(200,
			{
				'Content-Length': LAST_BATTERY_INFO.length,
				'Content-Type': 'application/json;'
			});
		res.end(LAST_BATTERY_INFO);
	}
	else
	{
		res.writeHead(404);
	}
}

function streamToCallback(callback, stream, length)
{
	let body = '';
	const nLength = Number(length);
	stream.on('data', (chunk) =>
	{
		body += chunk;
		if (nLength > 0)
		{
			if (body.length > nLength)
			{
				stream.connection.destroy();
				callback('Фактический размер данных превышает задекларированный размер');
			}
		}
	});
	stream.on('end', () =>
	{
		if (nLength > 0 && body.length !== nLength)
		{
			callback('Данных пришло меньше, чем ожидалось');
		}
		else
		{
			callback(null, body);
		}
	});
	stream.on('error', (err) =>
	{
		callback(err);
	});
}