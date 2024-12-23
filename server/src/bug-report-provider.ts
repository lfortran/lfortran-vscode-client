import {
  Diagnostic,
  RenameParams,
  WorkspaceEdit,
} from 'vscode-languageserver/node';

import { LFortranSettings } from './lfortran-types';

export interface BugReportProvider {
  getTitle(): string;
  getBody(params: object): string;
}

export class RenameSymbolBugReportProvider implements BugReportProvider {
  public params: RenameParams;
  public inputText: string;
  public workspaceEdit: WorkspaceEdit;

  constructor(params: RenameParams, inputText: string, workspaceEdit: WorkspaceEdit) {
    this.params = params;
    this.inputText = inputText;
    this.workspaceEdit = workspaceEdit;
  }

  getTitle(): string {
    return "[Generated] LFortranLanguageServer.onRenameRequest rendered invalid text.";
  }

  getBody({ version, outputText, diagnostics }: {
    version: LFortranSettings,
    outputText: string,
    diagnostics: Diagnostic[]
  }): string {
    return `
The text rendered using the output from \`LFortranLanguageServer.onRenameRequest\` was invalid. Please see the following for more details:

### Input Text

\`\`\`fortran
${this.inputText}
\`\`\`

### Rename Parameters

\`\`\`json
${JSON.stringify(this.params, undefined, 2)}
\`\`\`

### Workspace Edit

\`\`\`json
${JSON.stringify(this.workspaceEdit, undefined, 2)}
\`\`\`

### Output Text

\`\`\`fortran
${outputText}
\`\`\`

### LFortran Diagnostics

\`\`\`json
${JSON.stringify(diagnostics, undefined, 2)}
\`\`\`

### LFortran Version

\`\`\`shell
${version}
\`\`\`
`.trim();
  }
}
