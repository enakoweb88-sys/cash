@echo off
setlocal
set "ENAKO_PROXY_SOURCE=%~dp0access-proxy.mjs"
powershell.exe -NoProfile -Command "[System.IO.File]::ReadAllText($env:ENAKO_PROXY_SOURCE) | Set-Clipboard"
if errorlevel 1 (
  echo Could not copy the Worker code. Open access-proxy.mjs in Notepad and copy its contents.
  pause
  exit /b 1
)
echo Cash Dashboard Worker code copied. Paste into that Worker's code editor.
echo This helper does not publish anything or change Cloudflare settings.
pause
