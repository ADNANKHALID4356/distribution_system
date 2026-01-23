@echo off
cd /d "%~dp0"
echo Killing electron processes...
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Cleaning dist folder...
if exist dist-standalone rmdir /s /q dist-standalone

echo Setting environment...
set CSC_IDENTITY_AUTO_DISCOVERY=false
set ELECTRON_BUILDER_NO_NATIVE_REBUILD=true

echo Building portable exe...
call npx electron-builder --win portable --config.directories.output=dist-standalone

echo.
echo Build complete! Check dist-standalone\win-unpacked\
pause
