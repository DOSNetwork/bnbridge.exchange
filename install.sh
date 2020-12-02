#!/bin/bash

sudo apt-get update
sudo apt-get -y install npm
sudo npm -g install npm
sudo npm -g install pm2
sudo npm -g install n
n 14.15.0
sudo apt-get -y install build-essential
sudo apt-get -y install libudev-dev
sudo apt-get -y install postgresql postgresql-contrib
cd sdk && npm install && cd ../bnbridge && npm install
