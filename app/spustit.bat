@echo off
chcp 65001 >nul
title Florbal - statistiky
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js neni nainstalovany. Stahnete ho z https://nodejs.org ^(verze LTS^) a spustte znovu.
  echo.
  pause
  exit /b 1
)

echo.
echo  Spoustim Florbal... Okno nechte otevrene, zavrenim se aplikace vypne.
start "" "http://localhost:3000"
node server.js
pause
