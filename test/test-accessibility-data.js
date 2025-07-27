#!/usr/bin/env node

import { AccessibilityAudit } from '../src/audits/accessibility-audit.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * Test script to verify accessibility audit data structure
 */
async function testAccessibilityData() {
  console.log(chalk.blue('🧪 Testing Accessibility Audit Data Structure\n'));
  
  try {
    // Create accessibility audit instance
    const audit = new AccessibilityAudit('./reports');
    
    console.log(chalk.blue('🚀 Running Accessibility Audit...\n'));
    
    // Run accessibility audit with both code scanning and live URL testing
    const results = await audit.runAccessibilityAudit(
      ['https://example.com'],
      {
        codeScan: true,
        liveUrlTest: true,
        useAxeCore: true,
        useLighthouse: false
      }
    );
    
    console.log(chalk.green('\n✅ Accessibility audit completed!'));
    console.log(chalk.blue('\n📊 Results Structure:'));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.white(`High Severity: ${results.highSeverity}`));
    console.log(chalk.white(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.white(`Low Severity: ${results.lowSeverity}`));
    
    if (results.summary) {
      console.log(chalk.blue('\n📋 Summary Breakdown:'));
      console.log(chalk.white(`Code Scan Issues: ${results.summary.codeScanIssues}`));
      console.log(chalk.white(`Live URL Issues: ${results.summary.liveUrlIssues}`));
      console.log(chalk.white(`Axe-Core Issues: ${results.summary.axeCoreIssues}`));
      console.log(chalk.white(`Lighthouse Issues: ${results.summary.lighthouseIssues}`));
    }
    
    // Check if the JSON file was created
    const reportPath = path.join('./reports', 'accessibility-audit-report.json');
    if (fs.existsSync(reportPath)) {
      console.log(chalk.green('\n✅ JSON report file created successfully!'));
      
      // Read and validate the JSON structure
      const jsonData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      console.log(chalk.blue('\n📄 JSON Structure Validation:'));
      console.log(chalk.white(`Has timestamp: ${!!jsonData.timestamp}`));
      console.log(chalk.white(`Has totalIssues: ${!!jsonData.totalIssues}`));
      console.log(chalk.white(`Has issues array: ${!!jsonData.issues}`));
      console.log(chalk.white(`Issues count: ${jsonData.issues ? jsonData.issues.length : 0}`));
      console.log(chalk.white(`Has summary: ${!!jsonData.summary}`));
      
      if (jsonData.issues && jsonData.issues.length > 0) {
        console.log(chalk.blue('\n🔍 Sample Issue Structure:'));
        const sampleIssue = jsonData.issues[0];
        console.log(chalk.white(`Type: ${sampleIssue.type}`));
        console.log(chalk.white(`Source: ${sampleIssue.source}`));
        console.log(chalk.white(`Severity: ${sampleIssue.severity}`));
        console.log(chalk.white(`Message: ${sampleIssue.message}`));
        if (sampleIssue.file) console.log(chalk.white(`File: ${sampleIssue.file}`));
        if (sampleIssue.url) console.log(chalk.white(`URL: ${sampleIssue.url}`));
      }
      
    } else {
      console.log(chalk.red('\n❌ JSON report file not found!'));
    }
    
    // Show some example issues
    if (results.issues && results.issues.length > 0) {
      console.log(chalk.blue('\n🔍 Sample Issues Found:'));
      results.issues.slice(0, 3).forEach((issue, index) => {
        console.log(chalk.white(`\n${index + 1}. ${issue.message}`));
        console.log(chalk.gray(`   Source: ${issue.source} | Severity: ${issue.severity}`));
        if (issue.file) {
          console.log(chalk.gray(`   File: ${issue.file}`));
        }
        if (issue.url) {
          console.log(chalk.gray(`   URL: ${issue.url}`));
        }
      });
    } else {
      console.log(chalk.yellow('\n⚠️  No issues found in the audit'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error during accessibility testing:'), error.message);
    console.error(chalk.gray('Stack trace:'), error.stack);
  }
}

// Run the test
testAccessibilityData().catch(console.error); 