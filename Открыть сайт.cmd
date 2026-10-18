@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install the LTS version from nodejs.org.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  call npm.cmd install --prefer-offline --no-audit --no-fund
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
start "" "http://127.0.0.1:4173/"
call npm.cmd run dev -- --host 127.0.0.1 --port 4173 --strictPort
pause
