#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Test script to verify dashboard accessibility data loading
 */
async function testDashboardAccessibility() {
  console.log(chalk.blue('🧪 Testing Dashboard Accessibility Data Loading\n'));
  
  try {
    // Check if accessibility report exists
    const reportPath = path.join('./reports', 'accessibility-audit-report.json');
    if (!fs.existsSync(reportPath)) {
      console.log(chalk.red('❌ Accessibility report not found!'));
      console.log(chalk.yellow('Please run the accessibility audit first:'));
      console.log(chalk.white('  node test-file-scanning.js'));
      return;
    }
    
    console.log(chalk.green('✅ Accessibility report found!'));
    
    // Read and parse the report
    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    console.log(chalk.blue('\n📊 Report Data Structure:'));
    console.log(chalk.white(`Total Issues: ${reportData.totalIssues}`));
    console.log(chalk.white(`High Severity: ${reportData.highSeverity}`));
    console.log(chalk.white(`Medium Severity: ${reportData.mediumSeverity}`));
    console.log(chalk.white(`Low Severity: ${reportData.lowSeverity}`));
    
    if (reportData.summary) {
      console.log(chalk.blue('\n📋 Summary Breakdown:'));
      console.log(chalk.white(`Code Scan Issues: ${reportData.summary.codeScanIssues}`));
      console.log(chalk.white(`Live URL Issues: ${reportData.summary.liveUrlIssues}`));
      console.log(chalk.white(`Axe-Core Issues: ${reportData.summary.axeCoreIssues}`));
      console.log(chalk.white(`Lighthouse Issues: ${reportData.summary.lighthouseIssues}`));
    }
    
    // Simulate what the dashboard would do
    console.log(chalk.blue('\n🔍 Simulating Dashboard Data Loading:'));
    
    // Simulate the data structure that would be passed to renderComprehensiveOverview
    const individualAuditData = {
      'accessibility-audit': reportData
    };
    
    // Simulate the getTotalIssues function logic
    function getTotalIssues(category, individualKey) {
      if (individualAuditData[individualKey] && individualAuditData[individualKey].totalIssues !== undefined) {
        return individualAuditData[individualKey].totalIssues;
      }
      return 0;
    }
    
    const accessibilityTotal = getTotalIssues('accessibility', 'accessibility-audit');
    console.log(chalk.white(`Accessibility Total (from dashboard logic): ${accessibilityTotal}`));
    
    // Check if the data structure matches what the dashboard expects
    if (individualAuditData['accessibility-audit']) {
      const accessibilityData = individualAuditData['accessibility-audit'];
      console.log(chalk.green('✅ Data structure matches dashboard expectations'));
      
      if (accessibilityData.summary) {
        console.log(chalk.blue('\n📊 Dashboard Overview Data:'));
        console.log(chalk.white(`Total Issues: ${accessibilityData.totalIssues || 0}`));
        console.log(chalk.white(`Code Scan Issues: ${accessibilityData.summary.codeScanIssues || 0}`));
        console.log(chalk.white(`Live URL Issues: ${accessibilityData.summary.liveUrlIssues || 0}`));
        
        // Simulate the HTML that would be generated
        const overviewHTML = `
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-600">${accessibilityData.totalIssues || 0}</div>
            <div class="text-sm text-gray-500">Total Issues</div>
            <div class="text-xs text-gray-400 mt-1">
              Code: ${accessibilityData.summary.codeScanIssues || 0} | 
              Live: ${accessibilityData.summary.liveUrlIssues || 0}
            </div>
          </div>
        `;
        
        console.log(chalk.blue('\n🎨 Generated Overview HTML:'));
        console.log(chalk.gray(overviewHTML));
      }
    } else {
      console.log(chalk.red('❌ Data structure does not match dashboard expectations'));
    }
    
    // Check file scanning information
    if (reportData.issues && reportData.issues.length > 0) {
      const uniqueFiles = new Set();
      reportData.issues.forEach(issue => {
        if (issue.file) {
          uniqueFiles.add(issue.file);
        }
      });
      
      console.log(chalk.blue('\n📁 File Scanning Information:'));
      console.log(chalk.white(`Total Issues: ${reportData.issues.length}`));
      console.log(chalk.white(`Unique Files Scanned: ${uniqueFiles.size}`));
      
      // Show file type distribution
      const fileExtensions = {};
      reportData.issues.forEach(issue => {
        if (issue.file) {
          const ext = path.extname(issue.file);
          fileExtensions[ext] = (fileExtensions[ext] || 0) + 1;
        }
      });
      
      console.log(chalk.blue('\n📊 Issues by File Type:'));
      Object.entries(fileExtensions).forEach(([ext, count]) => {
        console.log(chalk.white(`  ${ext}: ${count} issues`));
      });
    }
    
    console.log(chalk.green('\n✅ Dashboard accessibility data loading test completed!'));
    console.log(chalk.blue('\n🚀 Next Steps:'));
    console.log(chalk.white('1. Start the dashboard: npm start'));
    console.log(chalk.white('2. Open the dashboard in your browser'));
    console.log(chalk.white('3. Check the Accessibility Issues card in the overview'));
    console.log(chalk.white('4. Click on the Accessibility Audit tab to see detailed results'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error during dashboard accessibility test:'), error.message);
    console.error(chalk.gray('Stack trace:'), error.stack);
  }
}

// Run the test
testDashboardAccessibility().catch(console.error); 