'use strict';

import * as vscode from 'vscode';

import * as postcss from 'postcss';
import * as resolver from 'npm-module-path';

interface IConfiguration {
	findExternalAutoprefixer: boolean;
	browsers: string[];
	formatOnSave: boolean;
}

interface IResult {
	css: string;
	warnings: boolean;
	range: vscode.Range;
}

let output: vscode.OutputChannel;
let autoprefixerConfiguration: IConfiguration;
let autoprefixerModule: any = null;

/**
 * Update Autoprefixer module.
 *
 * @param {IConfiguration} config
 */
async function requireCore(config: IConfiguration): Promise<any> {
	if (!config.findExternalAutoprefixer) {
		autoprefixerModule = require('autoprefixer');
		return;
	}

	try {
		const modulePath = await resolver.resolveOne('autoprefixer', vscode.workspace.rootPath || '');
		autoprefixerModule = require(modulePath);
	} catch (err) {
		throw [
			'Failed to load autoprefixer library.',
			'Please install autoprefixer in your workspace folder using **npm install autoprefixer**',
			'or globally using **npm install -g autoprefixer** and then run command again.'
		].join(' ');
	}
}

/**
 * Get PostCSS options.
 *
 * @param {string} language
 * @returns {*}
 */
function getPostcssOptions(language: string): any {
	switch (language) {
		case 'less':
			return {
				parser: require('postcss-less'),
				stringifier: require('postcss-less/dist/less-stringify')
			};
		case 'scss':
			return {
				syntax: require('postcss-scss')
			};
		case 'css':
			return {
				parser: require('postcss-safe-parser')
			};
		default:
			return null;
	}
}

/**
 * Check syntax support.
 *
 * @param {any} ext
 * @returns {boolean}
 */
function isSupportedSyntax(document: vscode.TextDocument): boolean {
	return /(css|postcss|less|scss)/.test(document.languageId);
}

/**
 * transform warning message.
 *
 * @param {postcss.ResultMessage} warn
 * @returns {string}
 */
function transformWarningMessage(warn: postcss.ResultMessage): string {
	return warn.toString().replace(/autoprefixer:\s<.*?>:(.*)?:\s(.*)/, '[$1] $2');
}

/**
 * Show message in iutput channel.
 *
 * @param {string} msg
 */
function showOutput(msg: string): void {
	if (!output) {
		output = vscode.window.createOutputChannel('Autoprefixer');
	}

	output.clear();
	output.appendLine('[Autoprefixer]\n');
	output.append(msg);
	output.show();
}

/**
 * Use Autoprefixer module.
 *
 * @param {vscode.TextDocument} document
 * @param {vscode.Selection} selection
 * @returns {Promise<IResult>}
 */
async function useAutoprefixer(document: vscode.TextDocument, selection: vscode.Selection): Promise<IResult> {
	if (!isSupportedSyntax(document)) {
		console.error('Cannot execute Autoprefixer because there is not style files. Supported: LESS, SCSS, PostCSS and CSS.');
		return null;
	}

	await requireCore(autoprefixerConfiguration);

	const browsers = autoprefixerConfiguration.browsers;
	const options = getPostcssOptions(document.languageId);

	let range: vscode.Range;
	let text: string;
	if (!selection || (selection && selection.isEmpty)) {
		const lastLine = document.lineAt(document.lineCount - 1);
		const start = new vscode.Position(0, 0);
		const end = new vscode.Position(document.lineCount - 1, lastLine.text.length);

		range = new vscode.Range(start, end);
		text = document.getText();
	} else {
		range = new vscode.Range(selection.start, selection.end);
		text = document.getText(range);
	}

	return postcss([autoprefixerModule(browsers)])
		.process(text, options)
		.then((result) => {
			let warnings = '';
			result.warnings().forEach((warn) => {
				warnings += '\t' + transformWarningMessage(warn) + '\n';
			});

			if (warnings) {
				showOutput('Warnings\n' + warnings);
			}

			return <IResult>{
				css: result.css,
				warnings: Boolean(warnings),
				range
			};
		});
}

export function activate(context: vscode.ExtensionContext) {
	autoprefixerConfiguration = vscode.workspace.getConfiguration().get<IConfiguration>('autoprefixer');

	const command = vscode.commands.registerTextEditorCommand('autoprefixer.execute', (textEditor) => {
		useAutoprefixer(textEditor.document, textEditor.selection).then((result) => {
			// If we have warnings then don't update Editor
			if (result.warnings) {
				return;
			}

			textEditor.edit((editBuilder) => {
				editBuilder.replace(result.range, result.css);
			});
		}).catch((err) => {
			showOutput(err.toString());
		});
	});

	const onSave = vscode.workspace.onWillSaveTextDocument((event) => {
		// Skip the formatting code without Editor configuration or if file not supported
		if (!autoprefixerConfiguration || !autoprefixerConfiguration.formatOnSave || !isSupportedSyntax(event.document)) {
			return;
		}

		const edit = useAutoprefixer(event.document, null).then((result) => {
			// If we have warnings then don't update Editor
			if (result.warnings) {
				return null;
			}

			return vscode.TextEdit.replace(result.range, result.css);
		}).catch((err) => {
			showOutput(err.toString());
		});

		event.waitUntil(Promise.all([edit]));
	});

	const configurationWatcher = vscode.workspace.onDidChangeConfiguration(() => {
		autoprefixerConfiguration = vscode.workspace.getConfiguration().get<IConfiguration>('autoprefixer');
	});

	// Subscriptions
	context.subscriptions.push(command);
	context.subscriptions.push(onSave);
	context.subscriptions.push(configurationWatcher);
}
