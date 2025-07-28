#!/usr/bin/env node

/**
 * Test script to verify security audit works without ESLint module resolution errors
 */

import chalk from 'chalk';
import { globby } from 'globby';
import { SecurityAudit } from '../src/audits/security-audit.js';

console.log(chalk.blue('🔒 Testing Security Audit...'));

async function testSecurityAudit() {
  try {
    console.log(chalk.gray('\n📋 Initializing Security Audit...'));
    const securityAudit = new SecurityAudit('./reports');
    
    console.log(chalk.gray('\n📋 Testing ESLint Security Issues Check...'));
    await securityAudit.checkESLintSecurityIssues();
    
    console.log(chalk.gray('\n📋 Testing Pattern Scanning...'));
    const jsFiles = await globby(['**/*.{js,ts,jsx,tsx}', '!**/node_modules/**', '!**/__tests__/**']);
    await securityAudit.patternScan(jsFiles, [
      { pattern: /eval\s*\(/, type: 'dangerous_eval' },
      { pattern: /innerHTML\s*=/, type: 'xss_innerhtml' },
      { pattern: /document\.write\s*\(/, type: 'xss_document_write' }
    ], 'security_patterns');
    
    console.log(chalk.gray('\n📋 Testing Secrets Detection...'));
    await securityAudit.checkForSecrets();
    
    console.log(chalk.green('\n✅ Security audit completed successfully!'));
    console.log(chalk.green('✅ No ESLint module resolution errors detected'));
    
  } catch (error) {
    console.error(chalk.red('❌ Security audit test failed:'), error.message);
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

testSecurityAudit(); 