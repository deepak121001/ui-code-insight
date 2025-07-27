#!/usr/bin/env node

import { AccessibilityAudit } from './src/audits/accessibility-audit.js';
import chalk from 'chalk';

/**
 * Test script to verify Puppeteer compatibility fix
 */
async function testAccessibilityFix() {
  console.log(chalk.blue('🧪 Testing Puppeteer Compatibility Fix\n'));
  
  // Test URL
  const testUrl = 'https://example.com';
  
  try {
    // Create accessibility audit instance
    const audit = new AccessibilityAudit('./reports');
    
    console.log(chalk.blue('🚀 Starting Live URL Accessibility Test...\n'));
    
    // Run accessibility audit with live URL testing
    const results = await audit.runAccessibilityAudit(
      [testUrl],
      {
        codeScan: false,        // Skip code scanning for this test
        liveUrlTest: true,      // Enable live URL testing
        useAxeCore: true,       // Use axe-core for testing
        useLighthouse: false    // Skip Lighthouse for this test
      }
    );
    
    console.log(chalk.green('\n✅ Live URL Accessibility Test Completed!'));
    console.log(chalk.blue('\n📊 Results Summary:'));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.white(`Live URL Issues: ${results.summary.liveUrlIssues}`));
    console.log(chalk.white(`Axe-Core Issues: ${results.summary.axeCoreIssues}`));
    
    if (results.issues.length > 0) {
      console.log(chalk.blue('\n🔍 Issues Found:'));
      results.issues.slice(0, 3).forEach((issue, index) => {
        console.log(chalk.white(`\n${index + 1}. ${issue.message}`));
        console.log(chalk.gray(`   Source: ${issue.source} | Severity: ${issue.severity}`));
        if (issue.url) {
          console.log(chalk.gray(`   URL: ${issue.url}`));
        }
      });
    } else {
      console.log(chalk.green('\n🎉 No accessibility issues found!'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error during accessibility testing:'), error.message);
    console.error(chalk.gray('Stack trace:'), error.stack);
  }
}

// Run the test
testAccessibilityFix().catch(console.error); 