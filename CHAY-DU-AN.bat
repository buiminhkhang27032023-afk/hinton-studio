@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Hinton Studio - localhost:3210
echo [1/3] Dung server cu tren cong 3210...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3210 ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
if not exist node_modules call npm install
echo [2/3] Dang build ban toi uu (1-3 phut)... log: build-log.txt
call npm run build > build-log.txt 2>&1
if errorlevel 1 (type build-log.txt & echo. & echo BUILD LOI - da luu build-log.txt & pause & exit /b 1)
echo [3/3] Da build xong. Mo http://localhost:3210
call npm run start
pause
