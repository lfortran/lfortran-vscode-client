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
    let cleanUp = this.cleanUp.bind(this);
    process.on("exit", cleanUp);
    process.on("SIGINT", cleanUp);
    process.on("uncaughtException", cleanUp);
  }

  cleanUp(/* exitCode: number */) {
    if (fs.existsSync(this.tmpFile.name)) {
      try {
        console.debug("Deleting temporary file: %s", this.tmpFile.name);
        this.tmpFile.removeCallback();
      } catch (error: any) {
        console.error("Failed to delete temporary file: %s", this.tmpFile.name);
        console.error(error);
      }
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

      let lfortranPath = settings.compiler.lfortranPath;
      if (lfortranPath === "lfortran") {
        lfortranPath = await which("lfortran", { nothrow: true });
        console.debug("lfortranPath = %s", lfortranPath);
      }
      if (lfortranPath === null) {
        console.error("Failed to locate lfortran, please specify its path in the configuration.");
        return "{}";
      }

      try {
        const response = spawnSync(lfortranPath, flags.concat([this.tmpFile.name]));

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
      } catch (compileError: any) {
        stdout = compileError.stdout;
        if (compileError.signal !== null) {
          console.error("Compilation failed.");
        }
        throw compileError;
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      return stdout;
    }
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
        let symbol: SymbolInformation = symbols[i];

        let location: Location = symbol.location;
        location.uri = uri;

        let range: Range = location.range;

        let start: Position = range.start;
        start.character--;

        let end: Position = range.end;
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
        let location = obj[i].location;
        if (location) {
          let range: Range = location.range;

          let start: Position = range.start;
          start.character--;

          let end: Position = range.end;
          end.character--;

          return [{
            targetUri: uri,
            targetRange: range,
            targetSelectionRange: range
          }];
        }
      }
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
    try {
      const flags = ["--show-errors"];
      const stdout = await this.runCompiler(settings, flags, text);
      const results: ErrorDiagnostics = JSON.parse(stdout);
      if (results?.diagnostics) {
        let k = Math.min(results.diagnostics.length, settings.maxNumberOfProblems);
        for (let i = 0; i < k; i++) {
          const diagnostic: Diagnostic = results.diagnostics[i];
          diagnostic.severity = DiagnosticSeverity.Warning;
          diagnostic.source = "lfortran-lsp";
          diagnostics.push(diagnostic);
        }
      }
    } catch (error: any) {
      console.error("Failed to show errors");
      console.error(error);
    } finally {
      return diagnostics;
    }
  }
}
