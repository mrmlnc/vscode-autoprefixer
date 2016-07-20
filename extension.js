'use strict';

const vscode = require('vscode');
const postcss = require('postcss');
const postcssSafeParser = require('postcss-safe-parser');

const resolve = require('npm-module-path');

let autoprefixer = null;

function getSyntax(language) {
  switch (language) {
    case 'less': {
      return require('postcss-less');
    }
    case 'scss': {
      return require('postcss-scss');
    }
    default: {
      return null;
    }
  }
}

function init(document, onDidSaveStatus) {
  const workspace = vscode.workspace.rootPath ? vscode.workspace.rootPath : '';
  resolve('autoprefixer', workspace, autoprefixer)
    .then((filepath) => {
      autoprefixer = filepath;

      const content = document.getText();
      const lang = document.languageId || document._languageId;
      const syntax = getSyntax(lang);
      const parser = (lang === 'css') ? postcssSafeParser : syntax;

      postcss([require(autoprefixer)])
        .process(content, { parser })
        .then((result) => {
          result.warnings().forEach((x) => {
            console.warn(x.toString());
          });

          const editor = vscode.editor || vscode.window.activeTextEditor;
          if (!editor) {
            throw new Error('Ooops...');
          }

          const document = editor.document;
          const lastLine = document.lineAt(document.lineCount - 1);
          const start = new vscode.Position(0, 0);
          const end = new vscode.Position(document.lineCount - 1, lastLine.text.length);
          const range = new vscode.Range(start, end);

          if (document.autoprefixer) {
            delete document.autoprefixer;
            return;
          }

          if (onDidSaveStatus) {
            const we = new vscode.WorkspaceEdit();
            we.replace(document.uri, range, result.css);
            document.autoprefixer = true;
            vscode.workspace.applyEdit(we).then(() => {
              document.save();
            });
          } else {
            editor.edit((builder) => {
              builder.replace(range, result.css);
            });
          }
        })
        .catch(console.error);
    })
    .catch((err) => {
      if (err.code === 'ENOENT') {
        return vscode.window.showErrorMessage('Failed to load autoprefixer library. Please install autoprefixer in your workspace folder using **npm install autoprefixer** or globally using **npm install -g autoprefixer** and then run command again.');
      }

      console.error(err);
    });
}

function activate(context) {
  const disposable = vscode.commands.registerTextEditorCommand('autoprefixer.execute', (textEditor) => {
    init(textEditor.document, false);
  });

  context.subscriptions.push(disposable);

  const onSave = vscode.workspace.onDidSaveTextDocument((document) => {
    const onDidSave = vscode.workspace.getConfiguration('autoprefixer').prefixOnSave;
    if (onDidSave) {
      init(document, true);
    }
  });

  context.subscriptions.push(onSave);
}

exports.activate = activate;
