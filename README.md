# LFortran LSP

[![Test Ubuntu](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-ubuntu.yml/badge.svg)](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-ubuntu.yml) [![Test MacOS](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-macos.yml/badge.svg)](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-macos.yml) [![Test Windows](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-windows.yml/badge.svg)](https://github.com/lfortran/lfortran-lsp/actions/workflows/test-windows.yml) [![Lint Sources](https://github.com/lfortran/lfortran-lsp/actions/workflows/lint-sources.yml/badge.svg)](https://github.com/lfortran/lfortran-lsp/actions/workflows/lint-sources.yml)

![Using LFortran LSP](https://lfortran.github.io/lfortran-lsp/videos/using-lfortran-lsp.gif)

Fortran language extension for VSCode that utilizes LFortran as its backend. The
extension communicates with VSCode via [Microsoft's Language Server
Protocol (LSP)](https://microsoft.github.io/language-server-protocol/).

## Key Features

1. Code Completion: Code completion recommendations will be given as you type,
   along with previews of each recommendation's definition.
2. Linting: highlights errors and warnings in your LFortran code which helps you
   to identify and correct programming errors.
3. Document Symbol Lookup: You can navigate symbols inside a file with
   `Ctrl + Shift + O`. By typing `:` the symbols are grouped by category. Press
   Up or Down and navigate to the place you want.
4. Go-To Symbol Definition: You may jump to the definition of a symbol by
   highlighting over it and pressing `<F12>` or by right clicking it and
   choosing `"Go to Definition"`.
5. Symbol Occurrence Highlighting: When you navigate over a symbol, all its
   instances will be highlighted in the document.
6. Definition Previews: When you hover over a symbol with your cursor, a preview
   of its definition will appear next to the cursor.
7. Symbol Renaming: You may rename any symbol by navigating over it and pressing
   `<F2>` or by right-clicking it and choosing `"Rename Symbol"`.

## Language Server

- The Language Server is written in TypeScript, which uses Microsoft’s official
  [language server module](https://github.com/microsoft/vscode-languageserver-node).
- Communication between the language server and LFortran Compiler is done with:
```typescript
const stdout = await runCompiler(text, "<flags>", settings); `
```

## Requirements

### VSCode

The extension has been developed against VSCode version `1.95.3` and tested
against VSCode version `1.95.2`. It may work in earlier versions, but for
maximum compatibility please use VSCode version >= `1.95.2`.

### LFortran

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

![Updating LFortran](https://lfortran.github.io/lfortran-lsp/videos/updating-lfortran.gif)

## Installation

Once you have installed `lfortran`, you may compile the extension as follows:

```bash
# 1. Clone the lfortran-lsp repository
# ------------------------------------
git clone --branch main --single-branch https://github.com/lfortran/lfortran-lsp.git
cd lfortran-lsp

# 2. Install the Node.js dependencies
# -----------------------------------
npm install

# 3. Package the extension as a .vsix archive
# -------------------------------------------
npx vsce package
ls -l lfortran-lsp-1.0.0.vsix
#-> -rw-r--r-- 1 dylon dylon 136257 Dec  5 16:32 lfortran-lsp-1.0.0.vsix
```

![Cloning and Building LFortran LSP](https://lfortran.github.io/lfortran-lsp/videos/cloning-and-building-lfortran-lsp.gif)

Once you have compiled the extension, you may import it into VSCode as follows:
1. Click the `"Extensions"` tab or press `Ctrl + Shift + x`.
2. Near the top-right of the panel that opens, click the horizontal ellipsis
   that has the tooltip text `"Views and More Actions..."`.
3. Click `"Install from VSIX..."`
4. Open the `lfortran-lsp-1.0.0.vsix` package you just created.

![Installing and Using LFortran LSP](https://lfortran.github.io/lfortran-lsp/videos/installing-and-using-lfortran-lsp.gif)

### Updating LFortran

To update the LFortran extension, do the following:

```bash
cd /path/to/lfortran-lsp
git pull origin main
npm install
npx vsce package
```

The cleanest way to update it in VSCode is to do the following:
1. Click the `"Extensions"` tab or press `Ctrl + Shift + x`.
2. Find the listing for `lfortran-lsp`.
3. Click the gear icon with the tooltip text `"Manage"`
4. Click `"Uninstall"`.
5. Click `"Restart Extensions"` on the `lfortran-lsp` listing where the gear
   icon used to be.
6. Wait a moment for the extensions to reload.
7. Click the `"Refresh"` button near the top-right of the extensions panel (it
   looks like an arrow that is rotating to the right).
8. Wait a moment for the extensions to reload.
9. Reinstall the .vsix archive as before:
   1. Near the top-right of the extensions panel, click the horizontal ellipsis
      that has the tooltip text `"Views and More Actions..."`.
   2. Click `"Install from VSIX..."`
   3. Open the `lfortran-lsp-1.0.0.vsix` package you just created.

![Updating LFortran LSP in VSCode](https://lfortran.github.io/lfortran-lsp/videos/updating-lfortran-lsp-in-vscode.gif)

## Testing

To run the unit tests, within the project root, run the following: `npm test`:

![Unit Testing LFortran LSP](https://lfortran.github.io/lfortran-lsp/videos/unit-testing-lfortran-lsp.gif)

The end-to-end integration tests run best on a headless server like `xvfb`.
Otherwise, they will open in a visible instance of VSCode but changing the
active window or performing any action within the VSCode instance may cause the
tests to fail. With `xvfb` installed, run the following: `xvfb-run npm run integ`:

![Integration Testing LFortran LSP](https://lfortran.github.io/lfortran-lsp/videos/integration-testing-lfortran-lsp.gif)
