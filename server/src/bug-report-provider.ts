import {
  Diagnostic,
  Location,
  Position,
  Range,
  RenameParams,
  WorkspaceEdit,
} from 'vscode-languageserver/node';

export interface BugReportProvider {
  getTitle(): string;
  getBody(params: object): string;
}

interface LineColStats {
  numLines: number;
  minNumCols: number;
  meanNumCols: number;
  stdDevNumCols: number;
  medianNumCols: number;
  maxNumCols: number;
  lineCols: number[];
}

function getLineColStats(text: string): LineColStats {
  const lineCols: number[] = [];
  let minNumCols: number = Number.MAX_SAFE_INTEGER;
  let maxNumCols: number = 0;
  let meanNumCols: number = 0.0;
  let stdDevNumCols: number = 0.0;
  let medianNumCols: number = 0.0;

  let line = 0;
  let col = 0;
  for (let i = 0, k = text.length; i < k; i++) {
    const c: string = text[i];
    switch (c) {
      case '\r': {
        if (((i + 1) < k) && (text[i + 1] === '\n')) {
          i++;
        }
        // fallthrough
      }
      case '\n': {
        lineCols.push(col + 1);

        line++;
        col = 0;
        break;
      }
      default: {
        col++;
      }
    }
  }

  lineCols.push(col + 1);

  const numLines: number = line + 1;
  const sortedLineCols = [...lineCols];
  sortedLineCols.sort((a, b) => a - b);

  if ((sortedLineCols.length % 2) == 0) {
    const i: number = sortedLineCols.length / 2;
    const leftNumCols: number = sortedLineCols[i];
    const rightNumCols: number = sortedLineCols[i - 1];
    medianNumCols = (leftNumCols + rightNumCols) / 2.0;
  } else {
    const i: number = (sortedLineCols.length - 1) / 2;
    medianNumCols = sortedLineCols[i];
  }

  let sumNumCols: number = 0;
  for (let i = 0, k = sortedLineCols.length; i < k; i++) {
    const numCols: number = sortedLineCols[i];
    sumNumCols += numCols;
    if (numCols < minNumCols) {
      minNumCols = numCols;
    }
    if (numCols > maxNumCols) {
      maxNumCols = numCols;
    }
  }

  meanNumCols = sumNumCols / numLines;

  let varNumCols = 0.0;
  for (let i = 0, k = sortedLineCols.length; i < k; i++) {
    const numCols: number = sortedLineCols[i];
    const errNumCols: number = numCols - meanNumCols;
    varNumCols += (errNumCols * errNumCols);
  }
  varNumCols /= numLines;
  stdDevNumCols = Math.sqrt(varNumCols);

  return {
    numLines: numLines,
    minNumCols: minNumCols,
    meanNumCols: meanNumCols,
    stdDevNumCols: stdDevNumCols,
    medianNumCols: medianNumCols,
    maxNumCols: maxNumCols,
    lineCols: lineCols,
  };
}

export class ExtractDefinitionBugReportProvider implements BugReportProvider {
  public location: Location;
  public text: string;

  constructor(location: Location, text: string) {
    this.location = location;
    this.text = text;
  }

  getTitle(): string {
    return "[Generated] LFortranLanguageServer.extractDefinition received invalid location data."
  }

  getBody({ version }: {
    version: string,
  }): string {
    const range: Range = this.location.range;

    const start: Position = range.start;
    const startLine: number = start.line;
    const startCol: number = start.character;

    const end: Position = range.end;
    const endLine: number = end.line;
    const endCol: number = end.character;

    const stats: LineColStats = getLineColStats(this.text);

    let message: string;

    if (startLine >= stats.numLines) {
      message = `The starting line [${startLine}] in the location data was outside the bounds of the number of available lines [${stats.numLines}].`;
    } else if (endLine >= stats.numLines) {
      message = `The ending line [${endLine}] in the location data was outside the bounds of the number of available lines [${stats.numLines}].`;
    } else if (startCol >= stats.lineCols[startLine]) {
      message = `The starting column [${startCol}] was greater than the maximum column [${stats.lineCols[startLine]}] on line [${startLine}].`;
    } else if (endCol >= stats.lineCols[endLine]) {
      message = `The ending column [${endCol}] was greater than the maximum column [${stats.lineCols[endLine]}] on line [${endLine}].`;
    } else {
      message = "An unexpected error occurred, please investigate."
    }

    return `
${message}

### Text

\`\`\`fortran
${this.text}
\`\`\`

### Location Data

\`\`\`json
${JSON.stringify(this.location, undefined, 2)}
\`\`\`

### Line and Column Statistics

\`\`\`json
${JSON.stringify(stats, undefined, 2)}
\`\`\`

### LFortran Version

\`\`\`shell
${version}
\`\`\`

### Additional Information

If you can provide additional information about what you were doing or how to reproduce this error, please include it here.
`.trim();
  }
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
    version: string,
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

### Additional Information

If you can provide additional information about what you were doing or how to reproduce this error, please include it here.
`.trim();
  }
}
