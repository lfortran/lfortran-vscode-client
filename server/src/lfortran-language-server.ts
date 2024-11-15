/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
  _Connection,
  DefinitionLink,
  DefinitionParams,
  Diagnostic,
  DidChangeConfigurationNotification,
  DidChangeConfigurationParams,
  // DidChangeWatchedFilesParams,
  DocumentSymbolParams,
  InitializedParams,
  InitializeParams,
  InitializeResult,
  SymbolInformation,
  TextDocumentChangeEvent,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { ExampleSettings } from './lfortran-types';

import { LFortranAccessor } from './lfortran-accessors';

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
        textDocumentSync: TextDocumentSyncKind.Incremental,
        documentSymbolProvider: true,
        definitionProvider: true,
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

  async onDocumentSymbol(request: DocumentSymbolParams): Promise<SymbolInformation[] | undefined> {
    const uri = request.textDocument.uri;
    const document = this.documents.get(uri);
    const settings = await this.getDocumentSettings(uri);
    const text = document?.getText();
    if (typeof text === "string") {
      return await this.lfortran.showDocumentSymbols(uri, text, settings);
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
}
