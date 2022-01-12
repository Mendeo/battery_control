# Контроль заряда телефона через Raspbery Pi
Web сервер для Raspberry PI, при помощи которого можно управлять зарядкой подключенного телефона.
Идея этого проекта сложилась, когда потребовалось раздавать интернет с телефона длительное время. Дело в том, что постоянно держать на зарядке телефон не очень хорошо: батарея вздувается за короткое время. Нужно было решение, для того что бы поддерживать заряд телефона на заданном низком уровне. Эту задачу решает данный мини проект.  
## Принцип работы
Телефон подключается к Raspberry Pi при помощи специального USB кабеля, в котором реализовано прерывание подачи напряжения питания. На телефоне запускается специальный скрипт, который переодически посылает на специальный web сервер информацию о текущем уровне заряда батарее и другую информацию. Web сервер работает на той же Raspberry Pi, к которой подключён телефон. Как только уровень заряда телефона превышает заданный уровень, то Web сервер посылает сигнал на USB кабель и отключает зарядку. Далее, как только уровень заряда упадёт ниже заданного уровня, то Raspberry Pi снова включит зарядку. Уровени включения и отключения заряда различаются на 2-3% поэтому батарея телефона всё время находится в оптимальном состоянии.  
В виде бонуса если зайти на Web сервер с браузера, то можно узнать не только текущий уровень заряда батареи и её статус, но и дополнительную инфомацию, такую как температура самой Raspberry Pi, количество переданного и принятого трафика и др.
## Зачем такие сложности?
Действительно, на некоторых рутованных телефонах можно ограничить уровень заряда путём редактированию системных файлов. Но в моём случае это не сработало. К тому же этот способ будет работать практически с любым, даже не рутованным телефоном.
## Скрипт на телефоне
Существует два разных способа запуска скрипта на телефоне: в Termux и в обычном эмуляторе терминала. Запуск через Termux более предпочтительней, т.к. не требует корректировки скрипта и работает сразу. Но этот способ не годится для старых телефонов, с версией андроида ниже 7. Можно, конечно, найти старую версию Termux и запустить скрипт даже на 5-ом андроиде, но это требует дополнительных усилий.  
С другой стороны, если у вас рутованый телефон даже со старой версией андроид можно запустить сприпт в любом эмуляторе терминала, но сначала предварительно портребуется установить BusyBox. Из всех утилит BusyBox для работы скрипта требуется wget.  
### Адрес сервера
В скрипте phone.sh по умолчанию задан адрес Web сервера http://192.168.43.2:80. Статический ip адрес 192.168.43.2 настраивается в Raspberry Pi для wifi интерфейса, через который Raspberry Pi подключается к телефону, раздающему интернет. Если вам нужно задать другой ip адрес в скрипте, то это делается в третей строке, в переменной SERVER.
### Перед запуском скрипта в Termux
Сначала нужно установить Termux, а также Termux:API. Далее нужно запустить Termux и установить Termux api:
```bash
pkg install termux-api
```
Это требуется сделать только один раз.
### Перед запуском скрипта на рутованом телефоне в терминале
Сначала нужно переключить скрипт в режим работы без Termux. Для этого в файле phone.sh во второй строке переменной IS_STARTS_FROM_TERMUX нужно выставить значение 0.  
Далее нужно проверить, что скрипт может получить информацию об уровне заряда телефона и о текущем статусе (заряжается, не заряжается). Эти данные берутся из системных файлов. Так в моём телефоне уровень заряда можно увидеть в файле "/sys/class/power_supply/battery/capacity", а информация о статусе в файле "/sys/class/power_supply/battery/status". У вас может быть не так. Поэтому в скрипте нужно задать корректные пути к нужным файлам.  
В файле, содержащем статус батареи находится текстовая информация о том заряжается телефон или нет. Этот текст нужно в точности занести в переменные NOT_CHARGING_STATUS и CHARGING_STATUS. Без информации о статусе батареии и её заряде скрипт работать не будет.  
Также в скрипте есть и другие пути к файлам с данными, например о температуре батареии и другие. Их тоже следует проверить. Но это опционально.  
Всё это проверяется и корректируется в строчках с 18 по 29 скрипта.  
Далее устанавливаем и запускаем BusyBox, затем нажимаем install в интерфейсе BusyBox и ждём пока всё установится (возможно это потребуется делать после каждой перезагрузки телефона).
### Запуск скрипта
Если запуск ведётся из обычного эмулятора терминала, то скрипт нужно запускать от рута, т.е. сначала выполняем:
```bash
su
```
При работе из Termux этого делать не нужно.  
Далее:
```bash
cd <папка с phone.sh>
sh phone.sh
```
По умолчанию телефон будет заряжаться до 45%. Изменить это значение можно передав новое значение в первом параметре скрипта, например:
```bash
sh phone.sh 50
```
После того, как телефон зарядится до заданного значения он начнёт разряжаться. Снова зарядка включится, когда уровень заряда батареии достигнет уровня на 2% ниже уровня отключения зарядки. Т.е. для 45% это будет 43%, для 50% - 48%. Это значение так же можно изменить. Во втором параметре к сприпту можно передать уровень, до которого батарея будет разряжаться. Например:
```bash
sh phone.sh 50 40
```
В этом примере телефон будет заряжаться до 50%, потом заряд отключится и снова включится, когда уровень заряда батерии достигнет 40%.
## Web сервер на Raspberry Pi
Web сервер написан на Node.js. Поэтому эта среда должна быть установлена на Raspberry Pi. Я тестировал работу сервера на версии Node.js 16.13.0.  
После запуска сервер работает на 80 порту.  
На Web странице отображается трафик для интерфейса поднятого WireGuard на Raspberry Pi, трафик самого телефона не отображается. В файле server.js значение переменной TRAFFIC_COMMAND содержит команду, результат выполнения которой будет отображаться в поле Traffic на Web странице.  
По адресу "/setBatteryInfo" телефон отправляет информацию о заряде и статусе батареии.  
По запросу на адрес "/getStatus" сервер отправляет json, с информацией, полученной от телефона и дополнительной информацией, такой как температура процессора Raspberry Pi, количество интернет трафика и др.  
По запросу на адрес "/startCharge" можно принудительно включить зарядку телефона.  
По запросу на адрес "/stopCharge" можно принудительно выключить зарядку телефона.  
Запрос на адрес "/" возвращает веб страницу. На ней переодически выполеняется запрос на "/getStatus" и отображается полученная информация. Поэтому можно в режиме рельного времени наблюдать информацию о статусе телефона и Raspberry Pi.
### Установка web сервера на Raspberry Pi
Для автоматического запуска Web servera после загрузки Raspberry Pi можно добавить unit в systemd.

