import { Diagnostic } from 'vscode-languageserver/node';

// The example settings
export interface LFortranSettings {
  maxNumberOfProblems: number;
  compiler: {
    lfortranPath: string;
  };
  log: {
    level: string;
    benchmark: boolean;
    filter: string;
  };
}

export interface ErrorDiagnostics {
  diagnostics: Diagnostic[];
}
