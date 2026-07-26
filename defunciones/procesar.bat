@echo off
setlocal
set ROOT=f:\JEX\defunciones
set PYTHONPATH=%ROOT%
set PY=%ROOT%\.python\python.exe
cd /d %ROOT%
"%PY%" process_images.py %*