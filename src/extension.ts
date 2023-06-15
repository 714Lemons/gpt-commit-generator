import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { Configuration, OpenAIApi } from "openai";
import { IncomingMessage } from 'http';

const maxTokens = 14000;

let isRunning = false;

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('gpt-commit-generator.generateCommit', async () => {
		if (isRunning) {
			vscode.window.showInformationMessage('The commit generator is currently running. Please wait for it to finish.');
			return;
		}
		isRunning = true;
		try {
			const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
			if (!gitExtension) {
				throw new Error('Git extension is not available.');
			}
			const repositories = gitExtension.getAPI(1).repositories;
			for (let repository of repositories) {
				await generateDiff(repository);
			}
		} catch (err: any) {
			console.error(err);
			vscode.window.showErrorMessage(err.message);
		} finally {
			isRunning = false;
		}
	});

	context.subscriptions.push(disposable);
}

function generateDiff(repository: any) {
	return new Promise<void>((resolve, reject) => {
		const folderPath = repository.rootUri.fsPath;
		child_process.exec('git diff --cached', { cwd: folderPath }, (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				vscode.window.showErrorMessage(`Error generating diff: ${error}`);
				reject(error);
				return;
			}
			const changes = stdout;
			console.log(`Changes since last commit:\n${changes}`);
			if (changes.trim().length === 0) {
				vscode.window.showInformationMessage('No changes to commit.');
				resolve();
			} else {
				vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: 'Generating commit message...',
					cancellable: true  // Make the progress notification cancellable
				}, async (progress, token) => {
					token.onCancellationRequested(() => {
						console.log("User cancelled the long running operation");
						reject('Operation cancelled by the user.');
					});

					if (estimateTokens(changes) > maxTokens) {
						vscode.window.showErrorMessage(`Error generating commit message: Too many changes to commit. Please commit manually.`);
						reject('Error generating commit message: Too many changes to commit. Please commit manually.');
						return;
					}
					try {
						await interpretChanges(changes, 1, progress, repository, token);
						progress.report({ message: 'Commit message generated successfully.' });
						resolve();
					} catch (error) {
						console.error(error);
						reject(error);
					}
				});
			}
		});
	});
}


function estimateTokens(text: string) {
	return Math.ceil(text.length / 4);
}

async function interpretChanges(changes: string, attempt: number = 1, progress: vscode.Progress<{ message?: string }>, repository: any, token: vscode.CancellationToken) {
    try {
        // Check if the operation has been cancelled by the user
        if (token.isCancellationRequested) {
            console.log("Operation cancelled by the user.");
            return;
        }
		
		const { apiKey, text } = await getOpenAIConfiguration();
		const configuration = new Configuration({ apiKey });
		const openai = new OpenAIApi(configuration);

		console.log(text);

		const response = await openai.createChatCompletion({
			model: 'gpt-3.5-turbo-16k',
			messages: [
				{
					role: 'user',
					content: `${text}\n${changes}`
				}
			],
			stream: true
		}, {responseType: 'stream'});

		const stream = response.data as unknown as IncomingMessage;
		repository.inputBox.value = '';

		// short pause
		await new Promise(resolve => setTimeout(resolve, 100));
		await new Promise<void>((resolve, reject) => {
			let buffer = '';
			stream.on('data', (chunk: Buffer) => {
				if (token.isCancellationRequested) {
					stream.destroy(); // Stops the stream when cancellation is requested
					console.log("Operation cancelled by the user.");
					reject();
					return;
				}

				buffer += chunk.toString();

				// Split on "\n\n", but keep the remainder in the buffer
				const payloads = buffer.split("\n\n");
				buffer = payloads.pop() || '';


				for (const payload of payloads) {
					if (payload.includes('[DONE]')) {resolve(); return;}
					if (payload.startsWith("data:")) {
						const data = JSON.parse(payload.replace("data: ", ""));
						try {
							const chunk: undefined | string = data.choices[0].delta?.content;
							console.log(chunk);
							if (chunk) {
								//console.log(chunk);
								repository.inputBox.value += chunk;
							}
						} catch (error) {
							console.log(`Error with JSON.parse and ${payload}.\n${error}`);
						}
					}
				}
			});
			stream.on('end', () => {
				setTimeout(() => {
					console.log('\nStream done');
					vscode.window.showInformationMessage('Commit message generated successfully.');
					resolve();
				}, 10);
			});

			stream.on('error', (err: Error) => {
				console.log(err);
				vscode.window.showErrorMessage(`Error interpreting changes: ${err.message}`);
				reject(err);
			});
		});

	} catch (error: any) {
		if (error.response?.status) {
			console.error(error.response.status, error.message);
			error.response.data.on('data', (data: { toString: () => any; }) => {
				const message = data.toString();
				try {
					const parsed = JSON.parse(message);
					console.error('An error occurred during OpenAI request: ', parsed);
				} catch(error) {
					console.error('An error occurred during OpenAI request: ', message);
				}
			});
		} else {
			console.error('An error occurred during OpenAI request', error);
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
