#!/usr/bin/env node

import { AccessibilityAudit } from '../src/audits/accessibility-audit.js';
import chalk from 'chalk';

/**
 * Test script for live URL accessibility testing
 */
async function testLiveUrlAccessibility() {
  console.log(chalk.blue('🧪 Testing Live URL Accessibility Feature\n'));
  
  // Example URLs to test
  const testUrls = [
    'https://example.com',
    'https://google.com'
  ];
  
  try {
    // Create accessibility audit instance
    const audit = new AccessibilityAudit('./reports');
    
    console.log(chalk.blue('🚀 Starting Live URL Accessibility Test...\n'));
    
    // Run accessibility audit with live URL testing
    const results = await audit.runAccessibilityAudit(
      testUrls,
      {
        codeScan: true,        // Run code scanning
        liveUrlTest: true,     // Enable live URL testing
        useAxeCore: true,      // Use axe-core for comprehensive testing
        useLighthouse: false   // Don't use Lighthouse (optional)
      }
    );
    
    console.log(chalk.green('\n✅ Live URL Accessibility Test Completed!'));
    console.log(chalk.blue('\n📊 Results Summary:'));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.white(`Code Scan Issues: ${results.summary.codeScanIssues}`));
    console.log(chalk.white(`Live URL Issues: ${results.summary.liveUrlIssues}`));
    console.log(chalk.white(`Axe-Core Issues: ${results.summary.axeCoreIssues}`));
    
    // Show some example issues
    if (results.issues.length > 0) {
      console.log(chalk.blue('\n🔍 Sample Issues Found:'));
      results.issues.slice(0, 5).forEach((issue, index) => {
        console.log(chalk.white(`\n${index + 1}. ${issue.message}`));
        console.log(chalk.gray(`   Source: ${issue.source} | Severity: ${issue.severity}`));
        if (issue.url) {
          console.log(chalk.gray(`   URL: ${issue.url}`));
        }
      });
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error during accessibility testing:'), error.message);
  }
}

// Run the test
testLiveUrlAccessibility().catch(console.error); 