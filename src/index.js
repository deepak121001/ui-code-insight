import { AuditOrchestrator } from './audits/audit-orchestrator.js';
import { copyStaticFiles } from './utils.js';
import { generateESLintReport } from './eslint/eslint-report.js';
import { generateStyleLintReport } from './stylelint/stylelint-report.js';
import { EnhancedConfig } from './config/enhanced-config.js';
import { ErrorHandler } from './utils/error-handler.js';
import { CIIntegration } from './integrations/ci-integration.js';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

/**
 * Main function to initialize code insight tool
 * Focused on core audit types: Security, Performance, Accessibility, Lighthouse, Dependencies
 */
export async function codeInsightInit(options = {}) {
  const {
    projectType = 'Other',
    reports = ['all'],
    eslintConfig = 'airbnb',
    stylelintConfig = 'standard',
    lighthouseUrl = null,
    accessibilityUrls = [],
    securityUrls = [],
    silent = false,
    ci = false
  } = options;

  // Initialize enhanced systems
  const config = new EnhancedConfig();
  const errorHandler = new ErrorHandler();
  const ciIntegration = new CIIntegration();

  if (!silent) {
    console.log(chalk.blue('🚀 UI Code Insight Tool Starting...\n'));
  }

  const auditCategories = ['security', 'performance', 'accessibility', 'lighthouse', 'dependency'];
  const currentDir = process.cwd();
  const reportDir = path.join(currentDir, 'report');

  // Create report directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  try {
    // Copy static files (dashboard template)
    if (!silent) {
      console.log(chalk.blue('📁 Copying static files...'));
    }
    await copyStaticFiles(reportDir);
    if (!silent) {
      console.log(chalk.green('✅ Static files copied successfully!'));
    }

    // Initialize audit orchestrator with lighthouse URL
    const orchestrator = new AuditOrchestrator(reportDir, lighthouseUrl, accessibilityUrls, securityUrls);
      
    // Run audits based on selection
    if (reports.includes('all')) {
      if (!silent) {
        console.log(chalk.blue('🔍 Running all audits...\n'));
      }
      const auditResults = await orchestrator.runAllAudits();
      
      // Generate CI output if enabled
      if (ci || ciIntegration.isCIEnabled()) {
        ciIntegration.generateCIOutput(auditResults);
      }
    } else {
      if (!silent) {
        console.log(chalk.blue(`🔍 Running selected audits: ${reports.join(', ')}\n`));
      }
      
      const auditResults = {
        timestamp: new Date().toISOString(),
        categories: {}
      };
      
      for (const reportType of reports) {
        if (auditCategories.includes(reportType)) {
          if (!silent) {
            console.log(chalk.blue(`\n📊 Running ${reportType} audit...`));
          }
          const result = await orchestrator.runSpecificAudit(reportType);
          auditResults.categories[reportType] = result;
        } else if (reportType === 'performance:enhanced') {
          if (!silent) {
            console.log(chalk.blue(`\n🚀 Running Enhanced Performance Audit...`));
          }
          const result = await orchestrator.runEnhancedPerformanceAudit();
          auditResults.categories['performance:enhanced'] = result;
        }
      }
      
      // Generate CI output if enabled
      if (ci || ciIntegration.isCIEnabled()) {
        ciIntegration.generateCIOutput(auditResults);
      }
    }

    // Generate additional reports if requested
    if (reports.includes('eslint') || reports.includes('all')) {
      if (!silent) {
        console.log(chalk.blue('\n📋 Generating ESLint Report...'));
      }
      await generateESLintReport(reportDir, true, projectType, reports);
    }

    if (reports.includes('stylelint') || reports.includes('all')) {
      if (!silent) {
        console.log(chalk.blue('\n📋 Generating Stylelint Report...'));
      }
      await generateStyleLintReport(reportDir, true, projectType, reports);
    }

    // Save error report if any errors occurred
    errorHandler.saveErrorReport(reportDir);
    errorHandler.displayErrorSummary();

    if (!silent) {
      console.log(chalk.green('\n✅ All reports generated successfully!'));
      console.log(chalk.blue(`📁 Reports saved to: ${reportDir}`));
      console.log(chalk.blue('🌐 Open dashboard.html in your browser to view results'));
    }

  } catch (error) {
    await errorHandler.handleError(error, {}, {
      auditType: 'main',
      operation: 'code-insight-init',
      severity: 'high'
    });
    
    if (!silent) {
      console.error(chalk.red('❌ Error during code insight generation:', error.message));
    }
    
    // In CI mode, exit with error code
    if (ci || ciIntegration.isCIEnabled()) {
      process.exit(1);
    }
    
    throw error;
  }
}

/**
 * Initialize configuration file
 */
export async function initConfig() {
  const config = new EnhancedConfig();
  return config.initConfig();
}

/**
 * Create configuration wizard
 */
export async function createConfigWizard() {
  const config = new EnhancedConfig();
  return await config.createConfigWizard();
}

/**
 * Generate CI/CD configurations
 */
export function generateCIConfigs() {
  const ciIntegration = new CIIntegration();
  
  console.log(chalk.blue('🔧 Generating CI/CD Configurations...\n'));
  
  ciIntegration.generateGitHubActionsWorkflow();
  ciIntegration.generateGitLabCIConfig();
  ciIntegration.generateJenkinsPipeline();
  
  console.log(chalk.green('\n✅ All CI/CD configurations generated successfully!'));
  console.log(chalk.blue('📁 Files created:'));
  console.log(chalk.blue('   • .github/workflows/ui-code-insight.yml'));
  console.log(chalk.blue('   • .gitlab-ci.yml'));
  console.log(chalk.blue('   • Jenkinsfile'));
}

/**
 * Validate configuration
 */
export function validateConfig() {
  const config = new EnhancedConfig();
  const validation = config.validateConfig();
  
  if (validation.isValid) {
    console.log(chalk.green('✅ Configuration is valid!'));
    return true;
  } else {
    console.log(chalk.red('❌ Configuration validation failed:'));
    validation.errors.forEach(error => {
      console.log(chalk.red(`   • ${error}`));
    });
    return false;
  }
}
