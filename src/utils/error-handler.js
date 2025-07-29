import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * Enhanced error handling system for UI Code Insight
 * Provides graceful degradation, retry mechanisms, and detailed error reporting
 */
export class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Handle errors with graceful degradation
   */
  async handleError(error, context = {}, options = {}) {
    const {
      auditType = 'unknown',
      operation = 'unknown',
      retry = true,
      fallback = null,
      severity = 'medium'
    } = options;

    const errorInfo = {
      timestamp: new Date().toISOString(),
      auditType,
      operation,
      message: error.message,
      stack: error.stack,
      severity,
      context
    };

    this.errorLog.push(errorInfo);

    // Log error with context
    this.logError(errorInfo);

    // Try retry mechanism if enabled
    if (retry && this.shouldRetry(auditType, operation)) {
      return await this.retryOperation(errorInfo, fallback);
    }

    // Use fallback if provided
    if (fallback) {
      console.log(chalk.yellow(`⚠️  Using fallback for ${auditType} ${operation}`));
      return fallback;
    }

    // Return graceful degradation result
    return this.getGracefulDegradationResult(auditType, operation);
  }

  /**
   * Log error with proper formatting
   */
  logError(errorInfo) {
    const { auditType, operation, message, severity } = errorInfo;
    
    const severityColors = {
      low: chalk.blue,
      medium: chalk.yellow,
      high: chalk.red,
      critical: chalk.red.bold
    };

    const color = severityColors[severity] || chalk.yellow;
    
    console.error(color(`\n❌ Error in ${auditType} audit - ${operation}:`));
    console.error(chalk.gray(`   ${message}`));
    
    if (process.env.NODE_ENV === 'development') {
      console.error(chalk.gray(`   Stack: ${errorInfo.stack}`));
    }
  }

  /**
   * Check if operation should be retried
   */
  shouldRetry(auditType, operation) {
    const key = `${auditType}:${operation}`;
    const attempts = this.retryAttempts.get(key) || 0;
    return attempts < this.maxRetries;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation(errorInfo, fallback) {
    const { auditType, operation } = errorInfo;
    const key = `${auditType}:${operation}`;
    const attempts = (this.retryAttempts.get(key) || 0) + 1;
    
    this.retryAttempts.set(key, attempts);
    
    console.log(chalk.yellow(`🔄 Retrying ${auditType} ${operation} (attempt ${attempts}/${this.maxRetries})`));
    
    // Exponential backoff
    const delay = this.retryDelay * Math.pow(2, attempts - 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // If max retries reached, use fallback or graceful degradation
    if (attempts >= this.maxRetries) {
      console.log(chalk.red(`❌ Max retries reached for ${auditType} ${operation}`));
      return fallback || this.getGracefulDegradationResult(auditType, operation);
    }
    
    // Return null to indicate retry should be attempted
    return null;
  }

  /**
   * Get graceful degradation result
   */
  getGracefulDegradationResult(auditType, operation) {
    const defaultResults = {
      security: {
        totalIssues: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [],
        message: 'Security audit failed - using safe defaults'
      },
      performance: {
        totalIssues: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [],
        message: 'Performance audit failed - using safe defaults'
      },
      accessibility: {
        totalIssues: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [],
        message: 'Accessibility audit failed - using safe defaults'
      },
      lighthouse: {
        totalIssues: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [],
        scores: {},
        urls: [],
        message: 'Lighthouse audit failed - using safe defaults'
      },
      dependency: {
        totalIssues: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [],
        message: 'Dependency audit failed - using safe defaults'
      }
    };

    return defaultResults[auditType] || {
      totalIssues: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0,
      issues: [],
      message: `${auditType} audit failed - using safe defaults`
    };
  }

  /**
   * Create fallback configuration
   */
  createFallbackConfig(auditType) {
    const fallbacks = {
      eslint: {
        configFile: 'eslintrc.simple.json',
        useDefaultRules: true,
        ignoreErrors: true
      },
      stylelint: {
        configFile: 'stylelintrc.simple.json',
        useDefaultRules: true,
        ignoreErrors: true
      },
      lighthouse: {
        useBasicConfig: true,
        skipAudits: ['performance', 'accessibility'],
        basicOnly: true
      },
      accessibility: {
        useBasicChecks: true,
        skipLiveTesting: true,
        basicScanOnly: true
      }
    };

    return fallbacks[auditType] || {};
  }

  /**
   * Validate file existence and permissions
   */
  validateFileAccess(filePath, operation = 'read') {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      if (operation === 'read') {
        fs.accessSync(filePath, fs.constants.R_OK);
      } else if (operation === 'write') {
        fs.accessSync(path.dirname(filePath), fs.constants.W_OK);
      }
      
      return true;
    } catch (error) {
      this.handleError(error, { filePath, operation }, {
        auditType: 'file-system',
        operation: 'file-access',
        severity: 'medium'
      });
      return false;
    }
  }

  /**
   * Handle network errors
   */
  async handleNetworkError(error, url, operation) {
    const networkError = {
      message: `Network error for ${operation}: ${error.message}`,
      url,
      operation,
      code: error.code || 'UNKNOWN'
    };

    return await this.handleError(error, networkError, {
      auditType: 'network',
      operation,
      severity: 'medium',
      retry: true,
      fallback: { success: false, message: 'Network operation failed' }
    });
  }

  /**
   * Handle tool execution errors
   */
  async handleToolError(error, tool, operation) {
    const toolError = {
      message: `${tool} execution failed: ${error.message}`,
      tool,
      operation,
      command: error.command || 'unknown'
    };

    return await this.handleError(error, toolError, {
      auditType: 'tool-execution',
      operation,
      severity: 'high',
      retry: false,
      fallback: this.createFallbackConfig(tool)
    });
  }

  /**
   * Handle configuration errors
   */
  async handleConfigError(error, configType) {
    const configError = {
      message: `Configuration error in ${configType}: ${error.message}`,
      configType,
      path: error.path || 'unknown'
    };

    return await this.handleError(error, configError, {
      auditType: 'configuration',
      operation: 'config-load',
      severity: 'medium',
      retry: false,
      fallback: this.createFallbackConfig(configType)
    });
  }

  /**
   * Generate error report
   */
  generateErrorReport() {
    if (this.errorLog.length === 0) {
      return null;
    }

    const report = {
      timestamp: new Date().toISOString(),
      totalErrors: this.errorLog.length,
      errorsByType: {},
      errorsBySeverity: {},
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    this.errorLog.forEach(error => {
      // Count by audit type
      if (!report.errorsByType[error.auditType]) {
        report.errorsByType[error.auditType] = 0;
      }
      report.errorsByType[error.auditType]++;

      // Count by severity
      if (!report.errorsBySeverity[error.severity]) {
        report.errorsBySeverity[error.severity] = 0;
      }
      report.errorsBySeverity[error.severity]++;

      // Update summary
      if (report.summary[error.severity] !== undefined) {
        report.summary[error.severity]++;
      }
    });

    return report;
  }

  /**
   * Save error report to file
   */
  saveErrorReport(reportDir) {
    const report = this.generateErrorReport();
    if (!report) return;

    try {
      const reportPath = path.join(reportDir, 'error-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(chalk.blue(`📄 Error report saved to: ${reportPath}`));
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not save error report:', error.message));
    }
  }

  /**
   * Display error summary
   */
  displayErrorSummary() {
    const report = this.generateErrorReport();
    if (!report) return;

    console.log(chalk.blue('\n📋 ERROR SUMMARY'));
    console.log(chalk.blue('='.repeat(30)));
    console.log(chalk.white(`Total Errors: ${report.totalErrors}`));
    
    Object.entries(report.summary).forEach(([severity, count]) => {
      if (count > 0) {
        const color = severity === 'critical' ? chalk.red.bold : 
                     severity === 'high' ? chalk.red :
                     severity === 'medium' ? chalk.yellow : chalk.blue;
        console.log(color(`${severity.toUpperCase()}: ${count}`));
      }
    });

    if (report.totalErrors > 0) {
      console.log(chalk.yellow('\n💡 Some audits may have incomplete results due to errors.'));
      console.log(chalk.yellow('   Check the error report for details.'));
    }
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
    this.retryAttempts.clear();
  }
}

export default ErrorHandler; 