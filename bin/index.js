#!/usr/bin/env node
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { codeInsightInit } from "../build/code-insight.js";

// Define dependencies for each project type
const dependenciesByType = {
  'React': [
    'eslint',
    'eslint-plugin-react',
    'eslint-plugin-import',
    'eslint-plugin-jsx-a11y',
    'eslint-config-airbnb'
  ],
  'Node': [
    'eslint',
    'eslint-plugin-node',
    'eslint-config-airbnb-base'
  ],
  'Vanilla JS': [
    'eslint',
    'eslint-config-airbnb-base'
  ],
  'TypeScript': [
    'eslint',
    '@typescript-eslint/parser',
    '@typescript-eslint/eslint-plugin',
    'eslint-config-airbnb-base'
  ],
  'TypeScript + React': [
    'eslint',
    '@typescript-eslint/parser',
    '@typescript-eslint/eslint-plugin',
    'eslint-plugin-react',
    'eslint-plugin-import',
    'eslint-plugin-jsx-a11y',
    'eslint-config-airbnb',
    'eslint-config-airbnb-typescript'
  ]
};

// Function to check if a package is already installed
function isPackageInstalled(packageName) {
  try {
    // Check if package exists in node_modules
    const packagePath = path.join(process.cwd(), 'node_modules', packageName);
    return fs.existsSync(packagePath);
  } catch (error) {
    return false;
  }
}

// Function to filter out already installed packages
function filterInstalledPackages(packages) {
  return packages.filter(pkg => !isPackageInstalled(pkg));
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
        'Other',
      ],
    },
  ]);

  // Prompt to install dependencies if project type is supported
  if (dependenciesByType[projectType]) {
    const { installDeps } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'installDeps',
        message: `Would you like to install all required dependencies for ${projectType}?`,
        default: true,
      }
    ]);

    if (installDeps) {
      const allDeps = dependenciesByType[projectType];
      const missingDeps = filterInstalledPackages(allDeps);
      
      if (missingDeps.length === 0) {
        console.log('✅ All required dependencies are already installed!');
      } else {
        const deps = missingDeps.join(' ');
        console.log(`Installing missing dependencies: ${deps}`);
        try {
          execSync(`npm install --save-dev ${deps}`, { stdio: 'inherit' });
          console.log('✅ Dependencies installed successfully!');
        } catch (error) {
          console.error('❌ Failed to install dependencies. Please install them manually.');
          console.error('You can run: npm install --save-dev ' + deps);
        }
      }
    }
  }

  const { reports } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'reports',
      message: 'Which report(s) do you want to generate?',
      choices: [
        { name: 'ESLint', value: 'eslint' },
        { name: 'Stylelint', value: 'stylelint' },
        { name: 'Package Report', value: 'package' },
        { name: 'Security Audit', value: 'security' },
        { name: 'Performance Audit', value: 'performance' },
        { name: 'Accessibility Audit', value: 'accessibility' },

        { name: 'Testing Audit', value: 'testing' },
        { name: 'Dependency Audit', value: 'dependency' },
        { name: 'Comprehensive Audit (All Categories)', value: 'comprehensive' },
        { name: 'All Traditional Reports', value: 'all' },
      ],
      validate: (answer) => answer.length > 0 || 'Select at least one report.'
    },
  ]);

  await codeInsightInit({ projectType, reports });
}

main();
