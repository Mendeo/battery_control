#!/bin/sh
#SERVER="http://192.168.43.2:80"
SERVER="http://192.168.2.90:80"
DEFAULT_MAX_CHARGE=45
CHECK_BATTERY_STATUS_PERIOD=30 #Секунды

NOT_CHARGING_STATUS="Not charging" #NOT_CHARGING в termux-battery-status
CHARGING_STATUS="Charging" #CHARGING в termux-battery-status

#Определеяем в каком диапазоне держать заряд или вообще не управлять зарядом
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

while [ 1 ]
do
	#Определение параметров батареи, если запускаем из Termux
	# batteryData=$(termux-battery-status)
	# currentPercent=$(echo "$batteryData" | awk '/percentage/ { sub(",","",$2); print($2) }')
	# batteryStatus=$(echo "$batteryData" | awk '/status/ { sub("\",","",$2); sub("\"","",$2); print($2) }')

	#Определение параметров батареии по файлам устройств из /sys
	currentPercent=$(cat /sys/class/power_supply/battery/capacity)
	batteryStatus=$(cat /sys/class/power_supply/battery/status)

	batteryData="{ \"percent\": $currentPercent, \"status\": \"$batteryStatus\", \"health\": \"$(cat /sys/class/power_supply/battery/health)\", \"voltage\": $(cat /sys/class/power_supply/battery/batt_vol), \"temperature\": $(($(cat /sys/class/power_supply/battery/batt_temp) / 10)) }"

	requestStartCharge()
	{
		echo "Starting charge"
		#curl $SERVER"/startCharge"
		wget -q -O /dev/null $SERVER"/startCharge"
	}
	requestStopCharge()
	{
		echo "Stoping charge"
		#curl $SERVER"/stopCharge"
		wget -q -O /dev/null $SERVER"/stopCharge"
	}
	sendBatteryInfoRequest()
	{
		#curl -d "$batteryData" -H "Content-Type: application/json" $SERVER"/setBatteryInfo"
		wget -q -O /dev/null --post-data="$batteryData" --header="Content-Type: application/json" $SERVER"/setBatteryInfo"
	}
	sendBatteryInfoRequest
	if [ $IS_MANUAL -eq 0 ]
	then
		if [ "$batteryStatus" = "$NOT_CHARGING_STATUS" ]
		then
			if [ $currentPercent -le $MIN_CHARGE ]
			then
				requestStartCharge
			fi
		elif [ "$batteryStatus" = "$CHARGING_STATUS" ]
		then
			if [ $currentPercent -ge $MAX_CHARGE ]
			then
				requestStopCharge
			fi
		fi
	fi
	sleep $CHECK_BATTERY_STATUS_PERIOD
done