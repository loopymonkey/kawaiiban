@echo off
cd %~dp0..
echo Stopping local docker container...
docker stop pm_app
docker rm pm_app
echo Stopped.
