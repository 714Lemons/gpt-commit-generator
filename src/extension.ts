import * as vscode from 'vscode';

import * as child_process from 'child_process';
import { Configuration, OpenAIApi } from "openai";

const maxTokens = 4000;

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('gpt-commit-generator.generateCommit', () => {
		vscode.workspace.workspaceFolders?.forEach((folder) => {
			generateDiff(folder.uri.fsPath);
		});
	});

	context.subscriptions.push(disposable);
}

function generateDiff(folderPath: string) {
	child_process.exec('git diff --cached', { cwd: folderPath }, (error, stdout, stderr) => {
		if (error) {
			console.error(`exec error: ${error}`);
			vscode.window.showErrorMessage(`Error generating diff: ${error}`);
			return;
		}
		const changes = stdout;
		console.log(`Changes since last commit:\n${changes}`);
		if (changes.trim().length === 0) {
			vscode.window.showInformationMessage('No changes to commit.');
		} else {
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Generating commit message...',
				cancellable: false
			}, (progress) => {

				if (estimateTokens(changes) > maxTokens) {
					vscode.window.showErrorMessage(`Error generating commit message: Too many changes to commit. Please commit manually.`);
					return Promise.reject('Error generating commit message: Too many changes to commit. Please commit manually.');
				}

				return interpretChanges(changes, 1, progress);
			});
		}
	});
}

function estimateTokens(text: string) {
	return Math.ceil(text.length / 4);
}


async function interpretChanges(changes: string, attempt: number = 1, progress: vscode.Progress<{ message?: string }>) {
	try {
		const { apiKey, text } = await getOpenAIConfiguration();

		const configuration = new Configuration({
			apiKey
		});

		const openai = new OpenAIApi(configuration);

		console.log(text);

		const response = await openai.createChatCompletion({
			model: 'gpt-3.5-turbo',
			messages: [
				{
					role: 'user',
					content:
						`${text}
						\n${changes}`
				}
			]
		});

		if (response.data.choices && response.data.choices.length > 0 && response.data.choices[0].message && response.data.choices[0].message.content) {
			const interpretation = response.data.choices[0].message.content;
			console.log(`Interpretation of changes:\n${interpretation}`);

			if (vscode.workspace.workspaceFolders) {
				try {
					const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
					if (!gitExtension) {
						console.error('Git extension is not available.');
						vscode.window.showErrorMessage(`Git extension is not available.`);
						return;
					}

					const repository = gitExtension.getAPI(1).repositories[0];
					const currentBranch = repository.state.HEAD?.name;

					if (!currentBranch) {
						console.error('No branch is currently checked out.');
						return;
					}

					const commitMessage = `${interpretation}`;
					repository.inputBox.value = commitMessage;

					vscode.window.showInformationMessage('Commit message generated successfully.');

				} catch (error) {
					console.error('Failed to write commit message to Git extension:', error);
				}
			} else {
				console.error('No workspace open');
			}
		}

	} catch (error: any) {
		if (error.response && error.response.status === 429) {
			// Implement exponential backoff
			const delay = Math.pow(2, attempt) * 1000; // Delay in milliseconds
			console.log(`Rate limit hit, retrying in ${delay / 1000}s...`);
			setTimeout(() => interpretChanges(changes, attempt + 1, progress), delay);
		} else {
			console.error(error);
			vscode.window.showErrorMessage(`Error interpreting changes: ${error.message}`);
		}
	}
}

async function getOpenAIConfiguration() {
	const config = vscode.workspace.getConfiguration('gpt-commit-generator', vscode.window.activeTextEditor?.document.uri);
	const apiKey = config.get<string>('apiKey');
	const text = config.get<string>('text');

	await config.update('text', text, vscode.ConfigurationTarget.Global);

	if (apiKey && text) {
		return { apiKey, text };
	} else {
		const newApiKey = await vscode.window.showInputBox({
			prompt: 'Enter your OpenAI API key',
			ignoreFocusOut: true, // Keep input box open even when focus is lost
		});

		if (newApiKey) {
			await config.update('apiKey', newApiKey, vscode.ConfigurationTarget.Global);

			return { apiKey: newApiKey, text: text };
		} else {
			throw new Error('Missing OpenAI API key');
		}
	}
}

export function deactivate() { }
