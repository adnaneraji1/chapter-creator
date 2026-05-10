@echo off
title Chapter Creator Setup

echo ==============================
echo Installing requirements...
echo ==============================

py -3.11 -m pip install -r requirements.txt

echo.
echo ==============================
echo Starting Chapter Creator...
echo ==============================

py -3.11 desktop.py

pause