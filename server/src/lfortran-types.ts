import { Diagnostic } from 'vscode-languageserver/node';

// The example settings
export interface LFortranSettings {
  maxNumberOfProblems: number;
  compiler: {
    lfortranPath: string;
    exclusiveFilter: boolean;
  };
  log: {
    level: string;
    benchmark: boolean;
  };
}

export interface ErrorDiagnostics {
  diagnostics: Diagnostic[];
}
