#!/bin/sh
IS_STARTS_FROM_TERMUX=1
SERVER="http://localhost" #"http://192.168.43.2:80"
DEFAULT_MAX_CHARGE=45
CHECK_BATTERY_STATUS_PERIOD=30 #Секунды

getBatteryData()
{
	if [ $IS_STARTS_FROM_TERMUX -eq 1 ]
	then
		#Получаем данные о состоянии батареии, если запускаем из Termux
		batteryData=$(termux-battery-status)
		currentPercent=$(echo "$batteryData" | awk '/percentage/ { sub(",","",$2); print($2) }')
		batteryStatus=$(echo "$batteryData" | awk '/status/ { sub("\",","",$2); sub("\"","",$2); print($2) }')
		NOT_CHARGING_STATUS="NOT_CHARGING"
		CHARGING_STATUS="CHARGING"
	else
		#Получаем данные о состоянии батареии по файлам устройств из /sys (запуск из обычного терминала из под рут)
		#Обязательные переменные
		currentPercent=$(cat /sys/class/power_supply/battery/capacity) #Обязательно нужно получить текущий процент заряда батареии
		batteryStatus=$(cat /sys/class/power_supply/battery/status) #Обязательно нужно получить информацию о том, заряжается батарея или нет
		NOT_CHARGING_STATUS="Not charging"
		CHARGING_STATUS="Charging"
		#Необязательные переменные, просто для отображения информации в браузере
		health=$(cat /sys/class/power_supply/battery/health)
		voltage=$(cat /sys/class/power_supply/battery/batt_vol)
		temperature=$(($(cat /sys/class/power_supply/battery/batt_temp) / 10))
		#Создаём итоговый JSON, который отправится на сервер
		batteryData="{ \"percent\": $currentPercent, \"status\": \"$batteryStatus\", \"health\": \"$health\", \"voltage\": $voltage, \"temperature\": $temperature }"
	fi
}

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

while [ 1 ]
do
	getBatteryData
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
