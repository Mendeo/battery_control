'use strict';
import {writeFileSync} from 'node:fs';
const d = new Date(2022, 5, 20, 0, 0, 0, 0);
let out = 'time,period\n';
for (let i = 0; i < 1000; i++)
{
	d.setMinutes(d.getMinutes() + 20);
	const year = d.getFullYear().toString();
	const month = addZeroToString(d.getMonth() + 1);
	const date = addZeroToString(d.getDate());
	const hours = addZeroToString(d.getHours());
	const minutes = addZeroToString(d.getMinutes());
	const seconds = addZeroToString(d.getSeconds());
	//const milliseconds = addZero2ToString(d.getMilliseconds());

	out += `${year}-${month}-${date}T${hours}:${minutes}:${seconds},${randomIntFromInterval(50, 100)}\n`;
}

function randomIntFromInterval(min, max) // min and max included
{
	return Math.floor(Math.random() * (max - min + 1) + min)
}

function addZeroToString(value)
{
	return value < 10 ? '0' + value.toString() : value.toString();
}
// function addZero2ToString(value)
// {
// 	if (value >= 100) return value.toString();
// 	if (value >= 10) return '0' + value.toString();
// 	return '00' + value.toString();
// }

writeFileSync('phone_charge.csv', out);