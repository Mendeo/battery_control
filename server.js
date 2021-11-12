'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const GPIO_NUMBER = 17;
const GPIO_SELECT_FILE = '/sys/class/gpio/export';
const GPIO_SET_DIRECTION_FILE = `/sys/class/gpio/gpio${GPIO_NUMBER}/direction`;
const GPIO_VALUE_FILE = `/sys/class/gpio/gpio${GPIO_NUMBER}/value`;

const index_html = fs.readFileSync(path.join(__dirname, 'index.html'));
const robots_txt = fs.readFileSync(path.join(__dirname, 'robots.txt'));
const favicon_ico = fs.readFileSync(path.join(__dirname, 'favicon.ico'));
const PORT = 80;

let LAST_BATTERY_INFO = '{}';
let _lastBatteryInfoTime = Date.now();

//GPIO Init
let _isGPIOInitialized = false;
fs.writeFile(GPIO_VALUE_FILE, '0', (err) =>
{
	if (err)
	{
		fs.writeFile(GPIO_SELECT_FILE, GPIO_NUMBER.toString(), (err) =>
		{
			if (err)
			{
				gpioInitializationError(err);
			}
			else
			{
				fs.writeFile(GPIO_SET_DIRECTION_FILE, 'out', (err) =>
				{
					if (err)
					{
						gpioInitializationError(err);
					}
					else
					{
						fs.writeFile(GPIO_VALUE_FILE, '0', (err) =>
						{
							if (err)
							{
								gpioInitializationError(err);
							}
							else
							{
								console.log('GPIO has been initialized successfully');
								_isGPIOInitialized = true;
							}
						});
					}
				});
			}
		});
	}
	else
	{
		console.log('GPIO has already been initialized');
		_isGPIOInitialized = true;
	}
});

function gpioInitializationError(err)
{
	console.log('Warning! GPIO has not been initialized: ' + err.message);
}

function setLogicalValueToGPIO(value, callback)
{
	if (_isGPIOInitialized)
	{
		fs.writeFile(GPIO_VALUE_FILE, value ? '1' : '0', callback);
	}
	else
	{
		callback(new Error('GPIO was not initialized'));
	}
}

http.createServer(app).listen(PORT);

function app(req, res)
{
	//let now = new Date();
	//console.log('*******' + now.toLocaleString('ru-RU', { hour: 'numeric', minute: 'numeric', second: 'numeric' }) + '*******');
	const url = req.url.split('?')[0];
	//console.log(url);
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
		setLogicalValueToGPIO(true, (err) =>
		{
			if (err)
			{
				res.writeHead(500);
				console.log(err.message);
				res.end(err.message);
			}
			else
			{
				res.writeHead(204);
				res.end();
			}
		});
	}
	else if (url === '/stopCharge')
	{
		setLogicalValueToGPIO(false, (err) =>
		{
			if (err)
			{
				res.writeHead(500);
				console.log(err.message);
				res.end(err.message);
			}
			else
			{
				res.writeHead(204);
				res.end();
			}
		});
	}
	else if (url === '/setBatteryInfo')
	{
		//console.log(req.headers);
		if (req.method !== 'POST')
		{
			res.writeHead(400);
			const msg = 'POST method required';
			console.log(msg);
			res.end(msg);
		}
		else if (req.headers['content-type'] !== 'application/json')
		{
			res.writeHead(400);
			const msg = 'Content-type header with "application/json" required';
			console.log(msg);
			res.end(msg);
		}
		else if (!req.headers['content-length'])
		{
			res.writeHead(411);
			const msg = 'Content-length header required';
			console.log(msg);
			res.end(msg);
		}
		else
		{
			const contentLength = Number(req.headers['content-length']);
			if (contentLength > 10000)
			{
				res.writeHead(400);
				const msg = 'Content length is too big';
				console.log(msg);
				res.end(msg);
			}
			else
			{
				streamToCallback((err, body) =>
				{
					if (err)
					{
						res.writeHead(400);
						console.log(err);
						res.end(err);
					}
					else
					{
						//console.log(body);
						try
						{
							const obj = JSON.parse(body);
							obj.time = new Date();
							const intTime = obj.time.getTime();
							obj.period = intTime - _lastBatteryInfoTime;
							if (obj.period <= 2000) obj.period = 2000;
							_lastBatteryInfoTime = intTime;
							LAST_BATTERY_INFO = JSON.stringify(obj);
							res.writeHead(204);
							res.end();
						}
						catch (e)
						{
							res.writeHead(400);
							const msg = 'Error while json parsing';
							console.log(msg);
							res.end(msg);
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
		res.end('The requested page was not found');
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
				callback('The actual data size exceeds the declared size');
			}
		}
	});
	stream.on('end', () =>
	{
		if (nLength > 0 && body.length !== nLength)
		{
			callback('There is less data than expected');
		}
		else
		{
			callback(null, body);
		}
	});
	stream.on('error', (err) =>
	{
		callback(err.message);
	});
}