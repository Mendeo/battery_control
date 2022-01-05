# Battery control
Web сервер для Raspbery PI, при помощи которого можно управлять зарядкой подключенного телефона.
Идея этого проекта сложилась, когда потребовалось раздавать интернет с телефона длительное время. Дело в том, что постоянно держать на зарядке телефон не очень хорошо: батарея вздувается за короткое время. Нужно было решение, для того что бы поддерживать заряд телефона на заданном низком уровне. Эту задачу решает данный проект.  
## Принцип работы
Телефон подключается к Raspberry Pi при помощи специального USB кабеля, в котором реализовано прерывание подачи напряжения питания. На телефоне запускается специальный скрипт, который переодически посылает на специальный web сервер информацию о текущем уровне заряда батарее и другую информацию. Web сервер работает на той же Raspbery Pi, к которой подключён телефон. Как только уровень заряда телефона превышает заданный уровень, то Web сервер посылает сигнал на USB кабель и отключает зарядку. Далее, как только уровень заряда упадёт ниже заданного уровня, то Raspberry Pi снова включит зарядку. Уровени включения и отключения заряда различаются на 2-3% поэтому батарея телефона всё время находится в оптимальном состоянии.  
В виде бонуса если зайти на Web сервер с браузера, то можно узнать не только текущий уровень заряда батареи и её статус, но и дополнительную инфомацию, такую как температура самой Raspbery Pi, количество переданного и принятого трафика и др.
## Зачем такие сложности?
Действительно, на некоторых рутованных телефонах можно ограничить уровень заряда путём редактированию системных файлов. Но в моём случае это не сработало. К тому же этот способ будет работать практически с любым, даже не рутованным телефоном.
## Скрипт на телефоне
Существует два разных способа запуска скрипта на телефоне в termux и в обычном эмуляторе терминала. Запуск через termux более предпочтительней, т.к. не требует корректировки скрипта и работает сразу. Но этот способ не годится для старых телефонов, с версией андроида ниже 7. Можно, конечно, найти старую версию termux и запустить скрипт даже на 5-ом андроиде, но это требует дополнительных усилий.  
С другой стороны, если у вас рутованый телефон даже со старой версией андроид можно запустить сприпт в любом эмуляторе терминала, но сначала предварительно портребуется установить busybox. Из всех утилит busybox для работы скрипта требуется wget.  
### Работа скрипта в termux
Сначала нужно установить termux, а также termux:API. Далее нужно запустить termux и установить termux api:
```bash
pkg install termux-api
```
Это требуется сделать только один раз.
### Работа скрипта на рутованом телефоне в терминале
Сначала нужно переключить скрипт в режим работы без termux. Для этого во второй строке переменной IS_STARTS_FROM_TERMUX нужно выставить значение 0.  
Далее нужно проверить, что скрипт может получить информацию об уровне заряда телефона и о текущем статусе (заряжается, не заряжается). Эти данные берутся из системных файлов. Так в моём телефоне уровень заряда можно увидеть в файле "/sys/class/power_supply/battery/capacity", а информация о статусе в файле "/sys/class/power_supply/battery/status". У вас может быть не так. Поэтому в скрипте нужно задать корректные пути к нужным файлам. В файле, содержащим статус батарее содержится текстовая информация о том заряжается телефон или нет. Этот текст нужно в точности занести в переменные NOT_CHARGING_STATUS и CHARGING_STATUS. Без информации о статусе батареии и её заряде скрипт работать не будет.  
Также в скрипте есть и другие пути к файлам с данными, например о температуре батареии и другие. Их тоже следует проверить. Но это опционально.  
Всё это проверяется и корректируется в строчках с 18 по 29 скрипта.  
Далее устанавливаем и запускаем busybox, затем нажимаем install в интерфейсе busybox и ждём пока всё установится (возможно это потребуется делать после каждой перезагрузки телефона).
### Запуск скрипта
Если запуск ведётся из обычного эмулятора терминала, то скрипт нужно запускать от рута, т.е. сначала выполняем
```bash
su
```
Далее:
```bash
cd <папка с phone.sh>
sh phone.sh
```
По умолчанию телефон будет заряжаться до 45%. Изменить это значение можно передав новое значение в первом параметре скрипта, например
```bash
sh phone.sh 50
```
После того, как телефон зарядится до заданного значения он начнёт разряжаться. Снова зарядка включится, когда уровень заряда батареии достигнет уровня на 2% ниже уровня отключения зарядки. Т.е. для 45% это будет 43%, для 50% - 48%. Это значение так же можно изменить. Во втором параметре к сприпту можно передать уровень, до которого батарея будет разряжаться. Например:
```bash
sh phone.sh 50 40
```
В этом примере телефон будет заряжаться до 50%, потом заряд отключится и снова включится, когда уровень заряда батерии достигнет 40%.
## Web сервер на Raspbery Pi
Web сервер написан на Node.js. Поэтому эта среда должна быть установлена на Raspbery Pi.  
После запуска сервер работает на 80 порту.  
По адресу "/setBatteryInfo" телефон отправляет информацию о заряде и статусе батареии.  
По запросу на адрес "/getStatus" сервер отправляет json, с информацией, полученной от телефона и дополнительной информацией, такой как температура процессора Raspbery Pi, количество интернет трафика и др.  
По запросу на адрес "/startCharge" можно принудительно включить зарядку телефона.  
По запросу на адрес "/stopCharge" можно принудительно выключить зарядку телефона.  
Запрос на адрес "/" возвращает веб страницу. На ней переодически выполеняется запрос на "/getStatus" и отображается полученная информация. Поэтому можно в режиме рельного времени наблюдать информацию о статусе телефона и Raspbery Pi.
### Установка web сервера на Raspbery Pi
Для автоматического запуска Web servera после загрузки Raspbery Pi нужно добавить unit в systemd.
Создаём
## USB кабель
На рисунке представлена принципиальная электрическая схема USB кабеля, в котором реализовано внешнее управление питанием. 