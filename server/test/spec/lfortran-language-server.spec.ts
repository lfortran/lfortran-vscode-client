import {
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  _Connection,
  DefinitionLink,
  DefinitionParams,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationParams,
  DocumentSymbolParams,
  Hover,
  HoverParams,
  InitializeParams,
  Location,
  MarkedString,
  Position,
  Range,
  RemoteWorkspace,
  SymbolInformation,
  SymbolKind,
  TextDocumentChangeEvent,
  TextDocumentPositionParams,
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
      let response: SymbolInformation[] = [
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

      let stdout = JSON.stringify(response);
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      document.getText.returns("");

      let expected = response;
      for (let symbol of expected) {
        let range = symbol.location.range;
        range.start.character--;
        range.end.character--;
      }

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

      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      document.getText.returns("");

      range.start.character--;
      range.end.character--;

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
      sinon.stub(lfortran, "runCompiler").resolves(stdout);
      document.getText.returns("");

      await server.validateTextDocument(document);
      let sendDiagnostics = connection.sendDiagnostics;
      assert.isTrue(sendDiagnostics.calledOnceWith({uri: uri, diagnostics }));
    });
  });

  describe("extractDefinition", () => {
    it("extracts definitions from the respective range", () => {
      let text: string = [
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit,",
        "sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris",
        "nisi ut aliquip ex ea commodo consequat.",
        "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum",
        "dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat",
        "non proident, sunt in culpa qui officia deserunt mollit anim id est",
        "laborum."
      ].join("\n");

      document.getText.returns(text);

      let start: Position = {
        line: 0,
        character: 0,
      };

      let end: Position = {
        line: 0,
        character: 10,
      };

      let range: Range = { start, end };
      let location: Location = { uri, range };

      let definition: string = server.extractDefinition(location);
      assert.equal(definition, "Lorem ipsum");

      start.line = 2;
      start.character = 8;
      end.line = 5;
      end.character = 31;
      definition = server.extractDefinition(location);
      assert.equal(definition, [
        "ad minim veniam, quis nostrud exercitation ullamco laboris",
        "nisi ut aliquip ex ea commodo consequat.",
        "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum",
        "dolore eu fugiat nulla pariatur."
      ].join("\n"));
    });
  });

  describe("index", () => {
    it("indexes empty lists of symbols", () => {
      let symbols: SymbolInformation[] = [];
      server.index(uri, symbols);
      let dictionary = server.dictionaries.get(uri);
      assert.isDefined(dictionary);
      let indexed: CompletionItem[] =
        Array.from(dictionary) as CompletionItem[];
      assert.isEmpty(indexed);
    });

    it("indexes singleton lists of symbols", () => {
      let text: string = "def foo; def bar; def baz; def qux; def quo;";
      document.getText.returns(text);

      let symbols: SymbolInformation[] = [
        {
          name: "foo",
          kind: SymbolInformation.Function,
          location: {
            uri: uri,
            range: {
              start: {
                line: 0,
                character: 0,
              },
              end: {
                line: 0,
                character: 7,
              },
            },
          },
        },
      ];

      server.index(uri, symbols);
      let dictionary = server.dictionaries.get(uri);
      assert.isDefined(dictionary);
      let indexed: CompletionItem[] =
        Array.from(dictionary) as CompletionItem[];
      assert.deepEqual(indexed, [
        {
          label: "foo",
          kind: CompletionItemKind.Text,
          detail: "def foo;"
        },
      ]);
    });

    it("indexes lists of symbols", () => {
      let text: string = "def foo; def bar; def baz; def qux; def quo;";
      document.getText.returns(text);

      let symbols: SymbolInformation[] = [
        {
          name: "foo",
          kind: SymbolKind.Function,
          location: {
            uri: uri,
            range: {
              start: {
                line: 0,
                character: 0,
              },
              end: {
                line: 0,
                character: 7,
              },
            },
          },
        },
        {
          name: "bar",
          kind: SymbolKind.Function,
          location: {
            uri: uri,
            range: {
              start: {
                line: 0,
                character: 9,
              },
              end: {
                line: 0,
                character: 16,
              },
            },
          },
        },
        {
          name: "baz",
          kind: SymbolKind.Function,
          location: {
            uri: uri,
            range: {
              start: {
                line: 0,
                character: 18,
              },
              end: {
                line: 0,
                character: 25,
              },
            },
          },
        },
      ];

      server.index(uri, symbols);
      let dictionary = server.dictionaries.get(uri);
      assert.isDefined(dictionary);
      let indexed: CompletionItem[] =
        Array.from(dictionary) as CompletionItem[];
      assert.deepEqual(indexed, [
        {
          label: "foo",
          kind: CompletionItemKind.Text,
          detail: "def foo;"
        },
        {
          label: "bar",
          kind: CompletionItemKind.Text,
          detail: "def bar;"
        },
        {
          label: "baz",
          kind: CompletionItemKind.Text,
          detail: "def baz;"
        },
      ]);
    });
  });

  describe("extractQuery", () => {
    it("expands identifiable symbols at the given location", () => {
      let text: string = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

      let query: string = server.extractQuery(text, 0, 1);
      assert.equal(query, "Lorem");

      query = server.extractQuery(text, 0, 6);  // actual text, ".", is not identifiable.
      assert.isNull(query);

      query = server.extractQuery(text, 0, 25);
      assert.equal(query, "amet");
    });
  });

  describe("onCompletion", () => {
    it("completes queries based on indexed terms", () => {
      let text: string = "def foo; def bar; def baz; def qux; def quo; ba";
      document.getText.returns(text);

      let symbols: SymbolInformation[] = [
        {
          name: "foo",
          kind: SymbolKind.Function,
          location: {
            uri: uri,
            range: {
              start: {
                line: 0,
                character: 0,
              },
              end: {
                line: 0,
                character: 7,
              },
            },
          },
        },
        {
          name: "bar",
          kind: SymbolKind.Function,
          location: {
            uri: uri,
            range: {
              start: {
                line: 0,
                character: 9,
              },
              end: {
                line: 0,
                character: 16,
              },
            },
          },
        },
        {
          name: "baz",
          kind: SymbolKind.Function,
          location: {
            uri: uri,
            range: {
              start: {
                line: 0,
                character: 18,
              },
              end: {
                line: 0,
                character: 25,
              },
            },
          },
        },
      ];

      server.index(uri, symbols);

      let documentPosition: TextDocumentPositionParams = {
        textDocument: {
          uri: uri,
        },
        position: {
          line: 0,
          character: 47,
        },
      };

      let actual: CompletionItem[] | CompletionList =
        server.onCompletion(documentPosition);

      if (!Array.isArray(actual)) {
        actual = (actual as CompletionList).items;
      }

      let expected: CompletionItem[] = [
        {
          label: "bar",
          kind: CompletionItemKind.Text,
          detail: "def bar;"
        },
        {
          label: "baz",
          kind: CompletionItemKind.Text,
          detail: "def baz;"
        },
      ];

      assert.deepEqual(actual, expected);
    });
  });

  describe("onHover", () => {
    it("displays a symbol's definition", async () => {
      let text: string = "def foo; def bar; def baz; def qux; def quo; ba";
      document.getText.returns(text);

      let symbols: SymbolInformation[] = [
        {
          name: "foo",
          kind: SymbolKind.Function,
          location: {
            uri: uri,
            range: {
              start: {
                line: 0,
                character: 0,
              },
              end: {
                line: 0,
                character: 7,
              },
            },
          },
        },
        {
          name: "bar",
          kind: SymbolKind.Function,
          location: {
            uri: uri,
            range: {
              start: {
                line: 0,
                character: 9,
              },
              end: {
                line: 0,
                character: 16,
              },
            },
          },
        },
        {
          name: "baz",
          kind: SymbolKind.Function,
          location: {
            uri: uri,
            range: {
              start: {
                line: 0,
                character: 18,
              },
              end: {
                line: 0,
                character: 25,
              },
            },
          },
        },
      ];

      server.index(uri, symbols);

      let hoverParams: HoverParams = {
        textDocument: {
          uri: uri,
        },
        position: {
          line: 0,
          character: 5,
        }
      };

      let response: Hover = server.onHover(hoverParams);
      let contents: MarkedString = response.contents as MarkedString;
      assert.equal(contents.language, "fortran");
      assert.equal(contents.value, "def foo;");
    });
  });
});
