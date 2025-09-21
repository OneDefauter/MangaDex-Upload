@echo off
REM --- Run Python app with remembered venv choice (PT/EN) ---
REM --- Versao sem parenteses: apenas IF/GOTO/labels (zero "()") ---
setlocal enableextensions disabledelayedexpansion

REM Base dir = folder of this .bat
set "ROOT=%~dp0"
pushd "%ROOT%"

set "VENV_DIR=%ROOT%.venv"
set "VENV_PY=%VENV_DIR%\Scripts\python.exe"
set "RUN_PY=%ROOT%run.py"
set "REQS=%ROOT%requirements.txt"
set "CHOICE_FILE=%ROOT%.venv_choice"

if exist "%RUN_PY%" goto HAVE_RUNPY
echo [ERRO] Arquivo run.py nao encontrado em: "%RUN_PY%"
echo [ERROR] run.py not found at: "%RUN_PY%"
goto END

:HAVE_RUNPY
REM Pick Python command: prefer py, then python
set "PY_CMD="
where py >nul 2>&1 && set "PY_CMD=py"
if not "%PY_CMD%"=="" goto HAVE_PY
where python >nul 2>&1 && set "PY_CMD=python"
if not "%PY_CMD%"=="" goto HAVE_PY

echo [ERRO] Python nao encontrado no PATH.
echo [ERROR] Python not found in PATH.
goto END

:HAVE_PY
REM If a remembered choice exists, honor it.
if not exist "%CHOICE_FILE%" goto CHECK_VENV_DIRECT
set /p CHOICE=<"%CHOICE_FILE%"
if /I "%CHOICE%"=="use_venv" goto USE_VENV_PREFERRED
if /I "%CHOICE%"=="no_venv"  goto RUN_GLOBAL
goto CHECK_VENV_DIRECT

:CHECK_VENV_DIRECT
REM If venv already exists, use it and remember
if exist "%VENV_PY%" goto REMEMBER_AND_RUN_VENV

REM No venv and no remembered choice: ask user once
echo A pasta .venv nao existe.
echo The .venv folder does not exist.
echo.
echo Deseja criar o ambiente virtual agora? (S/N)
choice /C SN /N /M "Do you want to create the virtual environment now? (Y/N): "
REM choice: 1 = S, 2 = N
if errorlevel 2 goto SET_NO_VENV_AND_RUN

echo Criando ambiente virtual...
echo Creating virtual environment...
"%PY_CMD%" -m venv "%VENV_DIR%"
if errorlevel 1 goto VENV_CREATE_FAILED

goto UPGRADE_PIP

:VENV_CREATE_FAILED
echo Falha ao criar o ambiente virtual. Usando Python global.
echo Failed to create virtual environment. Using global Python.
goto SET_NO_VENV_AND_RUN

:UPGRADE_PIP
echo Atualizando pip...
echo Upgrading pip...
"%VENV_PY%" -m pip install --upgrade pip --quiet
if errorlevel 1 echo Aviso: falha ao atualizar pip. Prosseguindo.

if exist "%REQS%" goto INSTALL_REQS
goto REMEMBER_AND_RUN_VENV

:INSTALL_REQS
echo Instalando dependencias a partir de requirements.txt...
echo Installing dependencies from requirements.txt...
"%VENV_PY%" -m pip install -r "%REQS%" --quiet
if errorlevel 1 echo Falha ao instalar dependencias (requirements). Continuando assim mesmo.

goto REMEMBER_AND_RUN_VENV

:USE_VENV_PREFERRED
REM User prefers venv. If missing, try to create it automatically.
if exist "%VENV_PY%" goto RUN_VENV
echo Preferencia de venv lembrada, mas .venv ausente. Criando...
echo Remembered venv preference, but .venv is missing. Creating...
"%PY_CMD%" -m venv "%VENV_DIR%"
if errorlevel 1 goto RUN_GLOBAL_TEMP
echo Atualizando pip...
"%VENV_PY%" -m pip install --upgrade pip --quiet
if exist "%REQS%" "%VENV_PY%" -m pip install -r "%REQS%"
goto RUN_VENV

:RUN_GLOBAL_TEMP
echo Nao foi possivel criar .venv agora. Usando Python global nesta execucao.
echo Could not create .venv now. Using global Python for this run.
goto RUN_GLOBAL

:REMEMBER_AND_RUN_VENV
> "%CHOICE_FILE%" echo use_venv
goto RUN_VENV

:SET_NO_VENV_AND_RUN
> "%CHOICE_FILE%" echo no_venv
goto RUN_GLOBAL

:RUN_VENV
echo Executando com o ambiente virtual...
echo Running with the virtual environment...
"%VENV_PY%" "%RUN_PY%"
goto END

:RUN_GLOBAL
echo Executando com o Python global...
echo Running with global Python...
"%PY_CMD%" "%RUN_PY%"
goto END

:END
popd
pause
