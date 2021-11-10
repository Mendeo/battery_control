'use strict';
const http = require('http');
const exec = require('child_process').exec;
const firstParam = process.argv[2];

let MAX_CHARGE = NaN;
let MIN_CHARGE = Number(process.argv[3]);

let IS_MANUAL = false;
if (firstParam === 'm')
{
	IS_MANUAL = true;
}
else
{
	MAX_CHARGE = Number(firstParam);
}

const SERVER_HOST = 'localhost';
const SERVER_PORT = 5017;
const CHECK_BATTERY_STATUS_PERIOD = 30000;
const TERMUX_COMMAND = 'testTermux.bat'; //termux-battery-status

if (isNaN(MAX_CHARGE) || MAX_CHARGE <= 2) MAX_CHARGE = 45;
if (isNaN(MIN_CHARGE) || MAX_CHARGE - MIN_CHARGE < 2) MIN_CHARGE = MAX_CHARGE - 2;

console.log(`charge from ${MIN_CHARGE} to ${MAX_CHARGE}`);

checkBattery();

function checkBattery()
{
	exec(TERMUX_COMMAND, (err, stdin, stderr) =>
	{
		if (err)
		{
			console.log(stderr);
		}
		else
		{
			let data = null;
			try
			{
				data = JSON.parse(stdin);
				data.time = new Date();
			}
			catch (e)
			{
				console.log(e.message);
			}
			if (data)
			{
				sendBatteryInfoRequest(JSON.stringify(data));
				if (!IS_MANUAL)
				{
					if (!data.percentage || !data.status)
					{
						console.log('Not enough data in battery info!');
					}
					else
					{
						if (data.status === 'NOT_CHARGING')
						{
							if (data.percentage <= MIN_CHARGE)
							{
								requestStartCharge();
							}
						}
						else if (data.status === 'CHARGING')
						{
							if (data.percentage >= MAX_CHARGE)
							{
								requestStopCharge();
							}
						}
					}
				}
			}
		}
		setTimeout(checkBattery, CHECK_BATTERY_STATUS_PERIOD);
	});
}

function requestStartCharge()
{
	console.log('Starting charge');
	const options =
	{
		hostname: SERVER_HOST,
		port: SERVER_PORT,
		path: '/startCharge'
	};
	http.get(options);
}

function requestStopCharge()
{
	console.log('Stoping charge');
	const options =
	{
		hostname: SERVER_HOST,
		port: SERVER_PORT,
		path: '/stopCharge'
	};
	http.get(options);
}

function sendBatteryInfoRequest(json)
{
	//console.log(json);
	const options =
	{
		hostname: SERVER_HOST,
		port: SERVER_PORT,
		path: '/setBatteryInfo',
		method: 'POST',
		headers:
		{
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(json)
		}
	};
	const req = http.request(options);
	req.on('error', (e) =>
	{
		console.error(`Problem with request: ${e.message}`);
	});
	req.end(json);
}