# GPT Commit Generator

The "gpt-commit-generator" extension allows you to generate commit messages based on the changes tracked by Git.

## Features

- Generates commit messages based on tracked changes
- Writes it directly into the git extension commit field
- Make sure all files you want to commit are tracked by git
- To add all type ```git add --all``` into the terminal

To run it, open the command pallete and type in: ```Gernerate Commit```

## Requirements

- OpenAI API Key
- Git: Make sure Git is installed and available in your system's PATH.

## Extension Settings

The "gpt-commit-generator" extension contributes the following settings:

- gpt-commit-generator.organization: The OpenAI organization ID.
- gpt-commit-generator.apiKey: The OpenAI API key.
- gpt-commit-generator.text: Prompt text that defines how the commit message should look like. Change it based on your liking or guidelines.

If these settings are not configured, the extension prompts you to enter the organization ID and API key.

Icon: from "https://www.freepik.com/free-vector/hexagon-vector-logos-outline-linear-style-logo-hexagon-abstract-hexagon-geometric-logo-hexagon-illustration_11059555.htm#query=geometric%20logo&position=4&from_view=keyword&track=ais" on Freepik
