# lfortran-lsp

[![Test Ubuntu](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-ubuntu.yml/badge.svg)](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-ubuntu.yml) [![Test MacOS](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-macos.yml/badge.svg)](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-macos.yml) [![Test Windows](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-windows.yml/badge.svg)](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-windows.yml) [![Lint Sources](https://github.com/lfortran/lfortran-lsp/actions/workflows/lint-sources.yml/badge.svg)](https://github.com/lfortran/lfortran-lsp/actions/workflows/lint-sources.yml)

LFortran implementation of Microsoft's Language Server Protocol (LSP) for VSCode.

## Key Features

1. Linting: highlights errors and warnings in your LFortran code which helps you
   to identify and correct programming errors.
2. Document Symbol Lookup: You can navigate symbols inside a file with
   `Ctrl + Shift + O`. By typing `:` the symbols are grouped by category. Press
   Up or Down and navigate to the place you want.

## Language Server

- The Language Server is written in TypeScript, which uses Microsoft’s official
  [language server module](https://github.com/microsoft/vscode-languageserver-node).
- Communication between the language server and LFortran Compiler is done with:
```typescript
const stdout = await runCompiler(text, "<flags>", settings); `
```

## Preconditions

### lfortran

You must have lfortran installed before you can use this extension. For the sake
of documentation completeness, the method of installing lfortran from as a git
repository is included below. For additional methods of installation, please
refer to [the documentation](https://docs.lfortran.org/en/installation/).

#### Installing as a git repository

```bash
# 1. Install Miniforge3 if you have not already:
# ----------------------------------------------
curl -L -O "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-$(uname)-$(uname -m).sh"
bash Miniforge3-$(uname)-$(uname -m).sh

# -------------------------------------------------------------------------
# Complete the installation and set your preferences. Be sure to initialize
# conda before proceding to the next step.
# -------------------------------------------------------------------------

# 2. Clone the repository to your workspace:
# ------------------------------------------
git clone --branch main --single-branch https://github.com/lfortran/lfortran.git
cd lfortran

# 3. Create a conda environment for lfortran:
# -------------------------------------------
conda create -n lf -c conda-forge \
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
  libcxx \
  rapidjson

# 4. Activate the environment:
# ----------------------------
conda activate lf

# 4. Compile lfortran with support for LSP:
# -----------------------------------------
./build0.sh
cmake \
  -DCMAKE_BUILD_TYPE=Debug \
  -DWITH_LSP=yes \
  -DWITH_JSON=yes \
  -DWITH_LLVM=yes \
  -DWITH_RUNTIME_STACKTRACE=yes \
  -DCMAKE_INSTALL_PREFIX=`pwd`/inst \
  .
make -j$(nproc)

# 5. Once `make` completes, you will find the `lfortran` binary located relative
# to the project root at `src/bin/lfortran`:
# ------------------------------------------------------------------------------
ls -l src/bin/lfortran
#-> -rwxr-xr-x 1 dylon dylon 226502136 Dec  4 22:05 src/bin/lfortran
```

![Cloning and Building LFortran](https://lfortran.github.io/lfortran-lsp/videos/cloning-and-building-lfortran.gif)

##### Updating lfortran

Updating the lfortran repository is straightforward:

```bash
cd /path/to/lfortran
git pull origin main
./build0.sh
# Note: I prefer to pass `--fresh` to `cmake` to avoid issues with development
# artifacts, but do also note that it rebuilds all of the artifacts so it is
# slower.
cmake --fresh \
  -DCMAKE_BUILD_TYPE=Debug \
  -DWITH_LSP=yes \
  -DWITH_JSON=yes \
  -DWITH_LLVM=yes \
  -DWITH_RUNTIME_STACKTRACE=yes \
  -DCMAKE_INSTALL_PREFIX=`pwd`/inst \
  .
make -j$(nproc)
```

## Usage

Compile lfortran with the option `-DWITH_LSP=yes` and `-DWITH_JSON=yes`:

```bash
conda activate lf # or use your environment name here
./build0.sh
cmake --build . -j$(nproc)
```

1. Clone https://github.com/lfortran/lfortran-lsp
2. Build the extension:

```console
cd lfortran-lsp && npm install && npm run compile
```

Open VSCode in the extension folder (`code editor/vscode/lsp-sample/`) and run
`ctrl + shift + D`, click on “Run and Debug” and choose VSCode Extension
Development, and test the extension. :)

To package the extension, you can do:

```bash
npx vsce package
```

This will generate a `.vsix` file in your `lfortran-lsp` folder, which can then be
imported as an extension. You can go to extensions in VSCode, click on `...` on
the top right, click on “Install from VSIX” and select the VSIX, and done (may
require a reload). The extension has now been installed.

## Testing

To test the extension, please run `npm run test`.
