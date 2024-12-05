import {
  DefinitionLink,
  Diagnostic,
  DiagnosticSeverity,
  Range,
  SymbolInformation,
  SymbolKind,
  TextEdit,
} from "vscode-languageserver/node";

import { LFortranCLIAccessor } from "../../src/lfortran-accessors";

import { settings } from "./lfortran-common";

import { assert } from "chai";

import "mocha";

import * as sinon from 'sinon';

describe("LFortranCLIAccessor", () => {
  let lfortran: LFortranCLIAccessor;

  const uri: string = __filename;

  beforeEach(() => {
    lfortran = new LFortranCLIAccessor();
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
      const response: SymbolInformation[] = [
        {
          name: "foo",
          // NOTE: Right now, the kind is hard-coded to Function ...
          kind: SymbolKind.Function,
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
          // NOTE: Right now, the kind is hard-coded to Function ...
          kind: SymbolKind.Function,
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
      const stdout = JSON.stringify(response);
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      const expected = response;
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
          location: {
            range: {
              start: {
                line: 3,
                character: 12
              },
              end: {
                line: 3,
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
                line: 0,
                character: 10
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
                character: 13
              },
              end: {
                line: 5,
                character: 17
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
              line: 8,
              character: 4,
            },
            end: {
              line: 12,
              character: 24,
            }
          },
          newText: newName,
        },
        {
          range: {
            start: {
              line: 4,
              character: 6,
            },
            end: {
              line: 4,
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
