'use strict';
const http = require('http');
const exec = require('child_process').exec;

checkBattery();

function checkBattery()
{
	exec('testTermux.bat', (err, stdin, stderr) =>
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
			}
			catch (e)
			{
				console.log(e.message);
			}
			if (data)
			{
				sendRequest(stdin);
			}
		}
		setTimeout(checkBattery, 10000);
	});
}

function sendRequest(json)
{
	console.log(json);
	const options =
	{
		hostname: 'localhost',
		port: 5017,
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