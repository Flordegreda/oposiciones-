@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "PYTHONPATH=%ROOT%"
set "STREAMLIT_BROWSER_GATHER_USAGE_STATS=false"
set "STREAMLIT_GLOBAL_DEVELOPMENT_MODE=false"
set "PY=%ROOT%\.python\python.exe"
set "PORT=8501"
cd /d "%ROOT%"

if not exist "%PY%" (
    echo.
    echo ERROR: No se encuentra Python en:
    echo   %ROOT%\.python
    echo.
    pause
    exit /b 1
)

echo.
echo Libros parroquiales Salvatierra
echo ================================
echo Carpeta: %ROOT%
echo.

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
    echo Cerrando proceso anterior en puerto %PORT% ^(PID %%p^)...
    taskkill /F /PID %%p >nul 2>&1
)

echo Iniciando en http://localhost:%PORT%
echo NO cierres esta ventana mientras uses la app.
echo.

start "" "http://localhost:%PORT%"
"%PY%" -m streamlit run app.py --server.port %PORT% <nul

echo.
echo La aplicacion se ha cerrado.
pause
