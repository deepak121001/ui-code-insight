import { AuditOrchestrator } from './audits/audit-orchestrator.js';
import { copyStaticFiles } from './utils.js';
import { generateESLintReport } from './eslint/eslint-report.js';
import { generateStyleLintReport } from './stylelint/stylelint-report.js';
import { generateNpmPackageReport } from './packages-report/packagesReport.js';
import { generateComponentUsageReport } from './component-usage/component-usage-report.js';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

/**
 * Main function to initialize code insight tool
 */
export async function codeInsightInit(options = {}) {
  const {
    projectType = 'Other',
    reports = ['all'],
    eslintConfig = 'airbnb',
    stylelintConfig = 'standard',
    lighthouseUrl = null,
    accessibilityUrls = [],
    securityUrls = []
  } = options;

  console.log(chalk.blue('🚀 UI Code Insight Tool Starting...\n'));

  const auditCategories = ['security', 'performance', 'accessibility', 'lighthouse', 'testing', 'dependency'];
  const currentDir = process.cwd();
  const reportDir = path.join(currentDir, 'report');

  // Create report directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  try {
    // Copy static files (dashboard template)
    console.log(chalk.blue('📁 Copying static files...'));
    await copyStaticFiles(reportDir);
    console.log(chalk.green('✅ Static files copied successfully!'));

    // Initialize audit orchestrator with lighthouse URL
    const orchestrator = new AuditOrchestrator(reportDir, lighthouseUrl, accessibilityUrls, securityUrls);
      
    // Run audits based on selection
    if (reports.includes('all')) {
      console.log(chalk.blue('🔍 Running all audits...\n'));
        await orchestrator.runAllAudits();
      } else {
      console.log(chalk.blue(`🔍 Running selected audits: ${reports.join(', ')}\n`));
      
      for (const reportType of reports) {
        if (auditCategories.includes(reportType)) {
          console.log(chalk.blue(`\n📊 Running ${reportType} audit...`));
          await orchestrator.runSpecificAudit(reportType);
        }
      }
    }

    // Generate additional reports if requested
    if (reports.includes('eslint') || reports.includes('all')) {
      console.log(chalk.blue('\n📋 Generating ESLint Report...'));
      await generateESLintReport(eslintConfig, reportDir);
    }

    if (reports.includes('stylelint') || reports.includes('all')) {
      console.log(chalk.blue('\n📋 Generating Stylelint Report...'));
      await generateStyleLintReport(stylelintConfig, reportDir);
          }

    if (reports.includes('packages') || reports.includes('all')) {
      console.log(chalk.blue('\n📋 Generating Packages Report...'));
      await generateNpmPackageReport(projectType, reports);
    }

    if (reports.includes('component-usage') || reports.includes('all')) {
      console.log(chalk.blue('\n📋 Generating Component Usage Report...'));
      await generateComponentUsageReport(reportDir);
    }

    console.log(chalk.green('\n✅ All reports generated successfully!'));
    console.log(chalk.blue(`📁 Reports saved to: ${reportDir}`));
    console.log(chalk.blue('🌐 Open dashboard.html in your browser to view results'));

  } catch (error) {
    console.error(chalk.red('❌ Error during code insight generation:', error.message));
    throw error;
  }
}
