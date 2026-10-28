@echo off
cd /d "%~dp0"
title Hinton Studio - DEV - localhost:3210
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3210 ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
call npm run dev
pause
