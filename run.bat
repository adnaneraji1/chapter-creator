@echo off
title Chapter Creator Builder
cd /d "%~dp0"

echo ==============================
echo Checking Python 3.11...
echo ==============================

py -3.11 --version >nul 2>&1

if errorlevel 1 (
    echo Python 3.11 not found.
    echo Installing Python 3.11 using winget...

    winget install Python.Python.3.11 -e --source winget

    echo.
    echo Restart this file after Python finishes installing.
    pause
    exit
)

echo Python 3.11 found.

echo.
echo ==============================
echo Installing requirements...
echo ==============================

py -3.11 -m pip install --upgrade pip
py -3.11 -m pip install -r requirements.txt

echo.
echo ==============================
echo Cleaning old build...
echo ==============================

if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

echo.
echo ==============================
echo Building EXE...
echo ==============================

py -3.11 -m PyInstaller --noconfirm --onedir --windowed --name "Chapter Creator" --icon "icon.ico" desktop.py

echo.
echo ==============================
echo Copying UI files...
echo ==============================

xcopy /E /I /Y "ui" "dist\Chapter Creator\ui"

echo.
echo ==============================
echo Creating Desktop shortcut...
echo ==============================

powershell -NoProfile -ExecutionPolicy Bypass -Command "$Desktop=[Environment]::GetFolderPath('Desktop'); $Target='%CD%\dist\Chapter Creator\Chapter Creator.exe'; $Shortcut=Join-Path $Desktop 'Chapter Creator.lnk'; $Wsh=New-Object -ComObject WScript.Shell; $S=$Wsh.CreateShortcut($Shortcut); $S.TargetPath=$Target; $S.WorkingDirectory='%CD%\dist\Chapter Creator'; $S.IconLocation=$Target; $S.Save()"

echo.
echo ==============================
echo DONE
echo ==============================
echo EXE:
echo %CD%\dist\Chapter Creator\Chapter Creator.exe
echo.
echo Desktop shortcut created.
echo.

pause