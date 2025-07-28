#!/usr/bin/env node

import { AccessibilityAudit } from '../src/audits/accessibility-audit.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * Comprehensive test script for enhanced accessibility audit
 */
async function testEnhancedAccessibility() {
  console.log(chalk.blue('🚀 Enhanced Accessibility Audit Test\n'));
  
  try {
    // Create accessibility audit instance
    const audit = new AccessibilityAudit('./reports');
    
    console.log(chalk.blue('📋 New Accessibility Audit Features:'));
    console.log(chalk.white('✅ Enhanced image accessibility checks'));
    console.log(chalk.white('✅ Improved heading structure validation'));
    console.log(chalk.white('✅ Comprehensive form accessibility checks'));
    console.log(chalk.white('✅ Semantic HTML and ARIA usage analysis'));
    console.log(chalk.white('✅ WCAG compliance tagging'));
    console.log(chalk.white('✅ Better issue categorization'));
    console.log(chalk.white('✅ Enhanced dashboard display'));
    console.log(chalk.white('✅ Live URL testing with axe-core'));
    
    console.log(chalk.blue('\n🔍 Running Enhanced Accessibility Audit...\n'));
    
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
    
    console.log(chalk.green('\n✅ Enhanced accessibility audit completed!'));
    
    // Display comprehensive results
    console.log(chalk.blue('\n📊 Enhanced Results Summary:'));
    console.log(chalk.white(`Total Issues Found: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));
    
    if (results.summary) {
      console.log(chalk.blue('\n📋 Detailed Breakdown:'));
      console.log(chalk.white(`Code Scan Issues: ${results.summary.codeScanIssues}`));
      console.log(chalk.white(`Live URL Issues: ${results.summary.liveUrlIssues}`));
      console.log(chalk.white(`Axe-Core Issues: ${results.summary.axeCoreIssues}`));
      console.log(chalk.white(`Lighthouse Issues: ${results.summary.lighthouseIssues}`));
    }
    
    // Analyze issue types
    if (results.issues && results.issues.length > 0) {
      console.log(chalk.blue('\n🔍 Issue Type Analysis:'));
      
      const issueTypes = {};
      const wcagCompliance = {};
      
      results.issues.forEach(issue => {
        // Count by type
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
        
        // Count WCAG compliance
        if (issue.wcag) {
          wcagCompliance[issue.wcag] = (wcagCompliance[issue.wcag] || 0) + 1;
        }
      });
      
      console.log(chalk.white('\nIssue Types:'));
      Object.entries(issueTypes).forEach(([type, count]) => {
        console.log(chalk.gray(`  ${type}: ${count} issues`));
      });
      
      console.log(chalk.white('\nWCAG Compliance:'));
      Object.entries(wcagCompliance).forEach(([wcag, count]) => {
        console.log(chalk.gray(`  ${wcag}: ${count} issues`));
      });
      
      // Show some example issues with new features
      console.log(chalk.blue('\n💡 Example Enhanced Issues:'));
      results.issues.slice(0, 5).forEach((issue, index) => {
        console.log(chalk.white(`\n${index + 1}. ${issue.message}`));
        console.log(chalk.gray(`   File: ${issue.file}:${issue.line}`));
        console.log(chalk.gray(`   Severity: ${issue.severity}`));
        if (issue.wcag) {
          console.log(chalk.gray(`   WCAG: ${issue.wcag}`));
        }
        if (issue.recommendation) {
          console.log(chalk.gray(`   Recommendation: ${issue.recommendation}`));
        }
        if (issue.source) {
          console.log(chalk.gray(`   Source: ${issue.source}`));
        }
      });
    }
    
    // Check if the JSON report was created
    const reportPath = path.join('./reports', 'accessibility-audit-report.json');
    if (fs.existsSync(reportPath)) {
      console.log(chalk.green('\n✅ Enhanced JSON report created successfully!'));
      
      const jsonData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      console.log(chalk.blue('\n📄 Enhanced Report Features:'));
      console.log(chalk.white(`Total Issues: ${jsonData.totalIssues}`));
      console.log(chalk.white(`Issues with WCAG tags: ${jsonData.issues ? jsonData.issues.filter(i => i.wcag).length : 0}`));
      console.log(chalk.white(`Issues with recommendations: ${jsonData.issues ? jsonData.issues.filter(i => i.recommendation).length : 0}`));
      
      // Check for new issue types
      const newIssueTypes = ['missing_alt', 'empty_alt', 'generic_alt', 'skipped_heading', 'multiple_h1', 'empty_heading', 'no_headings', 'missing_form_label', 'missing_aria_required', 'empty_button', 'button_no_accessible_name', 'empty_label', 'empty_aria_label', 'missing_aria_error_description', 'redundant_aria_role', 'non_semantic_interactive'];
      
      const foundNewTypes = newIssueTypes.filter(type => 
        jsonData.issues && jsonData.issues.some(issue => issue.type === type)
      );
      
      console.log(chalk.blue('\n🆕 New Issue Types Found:'));
      foundNewTypes.forEach(type => {
        const count = jsonData.issues.filter(issue => issue.type === type).length;
        console.log(chalk.white(`  ${type}: ${count} issues`));
      });
    } else {
      console.log(chalk.red('\n❌ Enhanced JSON report not found!'));
    }
    
    console.log(chalk.green('\n🎉 Enhanced accessibility audit test completed!'));
    console.log(chalk.blue('\n🚀 Next Steps:'));
    console.log(chalk.white('1. Start the dashboard: npm start'));
    console.log(chalk.white('2. View the enhanced accessibility audit results'));
    console.log(chalk.white('3. Check the new WCAG compliance summary'));
    console.log(chalk.white('4. Review detailed issue recommendations'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error during enhanced accessibility testing:'), error.message);
    console.error(chalk.gray('Stack trace:'), error.stack);
  }
}

// Run the test
testEnhancedAccessibility().catch(console.error); 