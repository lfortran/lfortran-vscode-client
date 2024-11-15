import { Diagnostic } from 'vscode-languageserver/node';

// The example settings
export interface ExampleSettings {
  maxNumberOfProblems: number;
  compiler: {
    lfortranPath: string;
  };
}

export interface ErrorDiagnostics {
  diagnostics: Diagnostic[];
}
