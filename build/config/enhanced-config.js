import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Enhanced configuration system for UI Code Insight
 * Provides better defaults, validation, and customization options
 */
export class EnhancedConfig {
  constructor() {
    this.configPath = path.join(process.cwd(), 'ui-code-insight.config.json');
    this.defaultConfig = this.getDefaultConfig();
    this.config = this.loadConfig();
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      version: '2.2.0',
      audits: {
        security: {
          enabled: true,
          liveUrlTest: true,
          codeScan: true,
          severity: ['high', 'medium', 'low']
        },
        performance: {
          enabled: true,
          bundleAnalysis: true,
          codeOptimization: true,
          severity: ['high', 'medium']
        },
        accessibility: {
          enabled: true,
          useAxeCore: true,
          liveUrlTest: true,
          codeScan: true,
          severity: ['high', 'medium', 'low']
        },
        lighthouse: {
          enabled: true,
          mobile: true,
          desktop: true,
          categories: ['performance', 'accessibility', 'best-practices', 'seo']
        },
        dependency: {
          enabled: true,
          securityVulnerabilities: true,
          outdatedPackages: true,
          unusedDependencies: true,
          severity: ['high', 'medium']
        }
      },
      reporting: {
        format: ['html', 'json'],
        severity: ['high', 'medium', 'low'],
        export: true,
        dashboard: true,
        progress: true
      },
      codeDisplay: {
        enabled: true,
        syntaxHighlighting: true,
        maxLength: 500,
        showContext: true,
        showFixes: true,
        showRemediation: true,
        themes: {
          light: {
            background: 'bg-gray-50',
            border: 'border-gray-200',
            text: 'text-gray-800',
            keyword: 'text-purple-600',
            string: 'text-green-600',
            comment: 'text-gray-500',
            number: 'text-blue-600',
            function: 'text-orange-600'
          },
          dark: {
            background: 'bg-gray-900',
            border: 'border-gray-700',
            text: 'text-gray-200',
            keyword: 'text-purple-400',
            string: 'text-green-400',
            comment: 'text-gray-500',
            number: 'text-blue-400',
            function: 'text-orange-400'
          }
        },
        languages: {
          javascript: ['js', 'jsx', 'ts', 'tsx'],
          css: ['css', 'scss', 'less'],
          html: ['html', 'htm'],
          json: ['json'],
          yaml: ['yml', 'yaml']
        }
      },
      ci: {
        enabled: false,
        failOnHigh: true,
        thresholds: {
          security: 0,
          accessibility: 5,
          performance: 10,
          dependency: 0
        },
        notifications: {
          slack: false,
          teams: false,
          email: false
        }
      },
      performance: {
        batchSize: 25,
        memoryThreshold: 0.7,
        maxFilesPerBatch: 500,
        parallelProcessing: true,
        caching: false
      },
      filePatterns: {
        js: [
          "./src/**/*.js",
          "./src/**/*.ts",
          "./src/**/*.jsx",
          "./src/**/*.tsx"
        ],
        html: [
          "**/*.{html,js,ts,jsx,tsx}"
        ],
        css: [
          "**/*.{scss,css,less}"
        ],
        exclude: [
          "node_modules/",
          "dist/",
          "build/",
          "coverage/",
          "report/",
          "reports/",
          "*.log",
          ".vscode/",
          ".idea/",
          "*.min.js",
          "*.min.css",
          "*.bundle.js",
          "*.bundle.css",
          "__tests__/",
          "test/",
          "tests/",
          "*.test.js",
          "*.test.ts",
          "*.test.jsx",
          "*.test.tsx",
          "*.spec.js",
          "*.spec.ts",
          "*.spec.jsx",
          "*.spec.tsx",
          "docs/",
          "*.md",
          "!.README.md",
          ".tmp/",
          ".cache/",
          ".temp/",
          ".git/"
        ]
      },
      integrations: {
        github: {
          enabled: false,
          token: null,
          repository: null
        },
        jira: {
          enabled: false,
          url: null,
          username: null,
          token: null
        },
        slack: {
          enabled: false,
          webhook: null,
          channel: null
        }
      }
    };
  }

  /**
   * Load configuration from file or create default
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        const userConfig = JSON.parse(fileContent);
        return this.mergeConfig(this.defaultConfig, userConfig);
      } else {
        console.log(chalk.blue('📝 No configuration file found. Using default settings.'));
        console.log(chalk.blue('💡 Run "ui-code-insight --init-config" to create a custom configuration.'));
        return this.defaultConfig;
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Error loading configuration, using defaults:', error.message));
      return this.defaultConfig;
    }
  }

  /**
   * Merge user configuration with defaults
   */
  mergeConfig(defaults, userConfig) {
    const merged = { ...defaults };
    
    // Deep merge for nested objects
    for (const [key, value] of Object.entries(userConfig)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = this.mergeConfig(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  /**
   * Save configuration to file
   */
  saveConfig(config = this.config) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log(chalk.green(`✅ Configuration saved to: ${this.configPath}`));
      return true;
    } catch (error) {
      console.error(chalk.red('❌ Error saving configuration:', error.message));
      return false;
    }
  }

  /**
   * Initialize configuration file
   */
  initConfig() {
    if (fs.existsSync(this.configPath)) {
      console.log(chalk.yellow('⚠️  Configuration file already exists.'));
      return false;
    }
    
    return this.saveConfig();
  }

  /**
   * Validate configuration
   */
  validateConfig(config = this.config) {
    const errors = [];
    
    // Validate audit settings
    for (const [auditName, auditConfig] of Object.entries(config.audits)) {
      if (typeof auditConfig.enabled !== 'boolean') {
        errors.push(`${auditName}.enabled must be a boolean`);
      }
      
      if (auditConfig.severity && !Array.isArray(auditConfig.severity)) {
        errors.push(`${auditName}.severity must be an array`);
      }
    }
    
    // Validate reporting settings
    if (!Array.isArray(config.reporting.format)) {
      errors.push('reporting.format must be an array');
    }
    
    // Validate performance settings
    if (typeof config.performance.batchSize !== 'number' || config.performance.batchSize < 1) {
      errors.push('performance.batchSize must be a positive number');
    }
    
    if (typeof config.performance.memoryThreshold !== 'number' || 
        config.performance.memoryThreshold < 0 || 
        config.performance.memoryThreshold > 1) {
      errors.push('performance.memoryThreshold must be between 0 and 1');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get audit configuration
   */
  getAuditConfig(auditName) {
    return this.config.audits[auditName] || null;
  }

  /**
   * Check if audit is enabled
   */
  isAuditEnabled(auditName) {
    const auditConfig = this.getAuditConfig(auditName);
    return auditConfig ? auditConfig.enabled : false;
  }

  /**
   * Get file patterns
   */
  getFilePatterns() {
    return this.config.filePatterns;
  }

  /**
   * Get performance settings
   */
  getPerformanceSettings() {
    return this.config.performance;
  }

  /**
   * Get CI settings
   */
  getCISettings() {
    return this.config.ci;
  }

  /**
   * Get integration settings
   */
  getIntegrationSettings() {
    return this.config.integrations;
  }

  /**
   * Update configuration
   */
  updateConfig(updates) {
    this.config = this.mergeConfig(this.config, updates);
    return this.saveConfig();
  }

  /**
   * Create configuration wizard
   */
  async createConfigWizard() {
    console.log(chalk.blue('🎯 UI Code Insight Configuration Wizard'));
    console.log(chalk.blue('='.repeat(50)));
    
    // This would be implemented with inquirer prompts
    // For now, we'll create a basic configuration
    const wizardConfig = {
      audits: {
        security: { enabled: true, liveUrlTest: true },
        performance: { enabled: true, bundleAnalysis: true },
        accessibility: { enabled: true, useAxeCore: true },
        lighthouse: { enabled: true, mobile: true, desktop: true },
        dependency: { enabled: true, securityVulnerabilities: true }
      },
      reporting: {
        format: ['html', 'json'],
        severity: ['high', 'medium', 'low'],
        export: true
      },
      performance: {
        batchSize: 25,
        memoryThreshold: 0.7,
        parallelProcessing: true
      }
    };
    
    this.updateConfig(wizardConfig);
    console.log(chalk.green('✅ Configuration wizard completed!'));
  }
}

export default EnhancedConfig; 