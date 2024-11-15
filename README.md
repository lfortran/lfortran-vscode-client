# lfortran-lsp

LFortran implementation of LSP for VSCode.

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

## Usage

Compile lfortran with the option `-DWITH_LSP=yes`:

```bash
conda activate lf # or use your environment name here
./build0.sh
cmake -DCMAKE_BUILD_TYPE=Debug \
  -DWITH_LSP=yes \
  -DWITH_LLVM=yes \
  -DCMAKE_INSTALL_PREFIX=`pwd`/inst \
  .
cmake --build . -j8
```

1. Clone https://github.com/dylon/lfortran-lsp
2. Go to: `lfortran-lsp/src/server.ts` file and replace the binary path of LFortran in
   line number 103 to your binary path.
3. Go to: `lfortran-lsp/package.json` file and replace the binary path of LFortran in
   line number 61 to your binary path.
4. Build the extension:

```bash
cd lfortran-lsp && npm install && npm run compile
```

Open VSCode in the extension folder (`code editor/vscode/lsp-sample/`) and run
`ctrl + shift + D`, click on “Run and Debug” and choose VSCode Extension
Development, and test the extension. :)

To package the extension, you can do:

```bash
npm install -g vsce
vsce package
```

This will generate a .vsix file in your `lfortran-lsp` folder, which can then be
imported as an extension. You can go to extensions in VSCode, click on `...` on
the top right, click on “Install from VSIX” and select the VSIX, and done (may
require a reload). The extension has now been installed.

## Testing

To test the extension, please run `npm run test`.