```bash
[Unit]
Description=phone battery control server
After=network.target

[Service]
User=root
Type=simple
ExecStart=/usr/local/bin/node /usr/local/lib/battery_control/server.js

[Install]
WantedBy=multi-user.target
```
В поле ExecStart нужно прописать точный путь к Node.js и к файлу server.js.

## USB кабель
Включать и отключать питание USB устройств, подключённых к Raspberry Pi можно разными способами. Одним из них является применение специального USB хаба, которым можно управлять. Но в моём случае я решил просто переделать обычный USB провод, которым подключается телефон к Raspberry Pi. Схему прерывания питания я выбрал на основе миниатюрного пятивольтового реле. Выбор обусловлен наличием у меня соотвтетвующих компонентов &#x1F60F;. Вы можете выбрать любой другой вариант.  
На рисунке ниже представлена принципиальная электрическая схема, которую я исопльзовал.

![Схема управления питанием USB](ReadmeImages/diagram.png)

Для подключения нужно аккуратно убрать внешнюю изоляцию USB кабеля. Затем, нужно разрезать красный провод, а чёрный просто очистить от изоляции не разрезая. Подключить схему в разрез красного провода и к чёрному.  
Управляющий провод нужно подключить к **GPIO 17** Raspberry Pi.  
**Фотография готового устройства.**

![Фотография готового устройства](ReadmeImages/photo.jpg)

**Скриншот Web страницы**

![Скриншот Web страницы](ReadmeImages/server.png)
