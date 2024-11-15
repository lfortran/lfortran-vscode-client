import {
  _Connection,
  DefinitionLink,
  DefinitionParams,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationParams,
  DocumentSymbolParams,
  InitializeParams,
  Range,
  RemoteWorkspace,
  SymbolInformation,
  SymbolKind,
  TextDocumentChangeEvent,
  TextDocuments,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import { ExampleSettings } from '../../src/lfortran-types';

import { LFortranCLIAccessor } from "../../src/lfortran-accessors";

import { LFortranLanguageServer } from "../../src/lfortran-language-server";

import { settings } from "./lfortran-common";

import * as sinon from "sinon";
import { stubInterface } from "ts-sinon";

import { assert } from "chai";

import "mocha";

describe("LFortranLanguageServer", () => {
  let lfortran: LFortranCLIAccessor;
  let connection: _Connection;
  let documents: TextDocuments<TextDocument>;
  let server: LFortranLanguageServer;
  let document: TextDocument;

  let uri: string = __filename;

  beforeEach(() => {
    lfortran = new LFortranCLIAccessor();

    connection = stubInterface<_Connection>();
    connection.workspace = stubInterface<RemoteWorkspace & PWorkspace>();
    connection.workspace.getConfiguration.returns(settings);

    document = stubInterface<TextDocument>();
    document.uri = uri;

    documents = stubInterface<TextDocuments<TextDocument>>();
    documents.get.returns(document);
    documents.all.returns([document]);

    server = new LFortranLanguageServer(lfortran, connection, documents);
    server.settings = settings;
    server.hasDiagnosticRelatedInformationCapability = true;
  });

  afterEach(() => {
    lfortran.cleanUp();
  });

  describe("onInitialize", () => {
    let params: InitializeParams = {
      processId: null,
      rootUri: uri,
      workspaceFolders: null,
      capabilities: {}
    };

    it("provides document symbols", () => {
      let result = server.onInitialize(params);
      assert.isTrue(result.capabilities.documentSymbolProvider);
    });

    it("provides definitions", () => {
      let result = server.onInitialize(params);
      assert.isTrue(result.capabilities.definitionProvider);
    });
  });

  // describe("onInitialized", () => {
  //   // nothing important to test, here ...
  // });

  describe("onDocumentSymbol", () => {
    let request: DocumentSymbolParams = {
      textDocument: {
        uri: uri
      }
    };

    it("Returns all the symbols", async () => {
      let expected: SymbolInformation[] = [
        {
          name: "baz",
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
          name: "qux",
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
      document.getText.returns(stdout);

      let actual = await server.onDocumentSymbol(request);
      assert.deepEqual(actual, expected);
    });

    it("Returns nothing when the document has not been defined", async () => {
      let actual = await server.onDocumentSymbol(request);
      assert.isUndefined(actual);
    });
  });

  describe("onDefinition", () => {
    let request: DefinitionParams = {
      textDocument: {
        uri: uri
      },
      position: {
        line: 0,
        character: 42
      }
    };

    it("returns location where symbol is defined", async () => {
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

      document.getText.returns(stdout);

      let actual = await server.onDefinition(request);
      assert.deepEqual(actual, expected);
    });

    it("returns nothing when the document has not been defined", async () => {
      let actual = await server.onDefinition(request);
      assert.isUndefined(actual);
    });
  });

  describe("onDidChangeConfiguration", () => {
    let updatedSettings: ExampleSettings = {
      maxNumberOfProblems: 1234,
      compiler: settings.compiler
    };
    let configChange: DidChangeConfigurationParams = {
      settings: {
        LFortranLanguageServer: updatedSettings
      }
    };

    it("updates the server settings", () => {
      server.onDidChangeConfiguration(configChange);
      assert.equal(server.settings.maxNumberOfProblems,
        updatedSettings.maxNumberOfProblems);
      assert.deepEqual(server.settings.compiler,
        updatedSettings.compiler);
    });

    it("re-validates the documents", () => {
      let validateTextDocument = sinon.spy(server, "validateTextDocument");
      server.onDidChangeConfiguration(configChange);
      assert.isTrue(validateTextDocument.calledOnceWith(document));
    });
  });

  describe("onDidClose", () => {
    it("removes the document from the cache", () => {
      let event: TextDocumentChangeEvent<TextDocument> = {
        document: document
      };
      server.onDidClose(event);
      assert.doesNotHaveAnyKeys(server.documentSettings, [document.uri]);
    });
  });

  describe("onDidChangeContent", () => {
    it("validates document from event", () => {
      let event: TextDocumentChangeEvent<TextDocument> = {
        document: document
      };
      let validateTextDocument = sinon.spy(server, "validateTextDocument");
      server.onDidChangeContent(event);
      assert.isTrue(validateTextDocument.calledOnceWith(document));
    });
  });

  describe("validateTextDocument", () => {
    it("returns the expected errors", async () => {
      let diagnostics: Diagnostic[] = [
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
        diagnostics: diagnostics
      });
      document.getText.returns(stdout);

      await server.validateTextDocument(document);
      let sendDiagnostics = connection.sendDiagnostics;
      assert.isTrue(sendDiagnostics.calledOnceWith({uri: uri, diagnostics }));
    });
  });
});
