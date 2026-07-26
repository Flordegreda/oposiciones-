@echo off
setlocal
set "PORT=8501"
echo Cerrando app en puerto %PORT%...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
    taskkill /F /PID %%p >nul 2>&1
    echo Proceso %%p cerrado.
)
echo Listo.
pause
