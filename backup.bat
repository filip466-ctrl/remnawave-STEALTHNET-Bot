@echo off
chcp 65001 >nul
cd /d "%~dp0"

start "STEALTHNET Backup Manager" powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup.ps1"
