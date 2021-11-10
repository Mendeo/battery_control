#!/bin/bash
./termux-battery-status | awk '/percentage/ { sub(",","",$2); print($2) }'
