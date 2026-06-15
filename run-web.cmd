@echo off
setlocal
cd /d "%~dp0"
set "SEE_MY_VOICE_DIR=%~dp0"
".venv\Scripts\python.exe" "web\server.py"
