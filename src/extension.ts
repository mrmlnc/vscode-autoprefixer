import { ExtensionContext, commands, TextEditor, workspace, TextDocument, OutputChannel, window, Selection, Range, Position, ProgressLocation, TextEdit } from 'vscode';
import * as resolver from 'npm-module-path';
import * as postcss from 'postcss';
import * as micromatch from 'micromatch';

type Context = {
	autoprefixer?: AutoprefixerModule;
	channels: ContextChannels;
};

type ContextChannels = {
	output?: OutputChannel;
};

type AutoprefixerModule = typeof import('autoprefixer');

type PluginSettings = {
	options: Record<string, unknown>;
	findExternalAutoprefixer: boolean;
	formatOnSave: boolean;
	ignoreFiles: string[];
};

type TextBlock = {
	languageId: string;
	content: string;
	range: Range;
	warnings: string[];
	changed: boolean;
};

const context: Context = {
	autoprefixer: undefined,
	channels: {
		output: undefined
	}
};

export function activate(context: ExtensionContext): void {
	const onCommand = commands.registerTextEditorCommand('autoprefixer.execute', (textEditor) => {
		if (window.activeTextEditor === undefined) {
			return;
		}

		const document = textEditor.document;
		const selection = textEditor.selection;
		const filepath = document.uri.fsPath;

		const workspaceFolderUri = workspace.getWorkspaceFolder(document.uri)?.uri;
		const workspaceFolderFsPath = workspaceFolderUri === undefined ? filepath : workspaceFolderUri.fsPath;

		const settings = workspace.getConfiguration(undefined, workspaceFolderUri).get('autoprefixer') as PluginSettings;

		const block = getTextBlock(document, selection);

		if (settings.ignoreFiles.length !== 0) {
			if (micromatch([filepath], settings.ignoreFiles).length !== 0) {
				return;
			}
		}

		Promise.resolve()
			.then(async () => {
				await applyAutoprefixerToTextBlock(workspaceFolderFsPath, block, settings);

				if (block.warnings.length !== 0) {
					showOutput(`Warnings:\n${block.warnings.join('\n')}`);
				}

				if (!block.changed) {
					return;
				}

				await applyTextBlockToEditor(block, textEditor);
			})
			.catch((error: Error) => {
				showOutput(error.stack === undefined ? error.message : error.stack);
			});
	});

	const onWillSave = workspace.onWillSaveTextDocument((event) => {
		const document = event.document;
		const filepath = document.uri.fsPath;

		const workspaceFolderUri = workspace.getWorkspaceFolder(document.uri)?.uri;
		const workspaceFolderFsPath = workspaceFolderUri === undefined ? filepath : workspaceFolderUri.fsPath;

		const settings = workspace.getConfiguration(undefined, workspaceFolderUri).get('autoprefixer') as PluginSettings;

		if (!settings.formatOnSave) {
			return null;
		}

		const block = getTextBlock(document);

		if (settings.ignoreFiles.length !== 0) {
			if (micromatch([filepath], settings.ignoreFiles).length !== 0) {
				return null;
			}
		}

		const visibleTextEditors = window.visibleTextEditors;
		const currentEditor = visibleTextEditors.find((editor) => editor.document.fileName === document.fileName);

		const action = Promise.resolve()
			.then(async () => {
				await applyAutoprefixerToTextBlock(workspaceFolderFsPath, block, settings);

				if (block.warnings.length !== 0) {
					showOutput(`Warnings:\n${block.warnings.join('\n')}`);
				}

				if (!block.changed) {
					return;
				}

				if (currentEditor === undefined) {
					TextEdit.replace(block.range, block.content);
				} else {
					await applyTextBlockToEditor(block, currentEditor);
				}
			})
			.catch((error: Error) => {
				showOutput(error.stack === undefined ? error.message : error.stack);
			});

		return event.waitUntil(action);
	});

	context.subscriptions.push(onCommand);
	context.subscriptions.push(onWillSave);
}

async function applyTextBlockToEditor(block: TextBlock, editor: TextEditor): Promise<boolean> {
	return editor.edit((builder) => {
		builder.replace(block.range, block.content);
	});
}

function showOutput(message: string): void {
	if (context.channels.output === undefined) {
		context.channels.output = window.createOutputChannel('Autoprefixer');
	}

	context.channels.output.clear();
	context.channels.output.append(`[Autoprefixer]\n${message}`);
	context.channels.output.show();
}

function isSupportedLanguage(languageId: string): boolean {
	return ['css', 'postcss', 'less', 'scss'].includes(languageId);
}

async function getPostcssOptions(languageId: string): Promise<object> {
	switch (languageId) {
		case 'less':
			return {
				syntax: await import('postcss-less')
			};
		case 'scss':
			return {
				syntax: await import('postcss-scss')
			};
		case 'css':
			return {
				parser: await import('postcss-safe-parser')
			};
		default:
			return {};
	}
}

async function applyAutoprefixerToTextBlock(workspaceFolderFsPath: string, block: TextBlock, settings: PluginSettings): Promise<void> {
	if (!isSupportedLanguage(block.languageId)) {
		showOutput('Cannot execute Autoprefixer because there is not supported languages. Supported: LESS, SCSS, PostCSS and CSS.');

		return;
	}

	const autoprefixer = await resolveAutoprefixerModuleWithProgress(workspaceFolderFsPath, settings);

	const autoprefixerOptions = settings.options;
	const postcssOptions = await getPostcssOptions(block.languageId);

	const result = postcss([autoprefixer(autoprefixerOptions)])
		.process(block.content, postcssOptions);

	block.content = result.css;

	for (const warning of result.warnings()) {
		block.warnings.push(`[${warning.line}:${warning.column}] ${warning.text}`);
	}

	block.changed = true;
}

function getTextBlock(document: TextDocument, selection?: Selection): TextBlock {
	let range: Range;
	let content: string;

	if (selection === undefined || selection.isEmpty) {
		const lastLine = document.lineAt(document.lineCount - 1);
		const start = new Position(0, 0);
		const end = new Position(document.lineCount - 1, lastLine.text.length);

		range = new Range(start, end);
		content = document.getText();
	} else {
		range = new Range(selection.start, selection.end);
		content = document.getText(range);
	}

	return {
		range,
		content,
		languageId: document.languageId,
		warnings: [],
		changed: false
	};
}

async function resolveAutoprefixerModuleWithProgress(root: string, settings: PluginSettings): Promise<AutoprefixerModule> {
	const autoprefixer = await window.withProgress({
		title: '[vscode-autoprefixer] resolve module',
		location: ProgressLocation.Window
	}, () => resolveAutoprefixerModule(root, settings));

	return autoprefixer;
}

async function resolveAutoprefixerModule(root: string, settings: PluginSettings): Promise<AutoprefixerModule> {
	if (context.autoprefixer !== undefined) {
		return context.autoprefixer;
	}

	let autoprefixer: AutoprefixerModule;

	if (settings.findExternalAutoprefixer) {
		autoprefixer = await import('autoprefixer');
	}

	try {
		const modulePath = await resolver.resolveOne('autoprefixer', root);

		autoprefixer = await import(modulePath);
	} catch {
		throw new Error([
			'Failed to load autoprefixer library.',
			'Please install autoprefixer in your workspace folder using **npm install autoprefixer**',
			'or globally using **npm install -g autoprefixer** and then run command again.'
		].join(' '));
	}

	context.autoprefixer = autoprefixer;

	return autoprefixer;
}
