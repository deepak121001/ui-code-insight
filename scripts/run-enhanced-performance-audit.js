#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { EnhancedPerformanceAudit } from '../src/audits/enhanced-performance-audit.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runEnhancedPerformanceAudit() {
  try {
    console.log(chalk.cyan.bold('\n🚀 UI Code Insight - Enhanced Performance Audit'));
    console.log(chalk.cyan('='.repeat(60)));
    
    // Get project root
    const projectRoot = process.cwd();
    const reportDir = join(projectRoot, 'report');
    
    // Create report directory if it doesn't exist
    const fs = await import('fs');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    console.log(chalk.blue(`📁 Project: ${projectRoot}`));
    console.log(chalk.blue(`📊 Reports: ${reportDir}`));
    
    // Initialize enhanced performance audit
    const performanceAudit = new EnhancedPerformanceAudit(reportDir);
    
    // Run enhanced performance audit
    const results = await performanceAudit.runEnhancedPerformanceAudit();
    
    // Display summary
    console.log(chalk.green('\n✅ Enhanced Performance Audit Completed!'));
    console.log(chalk.blue('\n📈 Performance Insights:'));
    
    if (results.totalIssues === 0) {
      console.log(chalk.green('🎉 No performance issues detected!'));
    } else {
      console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
      console.log(chalk.red(`High Priority: ${results.highSeverity}`));
      console.log(chalk.yellow(`Medium Priority: ${results.mediumSeverity}`));
      console.log(chalk.blue(`Low Priority: ${results.lowSeverity}`));
      
      // Show top issues by type
      const issueTypes = {};
      results.issues.forEach(issue => {
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
      });
      
      console.log(chalk.blue('\n🔍 Issue Breakdown:'));
      Object.entries(issueTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([type, count]) => {
          console.log(chalk.white(`  ${type}: ${count} issues`));
        });
    }
    
    console.log(chalk.blue('\n📋 Next Steps:'));
    console.log(chalk.white('1. Review the detailed report in report/enhanced-performance-audit-report.json'));
    console.log(chalk.white('2. Address high and medium priority issues first'));
    console.log(chalk.white('3. Consider implementing suggested optimizations'));
    console.log(chalk.white('4. Run the audit again to verify improvements'));
    
    console.log(chalk.cyan('\n🎯 For more detailed analysis, consider installing:'));
    console.log(chalk.white('  npm install --save-dev size-limit dependency-cruiser @lhci/cli'));
    
    return results;
    
  } catch (error) {
    console.error(chalk.red('\n❌ Enhanced Performance Audit Failed:'));
    console.error(chalk.red(error.message));
    
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

// Run the audit
runEnhancedPerformanceAudit(); 