#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import { codeInsightInit, initConfig, createConfigWizard, generateCIConfigs, validateConfig } from "../build/code-insight.js";
import fs from 'fs';
import path from 'path';

// URL configuration file path - will be set to report folder during execution
let URL_CONFIG_FILE = path.join(process.cwd(), '.ui-code-insight-urls.json');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  silent: false,
  ci: false,
  initConfig: false,
  configWizard: false,
  generateCI: false,
  validate: false,
  help: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  switch (arg) {
    case '--silent':
    case '-s':
      options.silent = true;
      break;
    case '--ci':
    case '-c':
      options.ci = true;
      break;
    case '--init-config':
      options.initConfig = true;
      break;
    case '--config-wizard':
      options.configWizard = true;
      break;
    case '--generate-ci':
      options.generateCI = true;
      break;
    case '--validate':
      options.validate = true;
      break;
    case '--help':
    case '-h':
      options.help = true;
      break;
  }
}

// Show help if requested
if (options.help) {
  showHelp();
  process.exit(0);
}

// Handle special commands
if (options.initConfig) {
  initConfig();
  process.exit(0);
}

if (options.configWizard) {
  createConfigWizard();
  process.exit(0);
}

if (options.generateCI) {
  generateCIConfigs();
  process.exit(0);
}

if (options.validate) {
  validateConfig();
  process.exit(0);
}

function showHelp() {
  console.log(chalk.blue('UI Code Insight - Help'));
  console.log(chalk.blue('='.repeat(40)));
  console.log(chalk.white('\nUsage:'));
  console.log(chalk.white('  ui-code-insight [options]'));
  console.log(chalk.white('\nOptions:'));
  console.log(chalk.white('  --silent, -s          Run in silent mode (minimal output)'));
  console.log(chalk.white('  --ci, -c              Run in CI mode with quality gates'));
  console.log(chalk.white('  --init-config         Initialize configuration file'));
  console.log(chalk.white('  --config-wizard       Run configuration wizard'));
  console.log(chalk.white('  --generate-ci         Generate CI/CD configuration files'));
  console.log(chalk.white('  --validate            Validate configuration file'));
  console.log(chalk.white('  --help, -h            Show this help message'));
  console.log(chalk.white('\nExamples:'));
  console.log(chalk.white('  ui-code-insight                    # Interactive mode'));
  console.log(chalk.white('  ui-code-insight --silent          # Silent mode'));
  console.log(chalk.white('  ui-code-insight --ci              # CI mode'));
  console.log(chalk.white('  ui-code-insight --init-config     # Initialize config'));
  console.log(chalk.white('  ui-code-insight --generate-ci     # Generate CI configs'));
}

function getFriendlyConfigName(configKey) {
  if (configKey === 'airbnb') return 'Airbnb';
  if (configKey === 'airbnb-base') return 'Airbnb Base';
  if (configKey === 'eslint:recommended') return 'ESLint Recommended';
  if (configKey === 'plugin:react/recommended') return 'React Recommended';
  if (configKey === 'plugin:import/recommended') return 'Import Plugin Recommended';
  // Add more as needed
  return configKey.replace(/^plugin:/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// URL validation helper
function validateUrls(input) {
  if (!input) return 'At least one URL is required';
  const urlList = input.split(',').map(url => url.trim()).filter(url => url);
  if (urlList.length === 0) return 'At least one URL is required';
  
  for (const url of urlList) {
    try {
      const urlObj = new URL(url);
      if (!urlObj.protocol || !urlObj.hostname) {
        return `Invalid URL format: ${url}`;
      }
    } catch {
      return `Please enter a valid URL: ${url}`;
    }
  }
  return true;
}

// Parse URLs helper
function parseUrls(input) {
  return input.split(',').map(url => url.trim()).filter(url => url);
}

// Set URL config file path to report folder
function setUrlConfigPath(reportDir) {
  URL_CONFIG_FILE = path.join(reportDir, 'ui-code-insight-urls.json');
}

// Load saved URL configurations
function loadUrlConfig() {
  try {
    if (fs.existsSync(URL_CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(URL_CONFIG_FILE, 'utf8'));
      return config;
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Could not load saved URL configuration'));
  }
  return null;
}

// Save URL configuration
function saveUrlConfig(urls, name = 'default') {
  try {
    // Ensure the directory exists
    const configDir = path.dirname(URL_CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const config = {
      name,
      urls,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(URL_CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(chalk.green(`✅ URL configuration saved as "${name}" in report folder`));
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Could not save URL configuration'));
  }
}

async function promptForLiveUrls(auditType, description) {
  console.log(chalk.blue(`\n${description}`));
  
  const { enableLiveUrlTesting } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableLiveUrlTesting',
      message: `Would you like to enable live URL ${auditType} testing?`,
      default: false,
    },
  ]);

  if (!enableLiveUrlTesting) {
    console.log(chalk.blue(`ℹ️  Running ${auditType} audit with code scanning only`));
    return [];
  }

  const { urls } = await inquirer.prompt([
    {
      type: 'input',
      name: 'urls',
      message: `Enter URLs to test (comma-separated, e.g., https://example.com, https://google.com):`,
      validate: validateUrls,
    },
  ]);
  
  const urlList = parseUrls(urls);
  console.log(chalk.green(`✅ Live ${auditType} testing will run on ${urlList.length} URL(s):`));
  urlList.forEach(url => console.log(chalk.green(`   • ${url}`)));
  
  return urlList;
}

async function promptForLighthouseUrl() {
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
          const urlObj = new URL(input);
          if (!urlObj.protocol || !urlObj.hostname) {
            return 'Please enter a valid URL (including http:// or https://)';
          }
          return true;
        } catch {
          return 'Please enter a valid URL (including http:// or https://)';
        }
      },
    },
  ]);
  
  console.log(chalk.green(`✅ Lighthouse audit will run on: ${url}`));
  return url;
}

