#!/usr/bin/env node

/**
 * Debug script to see what Stylelint rules are being reported
 * This will help identify which rules are being filtered out
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeStylelintReport() {
  console.log('🔍 Analyzing Stylelint report for rule distribution...\n');
  
  const reportPath = path.join(__dirname, 'report/stylelint-report.json');
  
  if (!fs.existsSync(reportPath)) {
    console.log('❌ No Stylelint report found. Please run a Stylelint audit first.');
    return;
  }
  
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const results = report.results || [];
    
    console.log(`📊 Found ${results.length} files with Stylelint results\n`);
    
    // Collect all rules and their counts
    const ruleCounts = {};
    const fileRuleCounts = {};
    let totalMessages = 0;
    let totalErrors = 0;
    
    results.forEach((result, index) => {
      const filePath = result.filePath || `File ${index}`;
      const errorCount = result.errorCount || 0;
      const warningCount = result.warningCount || 0;
      const messages = result.messages || [];
      
      totalErrors += errorCount;
      totalMessages += messages.length;
      
      console.log(`📁 ${filePath}:`);
      console.log(`   Error count: ${errorCount}, Warning count: ${warningCount}, Messages: ${messages.length}`);
      
      if (messages.length > 0) {
        const fileRules = {};
        messages.forEach(msg => {
          const rule = msg.rule || 'unknown-rule';
          const severity = msg.severity || 'unknown';
          
          // Global rule counts
          if (!ruleCounts[rule]) {
            ruleCounts[rule] = { error: 0, warning: 0, total: 0 };
          }
          ruleCounts[rule].total++;
          if (severity === 'error') {
            ruleCounts[rule].error++;
          } else if (severity === 'warning') {
            ruleCounts[rule].warning++;
          }
          
          // File-specific rule counts
          if (!fileRules[rule]) {
            fileRules[rule] = 0;
          }
          fileRules[rule]++;
        });
        
        fileRuleCounts[filePath] = fileRules;
        
        // Show first few messages
        console.log(`   Sample messages:`);
        messages.slice(0, 3).forEach(msg => {
          console.log(`     - ${msg.rule} (${msg.severity}): ${msg.message}`);
        });
        if (messages.length > 3) {
          console.log(`     ... and ${messages.length - 3} more`);
        }
      } else {
        console.log(`   ⚠️  No messages found (possible filtering issue)`);
      }
      console.log('');
    });
    
    console.log(`📈 Summary:`);
    console.log(`   Total files: ${results.length}`);
    console.log(`   Total error count: ${totalErrors}`);
    console.log(`   Total message count: ${totalMessages}`);
    console.log(`   Unique rules found: ${Object.keys(ruleCounts).length}`);
    
    if (totalErrors !== totalMessages) {
      console.log(`   ⚠️  Mismatch detected: ${totalErrors} errors vs ${totalMessages} messages`);
    }
    
    // Show rule distribution
    console.log(`\n📋 Rule Distribution:`);
    const sortedRules = Object.entries(ruleCounts)
      .sort((a, b) => b[1].total - a[1].total);
    
    sortedRules.forEach(([rule, counts]) => {
      console.log(`   ${rule}: ${counts.total} total (${counts.error} errors, ${counts.warning} warnings)`);
    });
    
    // Check against exclude list
    console.log(`\n🔍 Checking against exclude list...`);
    const excludeRules = [
      'scss/double-slash-comment-empty-line-before',
      'scss/load-partial-extension',
      'declaration-empty-line-before',
      'color-function-notation',
      'selector-max-universal'
    ];
    
    const excludedRules = sortedRules.filter(([rule]) => excludeRules.includes(rule));
    const nonExcludedRules = sortedRules.filter(([rule]) => !excludeRules.includes(rule));
    
    console.log(`   Rules in exclude list: ${excludedRules.length}`);
    excludedRules.forEach(([rule, counts]) => {
      console.log(`     - ${rule}: ${counts.total} messages`);
    });
    
    console.log(`   Rules NOT in exclude list: ${nonExcludedRules.length}`);
    nonExcludedRules.slice(0, 10).forEach(([rule, counts]) => {
      console.log(`     - ${rule}: ${counts.total} messages`);
    });
    
    if (nonExcludedRules.length > 10) {
      console.log(`     ... and ${nonExcludedRules.length - 10} more`);
    }
    
  } catch (error) {
    console.error('❌ Error analyzing report:', error.message);
  }
}

// Run the analysis
analyzeStylelintReport(); 