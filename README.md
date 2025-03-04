# LFortran LSP

VSCode extension for integrating with LFortran's language server. The extension
is intended to be extremely lightweight and delegates all the heavy lifting to
the language server.

# Building and Installation

```shell
# Clone the repository if you have not already:
git clone https://github.com/lfortran/lfortran-lsp.git

cd lfortran-lsp

# If you already had it cloned, update your repo:
git pull origin main

# Install the NPM dependencies:
npm install

# Bundle the package (lfortran-lsp-0.0.1.vsix):
npx vsce package

# Uninstall any older version of the extension from VSCode:
code --uninstall-extension lcompilers.lfortran-lsp

# Install the package you just created:
code --install-extension lfortran-lsp-0.0.1.vsix
```

# Usage

Once you have installed the extension, it should begin working immediately when
a Fortran file is opened or edited. More specifically, any time a file is opened
or edited with one of the following file extensions, this VSCode extension will
be activated: `.f`; `.for`; `.f90`; `.f95`; `.f03`.

## Code Validation

LFortran will automatically check a document for syntactic and semantic errors
and warn about potential issues. Errors will be highlighted and described in the
`Problems` terminal (`View -> Problems`).

## Configuration

You may configure the extension by clicking the `Extensions` tab, followed by
clicking the gear icon on the bottom-right of the `lfortran-lsp` list item, and
lastly by clicking the `Settings` menu item. Most of the settings are common to
all workspaces but the compiler flags may be modified at the resource level.
