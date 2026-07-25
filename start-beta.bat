@echo off
title LocalAkademi Beta Launcher

echo ============================================
echo   LocalAkademi - Local Beta Launcher
echo ============================================
echo.

REM ---------- Environment validation ----------
echo [1/4] Checking .env file...

if not exist "%~dp0.env" (
    echo   ERROR: .env file was not found in the project folder.
    echo   Copy .env.example to .env and fill in the required values.
    pause
    exit /b 1
)
echo   [OK] .env file found. Backend loads it with Node --env-file.

echo.

REM ---------- Kill existing servers ----------
echo [2/4] Stopping existing servers...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 "') do taskkill /F /PID %%a >nul 2>&1
echo   [OK] Ports 3000 and 5173 cleared
echo.

REM ---------- Start backend ----------
echo [3/4] Starting Backend (port 3000)...
start "LocalAkademi-Backend" cmd /c "cd /d %~dp0 && npm run dev"
echo   Backend starting in new window...
echo.

REM ---------- Wait for backend ----------
echo Waiting for backend to be ready...
:wait_loop
timeout /t 2 /nobreak >nul
curl -s http://localhost:3000/health >nul 2>&1
if errorlevel 1 goto wait_loop
echo   [OK] Backend is ready
echo.

REM ---------- Start frontend ----------
echo [4/4] Starting Frontend (port 5173)...
start "LocalAkademi-Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"
echo   Frontend starting in new window...
echo.

REM ---------- Done ----------
echo ============================================
echo   LocalAkademi Beta is starting up!
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:5173
echo   Health:   http://localhost:3000/health
echo ============================================
echo.
echo Waiting for frontend...
:wait_frontend
timeout /t 2 /nobreak >nul
curl -s http://localhost:5173 >nul 2>&1
if errorlevel 1 goto wait_frontend
echo [OK] Frontend is ready
echo.
start http://localhost:5173
echo Browser opened. Happy testing!
echo.
pause
