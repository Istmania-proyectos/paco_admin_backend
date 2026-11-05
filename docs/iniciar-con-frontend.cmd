@echo off
setlocal
if "%~1"=="" goto usage
if not exist "%~dp0package.json" (
  echo Coloque este archivo junto a package.json en la carpeta del backend.
  exit /b 1
)
set "FRONTEND_DIST_PATH=%~f1"
if not exist "%FRONTEND_DIST_PATH%\index.html" (
  echo No existe index.html en la carpeta indicada:
  echo %FRONTEND_DIST_PATH%
  exit /b 1
)
if not exist "%FRONTEND_DIST_PATH%\version-frontend.json" (
  echo La carpeta indicada no contiene el frontend actualizado: falta version-frontend.json.
  echo %FRONTEND_DIST_PATH%
  exit /b 1
)
findstr /C:"frontend-tickets-20261102-1648" "%FRONTEND_DIST_PATH%\version-frontend.json" >nul
if errorlevel 1 (
  echo El archivo de version no corresponde al frontend entregado.
  exit /b 1
)
pushd "%~dp0"
echo Frontend seleccionado: %FRONTEND_DIST_PATH%
call pnpm start:prod
set "ticketExitCode=%errorlevel%"
popd
exit /b %ticketExitCode%
:usage
echo Uso: iniciar-con-frontend.cmd "RUTA COMPLETA DE LA CARPETA QUE CONTIENE INDEX.HTML"
echo Copiar este archivo a la carpeta del backend y detener el proceso anterior antes de iniciar.
exit /b 1
