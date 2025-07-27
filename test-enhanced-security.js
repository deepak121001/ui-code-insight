#!/usr/bin/env node

import { SecurityAudit } from './src/audits/security-audit.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * Test script to demonstrate enhanced security audit with live URL testing
 */
async function testEnhancedSecurity() {
  console.log(chalk.blue('🔒 Enhanced Security Audit Test\n'));
  
  try {
    // Create security audit instance
    const audit = new SecurityAudit('./reports');
    
    console.log(chalk.blue('📋 Enhanced Security Audit Features:'));
    console.log(chalk.white('✅ Code scanning for hardcoded secrets'));
    console.log(chalk.white('✅ ESLint security plugin analysis'));
    console.log(chalk.white('✅ File upload security validation'));
    console.log(chalk.white('✅ Input validation checks'));
    console.log(chalk.white('✅ Security headers analysis (HTML)'));
    console.log(chalk.white('✅ Enhanced pattern checks'));
    console.log(chalk.white('✅ Live URL security testing'));
    console.log(chalk.white('✅ HTTP security headers validation'));
    console.log(chalk.white('✅ CSP (Content Security Policy) analysis'));
    console.log(chalk.white('✅ XSS vulnerability detection'));
    console.log(chalk.white('✅ HTTPS transport validation'));
    
    console.log(chalk.blue('\n🔍 Running Enhanced Security Audit...\n'));
    
    // Test URLs for security analysis
    const testUrls = [
      'https://example.com',
      'https://httpbin.org/headers' // Good for testing headers
    ];
    
    // Run security audit with both code scanning and live URL testing
    const results = await audit.runSecurityAudit(testUrls);
    
    console.log(chalk.green('\n✅ Enhanced security audit completed!'));
    
    // Display comprehensive results
    console.log(chalk.blue('\n📊 Enhanced Results Summary:'));
    console.log(chalk.white(`Total Issues Found: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));
    
    // Analyze issue types
    if (results.issues && results.issues.length > 0) {
      console.log(chalk.blue('\n🔍 Issue Type Analysis:'));
      
      const issueTypes = {};
      const sourceTypes = {};
      
      results.issues.forEach(issue => {
        // Count by type
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
        
        // Count by source
        const source = issue.source || 'custom';
        sourceTypes[source] = (sourceTypes[source] || 0) + 1;
      });
      
      console.log(chalk.white('\nIssue Types:'));
      Object.entries(issueTypes).forEach(([type, count]) => {
        console.log(chalk.gray(`  ${type}: ${count} issues`));
      });
      
      console.log(chalk.white('\nSource Types:'));
      Object.entries(sourceTypes).forEach(([source, count]) => {
        console.log(chalk.gray(`  ${source}: ${count} issues`));
      });
      
      // Show some example issues with new features
      console.log(chalk.blue('\n💡 Example Enhanced Issues:'));
      results.issues.slice(0, 8).forEach((issue, index) => {
        console.log(chalk.white(`\n${index + 1}. ${issue.message}`));
        console.log(chalk.gray(`   File/URL: ${issue.file || issue.url || 'N/A'}`));
        console.log(chalk.gray(`   Severity: ${issue.severity}`));
        console.log(chalk.gray(`   Source: ${issue.source || 'custom'}`));
        if (issue.recommendation) {
          console.log(chalk.gray(`   Recommendation: ${issue.recommendation}`));
        }
        if (issue.header) {
          console.log(chalk.gray(`   Header: ${issue.header}`));
        }
      });
    }
    
    // Check if the JSON report was created
    const reportPath = path.join('./reports', 'security-audit-report.json');
    if (fs.existsSync(reportPath)) {
      console.log(chalk.green('\n✅ Enhanced JSON report created successfully!'));
      
      const jsonData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      console.log(chalk.blue('\n📄 Enhanced Report Features:'));
      console.log(chalk.white(`Total Issues: ${jsonData.totalIssues}`));
      console.log(chalk.white(`Issues with recommendations: ${jsonData.issues ? jsonData.issues.filter(i => i.recommendation).length : 0}`));
      console.log(chalk.white(`Live URL issues: ${jsonData.issues ? jsonData.issues.filter(i => i.source === 'live-url').length : 0}`));
      
      // Check for new issue types
      const newIssueTypes = ['missing_security_header', 'weak_security_header', 'xss_dom_vulnerability', 'inline_scripts', 'inline_event_handlers', 'insecure_transport'];
      
      const foundNewTypes = newIssueTypes.filter(type => 
        jsonData.issues && jsonData.issues.some(issue => issue.type === type)
      );
      
      console.log(chalk.blue('\n🆕 New Live URL Issue Types Found:'));
      foundNewTypes.forEach(type => {
        const count = jsonData.issues.filter(issue => issue.type === type).length;
        console.log(chalk.white(`  ${type}: ${count} issues`));
      });
    } else {
      console.log(chalk.red('\n❌ Enhanced JSON report not found!'));
    }
    
    console.log(chalk.green('\n🎉 Enhanced security audit test completed!'));
    console.log(chalk.blue('\n🚀 Next Steps:'));
    console.log(chalk.white('1. Start the dashboard: npm start'));
    console.log(chalk.white('2. View the enhanced security audit results'));
    console.log(chalk.white('3. Check the live URL security testing results'));
    console.log(chalk.white('4. Review security header analysis'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error during enhanced security testing:'), error.message);
    console.error(chalk.gray('Stack trace:'), error.stack);
  }
}

// Run the test
testEnhancedSecurity().catch(console.error); 