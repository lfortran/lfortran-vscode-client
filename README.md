# LFortran Language Client (VSCode)

Integrates VSCode with LFortran's language server. The extension is extremely
lightweight and delegates all the heavy lifting to the language server.

## Installation

Before you install this extension, please be sure to install `lfortran` per [the
installation instructions](https://docs.lfortran.org/en/installation/). Unless
you intend to develop `lfortran`, it is recommended to install it with Conda.

![Installing LFortran with Conda](https://lfortran.github.io/lfortran-vscode-client/videos/lfortran-vscode-client/installing-lfortran-with-conda.gif)

Once you have installed `lfortran`, it is recommended to install this extension
via [the VSCode
Marketplace](https://marketplace.visualstudio.com/items?itemName=LCompilers.LFortran).

## Version Compatibility with LFortran

There are two independent constraints.

First constraint is that for a given version of `lfortran-vscode-client` in the
left column, you need at least the version of `LFortran` in the right column:

| lfortran-vscode-client | LFortran  |
| ---------------------- | --------- |
| 0.0.4                  | >= 0.50.0 |
| 0.0.5                  | >= 0.51.0 |

The second constraint is that for a given version of `LFortran` in the left
column, you need at least the version of `lfortran-vscode-client` in the right
column:

| LFortran | lfortran-vscode-client |
| -------- | ---------------------- |
| 0.50.0   | >= 0.0.4               |
| 0.51.0   | >= 0.0.4               |

When `lfortran-vscode-client` introduces a change the requires some feature in
`LFortran`, we bump the `LFortran` version in the first table. When `LFortran`
adds a change that requires some feature in the `lfortran-vscode-client`, then
we bump the `lfortran-vscode-client` verison in the second table. When a new
version of `lfortran-vscode-client` is released, only the first table has to be
updated. When a new version of `LFortran` is released, only the second table
needs to be updated.


### Building from source

If you would like to build this extension from source, please install `lfortran`
as described, above. Then, follow these instructions:

```shell
# Clone the repository if you have not already:
git clone https://github.com/lfortran/lfortran-vscode-client.git

cd lfortran-vscode-client

# If you already had it cloned, update your repo:
git checkout main
git pull origin main

# Install the NPM dependencies:
npm install

# Remove old build artifacts:
rm -rf out *.vsix

# Bundle the package:
npx vsce package

# Uninstall any older version of the extension from VSCode:
code --uninstall-extension lcompilers.lfortran

# Install the package you just created:
code --install-extension *.vsix
```

## Usage

Once you have installed the extension, it should begin working immediately when
a Fortran file is opened or edited. More specifically, any time a file is opened
or edited with one of the following file extensions, this VSCode extension will
be activated: `.f`; `.for`; `.f90`; `.f95`; `.f03`.

### Code Validation

LFortran will automatically check a document for syntactic and semantic errors
and warn about potential issues. Errors will be highlighted and described in the
`Problems` terminal (`View -> Problems`).

![Installing LFortran with Conda](https://lfortran.github.io/lfortran-vscode-client/videos/lfortran-vscode-client/document-validation.gif)

### Goto Definitions

To jump to a symbol's definition, either place the cursor over it and press
`F12` or right-click it and select `Go to Definition` from the context menu.

![Installing LFortran with Conda](https://lfortran.github.io/lfortran-vscode-client/videos/lfortran-vscode-client/goto-definition.gif)

### Hover Previews

When the cursor hovers over a symbol, a preview of its definition will be placed
next to it.

![Installing LFortran with Conda](https://lfortran.github.io/lfortran-vscode-client/videos/lfortran-vscode-client/hover-previews.gif)

### Configuration

You may configure the extension by clicking the `Extensions` tab, followed by
clicking the gear icon on the bottom-right of the `LFortran` list item, and
lastly by clicking the `Settings` menu item. Most of the settings are common to
all workspaces but the compiler flags may be modified at the resource level.

![Installing LFortran with Conda](https://lfortran.github.io/lfortran-vscode-client/videos/lfortran-vscode-client/configuration.gif)

## Debugging

If you would like to debug the extension, please do the following:
1. Open the extension's output terminal by selecting `View -> Terminal` from the
   menu bar. Then, select the `Output` tab and choose `LFortran` from the combo
   box near the top-right.
2. Open the extension's settings and enable at least a `debug` log level.
3. If you would like trace-level logging, you may set the log level to either
   `trace` or `all` to enable the most granular level of logging within the
   extension, or leave the log level alone and enable request tracing under
   `LFortran > Trace: Server`. If you enable `verbose` request tracing, the JSON
   payloads will be pretty-printed if you have enabled `LFortran > Log: Pretty
   Print`.
4. The language server mirrors its logs to a log file. Its default location is a
   file named `lfortran-language-server.log` that is located relative to the
   root of your workspace.

![Installing LFortran with Conda](https://lfortran.github.io/lfortran-vscode-client/videos/lfortran-vscode-client/debugging.gif)


## Releasing a New Version

1. Update a new version in `package.json`, build the extension locally (see
   above) and test it in VSCode. Push all changes to main.
2. Go to https://github.com/lfortran/lfortran-vscode-client/releases, click on
   "Draft a new release", "Choose a tag", enter a new version (e.g., `v0.0.5`),
   click on "Generate release notes".
3. Manually attach the new `*.vsix` file to the release, and "Publish release"
4. Log into https://marketplace.visualstudio.com/manage/publishers/lcompilers
5. Find the "LFortran" line and click on the "..." menu (that has a hint "More
   Actions..."), select "Update", and upload the same `*.vsix` as above, click
   "Upload".
