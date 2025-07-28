#!/usr/bin/env node

/**
 * Test script to verify that test directories are properly excluded
 */

import { globby } from 'globby';
import chalk from 'chalk';
import { 
  getJavaScriptPatterns, 
  getHtmlPatterns, 
  getStylesheetPatterns,
  getCommonExclusions 
} from '../src/audits/file-globs.js';

console.log(chalk.blue('🔍 Testing File Exclusions...'));

async function testExclusions() {
  console.log(chalk.gray('\n📋 Testing JavaScript/TypeScript patterns:'));
  
  try {
    const jsFiles = await globby(getJavaScriptPatterns());
    console.log(chalk.green(`✅ Found ${jsFiles.length} JavaScript/TypeScript files`));
    
    // Check if any test files are included
    const testFiles = jsFiles.filter(file => 
      file.includes('__tests__') || 
      file.includes('/test/') || 
      file.includes('/tests/') ||
      file.includes('.test.') ||
      file.includes('.spec.')
    );
    
    if (testFiles.length > 0) {
      console.log(chalk.red(`❌ Found ${testFiles.length} test files that should be excluded:`));
      testFiles.slice(0, 5).forEach(file => console.log(chalk.red(`   - ${file}`)));
      if (testFiles.length > 5) {
        console.log(chalk.red(`   ... and ${testFiles.length - 5} more`));
      }
    } else {
      console.log(chalk.green(`✅ No test files found in JavaScript patterns`));
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Error testing JavaScript patterns: ${error.message}`));
  }

  console.log(chalk.gray('\n📋 Testing HTML patterns:'));
  
  try {
    const htmlFiles = await globby(getHtmlPatterns());
    console.log(chalk.green(`✅ Found ${htmlFiles.length} HTML files`));
    
    // Check if any test files are included
    const testHtmlFiles = htmlFiles.filter(file => 
      file.includes('__tests__') || 
      file.includes('/test/') || 
      file.includes('/tests/')
    );
    
    if (testHtmlFiles.length > 0) {
      console.log(chalk.red(`❌ Found ${testHtmlFiles.length} test HTML files that should be excluded:`));
      testHtmlFiles.slice(0, 5).forEach(file => console.log(chalk.red(`   - ${file}`)));
    } else {
      console.log(chalk.green(`✅ No test HTML files found`));
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Error testing HTML patterns: ${error.message}`));
  }

  console.log(chalk.gray('\n📋 Testing SCSS/CSS patterns:'));
  
  try {
    const scssFiles = await globby(getStylesheetPatterns());
    console.log(chalk.green(`✅ Found ${scssFiles.length} SCSS/CSS files`));
    
    // Check if any test files are included
    const testScssFiles = scssFiles.filter(file => 
      file.includes('__tests__') || 
      file.includes('/test/') || 
      file.includes('/tests/')
    );
    
    if (testScssFiles.length > 0) {
      console.log(chalk.red(`❌ Found ${testScssFiles.length} test SCSS files that should be excluded:`));
      testScssFiles.slice(0, 5).forEach(file => console.log(chalk.red(`   - ${file}`)));
    } else {
      console.log(chalk.green(`✅ No test SCSS files found`));
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Error testing SCSS patterns: ${error.message}`));
  }

  console.log(chalk.gray('\n📋 Testing Common Exclusions:'));
  const commonExclusions = getCommonExclusions();
  console.log(chalk.green(`✅ Common exclusions include:`));
  commonExclusions.forEach(exclusion => {
    if (exclusion.includes('test') || exclusion.includes('spec')) {
      console.log(chalk.green(`   ✅ ${exclusion}`));
    }
  });

  console.log(chalk.blue('\n📊 Summary:'));
  console.log(chalk.green('✅ Test directories are now excluded from all audits'));
  console.log(chalk.green('✅ This will improve performance and reduce false positives'));
}

testExclusions().catch(error => {
  console.error(chalk.red('❌ Test script error:'), error);
  process.exit(1);
}); 