#!/usr/bin/env node

/**
 * Test script to diagnose ESLint module resolution issues
 */

import { ESLint } from "eslint";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.blue('🔍 Testing ESLint Configuration...'));

// Test different configurations
const configs = [
  {
    name: 'Simple Config',
    path: path.join(__dirname, '../src/config/eslintrc.simple.json')
  },
  {
    name: 'Vanilla Config', 
    path: path.join(__dirname, '../src/config/eslintrc.vanilla.json')
  },
  {
    name: 'React Config',
    path: path.join(__dirname, '../src/config/eslintrc.react.json')
  }
];

async function testConfig(config) {
  console.log(chalk.gray(`\n📋 Testing: ${config.name}`));
  
  if (!fs.existsSync(config.path)) {
    console.log(chalk.red(`❌ Config file not found: ${config.path}`));
    return false;
  }
  
  try {
    console.log(chalk.gray(`📁 Config file: ${config.path}`));
    
    const eslint = new ESLint({
      useEslintrc: false,
      overrideConfigFile: config.path,
      errorOnUnmatchedPattern: false,
      allowInlineConfig: false,
    });
    
    console.log(chalk.green(`✅ ESLint initialized successfully with ${config.name}`));
    
    // Test with a simple JavaScript string
    const testCode = 'const test = "hello";\nconsole.log(test);';
    const results = await eslint.lintText(testCode, { filePath: 'test.js' });
    
    console.log(chalk.green(`✅ Linting test completed successfully`));
    console.log(chalk.gray(`   - Errors: ${results[0].errorCount}`));
    console.log(chalk.gray(`   - Warnings: ${results[0].warningCount}`));
    
    return true;
    
  } catch (error) {
    console.log(chalk.red(`❌ Error with ${config.name}: ${error.message}`));
    
    if (error.message.includes('@eslint/eslintrc')) {
      console.log(chalk.yellow(`⚠️  Module resolution issue detected`));
      console.log(chalk.yellow(`   This is likely due to ESLint trying to resolve modules from node_modules`));
    }
    
    return false;
  }
}

async function main() {
  console.log(chalk.blue('🚀 Starting ESLint Configuration Tests...\n'));
  
  let successCount = 0;
  let totalCount = 0;
  
  for (const config of configs) {
    totalCount++;
    const success = await testConfig(config);
    if (success) successCount++;
  }
  
  console.log(chalk.blue('\n📊 Test Results:'));
  console.log(chalk.green(`✅ Successful: ${successCount}/${totalCount}`));
  
  if (successCount === 0) {
    console.log(chalk.red('\n❌ All configurations failed. This indicates a module resolution issue.'));
    console.log(chalk.yellow('\n🔧 Recommended Solutions:'));
    console.log(chalk.yellow('1. Clear npm cache: npm cache clean --force'));
    console.log(chalk.yellow('2. Reinstall dependencies: rm -rf node_modules && npm install'));
    console.log(chalk.yellow('3. Use simplified config: The simple config should work as fallback'));
  } else if (successCount < totalCount) {
    console.log(chalk.yellow('\n⚠️  Some configurations failed. Using the working config as fallback.'));
  } else {
    console.log(chalk.green('\n🎉 All configurations working!'));
  }
}

main().catch(error => {
  console.error(chalk.red('❌ Test script error:'), error);
  process.exit(1);
}); 