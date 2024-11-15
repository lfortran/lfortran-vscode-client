import {
  DefinitionLink,
  Diagnostic,
  DiagnosticSeverity,
  Range,
  SymbolInformation,
  SymbolKind,
} from "vscode-languageserver/node";

import { LFortranCLIAccessor } from "../../src/lfortran-accessors";

import { settings } from "./lfortran-common";

import { assert } from "chai";

import "mocha";

describe("LFortranCLIAccessor", () => {
  let lfortran: LFortranCLIAccessor;

  let uri: string = __filename;

  beforeEach(() => {
    lfortran = new LFortranCLIAccessor();
  });

  afterEach(() => {
    lfortran.cleanUp();
  });

  describe("showDocumentSymbols", () => {
    it("returns an empty list when lfortran returns an empty list", async () => {
      let stdout = "[]";
      let response = await lfortran.showDocumentSymbols(uri, stdout, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns nothing", async () => {
      let stdout = "";
      let response = await lfortran.showDocumentSymbols(uri, stdout, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns an error", async () => {
      let stdout = "error";
      let response = await lfortran.showDocumentSymbols(uri, stdout, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns the expected symbol information", async () => {
      let expected: SymbolInformation[] = [
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
      let stdout = JSON.stringify(expected);
      let actual = await lfortran.showDocumentSymbols(uri, stdout, settings);
      assert.deepEqual(actual, expected);
    });
  });

  describe("lookupName", () => {
    let line = 0;
    let column = 42;

    it("returns an empty list when lfortran returns an empty list", async () => {
      let stdout = "[]";
      let response = await lfortran.lookupName(uri, stdout, line, column, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns nothing", async () => {
      let stdout = "";
      let response = await lfortran.lookupName(uri, stdout, line, column, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns an error", async () => {
      let stdout = "error";
      let response = await lfortran.lookupName(uri, stdout, line, column, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns the expected definition link", async () => {
      let range: Range = {
        start: {
          line: 3,
          character: 12
        },
        end: {
          line: 3,
          character: 20
        }
      };

      let expected: DefinitionLink[] = [
        {
          targetUri: uri,
          targetRange: range,
          targetSelectionRange: range,
        },
      ];

      let stdout = JSON.stringify([
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

      let actual = await lfortran.lookupName(uri, stdout, line, column, settings);
      assert.deepEqual(actual, expected);
    });
  });

  describe("showErrors", () => {
    it("returns an empty list when lfortran returns an empty list", async () => {
      let stdout = "[]";
      let response = await lfortran.showErrors(uri, stdout, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns nothing", async () => {
      let stdout = "";
      let response = await lfortran.showErrors(uri, stdout, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns an empty list when lfortran returns an error", async () => {
      let stdout = "error";
      let response = await lfortran.showErrors(uri, stdout, settings);
      assert.isArray(response);
      assert.isEmpty(response);
    });

    it("returns the expected errors", async () => {
      let expected: Diagnostic[] = [
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
          // NOTE: Right now, the severity is hard-coded to Warning ...
          severity: DiagnosticSeverity.Warning,
          source: "lfortran-lsp",
          message: "baz should be qux"
        },
      ];

      let stdout = JSON.stringify({
        diagnostics: expected
      });

      let actual = await lfortran.showErrors(uri, stdout, settings);
      assert.deepEqual(actual, expected);
    });
  });
});
