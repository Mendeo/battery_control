reset
set encoding utf8
set terminal qt size 1024, 768

set datafile separator ',' #columnheaders
set grid xtics ytics linetype 7 linecolor rgb 'light-gray'
set key autotitle columnheader
set key off
set xdata time
set timefmt "%Y-%m-%dT%H:%M:%S"
#set format x "%d.%m %H:%M"
#stats 'phone_charge.csv' using 1:2
plot 'phone_charge.csv' using 1:2 with linespoint linetype 7 linecolor "black"