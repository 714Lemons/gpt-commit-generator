# GPT Commit Generator

The "gpt-commit-generator" extension allows you to generate commit messages based on the changes tracked by Git. This README provides an overview of the extension's features, requirements, and configuration.

## Features

The extension provides the following features:

- Generates commit messages based on tracked changes
- Prompts the user to run "git add --all" before generating the commit message
- Saves the generated commit message to a file in the workspace

## Requirements

To use the "gpt-commit-generator" extension, you need to have the following dependencies installed:

- Git: Make sure Git is installed and available in your system's PATH.

## Extension Settings

The "gpt-commit-generator" extension contributes the following settings:

- gpt-commit-generator.organization: The OpenAI organization ID.
- gpt-commit-generator.apiKey: The OpenAI API key.
If these settings are not configured, the extension prompts you to enter the organization ID and API key.
