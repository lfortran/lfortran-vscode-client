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

export namespace ASRSymbolType {
  export const Program: number = 0;
  export const Module: number = 1;
  export const Function: number = 2;
  export const GenericProcedure: number = 3;
  export const CustomOperator: number = 4;
  export const ExternalSymbol: number = 5;
  export const Struct: number = 6;
  export const Enum: number = 7;
  export const UnionType: number = 8;
  export const Variable: number = 9;
  export const Class: number = 10;
  export const ClassProcedure: number = 11;
  export const AssociateBlock: number = 12;
  export const Block: number = 13;
  export const Requirement: number = 14;
  export const Template: number = 15;
}

export type ASRSymbolType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export namespace LFortranDiagnosticLevel {
  export const Error: number = 0;
  export const Warning: number = 1;
  export const Note: number = 2;
  export const Help: number = 3;
  export const Style: number = 4;
}

export type LFortranDiagnosticLevel = 0 | 1 | 2 | 3 | 4;
