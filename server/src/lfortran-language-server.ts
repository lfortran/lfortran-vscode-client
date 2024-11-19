/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  _Connection,
  DefinitionLink,
  DefinitionParams,
  Diagnostic,
  DidChangeConfigurationNotification,
  DidChangeConfigurationParams,
  // DidChangeTextDocumentParams,
  // DidChangeWatchedFilesParams,
  DocumentSymbolParams,
  Hover,
  HoverParams,
  InitializedParams,
  InitializeParams,
  InitializeResult,
  Location,
  Position,
  Range,
  SymbolInformation,
  TextDocumentChangeEvent,
  TextDocumentPositionParams,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { ExampleSettings } from './lfortran-types';

import { LFortranAccessor } from './lfortran-accessors';

import { PrefixTrie } from './prefix-trie';

// The global settings, used when the `workspace/configuration` request is not
// supported by the client. Please note that this is not the case when using
// this server with the client provided in this example but could happen with
// other clients.
const defaultSettings: ExampleSettings = {
  maxNumberOfProblems: 100,
  compiler: {
    lfortranPath: "lfortran"
  }
};

const RE_IDENTIFIABLE: RegExp = /^[a-zA-Z0-9_]$/;

export class LFortranLanguageServer {
  public lfortran: LFortranAccessor;
  public connection: _Connection;
  public documents: TextDocuments<TextDocument>;

  public hasConfigurationCapability: boolean = false;
  public hasWorkspaceFolderCapability: boolean = false;
  public hasDiagnosticRelatedInformationCapability: boolean = false;

  public settings: ExampleSettings = defaultSettings;

  // Cache the settings of all open documents
  public documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

  public dictionaries = new Map<string, PrefixTrie>();

  constructor(lfortran: LFortranAccessor,
              connection: _Connection,
              documents: TextDocuments<TextDocument>) {
    this.lfortran = lfortran;
    this.connection = connection;
    this.documents = documents;
  }

  onInitialize(params: InitializeParams): InitializeResult {
    const capabilities = params.capabilities;
    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    this.hasConfigurationCapability = !!(
      capabilities.workspace && !!capabilities.workspace.configuration
    );
    this.hasWorkspaceFolderCapability = !!(
      capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    this.hasDiagnosticRelatedInformationCapability = !!(
      capabilities.textDocument &&
      capabilities.textDocument.publishDiagnostics &&
      capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
      capabilities: {
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: ["0","1","2","3","4","5","6","7","8","9","_"],
        },
        definitionProvider: true,
        documentSymbolProvider: true,
        hoverProvider: true,
        textDocumentSync: TextDocumentSyncKind.Incremental,
      }
    };

    if (this.hasWorkspaceFolderCapability) {
      result.capabilities.workspace = {
        workspaceFolders: {
          supported: true
        }
      };
    }

    return result;
  }

  onInitialized(params: InitializedParams): void {
    if (this.hasConfigurationCapability) {
      // Register for all configuration changes.
      this.connection.client
        .register(DidChangeConfigurationNotification.type, undefined);
    }
    // if (hasWorkspaceFolderCapability) {
    //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
    //   connection.workspace.onDidChangeWorkspaceFolders(_event => {
    //     // connection.console.log('Workspace folder change event received.');
    //   });
    // }
  }

  extractDefinition(location: Location): string | undefined {
    let document = this.documents.get(location.uri);
    if (document !== undefined) {
      let range: Range = location.range;

      let start: Position = range.start;
      let startLine: number = start.line;
      let startCol: number = start.character;

      let end: Position = range.end;
      let endLine: number = end.line;
      let endCol: number = end.character;

      let text = document.getText();

      let currLine = 0;
      let currCol = 0;

      for (let i = 0, k = text.length; i < k; i++) {
        let c: string;
        if ((currLine === startLine) && (currCol === startCol)) {
          let j = i;
          for (; (currLine < endLine) || (currLine === endLine) && (currCol <= endCol); j++) {
            c = text[j];
            if (c === '\n') {
              currLine++;
              currCol = 0;
            } else if (c === '\r') {
              let l = j + 1;
              if ((l < k) && (text[l] === '\n')) {
                j = l;
              }
              currLine++;
              currCol = 0;
            } else {
              currCol++;
            }
          }
          let definition: string = text.substring(i, j);
          return definition;
        } else {
          c = text[i];
          if (c === '\n') {
            currLine++;
            currCol = 0;
          } else if (c === '\r') {
            let j = i + 1;
            if ((j < k) && (text[j] === '\n')) {
              i = j;
            }
            currLine++;
            currCol = 0;
          } else {
            currCol++;
          }
        }
      }
    }
  }

  index(uri: string, symbols: SymbolInformation[]): void {
    // (symbols.length == 0) => error with document, but we still need to
    // support auto-completion.
    let terms: string[] = [];
    let values: CompletionItem[] = [];
    for (let i = 0, k = symbols.length; i < k; i++) {
      let symbol: SymbolInformation = symbols[i];
      let definition: string | undefined =
        this.extractDefinition(symbol.location);
      terms.push(symbol.name);
      values.push({
        label: symbol.name,
        // FIXME: Once lfortran returns the correct symbol kinds, map them
        // to their corresponding completion kind, here.
        // ---------------------------------------------------------------
        // kind: symbol.kind,
        kind: CompletionItemKind.Text,
        detail: definition,
      });
    }
    // TODO: Index temporary file by URI (maybe)
    let dictionary = PrefixTrie.from(terms, values);
    this.dictionaries.set(uri, dictionary);
  }

