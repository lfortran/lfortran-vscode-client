/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
  createConnection,
  TextDocuments,
  Diagnostic,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  InitializeResult
} from 'vscode-languageserver/node';

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

import { ExampleSettings } from './lfortran-types';

import {
  LFortranAccessor,
  LFortranCLIAccessor
} from './lfortran-accessors';

const lfortran: LFortranAccessor = new LFortranCLIAccessor();

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;
  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
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
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  // if (hasWorkspaceFolderCapability) {
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   connection.workspace.onDidChangeWorkspaceFolders(_event => {
  //     // connection.console.log('Workspace folder change event received.');
  //   });
  // }
});

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = {
  maxNumberOfProblems: 100,
  compiler: {
    lfortranPath: "lfortran"
  }
};

let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDocumentSymbol(async (request) => {
  const uri = request.textDocument.uri;
  const document = documents.get(uri);
  const settings = await getDocumentSettings(uri);
  const text = document?.getText();
  if (typeof text === "string") {
    return await lfortran.showDocumentSymbols(uri, text, settings);
  }
});

connection.onDefinition(async (request) => {
  const uri = request.textDocument.uri;
  const document = documents.get(uri);
  const settings = await getDocumentSettings(uri);
  const text = document?.getText();
  if (typeof text === "string") {
    const line = request.position.line;
    const column = request.position.character;
    return await lfortran.lookupName(uri, text, line, column, settings);
  }
});

connection.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ExampleSettings>(
      (change.settings.LFortranLanguageServer || defaultSettings)
    );
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'LFortranLanguageServer'
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  if (!hasDiagnosticRelatedInformationCapability) {
    console.error('Trying to validate a document with no diagnostic capability');
    return;
  }
  const uri = textDocument.uri;
  // In this simple example we get the settings for every validate run.
  const settings = await getDocumentSettings(uri);
  // The validator creates diagnostics for all uppercase words length 2 and more
  const text = textDocument.getText();
  const diagnostics: Diagnostic[] = await lfortran.showErrors(uri, text, settings);
  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({uri: uri, diagnostics});
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
connection.onDidChangeWatchedFiles(_change => {
  // Monitored files have change in VSCode
  connection.console.log('We received an file change event');
});

// Make the text document manager listen on the connection for open, change and
// close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
