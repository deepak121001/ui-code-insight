#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all test files
const testFiles = fs.readdirSync(__dirname)
  .filter(file => file.startsWith('test-') && file.endsWith('.js'))
  .filter(file => file !== 'run-tests.js');

console.log(chalk.blue('🧪 UI Code Insight Test Runner'));
console.log(chalk.blue('='.repeat(40)));

if (process.argv.length > 2) {
  // Run specific test
  const testName = process.argv[2];
  const testFile = testFiles.find(file => file.includes(testName));
  
  if (testFile) {
    console.log(chalk.blue(`Running test: ${testFile}`));
    try {
      execSync(`node ${path.join(__dirname, testFile)}`, { stdio: 'inherit' });
      console.log(chalk.green(`✅ ${testFile} completed successfully`));
    } catch (error) {
      console.log(chalk.red(`❌ ${testFile} failed`));
      process.exit(1);
    }
  } else {
    console.log(chalk.red(`❌ Test not found: ${testName}`));
    console.log(chalk.blue('Available tests:'));
    testFiles.forEach(file => console.log(chalk.white(`  • ${file}`)));
    process.exit(1);
  }
} else {
  // List all available tests
  console.log(chalk.blue('Available test files:'));
  testFiles.forEach(file => {
    console.log(chalk.white(`  • ${file}`));
  });
  
  console.log(chalk.blue('\nUsage:'));
  console.log(chalk.white('  node test/run-tests.js                    # List all tests'));
  console.log(chalk.white('  node test/run-tests.js accessibility     # Run accessibility tests'));
  console.log(chalk.white('  node test/run-tests.js security          # Run security tests'));
  console.log(chalk.white('  node test/run-tests.js file-scanning     # Run file scanning tests'));
} 