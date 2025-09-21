#!/usr/bin/env sh
# Run Python app with remembered virtualenv choice (PT/EN), POSIX sh

set -eu

# --- resolve script directory (POSIX-friendly, works with/without symlinks) ---
SCRIPT="$0"
# Try readlink -f if available; otherwise fall back to relative path handling.
if command -v readlink >/dev/null 2>&1; then
  # Some BSDs lack -f; try it and fall back gracefully.
  if READLINK_RESOLVED=$(readlink -f "$SCRIPT" 2>/dev/null); then
    SCRIPT="$READLINK_RESOLVED"
  fi
fi
SCRIPT_DIR=$(cd "$(dirname -- "$SCRIPT")" && pwd)
ROOT="$SCRIPT_DIR"

VENV_DIR="$ROOT/.venv"
VENV_PY="$VENV_DIR/bin/python"
RUN_PY="$ROOT/run.py"
REQS="$ROOT/requirements.txt"
CHOICE_FILE="$ROOT/.venv_choice"

# Optional flag to reset stored preference
if [ "${1-}" = "--reset-choice" ] || [ "${1-}" = "--forget" ]; then
  [ -f "$CHOICE_FILE" ] && rm -f "$CHOICE_FILE"
  echo "Preferencia apagada / Preference cleared."
fi

# Pick Python: prefer python3 then python
if command -v python3 >/dev/null 2>&1; then
  PY_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PY_CMD="python"
else
  echo "[ERRO] Python nao encontrado no PATH."
  echo "[ERROR] Python not found in PATH."
  exit 1
fi

if [ ! -f "$RUN_PY" ]; then
  echo "[ERRO] Arquivo run.py nao encontrado em: $RUN_PY"
  echo "[ERROR] run.py not found at: $RUN_PY"
  exit 1
fi

ask_yes_no() {
  # PT/EN prompt; default = N (Enter)
  while :; do
    printf "%s\n" "Deseja criar o ambiente virtual agora?" \
                  "Do you want to create the virtual environment now?"
    printf "(S/N | Y/N): "
    # shellcheck disable=SC2039
    read -r answer || true
    case "$answer" in
      [SsYy]) return 0 ;;
      ""|[Nn]) return 1 ;;
      *) echo "Resposta invalida / Invalid answer." ;;
    esac
  done
}

run_with_venv() {
  echo "Executando com o ambiente virtual..."
  echo "Running with the virtual environment..."
  exec "$VENV_PY" "$RUN_PY"
}

run_global() {
  echo "Executando com o Python global..."
  echo "Running with global Python..."
  exec "$PY_CMD" "$RUN_PY"
}

create_venv_if_needed() {
  if [ -x "$VENV_PY" ]; then
    return 0
  fi
  echo "Criando ambiente virtual..."
  echo "Creating virtual environment..."
  if ! "$PY_CMD" -m venv "$VENV_DIR"; then
    return 1
  fi
  return 0
}

upgrade_pip_safely() {
  echo "Atualizando pip..."
  echo "Upgrading pip..."
  # ignore failures
  "$VENV_PY" -m pip install --upgrade pip --quiet || true
}

install_requirements_if_present() {
  if [ -f "$REQS" ]; then
    echo "Instalando dependencias a partir de requirements.txt..."
    echo "Installing dependencies from requirements.txt..."
    # ignore failures
    "$VENV_PY" -m pip install -r "$REQS" --quiet || true
  fi
}

# 1) If remembered choice exists, honor it
if [ -f "$CHOICE_FILE" ]; then
  choice=$(cat "$CHOICE_FILE" 2>/dev/null || echo "")
  if [ "$choice" = "use_venv" ]; then
    # Create venv automatically if missing
    if create_venv_if_needed; then
      upgrade_pip_safely
      install_requirements_if_present
      run_with_venv
    else
      echo "Nao foi possivel criar .venv agora. Usando Python global nesta execucao."
      echo "Could not create .venv now. Using global Python for this run."
      run_global
    fi
  elif [ "$choice" = "no_venv" ]; then
    run_global
  fi
fi

# 2) No remembered choice:
#    If venv already exists, use and remember it
if [ -x "$VENV_PY" ]; then
  printf "%s" "use_venv" > "$CHOICE_FILE"
  run_with_venv
fi

# 3) No venv: ask once and remember
echo "A pasta .venv nao existe."
echo "The .venv folder does not exist."
if ask_yes_no; then
  if create_venv_if_needed; then
    upgrade_pip_safely
    install_requirements_if_present
    printf "%s" "use_venv" > "$CHOICE_FILE"
    run_with_venv
  else
    echo "Falha ao criar o ambiente virtual. Usando Python global."
    echo "Failed to create virtual environment. Using global Python."
    printf "%s" "no_venv" > "$CHOICE_FILE"
    run_global
  fi
else
  printf "%s" "no_venv" > "$CHOICE_FILE"
  run_global
fi