async function promptForBatchUrlTesting(reports, reportDir = null) {
  // Set URL config path to report folder if provided
  if (reportDir) {
    setUrlConfigPath(reportDir);
  }
  
  // Check if any audits require live URLs
  const liveUrlAudits = [];
  if (reports.includes('lighthouse')) liveUrlAudits.push('Lighthouse');
  if (reports.includes('security')) liveUrlAudits.push('Security');
  if (reports.includes('accessibility')) liveUrlAudits.push('Accessibility');
  
  if (liveUrlAudits.length === 0) {
    return { lighthouseUrl: null, accessibilityUrls: [], securityUrls: [] };
  }
  
  console.log(chalk.blue('\n🌐 Live URL Testing Setup'));
  console.log(chalk.blue('='.repeat(40)));
  console.log(chalk.blue(`The following audits require live URLs: ${liveUrlAudits.join(', ')}`));
  
  // Check for saved URL configuration
  const savedConfig = loadUrlConfig();
  let useSavedConfig = false;
  
  if (savedConfig) {
    console.log(chalk.blue(`📁 Found saved URL configuration: "${savedConfig.name}" (${savedConfig.urls.length} URLs)`));
    const { useSaved } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useSaved',
        message: `Would you like to use the saved URL configuration?`,
        default: true,
      },
    ]);
    useSavedConfig = useSaved;
  }
  
  if (useSavedConfig) {
    console.log(chalk.green(`✅ Using saved URL configuration:`));
    savedConfig.urls.forEach(url => console.log(chalk.green(`   • ${url}`)));
    
    return {
      lighthouseUrl: reports.includes('lighthouse') ? savedConfig.urls[0] : null,
      accessibilityUrls: reports.includes('accessibility') ? savedConfig.urls : [],
      securityUrls: reports.includes('security') ? savedConfig.urls : [],
    };
  }
  
  console.log(chalk.blue('You can either:'));
  console.log(chalk.blue('1. Enter URLs for each audit separately'));
  console.log(chalk.blue('2. Use the same URLs for all audits (recommended)'));
  
  const { useBatchUrls } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useBatchUrls',
      message: 'Would you like to use the same URLs for all live URL audits?',
      default: true,
    },
  ]);

  if (useBatchUrls) {
    const { batchUrls } = await inquirer.prompt([
      {
        type: 'input',
        name: 'batchUrls',
        message: 'Enter URLs to test across all audits (comma-separated):',
        validate: validateUrls,
      },
    ]);
    
    const urlList = parseUrls(batchUrls);
    console.log(chalk.green(`✅ Using ${urlList.length} URL(s) for all live URL audits:`));
    urlList.forEach(url => console.log(chalk.green(`   • ${url}`)));
    
    // Ask if user wants to save this configuration
    const { saveConfig } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'saveConfig',
        message: 'Would you like to save this URL configuration for future use?',
        default: true,
      },
    ]);
    
    if (saveConfig) {
      const { configName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'configName',
          message: 'Enter a name for this URL configuration:',
          default: 'default',
        },
      ]);
      saveUrlConfig(urlList, configName);
    }
    
    return {
      lighthouseUrl: reports.includes('lighthouse') ? urlList[0] : null, // Lighthouse uses first URL
      accessibilityUrls: reports.includes('accessibility') ? urlList : [],
      securityUrls: reports.includes('security') ? urlList : [],
    };
  } else {
    // Individual URL prompting for each audit
    let lighthouseUrl = null;
    let accessibilityUrls = [];
    let securityUrls = [];

    if (reports.includes('lighthouse')) {
      lighthouseUrl = await promptForLighthouseUrl();
    }

    if (reports.includes('accessibility')) {
      accessibilityUrls = await promptForLiveUrls(
        'accessibility',
        '♿ Accessibility Audit - Live URL Testing\n' +
        '     - Tests actual rendered pages for accessibility issues\n' +
        '     - Uses axe-core for comprehensive WCAG compliance testing\n' +
        '     - Tests color contrast, keyboard navigation, screen reader support\n' +
        '     - Detects issues in JavaScript-rendered content\n' +
        '     - Provides detailed recommendations for fixes'
      );
    }

    if (reports.includes('security')) {
      securityUrls = await promptForLiveUrls(
        'security',
        '🔒 Security Audit - Live URL Testing\n' +
        '     - Tests HTTP security headers (HSTS, CSP, etc.)\n' +
        '     - Checks for XSS vulnerabilities in rendered content\n' +
        '     - Validates Content Security Policy effectiveness\n' +
        '     - Tests transport security and certificate validation\n' +
        '     - Provides security hardening recommendations'
      );
    }
    
    return { lighthouseUrl, accessibilityUrls, securityUrls };
  }
}