  async onDocumentSymbol(request: DocumentSymbolParams): Promise<SymbolInformation[] | undefined> {
    const uri = request.textDocument.uri;
    const document = this.documents.get(uri);
    const settings = await this.getDocumentSettings(uri);
    const text = document?.getText();
    if (typeof text === "string") {
      let symbols: SymbolInformation[] =
        await this.lfortran.showDocumentSymbols(uri, text, settings);
      if (symbols.length > 0) {
        // (symbols.length == 0) => error with document, but we still need to
        // support auto-completion.
        this.index(uri, symbols);
      }
      return symbols;
    }
  }

  async onDefinition(request: DefinitionParams): Promise<DefinitionLink[] | undefined> {
    const uri = request.textDocument.uri;
    const document = this.documents.get(uri);
    const settings = await this.getDocumentSettings(uri);
    const text = document?.getText();
    if (typeof text === "string") {
      const line = request.position.line;
      const column = request.position.character;
      return await this.lfortran.lookupName(uri, text, line, column, settings);
    }
  }

  onDidChangeConfiguration(change: DidChangeConfigurationParams): void {
    if (this.hasConfigurationCapability) {
      // Reset all cached document settings
      this.documentSettings.clear();
    } else {
      this.settings = <ExampleSettings>(
        (change.settings.LFortranLanguageServer || defaultSettings)
      );
    }

    // Revalidate all open text documents
    this.documents.all().forEach(this.validateTextDocument);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getDocumentSettings(resource: string): Thenable<ExampleSettings> {
    if (!this.hasConfigurationCapability) {
      return Promise.resolve(this.settings);
    }
    let result = this.documentSettings.get(resource);
    if (!result) {
      result = this.connection.workspace.getConfiguration({
        scopeUri: resource,
        section: 'LFortranLanguageServer'
      });
      this.documentSettings.set(resource, result);
    }
    return result;
  }

  // Only keep settings for open documents
  onDidClose(event: TextDocumentChangeEvent<TextDocument>): void {
    this.documentSettings.delete(event.document.uri);
  }

  onDidChangeContent(event: TextDocumentChangeEvent<TextDocument>): void {
    this.validateTextDocument(event.document);
  }

  async validateTextDocument(textDocument: TextDocument): Promise<void> {
    if (!this.hasDiagnosticRelatedInformationCapability) {
      console.error('Trying to validate a document with no diagnostic capability');
      return;
    }
    const uri = textDocument.uri;
    const settings = await this.getDocumentSettings(uri);
    const text = textDocument.getText();
    const diagnostics: Diagnostic[] =
      await this.lfortran.showErrors(uri, text, settings);
    // Send the computed diagnostics to VSCode.
    this.connection.sendDiagnostics({ uri: uri, diagnostics });
  }

  // // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // onDidChangeWatchedFiles(change: DidChangeWatchedFilesParams): void {
  //   // Monitored files have change in VSCode
  //   this.connection.console.log('We received an file change event');
  // }

  extractQuery(text: string, line: number, column: number): string | null {
    let currLine = 0;
    let currCol = 0;

    for (let i = 0, k = text.length; i < k; i++) {
      let c: string = text[i];
      if (c === '\n') {
        currLine++;
        currCol = 0;
      } else if (c === '\r') {
        let j = i + 1;
        if ((j < k) && (text[j] === '\n')) {
          i = j;
        }
        currLine++;
        currCol = 0;
      } else {
        currCol++;
      }

      if ((line === currLine) && (column === currCol)) {
        let re_identifiable: RegExp = RE_IDENTIFIABLE;
        if (re_identifiable.test(c)) {
          let l = i;
          let u = i + 1;
          while ((l > 0) && re_identifiable.test(text[l - 1])) {
            l--;
          }
          while ((u < k) && re_identifiable.test(text[u])) {
            u++;
          }
          let query = text.substring(l, u);
          return query;
        }
      }
    }

    return null;
  }

  onCompletion(documentPosition: TextDocumentPositionParams): CompletionItem[] | CompletionList | undefined {
    let uri: string = documentPosition.textDocument.uri;
    let document = this.documents.get(uri);
    let dictionary = this.dictionaries.get(uri);
    if ((document !== undefined) && (dictionary !== undefined)) {
      let text: string = document.getText();
      let pos: Position = documentPosition.position;
      let query: string | null = this.extractQuery(text, pos.line, pos.character);
      if (query !== null) {
        return Array.from(dictionary.lookup(query)) as CompletionItem[];
      }
    }
  }

  onCompletionResolve(item: CompletionItem): CompletionItem {
    return item;
  }

  onHover(params: HoverParams): Hover | undefined {
    let uri: string = params.textDocument.uri;
    let document = this.documents.get(uri);
    let dictionary = this.dictionaries.get(uri);
    if ((document !== undefined) && (dictionary !== undefined)) {
      let text: string = document.getText();
      let pos: Position = params.position;
      let query: string | null = this.extractQuery(text, pos.line, pos.character);
      if (query !== null) {
        let completion: CompletionItem | undefined =
          dictionary.exactLookup(query) as CompletionItem;
        let definition: string | undefined = completion?.detail;
        if (definition !== undefined) {
          return {
            contents: {
              language: "fortran",
              value: definition,
            },
          };
        }
      }
    }
  }
}
