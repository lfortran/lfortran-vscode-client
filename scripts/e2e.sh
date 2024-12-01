#!/usr/bin/env bash
set -x

EXIT_SUCCESS=0
EXIT_CONDA_FAILED=1
EXIT_GIT_FAILED=2
EXIT_NODE_FAILED=3
EXIT_BUILD_FAILED=4
EXIT_UNKNOWN_ARGS=5
EXIT_MISSING_XVFB=6

CONDA_ENV=lf

cd "$(dirname "$0")/.."

BASE_DIR="$PWD"
LFORTRAN_DIR="$BASE_DIR/lfortran"

NUM_PROCS=1
if command -v nproc &>/dev/null; then
  NUM_PROCS=$(nproc)
fi

declare PRINT_HELP
declare UPDATE_LFORTRAN
declare HEADLESS_MODE
declare -a ADDITIONAL_ARGS

function initialize-conda() {
  if [ -z "$CONDA_SHLVL" ] || (( CONDA_SHLVL == 0 )); then
    echo "Initializing conda"

    if command -v conda &>/dev/null; then
      __conda_setup="$(conda 'shell.bash' 'hook' 2> /dev/null)"
    elif [ -n "$CONDA_PREFIX_1" ]; then
      __conda_setup="$("$CONDA_PREFIX_1/bin/conda" 'shell.bash' 'hook' 2> /dev/null)"
    elif [ -n "$CONDA_PREFIX" ]; then
      __conda_setup="$("$CONDA_PREFIX/bin/conda" 'shell.bash' 'hook' 2> /dev/null)"
    else
      __conda_setup="$("$HOME/miniforge3/bin/conda" 'shell.bash' 'hook' 2> /dev/null)"
    fi

    if [ $? -eq 0 ]; then
      eval "$__conda_setup"
    elif [ -f "$CONDA_PREFIX_1/etc/profile.d/conda.sh" ]; then
      source "$CONDA_PREFIX_1/etc/profile.d/conda.sh"
    elif [ -f "$CONDA_PREFIX/etc/profile.d/conda.sh" ]; then
      source "$CONDA_PREFIX/etc/profile.d/conda.sh"
    elif [ -f "$HOME/miniforge3/etc/profile.d/conda.sh" ]; then
      source "$HOME/miniforge3/etc/profile.d/conda.sh"
    elif [ -n "$CONDA_PREFIX_1" ]; then
      export PATH="$CONDA_PREFIX_1/bin:$PATH"
    elif [ -n "$CONDA_PREFIX" ]; then
      export PATH="$CONDA_PREFIX/bin:$PATH"
    else
      export PATH="$HOME/miniforge3/bin:$PATH"
    fi
  fi
}

function activate-conda() {
  local RETURN_CODE

  if ! conda info --envs | grep "^$CONDA_ENV " &>/dev/null; then
    echo "Creating conda environment $CONDA_ENV"
    conda create -n $CONDA_ENV -c conda-forge \
          llvmdev=11.0.1 \
          bison=3.4 \
          re2c \
          python \
          cmake \
          make \
          toml \
          zstd-static \
          pandoc \
          gcc \
          gxx \
          libcxx
    RETURN_CODE=$?
    if (( RETURN_CODE != EXIT_SUCCESS )); then
      echo "`conda create -n $CONDA_ENV` failed with status $RETURN_CODE" 1>&2
      return $EXIT_CONDA_FAILED
    fi
  fi

  conda activate $CONDA_ENV
  if (( RETURN_CODE != EXIT_SUCCESS )); then
    echo "`conda activate $CONDA_ENV` failed with status $RETURN_CODE" 1>&2
    return $EXIT_CONDA_FAILED
  fi

  return $EXIT_SUCCESS
}

function clone-or-update-lfortran() {
  local RETURN_CODE

  if [ ! -e "$LFORTRAN_DIR" ]; then
    echo "Cloning e2e instance of LFortran to $LFORTRAN_DIR"
    git clone -b main --single-branch https://github.com/lfortran/lfortran.git "$LFORTRAN_DIR"
    RETURN_CODE=$?
    if (( RETURN_CODE != EXIT_SUCCESS )); then
      echo "git failed to clone lfortran with status $RETURN_CODE" 1>&2
      return $EXIT_GIT_FAILED
    fi
    UPDATE_LFORTRAN=true
  elif [ ! -x "$LFORTRAN_DIR/src/bin/lfortran" ]; then
    UPDATE_LFORTRAN=true
  elif [ -n "$UPDATE_LFORTRAN" ]; then
    echo "Updating LFortran to the latest version"
    pushd "$LFORTRAN_DIR"
    git pull origin main
    RETURN_CODE=$?
    if (( RETURN_CODE != EXIT_SUCCESS )); then
      echo "git failed to update lfortran with status $RETURN_CODE" 1>&2
      return $EXIT_GIT_FAILED
    fi
    popd
  fi

  return $EXIT_SUCCESS
}

