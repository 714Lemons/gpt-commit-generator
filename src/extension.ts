// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

import * as child_process from 'child_process';
import { Configuration, OpenAIApi } from "openai";
import * as fs from 'fs';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('gpt-commit-generator.generateCommit', () => {
		vscode.workspace.workspaceFolders?.forEach((folder) => {
            vscode.window.showInformationMessage('Do you want to run "git add --all"?', { modal: true }, 'Yes', 'No').then((result) => {
                if (result === 'Yes') {
                    child_process.exec('git add --all', { cwd: folder.uri.fsPath }, (error) => {
                        if (error) {
                            console.error(`exec error: ${error}`);
                            return;
                        }
                        generateDiff(folder.uri.fsPath);
                    });
                } else {
                    generateDiff(folder.uri.fsPath);
                }
            });
        });
    });

	context.subscriptions.push(disposable);
}

function generateDiff(folderPath: string) {
    child_process.exec('git diff --cached', { cwd: folderPath }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
		const changes = stdout;
        console.log(`Changes since last commit:\n${changes}`);
		interpretChanges(changes);
    });
}


async function interpretChanges(changes: string, attempt: number = 1) {
    try {
		const { organization, apiKey } = await getOpenAIConfiguration();

		const configuration = new Configuration({
			organization,
			apiKey
		});

		const openai = new OpenAIApi(configuration);

        const response = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content: 
						`The following changes are tracked by git.
						Create a commit message with the most important bullet points.
						start every bullet point with a dash
						\n${changes}`
                }
            ]
        });

        if (response.data.choices && response.data.choices.length > 0 && response.data.choices[0].message && response.data.choices[0].message.content) {
            const interpretation = response.data.choices[0].message.content;
            console.log(`Interpretation of changes:\n${interpretation}`);

            // Check if a workspace is open
            if (vscode.workspace.workspaceFolders) {
                const workspaceFolderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
                const filePath = path.join(workspaceFolderPath, 'commit.txt');
                fs.writeFile(filePath, interpretation, (error) => {
                    if (error) {
                        console.error(`Write file error: ${error}`);
                        return;
                    }
                    console.log(`Interpretation saved to ${filePath}`);
                });
            } else {
                console.error('No workspace open');
            }
        } else {
            console.error('Invalid response from OpenAI API');
        }
    } catch (error: any) {
        if (error.response && error.response.status === 429) {
            // Implement exponential backoff
            const delay = Math.pow(2, attempt) * 1000; // Delay in milliseconds
            console.log(`Rate limit hit, retrying in ${delay / 1000}s...`);
            setTimeout(() => interpretChanges(changes, attempt + 1), delay);
        } else {
            console.error(error);
        }
    }
}

async function getOpenAIConfiguration() {
	const config = vscode.workspace.getConfiguration('gpt-commit-generator', vscode.window.activeTextEditor?.document.uri);
	const organization = config.get<string>('organization');
	const apiKey = config.get<string>('apiKey');
  
	if (organization && apiKey) {
	  return { organization, apiKey };
	} else {
	  const newOrganization = await vscode.window.showInputBox({
		prompt: 'Enter your OpenAI organization ID',
		ignoreFocusOut: true, // Keep input box open even when focus is lost
	  });
	  const newApiKey = await vscode.window.showInputBox({
		prompt: 'Enter your OpenAI API key',
		ignoreFocusOut: true, // Keep input box open even when focus is lost
	  });
  
	  if (newOrganization && newApiKey) {
		await config.update('organization', newOrganization, vscode.ConfigurationTarget.Global);
		await config.update('apiKey', newApiKey, vscode.ConfigurationTarget.Global);
  
		return { organization: newOrganization, apiKey: newApiKey };
	  } else {
		throw new Error('Missing OpenAI organization or API key');
	  }
	}
  }


// This method is called when your extension is deactivated
export function deactivate() {}