async function main() {
  // Skip interactive prompts in CI mode
  if (options.ci) {
    console.log(chalk.blue('🔧 Running in CI mode...'));
    
    try {
      await codeInsightInit({
        projectType: 'Other',
        reports: ['all'],
        silent: true,
        ci: true
      });
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
      process.exit(1);
    }
    return;
  }

  const { projectType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'projectType',
      message: 'What type of project is this?',
      choices: [
        'React',
        'Node.js',
        'Vanilla JavaScript',
        'TypeScript',
        'TypeScript + React',
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
    'Node.js': {
      eslint: [
        'eslint',
        'eslint-plugin-node',
        'eslint-config-airbnb-base',
      ],
      stylelint: [],
    },
    'Vanilla JavaScript': {
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
      message: 'Which audit(s) do you want to run?',
      choices: [
        { name: 'All Audits', value: 'all' },
        { name: '🔒 Security Audit', value: 'security' },
        { name: '⚡ Code Performance Audit', value: 'performance' },
        { name: '♿ Accessibility Audit', value: 'accessibility' },
        { name: '🚀 Runtime Performance Audit', value: 'lighthouse' },
        { name: '📦 Dependency Audit', value: 'dependency' },
        { name: '🔧 ESLint Report', value: 'eslint' },
        { name: '🎨 Stylelint Report', value: 'stylelint' },
      ],
    },
  ]);

  // If only 'all' is selected, expand it to include all reports
  if (reports.length === 1 && reports.includes('all')) {
    reports.push('security', 'performance', 'accessibility', 'lighthouse', 'dependency', 'eslint', 'stylelint');
  }

  // Create report directory early for URL configuration
  const currentDir = process.cwd();
  const reportDir = path.join(currentDir, 'report');
  
  // Create report directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Handle live URL prompting with report directory
  const { lighthouseUrl, accessibilityUrls, securityUrls } = await promptForBatchUrlTesting(reports, reportDir);

  try {
    await codeInsightInit({
      projectType,
      reports,
      lighthouseUrl,
      accessibilityUrls,
      securityUrls,
      silent: options.silent,
      ci: options.ci
    });
  } catch (error) {
    console.error(chalk.red('Error:', error.message));
    process.exit(1);
  }
}

main();
