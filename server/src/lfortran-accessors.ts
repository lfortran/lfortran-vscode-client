import {
  DefinitionLink
} from 'vscode-languageserver-protocol';

import {
  Diagnostic,
  DiagnosticSeverity,
  Location,
  Position,
  Range,
  SymbolInformation,
  SymbolKind,
  TextEdit,
} from 'vscode-languageserver/node';

import {
  ExampleSettings,
  ErrorDiagnostics
} from './lfortran-types';

import which from 'which';

import fs from 'fs';

import tmp from 'tmp';

import { spawnSync } from 'node:child_process';

/**
 * Accessor interface for interacting with LFortran. Possible implementations
 * include a CLI accessor and service accessor.
 */
export interface LFortranAccessor {

  /**
   * Looks-up all the symbols in the given document.
   */
  showDocumentSymbols(uri: string,
                      text: string,
                      settings: ExampleSettings): Promise<SymbolInformation[]>;

  /**
   * Looks-up the location and range of the definition of the symbol within the
   * given document at the specified line and column.
   */
  lookupName(uri: string,
             text: string,
             line: number,
             column: number,
             settings: ExampleSettings): Promise<DefinitionLink[]>;

  /**
   * Identifies the errors and warnings about the statements within the given
   * document.
   */
  showErrors(uri: string,
             text: string,
             settings: ExampleSettings): Promise<Diagnostic[]>;

  renameSymbol(uri: string,
               text: string,
               line: number,
               column: number,
               newName: string,
               settings: ExampleSettings): Promise<TextEdit[]>;
}

/**
 * Interacts with LFortran through its command-line interface.
 */
export class LFortranCLIAccessor implements LFortranAccessor {

  // File handle representing the temporary file used to pass document text to
  // LFortran.
  public tmpFile = tmp.fileSync({
    prefix: "lfortran-lsp",
    postfix: ".tmp"
  });

  constructor() {
    // Be sure to delete the temporary file when possible.
    const cleanUp = this.cleanUp.bind(this);
    process.on("exit", cleanUp);
    process.on("SIGINT", cleanUp);
    process.on("uncaughtException", cleanUp);
  }

  cleanUp(/* exitCode: number */) {
    if (fs.existsSync(this.tmpFile.name)) {
      try {
        console.debug("Deleting temporary file: %s", this.tmpFile.name);
        this.tmpFile.removeCallback();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("Failed to delete temporary file: %s", this.tmpFile.name);
        console.error(error);
      }
    }
  }

