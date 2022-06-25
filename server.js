'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const START_TIME = new Date();
const GPIO_NUMBER = 17;
const GPIO_SELECT_FILE = '/sys/class/gpio/export';
const GPIO_SET_DIRECTION_FILE = `/sys/class/gpio/gpio${GPIO_NUMBER}/direction`;
const GPIO_VALUE_FILE = `/sys/class/gpio/gpio${GPIO_NUMBER}/value`;

const RPI_TEMPERATURE_COMMAND = 'vcgencmd measure_temp'; //'/sys/class/thermal/thermal_zone0/temp';
const TRAFFIC_COMMAND = 'wg show | awk -F \': \' \'/transfer/ {print ($2);}\'';

const index_html_raw = fs.readFileSync(path.join(__dirname, 'index.html'));
const robots_txt = fs.readFileSync(path.join(__dirname, 'robots.txt'));
const favicon_ico = fs.readFileSync(path.join(__dirname, 'favicon.ico'));
const PORT = 80;

const CHRAGE_STATISTIC = [];

const index_html = Buffer.from(index_html_raw.toString().replace('!@~#~@!', START_TIME));

let LAST_BATTERY_INFO = (Buffer.from('{}')).toString('base64');

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
	console.log('Warning! GPIO has not been initialized: ' + err?.message);
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
				console.log(err?.message);
				res.end(err?.message);
			}
			else
			{
				res.writeHead(204);
				res.end();
			}
		});
		CHRAGE_STATISTIC.push({
			start: new Date()
		});
	}
	else if (url === '/stopCharge')
	{
		setLogicalValueToGPIO(false, (err) =>
		{
			if (err)
			{
				res.writeHead(500);
				console.log(err?.message);
				res.end(err?.message);
			}
			else
			{
				res.writeHead(204);
				res.end();
			}
		});
		const stObj = CHRAGE_STATISTIC.at(-1);
		if (!stObj)
		{
			stObj.stop = new Date();
			stObj.period = stObj.stop.getTime() - stObj.start.getTime();
		}
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
						try
						{
							const obj = JSON.parse(body);
							obj.lastInfoTime = new Date();
							res.writeHead(204);
							res.end();
							LAST_BATTERY_INFO = (Buffer.from(JSON.stringify(obj))).toString('base64');
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
	else if (url === '/getStatus')
	{
		const dataToSend = { phoneData: LAST_BATTERY_INFO };
		getServerData((serverData) =>
		{
			if (serverData !== null) dataToSend.serverData = serverData;
			const json = JSON.stringify(dataToSend);
			res.writeHead(200,
				{
					'Content-Length': json.length,
					'Content-Type': 'application/json;'
				});
			res.end(json);
		});
	}
	else
	{
		res.writeHead(404);
		res.end('The requested page was not found');
	}
}

function getServerData(callback)
{
	const serverData = {};
	getRPITemperature((data) =>
	{
		if (data !== null) serverData.RPI_Temperature = data;
		getTraffic((data) =>
		{
			if (data !== null) serverData.Traffic = data;
			endOfChain();
		});
	});
	function endOfChain()
	{
		if (Object.keys(serverData).length === 0)
		{
			callback(null);
		}
		else
		{
			callback((Buffer.from(JSON.stringify(serverData))).toString('base64'));
		}
	}
}

function getRPITemperature(callback)
{
	if (getRPITemperature.notAvailable)
	{
		callback(null);
	}
	else
	{
		//При помощи команды
		exec(RPI_TEMPERATURE_COMMAND, (err, stdout, stderr) =>
		{
			if (err || stderr)
			{
				console.log('Warning! RPI Temperature is not available: ' + err?.message);
				getRPITemperature.notAvailable = true;
				callback(null);
			}
			else
			{
				callback(stdout.split('=')[1]);
			}
		});
		//Чтение из файла
		/*
		fs.readFile(RPI_TEMPERATURE_FILE, (err, rawTemp) =>
		{
			if (err)
			{
				console.log('Warning! RPI Temperature is not available: ' + err?.message);
				getRPITemperature.notAvailable = true;
				callback(null);
			}
			else
			{
				callback(Number(rawTemp) / 1000);
			}
		});
		*/
	}
}

function getTraffic(callback)
{
	if (getTraffic.notAvailable)
	{
		callback(null);
	}
	else
	{
		exec(TRAFFIC_COMMAND, (err, stdout, stderr) =>
		{
			if (err || stderr)
			{
				console.log('Warning! Traffic data is not available ' + err?.message);
				getTraffic.notAvailable = true;
				callback(null);
			}
			else
			{
				callback(stdout);
			}
		});
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
		callback(err?.message);
	});
}