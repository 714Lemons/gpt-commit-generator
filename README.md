# GPT Commit Generator

- Allows you to generate commit messages based on the changes tracked by Git
- Lets you setup your own prompt to customize the commit message
- Uses GPT-3.5-turbo-16k
- Supports submodules/ multiple repositories in one workspace

![Alt Text](/images/usage.gif)

![Alt Text](/images/prompt.gif)

## Features

- Generates commit messages based on tracked changes
- Writes it directly into the git extension commit field
- Make sure all files you want to commit are tracked by git

To run it, click the Generate Commit button in the source control panel or open the command palette and type in: ```Generate Commit```.

## Requirements

- OpenAI API Key
- Git: Make sure Git is installed and available in your system's PATH.

## Extension Settings

The "gpt-commit-generator" extension contributes the following settings:

- gpt-commit-generator.apiKey: The OpenAI API key.
- gpt-commit-generator.text: Prompt text that defines how the commit message should look like. Change it based on your liking or guidelines.

If the API key is not set, the extension will ask you to enter it.

<a href="https://www.flaticon.com/de/kostenlose-icons/begehen" title="begehen Icons">Begehen Icons erstellt von Freepik - Flaticon</a>