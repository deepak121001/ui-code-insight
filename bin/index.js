#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
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
  };

  const info = lintingInfo[projectType];
  console.log(chalk.blue(`\n📋 Selected project type: ${projectType}`));
  console.log(chalk.blue('🔧 Will use the following configurations:'));
  
  if (info.eslint.length > 0) {
    console.log(chalk.cyan('\nESLint:'));
    info.eslint.forEach(config => {
      console.log(chalk.white(`  • ${getFriendlyConfigName(config)}`));
    });
  }
  
  if (info.stylelint.length > 0) {
    console.log(chalk.cyan('\nStylelint:'));
    info.stylelint.forEach(config => {
      console.log(chalk.white(`  • ${getFriendlyConfigName(config)}`));
    });
  }

  const { reports } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'reports',
      message: 'Which report(s) do you want to generate?',
      choices: [
        { name: 'All Reports', value: 'all' },
        { name: 'Security Audit', value: 'security' },
        { name: 'Performance Audit', value: 'performance' },
        { name: 'Accessibility Audit', value: 'accessibility' },
        { name: 'Lighthouse Audit', value: 'lighthouse' },
        { name: 'Testing Audit', value: 'testing' },
        { name: 'Dependency Audit', value: 'dependency' },
        { name: 'ESLint Report', value: 'eslint' },
        { name: 'Stylelint Report', value: 'stylelint' },
        { name: 'Packages Report', value: 'packages' },
        { name: 'Component Usage Report', value: 'component-usage' },
      ],
    },
  ]);

  let lighthouseUrl = null;
  let accessibilityUrls = [];
  
  // If Lighthouse audit is selected, prompt for URL
  if (reports.includes('lighthouse')) {
    console.log(chalk.blue('\n📝 Note: Local Lighthouse results may differ from PageSpeed Insights'));
    console.log(chalk.blue('   due to different testing environments and network conditions.\n'));
    
    const { url } = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: 'Enter the URL to test with Lighthouse (e.g., https://example.com):',
        validate: (input) => {
          if (!input) return 'URL is required for Lighthouse audit';
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL (including http:// or https://)';
          }
        },
      },
    ]);
    lighthouseUrl = url;
    console.log(chalk.green(`✅ Lighthouse audit will run on: ${lighthouseUrl}`));
  }

  // If Accessibility audit is selected, prompt for live URLs
  if (reports.includes('accessibility')) {
    console.log(chalk.blue('\n♿ Accessibility Audit Options:'));
    console.log(chalk.blue('   • Code scanning: Analyzes your local source code'));
    console.log(chalk.blue('   • Live URL testing: Tests live websites for accessibility issues'));
    console.log(chalk.blue('     - Uses axe-core for comprehensive WCAG compliance testing'));
    console.log(chalk.blue('     - Tests color contrast, keyboard navigation, screen reader support'));
    console.log(chalk.blue('     - Detects issues in JavaScript-rendered content'));
    console.log(chalk.blue('     - Provides detailed recommendations for fixes\n'));
    
    const { enableLiveUrlTesting } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableLiveUrlTesting',
        message: 'Would you like to enable live URL accessibility testing?',
        default: false,
      },
    ]);

    if (enableLiveUrlTesting) {
      const { urls } = await inquirer.prompt([
        {
          type: 'input',
          name: 'urls',
          message: 'Enter URLs to test (comma-separated, e.g., https://example.com, https://google.com):',
          validate: (input) => {
            if (!input) return 'At least one URL is required for live accessibility testing';
            const urlList = input.split(',').map(url => url.trim());
            for (const url of urlList) {
              try {
                new URL(url);
              } catch {
                return `Please enter a valid URL: ${url}`;
              }
            }
            return true;
          },
        },
      ]);
      
      accessibilityUrls = urls.split(',').map(url => url.trim());
      console.log(chalk.green(`✅ Live accessibility testing will run on ${accessibilityUrls.length} URL(s):`));
      accessibilityUrls.forEach(url => console.log(chalk.green(`   • ${url}`)));
    } else {
      console.log(chalk.blue('ℹ️  Running accessibility audit with code scanning only'));
    }
  }

  // If only 'all' is selected, expand it to include all reports
  if (reports.length === 1 && reports.includes('all')) {
    reports.push('security', 'performance', 'accessibility', 'lighthouse', 'testing', 'dependency', 'eslint', 'stylelint', 'packages', 'component-usage');
  }

  try {
    await codeInsightInit({
      projectType,
      reports,
      lighthouseUrl,
      accessibilityUrls
    });
  } catch (error) {
    console.error(chalk.red('Error:', error.message));
    process.exit(1);
  }
}

main();
