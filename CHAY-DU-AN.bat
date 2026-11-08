@echo off
chcp 65001 >nul
cd /d "%~dp0"
title SeeCut Studio - Dang Chay Tren May Moi

echo ====================================================================
echo               KHOI DONG SEECUT STUDIO (PORT 3210)
echo ====================================================================

echo [1/3] Kiem tra va giai phong cong 3210...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3210 ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1

echo [2/3] Dang khoi dong Web Server Next.js...
start "" http://localhost:3210/canvas/prj_06d6f1c9496a

call npm run dev
pause
