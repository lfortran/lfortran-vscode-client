import {
  DefinitionLink,
  Diagnostic,
  DiagnosticSeverity,
  Range,
  SymbolKind,
  TextEdit,
} from "vscode-languageserver/node";

import { LFortranCLIAccessor } from "../../src/lfortran-accessors";

import { Logger } from "../../src/logger";

import { settings } from "./lfortran-common";

import { assert } from "chai";

import "mocha";

import * as sinon from 'sinon';

describe("LFortranCLIAccessor", () => {
  let logger: Logger;
  let lfortran: LFortranCLIAccessor;

  const uri: string = __filename;

  beforeEach(() => {
    logger = new Logger(settings);
    lfortran = new LFortranCLIAccessor(logger);
  });

  afterEach(() => {
    lfortran.cleanUp();
  });

  describe("showDocumentSymbols", () => {
    it("returns an empty list when lfortran returns an empty list", async () => {
      const stdout = '[]';
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const response = await lfortran.showDocumentSymbols(uri, "", settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns nothing", async () => {
      const stdout = "";
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const response = await lfortran.showDocumentSymbols(uri, "", settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns an error", async () => {
      const stdout = "error";
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const response = await lfortran.showDocumentSymbols(uri, "", settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns the expected symbol information", async () => {
      const response: Record<string, any>[] = [
        {
          name: "foo",
          kind: SymbolKind.Function,
          filename: uri,
          location: {
            uri: "uri",
            range: {
              start: {
                line: 1,
                character: 1
              },
              end: {
                line: 1,
                character: 5
              }
            }
          }
        },
        {
          name: "bar",
          kind: SymbolKind.Function,
          filename: uri,
          location: {
            uri: "uri",
            range: {
              start: {
                line: 4,
                character: 15
              },
              end: {
                line: 4,
                character: 25
              }
            }
          }
        },
      ];
      const stdout = JSON.stringify(response);
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const expected: Record<string, any>[] = [
        {
          name: "foo",
          kind: SymbolKind.Function,
          filename: uri,
          location: {
            uri: uri,
            range: {
              start: {
                line: 0,
                character: 1
              },
              end: {
                line: 0,
                character: 5
              }
            }
          }
        },
        {
          name: "bar",
          kind: SymbolKind.Function,
          filename: uri,
          location: {
            uri: uri,
            range: {
              start: {
                line: 3,
                character: 15
              },
              end: {
                line: 3,
                character: 25
              }
            }
          }
        },
      ];
      for (const symbol of expected) {
        const range = symbol.location.range;
        range.start.character--;
        range.end.character--;
      }
      const actual = await lfortran.showDocumentSymbols(uri, "", settings);
      assert.deepEqual(actual, expected);
    });
  });

  describe("lookupName", () => {
    const line = 0;
    const column = 42;

    it("returns an empty list when lfortran returns an empty list", async () => {
      const stdout = "[]";
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const response = await lfortran.lookupName(uri, "", line, column, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns nothing", async () => {
      const stdout = "";
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const response = await lfortran.lookupName(uri, "", line, column, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns an error", async () => {
      const stdout = "error";
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const response = await lfortran.lookupName(uri, "", line, column, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns the expected definition link", async () => {
      const range: Range = {
        start: {
          line: 3,
          character: 12
        },
        end: {
          line: 3,
          character: 20
        }
      };

      const expected: DefinitionLink[] = [
        {
          targetUri: uri,
          targetRange: range,
          targetSelectionRange: range,
        },
      ];

      const stdout = JSON.stringify([
        {
          filename: uri,
          location: {
            range: {
              start: {
                line: 4,
                character: 12
              },
              end: {
                line: 4,
                character: 20
              }
            }
          }
        }
      ]);

      sinon.stub(lfortran, "runCompiler").resolves(stdout);

      range.start.character--;
      range.end.character--;

      const actual = await lfortran.lookupName(uri, "", line, column, settings);
      assert.deepEqual(actual, expected);
    });
  });

  describe("showErrors", () => {
    it("returns an empty list when lfortran returns an empty list", async () => {
      const stdout = "[]";
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const response = await lfortran.showErrors(uri, "", settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns nothing", async () => {
      const stdout = "";
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const response = await lfortran.showErrors(uri, "", settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns an error", async () => {
      const stdout = "error";
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const response = await lfortran.showErrors(uri, "", settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns the expected errors", async () => {
      const expected: Diagnostic[] = [
        {
          range: {
            start: {
              line: 0,
              character: 9
            },
            end: {
              line: 2,
              character: 20
            }
          },
          severity: DiagnosticSeverity.Warning,
          source: "lfortran-lsp",
          message: "foo should be bar"
        },
        {
          range: {
            start: {
              line: 5,
              character: 12
            },
            end: {
              line: 5,
              character: 17
            }
          },
          // NOTE: Right now, the severity is hard-coded to Warning ...
          severity: DiagnosticSeverity.Warning,
          source: "lfortran-lsp",
          message: "baz should be qux"
        },
      ];

      const stdout = JSON.stringify({
        diagnostics: [
          {
            range: {
              start: {
                line: 1,
                character: 10
              },
              end: {
                line: 3,
                character: 21
              }
            },
            severity: DiagnosticSeverity.Warning,
            source: "lfortran-lsp",
            message: "foo should be bar"
          },
          {
            range: {
              start: {
                line: 6,
                character: 13
              },
              end: {
                line: 6,
                character: 18
              }
            },
            severity: DiagnosticSeverity.Warning,
            source: "lfortran-lsp",
            message: "baz should be qux"
          },
        ]
      });

      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const actual = await lfortran.showErrors(uri, "", settings);
      assert.deepEqual(actual, expected);
    });
  });

  describe("renameSymbol", () => {
    it("decrements the exclusive ending character values to make them inclusive columns", async () => {
      const newName: string = "foo";

      const stdout: string = JSON.stringify([
        {
          kind: 1,
          location: {
            range: {
              start: {
                character: 5,
                line: 8
              },
              end: {
                character: 25,
                line: 12
              }
            },
            uri: "uri"
          },
          name: "eval_1d"
        },
        {
          kind: 1,
          location: {
            range: {
              start: {
                character: 7,
                line: 4
              },
              end: {
                character: 28,
                line: 4
              }
            },
            uri: "uri"
          },
          name: "eval_1d"
        }
      ]);

      sinon.stub(lfortran, "runCompiler").resolves(stdout);

      const expected: TextEdit[] = [
        {
          range: {
            start: {
              line: 7,
              character: 4,
            },
            end: {
              line: 11,
              character: 24,
            }
          },
          newText: newName,
        },
        {
          range: {
            start: {
              line: 3,
              character: 6,
            },
            end: {
              line: 3,
              character: 27,
            }
          },
          newText: newName,
        },
      ];

      const actual: TextEdit[] =
        await lfortran.renameSymbol(uri, "", 18, 22, newName, settings);
      assert.deepEqual(actual, expected);
    });
  });
});
