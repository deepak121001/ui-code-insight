#!/usr/bin/env node

import { AccessibilityAudit } from './src/audits/accessibility-audit.js';
import { getConfigPattern } from './src/config-loader.js';
import { globby } from 'globby';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * Test script to verify file scanning coverage
 */
async function testFileScanning() {
  console.log(chalk.blue('🧪 Testing Accessibility Audit File Scanning Coverage\n'));
  
  try {
    // Check what files would be scanned
    console.log(chalk.blue('📁 Checking file patterns...'));
    
    const jsPattern = getConfigPattern('jsFilePathPattern');
    const htmlPattern = getConfigPattern('htmlFilePathPattern');
    
    console.log(chalk.white('JS File Pattern:'), jsPattern);
    console.log(chalk.white('HTML File Pattern:'), htmlPattern);
    
    // Get actual files that would be scanned
    const jsFiles = await globby(jsPattern, {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const htmlFiles = await globby(htmlPattern, {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const allFiles = [...jsFiles, ...htmlFiles];
    
    console.log(chalk.green('\n✅ File Scanning Results:'));
    console.log(chalk.white(`JavaScript/TypeScript files: ${jsFiles.length}`));
    console.log(chalk.white(`HTML files: ${htmlFiles.length}`));
    console.log(chalk.white(`Total files to scan: ${allFiles.length}`));
    
    // Show some example files
    console.log(chalk.blue('\n📄 Sample JavaScript/TypeScript files:'));
    jsFiles.slice(0, 5).forEach(file => {
      console.log(chalk.gray(`  - ${file}`));
    });
    
    console.log(chalk.blue('\n📄 Sample HTML files:'));
    htmlFiles.slice(0, 5).forEach(file => {
      console.log(chalk.gray(`  - ${file}`));
    });
    
    // Check file types distribution
    const fileExtensions = {};
    allFiles.forEach(file => {
      const ext = path.extname(file);
      fileExtensions[ext] = (fileExtensions[ext] || 0) + 1;
    });
    
    console.log(chalk.blue('\n📊 File Type Distribution:'));
    Object.entries(fileExtensions).forEach(([ext, count]) => {
      console.log(chalk.white(`  ${ext}: ${count} files`));
    });
    
    // Now run a quick accessibility audit to see the results
    console.log(chalk.blue('\n🚀 Running Quick Accessibility Audit...'));
    
    const audit = new AccessibilityAudit('./reports');
    
    // Run only code scanning (no live URL testing for this test)
    const results = await audit.runAccessibilityAudit([], {
      codeScan: true,
      liveUrlTest: false,
      useAxeCore: false,
      useLighthouse: false
    });
    
    console.log(chalk.green('\n✅ Accessibility Audit Results:'));
    console.log(chalk.white(`Total Issues Found: ${results.totalIssues}`));
    console.log(chalk.white(`High Severity: ${results.highSeverity}`));
    console.log(chalk.white(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.white(`Low Severity: ${results.lowSeverity}`));
    
    if (results.summary) {
      console.log(chalk.blue('\n📋 Summary Breakdown:'));
      console.log(chalk.white(`Code Scan Issues: ${results.summary.codeScanIssues}`));
      console.log(chalk.white(`Live URL Issues: ${results.summary.liveUrlIssues}`));
    }
    
    // Show some example issues by file type
    if (results.issues && results.issues.length > 0) {
      console.log(chalk.blue('\n🔍 Sample Issues by File Type:'));
      
      const issuesByFileType = {};
      results.issues.forEach(issue => {
        if (issue.file) {
          const ext = path.extname(issue.file);
          if (!issuesByFileType[ext]) {
            issuesByFileType[ext] = [];
          }
          issuesByFileType[ext].push(issue);
        }
      });
      
      Object.entries(issuesByFileType).forEach(([ext, issues]) => {
        console.log(chalk.white(`\n${ext} files (${issues.length} issues):`));
        issues.slice(0, 3).forEach(issue => {
          console.log(chalk.gray(`  - ${issue.message} (${issue.file}:${issue.line})`));
        });
      });
    }
    
    // Check if the JSON report was created
    const reportPath = path.join('./reports', 'accessibility-audit-report.json');
    if (fs.existsSync(reportPath)) {
      console.log(chalk.green('\n✅ JSON report created successfully!'));
      
      const jsonData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      console.log(chalk.blue('\n📄 Report Statistics:'));
      console.log(chalk.white(`Total Issues in Report: ${jsonData.totalIssues}`));
      console.log(chalk.white(`Issues Array Length: ${jsonData.issues ? jsonData.issues.length : 0}`));
      
      // Count issues by file type in the report
      if (jsonData.issues) {
        const reportIssuesByFileType = {};
        jsonData.issues.forEach(issue => {
          if (issue.file) {
            const ext = path.extname(issue.file);
            reportIssuesByFileType[ext] = (reportIssuesByFileType[ext] || 0) + 1;
          }
        });
        
        console.log(chalk.blue('\n📊 Issues by File Type in Report:'));
        Object.entries(reportIssuesByFileType).forEach(([ext, count]) => {
          console.log(chalk.white(`  ${ext}: ${count} issues`));
        });
      }
    } else {
      console.log(chalk.red('\n❌ JSON report not found!'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error during file scanning test:'), error.message);
    console.error(chalk.gray('Stack trace:'), error.stack);
  }
}

// Run the test
testFileScanning().catch(console.error); 