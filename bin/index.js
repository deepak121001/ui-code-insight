#!/usr/bin/env node
import inquirer from 'inquirer';
import { codeInsightInit } from "../build/code-insight.js";

async function main() {
  const { projectType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'projectType',
      message: 'What type of project is this?',
      choices: ['React', 'Node', 'Vanilla JS', 'Other'],
    },
  ]);

  const { reports } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'reports',
      message: 'Which report(s) do you want to generate?',
      choices: [
        { name: 'ESLint', value: 'eslint' },
        { name: 'Stylelint', value: 'stylelint' },
        { name: 'Package Report', value: 'package' },
        { name: 'All', value: 'all' },
      ],
      validate: (answer) => answer.length > 0 || 'Select at least one report.'
    },
  ]);

  await codeInsightInit({ projectType, reports });
}

main();
