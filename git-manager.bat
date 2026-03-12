@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "Git Manager" python "%~dp0git-manager.py"
