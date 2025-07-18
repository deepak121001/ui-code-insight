#!/usr/bin/env node
import inquirer from 'inquirer';
import { codeInsightInit } from "../build/code-insight.js";

function getFriendlyConfigName(configKey) {
  if (configKey === 'airbnb') return 'Airbnb';
  if (configKey === 'airbnb-base') return 'Airbnb Base';
  if (configKey === 'eslint:recommended') return 'ESLint Recommended';
  if (configKey === 'plugin:react/recommended') return 'React Recommended';
  if (configKey === 'plugin:import/recommended') return 'Import Plugin Recommended';
  // Add more as needed
  return configKey.replace(/^plugin:/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function main() {
  const { projectType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'projectType',
      message: 'What type of project is this?',
      choices: [
        'React',
        'Node',
        'Vanilla JS',
        'TypeScript',
        'TypeScript + React',
        'EDS',
        'Other',
      ],
    },
  ]);

  // Show which plugins/configs will be used for linting
  const lintingInfo = {
    'React': {
      eslint: [
        'eslint',
        'eslint-plugin-react',
        'eslint-plugin-import',
        'eslint-plugin-jsx-a11y',
        'eslint-config-airbnb',
        "eslint-plugin-promise",
        "eslint-plugin-security",
      ],
      stylelint: [
        'stylelint',
        'stylelint-config-standard',
        'stylelint-config-recommended',
      ],
    },
    'Node': {
      eslint: [
        'eslint',
        'eslint-plugin-node',
        'eslint-config-airbnb-base',
      ],
      stylelint: [],
    },
    'Vanilla JS': {
      eslint: [
        'eslint',
        'eslint-config-airbnb-base',
        "eslint-plugin-promise",
        "eslint-plugin-security",
      ],
      stylelint: [
        'stylelint',
        'stylelint-config-standard',
      ],
    },
    'TypeScript': {
      eslint: [
        'eslint',
        '@typescript-eslint/parser',
        '@typescript-eslint/eslint-plugin',
        'eslint-config-airbnb-base',
        "eslint-plugin-promise",
        "eslint-plugin-security",
      ],
      stylelint: [
        'stylelint',
        'stylelint-config-standard',
        'stylelint-config-recommended',
      ],
    },
    'TypeScript + React': {
      eslint: [
        'eslint',
        '@typescript-eslint/parser',
        '@typescript-eslint/eslint-plugin',
        'eslint-plugin-react',
        'eslint-plugin-import',
        'eslint-plugin-jsx-a11y',
        'eslint-config-airbnb',
        'eslint-config-airbnb-typescript',
        "eslint-plugin-promise",
        "eslint-plugin-security",
      ],
      stylelint: [
        'stylelint',
        'stylelint-config-standard',
        'stylelint-config-recommended',
      ],
    },
    'EDS': {
      eslint: [
        'eslint',
        'eslint-config-airbnb-base',
        "eslint-plugin-promise",
        "eslint-plugin-security",
      ],
      stylelint: [
        'stylelint',
        'stylelint-config-standard',
      ],
    },
    'Other': {
      eslint: ['eslint'],
      stylelint: ['stylelint'],
    },
  };

  const selectedLinting = lintingInfo[projectType] || lintingInfo['Other'];
  console.log('\n--- Linting Plugins/Configs Used ---');
  console.log('ESLint:');
  selectedLinting.eslint.forEach((plugin) => console.log('  - ' + plugin));
  if (selectedLinting.stylelint.length > 0) {
    console.log('Stylelint:');
    selectedLinting.stylelint.forEach((plugin) => console.log('  - ' + plugin));
  } else {
    console.log('Stylelint: (not used for this project type)');
  }
  console.log('-----------------------------------\n');

  const { reports } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'reports',
      message: 'Which report(s) do you want to generate?',
      choices: [
        { name: 'All Traditional Reports (ESLint Stylelint, NPM-Report)', value: 'all' },
        { name: 'Comprehensive Audit (All Categories)', value: 'comprehensive' },
        { name: 'ESLint', value: 'eslint' },
        { name: 'Stylelint', value: 'stylelint' },
        { name: 'Security Audit', value: 'security' },
        { name: 'Code Performance Audit', value: 'performance' },
        { name: 'Accessibility Audit', value: 'accessibility' },
        { name: 'Dependency Audit', value: 'dependency' },
        { name: 'Package Report', value: 'package' },
        { name: 'Testing Audit', value: 'testing' },
      ],
      validate: (answer) => answer.length > 0 || 'Select at least one report.'
    },
  ]);

  await codeInsightInit({ projectType, reports });
}

main();
