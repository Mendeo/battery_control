#!/bin/bash
SERVER="http://192.168.43.2:80"
DEFAULT_MAX_CHARGE=45

IS_MANUAL=0
if [ -z $1 ]
then
	MIN_CHARGE=$(($DEFAULT_MAX_CHARGE - 2))
	MAX_CHARGE=$DEFAULT_MAX_CHARGE
else
	if [ $1 = "m" ]
	then
		IS_MANUAL=1
	else
		MAX_CHARGE=$1
		if [ -z $2 ]
		then
			MIN_CHARGE=$(($MAX_CHARGE - 2))
		else
			MIN_CHARGE=$2
		fi
		if [[ $(($MAX_CHARGE - $MIN_CHARGE)) -lt 2 || $(($MAX_CHARGE)) -lt 2 ]]
		then
			MIN_CHARGE=$(($DEFAULT_MAX_CHARGE - 2))
			MAX_CHARGE=$DEFAULT_MAX_CHARGE
		fi
	fi
fi
if [ $IS_MANUAL -eq 1 ]
then
	echo "Manual charge. Use web page to control."
else
	echo "Charge from $MIN_CHARGE to $MAX_CHARGE"
fi

batteryData=$(termux-battery-status)
currentPercent=$(echo "$batteryData" | awk '/percentage/ { sub(",","",$2); print($2) }')
batteryStatus=$(echo "$batteryData" | awk '/status/ { sub("\",","",$2); sub("\"","",$2); print($2) }')

requestStartCharge()
{
	echo "Starting charge"
	curl $SERVER"/startCharge"
}
requestStopCharge()
{
	echo "Stoping charge"
	curl $SERVER"/stopCharge"
}
sendBatteryInfoRequest()
{
	curl -d "$batteryData" -H "Content-Type: application/json" $SERVER"/setBatteryInfo"
}

sendBatteryInfoRequest
if [ $IS_MANUAL -eq 0 ]
then
	if [ $batteryStatus = "NOT_CHARGING" ]
	then
		if [ $currentPercent -le $MIN_CHARGE ]
		then
			requestStartCharge
		fi
	elif [ $batteryStatus = "CHARGING" ]
	then
		if [ $currentPercent -ge $MAX_CHARGE ]
		then
			requestStopCharge
		fi
	fi
fi