  async checkPathExistsAndIsExecutable(path: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(path);
      return stats.isFile() && (stats.mode & 0o111) !== 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return false; // Path doesn't exist
      }
      throw err; // Other errors
    }
  }

  /**
   * Invokes LFortran through its command-line interface with the given
   * settings, flags, and document text.
   */
  async runCompiler(settings: ExampleSettings,
                    flags: string[],
                    text: string): Promise<string> {
    let stdout: string = "{}";

    try {
      fs.writeFileSync(this.tmpFile.name, text);

      let lfortranPath: string | null = settings.compiler.lfortranPath;
      if (lfortranPath === "lfortran" || !(await this.checkPathExistsAndIsExecutable(lfortranPath))) {
        lfortranPath = await which("lfortran", { nothrow: true });
        console.debug("lfortranPath = %s", lfortranPath);
      }

      if (lfortranPath === null) {
        console.error(
          "Failed to locate lfortran, please specify its path in the configuration.");
        return "";
      }

      try {
        try {
          fs.accessSync(lfortranPath, fs.constants.X_OK);
          console.debug("[%s] is executable", lfortranPath);
        } catch (err) {
          console.error("[%s] is NOT executable", lfortranPath);
          console.error(err);
        }
        flags = flags.concat([this.tmpFile.name]);
        const response = spawnSync(lfortranPath, flags, {
          encoding: "utf-8",
          stdio: "pipe"
        });

        if (response.error) {
          if (response.stderr) {
            stdout = response.stderr.toString();
          } else {
            console.error("Failed to get stderr from lfortran");
            stdout = "";
          }
        } else {
          if (response.stdout) {
            stdout = response.stdout.toString();
          } else {
            console.error("Failed to get stdout from lfortran");
            stdout = "";
          }
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (compileError: any) {
        stdout = compileError.stdout;
        if (compileError.signal !== null) {
          console.error("Compilation failed.");
        }
        throw compileError;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
    }
    return stdout;
  }

  async showDocumentSymbols(uri: string,
                            text: string,
                            settings: ExampleSettings): Promise<SymbolInformation[]> {
    const flags = ["--show-document-symbols"];
    const stdout = await this.runCompiler(settings, flags, text);
    let results;
    try {
      results = JSON.parse(stdout);
    } catch (error) {
      console.warn("Failed to parse response: %s", stdout);
      console.warn(error);
      return [];
    }
    if (Array.isArray(results)) {
      const symbols: SymbolInformation[] = results;
      for (let i = 0, k = symbols.length; i < k; i++) {
        const symbol: SymbolInformation = symbols[i];

        const location: Location = symbol.location;
        location.uri = uri;

        const range: Range = location.range;

        const start: Position = range.start;
        start.character--;

        const end: Position = range.end;
        end.character--;

        symbol.kind = SymbolKind.Function;
      }
      return symbols;
    }
    return [];
  }

  async lookupName(uri: string,
                   text: string,
                   line: number,
                   column: number,
                   settings: ExampleSettings): Promise<DefinitionLink[]> {
    try {
      const flags = [
        "--lookup-name",
        "--line=" + (line + 1),
        "--column=" + (column + 1)
      ];
      const stdout = await this.runCompiler(settings, flags, text);
      const obj = JSON.parse(stdout);
      for (let i = 0, k = obj.length; i < k; i++) {
        const location = obj[i].location;
        if (location) {
          const range: Range = location.range;

          const start: Position = range.start;
          start.character--;

          const end: Position = range.end;
          end.character--;

          return [{
            targetUri: uri,
            targetRange: range,
            targetSelectionRange: range
          }];
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Failed to lookup name at line=%d, column=%d", line, column);
      console.error(error);
    }
    return [];
  }

  async showErrors(uri: string,
                   text: string,
                   settings: ExampleSettings): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    let stdout: string | null = null;
    try {
      const flags = ["--show-errors"];
      stdout = await this.runCompiler(settings, flags, text);
      if (stdout.length > 0) {
        let results: ErrorDiagnostics;
        try {
          results = JSON.parse(stdout);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          // FIXME: Remove this repair logic once the respective bug has been
          // fixed (lfortran/lfortran issue #5525)
          // ----------------------------------------------------------------
          console.warn("Failed to parse response, attempting to repair and re-parse it.");
          const repaired: string = stdout.substring(0, 28) + "{" + stdout.substring(28);
          try {
            results = JSON.parse(repaired);
            console.log("Repair succeeded, see: https://github.com/lfortran/lfortran/issues/5525");
          } catch {
            console.error("Failed to repair response");
            throw error;
          }
        }
        if (results?.diagnostics) {
          const k = Math.min(results.diagnostics.length, settings.maxNumberOfProblems);
          for (let i = 0; i < k; i++) {
            const diagnostic: Diagnostic = results.diagnostics[i];
            diagnostic.severity = DiagnosticSeverity.Warning;
            diagnostic.source = "lfortran-lsp";
            diagnostics.push(diagnostic);
          }
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Failed to show errors");
      if (stdout !== null) {
        console.error("Failed to parse response: %s", stdout);
      }
      console.error(error);
    }
    return diagnostics;
  }

  async renameSymbol(uri: string,
                     text: string,
                     line: number,
                     column: number,
                     newName: string,
                     settings: ExampleSettings): Promise<TextEdit[]> {
    const edits: TextEdit[] = [];
    try {
      const flags = [
        "--rename-symbol",
        "--line=" + (line + 1),
        "--column=" + (column + 1)
      ];
      const stdout = await this.runCompiler(settings, flags, text);
      const obj = JSON.parse(stdout);
      for (let i = 0, k = obj.length; i < k; i++) {
        const location = obj[i].location;
        if (location) {
          const range: Range = location.range;

          const start: Position = range.start;
          start.character--;

          const end: Position = range.end;
          end.character--;

          const edit: TextEdit = {
            range: range,
            newText: newName,
          };

          edits.push(edit);
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Failed to rename symbol at line=%d, column=%d", line, column);
      console.error(error);
    }
    return edits;
  }
}
