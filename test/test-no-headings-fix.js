#!/usr/bin/env node

import { AccessibilityAudit } from '../src/audits/accessibility-audit.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * Test script to verify heading structure checks only apply to live URLs
 */
async function testHeadingStructureFix() {
  console.log(chalk.blue('🔧 Testing Heading Structure Fix\n'));
  
  try {
    // Create accessibility audit instance
    const audit = new AccessibilityAudit('./reports');
    
    console.log(chalk.blue('📋 Testing Code Scanning (should NOT include no_headings)...'));
    
    // Run code scanning only
    const codeScanResults = await audit.runAccessibilityAudit(
      [], // No URLs
      {
        codeScan: true,
        liveUrlTest: false,
        useAxeCore: false,
        useLighthouse: false
      }
    );
    
    // Check if no_headings issues were found in code scanning
    const noHeadingsInCodeScan = codeScanResults.issues ? 
      codeScanResults.issues.filter(issue => issue.type === 'no_headings') : [];
    
    // Check if skipped_heading issues were found in code scanning
    const skippedHeadingsInCodeScan = codeScanResults.issues ? 
      codeScanResults.issues.filter(issue => issue.type === 'skipped_heading') : [];
    
    if (noHeadingsInCodeScan.length === 0 && skippedHeadingsInCodeScan.length === 0) {
      console.log(chalk.green('✅ Code scanning correctly excludes no_headings and skipped_heading issues'));
    } else {
      console.log(chalk.red(`❌ Code scanning incorrectly found issues:`));
      if (noHeadingsInCodeScan.length > 0) {
        console.log(chalk.red(`   - ${noHeadingsInCodeScan.length} no_headings issues`));
        noHeadingsInCodeScan.forEach(issue => {
          console.log(chalk.red(`     ${issue.file}: ${issue.message}`));
        });
      }
      if (skippedHeadingsInCodeScan.length > 0) {
        console.log(chalk.red(`   - ${skippedHeadingsInCodeScan.length} skipped_heading issues`));
        skippedHeadingsInCodeScan.forEach(issue => {
          console.log(chalk.red(`     ${issue.file}: ${issue.message}`));
        });
      }
    }
    
    console.log(chalk.blue('\n📋 Testing Live URL Scanning (should include no_headings)...'));
    
    // Run live URL testing only
    const liveUrlResults = await audit.runAccessibilityAudit(
      ['https://example.com'], // Test URL
      {
        codeScan: false,
        liveUrlTest: true,
        useAxeCore: true,
        useLighthouse: false
      }
    );
    
    // Check if no_headings issues were found in live URL testing
    const noHeadingsInLiveUrl = liveUrlResults.issues ? 
      liveUrlResults.issues.filter(issue => issue.type === 'no_headings') : [];
    
    // Check if skipped_heading issues were found in live URL testing
    const skippedHeadingsInLiveUrl = liveUrlResults.issues ? 
      liveUrlResults.issues.filter(issue => issue.type === 'skipped_heading') : [];
    
    if (noHeadingsInLiveUrl.length > 0 || skippedHeadingsInLiveUrl.length > 0) {
      console.log(chalk.green(`✅ Live URL testing correctly found heading structure issues:`));
      if (noHeadingsInLiveUrl.length > 0) {
        console.log(chalk.green(`   - ${noHeadingsInLiveUrl.length} no_headings issues`));
        noHeadingsInLiveUrl.forEach(issue => {
          console.log(chalk.green(`     ${issue.url}: ${issue.message}`));
        });
      }
      if (skippedHeadingsInLiveUrl.length > 0) {
        console.log(chalk.green(`   - ${skippedHeadingsInLiveUrl.length} skipped_heading issues`));
        skippedHeadingsInLiveUrl.forEach(issue => {
          console.log(chalk.green(`     ${issue.url}: ${issue.message}`));
        });
      }
    } else {
      console.log(chalk.yellow('⚠️  Live URL testing found no heading structure issues (this might be normal for the test URL)'));
    }
    
    // Summary
    console.log(chalk.blue('\n📊 Summary:'));
    console.log(chalk.white(`Code Scan Issues: ${codeScanResults.totalIssues || 0}`));
    console.log(chalk.white(`Live URL Issues: ${liveUrlResults.totalIssues || 0}`));
    console.log(chalk.white(`No Headings in Code Scan: ${noHeadingsInCodeScan.length}`));
    console.log(chalk.white(`No Headings in Live URL: ${noHeadingsInLiveUrl.length}`));
    console.log(chalk.white(`Skipped Headings in Code Scan: ${skippedHeadingsInCodeScan.length}`));
    console.log(chalk.white(`Skipped Headings in Live URL: ${skippedHeadingsInLiveUrl.length}`));
    
    if (noHeadingsInCodeScan.length === 0 && skippedHeadingsInCodeScan.length === 0) {
      console.log(chalk.green('\n🎉 Fix successful! Heading structure checks now only apply to live URL testing.'));
    } else {
      console.log(chalk.red('\n❌ Fix failed! Heading structure checks still apply to code scanning.'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error during testing:'), error.message);
    console.error(chalk.gray('Stack trace:'), error.stack);
  }
}

// Run the test
testHeadingStructureFix().catch(console.error); 