function build-lfortran() {
  local RETURN_CODE
  if [ -n "$UPDATE_LFORTRAN" ]; then
    initialize-conda

    activate-conda
    RETURN_CODE=$?
    if (( RETURN_CODE != EXIT_SUCCESS )); then
      echo "Failed to set up conda" 1>&2
      return $RETURN_CODE
    fi

    echo "Building the latest version of LFortran"
    pushd "$LFORTRAN_DIR"

    ./build0.sh
    RETURN_CODE=$?
    if (( RETURN_CODE != EXIT_SUCCESS )); then
      echo "./build0.sh failed with status $RETURN_CODE" 1>&2
      return $EXIT_BUILD_FAILED
    fi

    cmake --fresh \
          -DCMAKE_BUILD_TYPE=Debug \
          -DWITH_LSP=yes \
          -DWITH_LLVM=yes \
          -DWITH_JSON=yes \
          -DCMAKE_INSTALL_PREFIX=`pwd`/inst .
    RETURN_CODE=$?
    if (( RETURN_CODE != EXIT_SUCCESS )); then
      echo "cmake failed with status $RETURN_CODE" 1>&2
      return $EXIT_BUILD_FAILED
    fi

    make -j$NUM_PROCS
    RETURN_CODE=$?
    if (( RETURN_CODE != EXIT_SUCCESS )); then
      echo "make failed with status $RETURN_CODE" 1>&2
      return $EXIT_BUILD_FAILED
    fi

    conda deactivate

    popd
  fi
  return $EXIT_SUCCESS
}

function run-integ-tests() {
  local RETURN_CODE
  if [ -z "$HEADLESS_MODE" ]; then
    npm run integ
  elif command -v xvfb-run &>/dev/null; then
    xvfb-run npm run integ
  else
    echo "Headless mode is only supported on platforms with `xvfb-run`" 1>&2
    return $EXIT_MISSING_XVFB
  fi
  RETURN_CODE=$?
  if (( RETURN_CODE != EXIT_SUCCESS )); then
    echo "`npm run integ` failed with status $RETURN_CODE" 1>&2
    return $EXIT_NODE_FAILED
  fi
  return $EXIT_SUCCESS
}

function print-help() {
  cat <<'EOF'
Runs the end-to-end tests for lfortran-lsp.

Usage: ./scripts/e2e.sh [OPTIONS]

Options:
  -h|--help             Print this help text.
  -u|--update-lfortran  Whether to update LFortran before running the end-to-end tests.
  --headless            Whether to run the tests in an XVFB framebuffer
                        (render off-screen; no visible window).
EOF
}

function parse-args() {
  local OPTION
  local LVALUE
  local RVALUE

  while (( $# )); do
    OPTION="$1"
    case "$OPTION" in
      -h|--help)
        PRINT_HELP=true
        shift
        ;;
      -u|--update-lfortran)
        UPDATE_LFORTRAN=true
        shift
        ;;
      --headless)
        HEADLESS_MODE=true
        shift
        ;;
      --*=*)
        shift
        LVALUE="${OPTION/=*}"
        RVALUE="${OPTION:1+${#LVALUE}}"
        set -- "$LVALUE" "$RVALUE" "$@"
        ;;
      -[a-z][a-z]*)
        shift # Expand short args in reverse, in case the right-most arg
        # accepts a parameter.
        for (( i = ${#OPTION} - 1; i > 0; i -= 1 )); do
          set -- "-${OPTION:$i:1}" "$@"
        done
        ;;
      *)
        ADDITIONAL_ARGS+=("$1")
        shift
        ;;
    esac
  done

  if (( ${#ADDITIONAL_ARGS[@]} )); then
    echo "Unrecognized args: ${ADDITIONAL_ARGS[@]}" 1>&2
    PRINT_HELP=true
    return $EXIT_UNKNOWN_ARGS
  fi

  return $EXIT_SUCCESS
}

function main() {
  local RETURN_CODE

  parse-args "$@"
  RETURN_CODE=$?
  if [ -n "$PRINT_HELP" ]; then
    print-help
    return $RETURN_CODE
  fi
  if (( RETURN_CODE != EXIT_SUCCESS )); then
    echo "Failed to run end-to-end tests" 1>&2
    return $RETURN_CODE
  fi

  clone-or-update-lfortran
  RETURN_CODE=$?
  if (( RETURN_CODE != EXIT_SUCCESS )); then
    echo "Failed to clone or update LFortran" 1>&2
    return $RETURN_CODE
  fi

  build-lfortran
  RETURN_CODE=$?
  if (( RETURN_CODE != EXIT_SUCCESS )); then
    echo "Failed to build LFortran" 1>&2
    return $RETURN_CODE
  fi

  run-integ-tests
  RETURN_CODE=$?
  if (( RETURN_CODE != EXIT_SUCCESS )); then
    echo "Failed to run end-to-end tests" 1>&2
    return $RETURN_CODE
  fi

  return $EXIT_SUCCESS
}

main "$@"
exit $?
