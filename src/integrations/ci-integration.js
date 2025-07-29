import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { ErrorHandler } from '../utils/error-handler.js';

/**
 * CI/CD Integration system for UI Code Insight
 * Supports GitHub Actions, GitLab CI, and Jenkins
 */
export class CIIntegration {
  constructor() {
    this.errorHandler = new ErrorHandler();
    this.ciPlatform = this.detectCIPlatform();
    this.config = this.loadCIConfig();
  }

  /**
   * Detect CI platform
   */
  detectCIPlatform() {
    if (process.env.GITHUB_ACTIONS === 'true') {
      return 'github-actions';
    } else if (process.env.GITLAB_CI === 'true') {
      return 'gitlab-ci';
    } else if (process.env.JENKINS_URL) {
      return 'jenkins';
    } else if (process.env.CIRCLECI) {
      return 'circleci';
    } else if (process.env.TRAVIS) {
      return 'travis';
    } else {
      return 'local';
    }
  }

  /**
   * Load CI configuration
   */
  loadCIConfig() {
    const configPath = path.join(process.cwd(), 'ui-code-insight.config.json');
    
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.ci || {};
      }
    } catch (error) {
      this.errorHandler.handleError(error, {}, {
        auditType: 'ci',
        operation: 'config-load',
        severity: 'low'
      });
    }

    return {
      enabled: false,
      failOnHigh: true,
      thresholds: {
        security: 0,
        accessibility: 5,
        performance: 10,
        dependency: 0
      }
    };
  }

  /**
   * Check if CI mode is enabled
   */
  isCIEnabled() {
    return this.config.enabled && this.ciPlatform !== 'local';
  }

  /**
   * Generate CI-specific output
   */
  generateCIOutput(auditResults) {
    if (!this.isCIEnabled()) {
      return;
    }

    console.log(chalk.blue('\n🔧 CI/CD Integration'));
    console.log(chalk.blue('='.repeat(30)));

    const summary = this.calculateSummary(auditResults);
    const passed = this.checkThresholds(summary);

    this.outputCISummary(summary, passed);
    this.generateCIArtifacts(auditResults);

    if (!passed && this.config.failOnHigh) {
      console.log(chalk.red('\n❌ Quality gates failed!'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n✅ Quality gates passed!'));
    }
  }

  /**
   * Calculate audit summary for CI
   */
  calculateSummary(auditResults) {
    const summary = {
      security: { high: 0, medium: 0, low: 0, total: 0 },
      accessibility: { high: 0, medium: 0, low: 0, total: 0 },
      performance: { high: 0, medium: 0, low: 0, total: 0 },
      dependency: { high: 0, medium: 0, low: 0, total: 0 },
      lighthouse: { high: 0, medium: 0, low: 0, total: 0 }
    };

    if (auditResults.categories) {
      Object.entries(auditResults.categories).forEach(([category, results]) => {
        if (results && summary[category]) {
          summary[category].high = results.highSeverity || 0;
          summary[category].medium = results.mediumSeverity || 0;
          summary[category].low = results.lowSeverity || 0;
          summary[category].total = results.totalIssues || 0;
        }
      });
    }

    return summary;
  }

  /**
   * Check if results meet CI thresholds
   */
  checkThresholds(summary) {
    const thresholds = this.config.thresholds;
    let passed = true;

    Object.entries(thresholds).forEach(([category, threshold]) => {
      const categorySummary = summary[category];
      if (categorySummary && categorySummary.high > threshold) {
        console.log(chalk.red(`❌ ${category}: ${categorySummary.high} high issues (threshold: ${threshold})`));
        passed = false;
      }
    });

    return passed;
  }

  /**
   * Output CI summary
   */
  outputCISummary(summary, passed) {
    console.log(chalk.white('\n📊 CI Summary:'));
    
    Object.entries(summary).forEach(([category, stats]) => {
      const color = stats.high > 0 ? chalk.red : stats.medium > 0 ? chalk.yellow : chalk.green;
      console.log(color(`  ${category}: ${stats.high}H ${stats.medium}M ${stats.low}L (${stats.total} total)`));
    });

    console.log(chalk.white(`\nStatus: ${passed ? '✅ PASSED' : '❌ FAILED'}`));
  }

  /**
   * Generate CI artifacts
   */
  generateCIArtifacts(auditResults) {
    const artifactsDir = process.env.CI_ARTIFACTS_DIR || 'report';
    
    try {
      // Generate JUnit XML for CI systems
      this.generateJUnitXML(auditResults, artifactsDir);
      
      // Generate SARIF for GitHub Security
      this.generateSARIF(auditResults, artifactsDir);
      
      // Generate summary JSON
      this.generateSummaryJSON(auditResults, artifactsDir);
      
      console.log(chalk.blue(`📁 CI artifacts saved to: ${artifactsDir}`));
    } catch (error) {
      this.errorHandler.handleError(error, {}, {
        auditType: 'ci',
        operation: 'artifact-generation',
        severity: 'low'
      });
    }
  }

  /**
   * Generate JUnit XML for CI systems
   */
  generateJUnitXML(auditResults, outputDir) {
    const xml = this.buildJUnitXML(auditResults);
    const xmlPath = path.join(outputDir, 'ui-code-insight-junit.xml');
    
    fs.writeFileSync(xmlPath, xml);
  }

  /**
   * Build JUnit XML content
   */
  buildJUnitXML(auditResults) {
    const timestamp = new Date().toISOString();
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<testsuites timestamp="${timestamp}">\n`;
    
    if (auditResults.categories) {
      Object.entries(auditResults.categories).forEach(([category, results]) => {
        if (results) {
          xml += `  <testsuite name="${category}" tests="${results.totalIssues || 0}" failures="${results.highSeverity || 0}">\n`;
          
          if (results.issues && results.issues.length > 0) {
            results.issues.forEach(issue => {
              const severity = issue.severity || 'medium';
              const isFailure = severity === 'high';
              xml += `    <testcase name="${this.escapeXML(issue.message)}" classname="${category}">\n`;
              
              if (isFailure) {
                xml += `      <failure message="${this.escapeXML(issue.message)}" type="${severity}">\n`;
                xml += `        ${this.escapeXML(issue.code || '')}\n`;
                xml += `      </failure>\n`;
              }
              
              xml += `    </testcase>\n`;
            });
          }
          
          xml += `  </testsuite>\n`;
        }
      });
    }
    
    xml += `</testsuites>`;
    return xml;
  }

  /**
   * Generate SARIF for GitHub Security
   */
  generateSARIF(auditResults, outputDir) {
    const sarif = this.buildSARIF(auditResults);
    const sarifPath = path.join(outputDir, 'ui-code-insight.sarif');
    
    fs.writeFileSync(sarifPath, JSON.stringify(sarif, null, 2));
  }

  /**
   * Build SARIF content
   */
  buildSARIF(auditResults) {
    const sarif = {
      $schema: "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0-rtm.5.json",
      version: "2.1.0",
      runs: [{
        tool: {
          driver: {
            name: "UI Code Insight",
            version: "2.2.0",
            informationUri: "https://github.com/deepak121001/ui-code-insight"
          }
        },
        results: []
      }]
    };

    if (auditResults.categories) {
      Object.entries(auditResults.categories).forEach(([category, results]) => {
        if (results && results.issues) {
          results.issues.forEach(issue => {
            const sarifResult = {
              ruleId: `${category}-${issue.type || 'issue'}`,
              level: issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'note',
              message: {
                text: issue.message
              },
              locations: [{
                physicalLocation: {
                  artifactLocation: {
                    uri: issue.file ? path.relative(process.cwd(), issue.file) : 'unknown'
                  },
                  region: issue.line ? {
                    startLine: issue.line,
                    startColumn: issue.column || 1
                  } : undefined
                }
              }]
            };
            
            sarif.runs[0].results.push(sarifResult);
          });
        }
      });
    }

    return sarif;
  }

  /**
   * Generate summary JSON for CI
   */
  generateSummaryJSON(auditResults, outputDir) {
    const summary = {
      timestamp: new Date().toISOString(),
      ci_platform: this.ciPlatform,
      summary: this.calculateSummary(auditResults),
      thresholds: this.config.thresholds,
      passed: this.checkThresholds(this.calculateSummary(auditResults))
    };

    const summaryPath = path.join(outputDir, 'ci-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  }

  /**
   * Escape XML content
   */
  escapeXML(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate GitHub Actions workflow
   */
  generateGitHubActionsWorkflow() {
    const workflow = `name: UI Code Insight Audit

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  code-audit:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run UI Code Insight Audit
      run: npx ui-code-insight --ci --silent
    
    - name: Upload audit results
      uses: actions/upload-artifact@v3
      with:
        name: audit-results
        path: report/
    
    - name: Upload SARIF
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: report/ui-code-insight.sarif
`;

    const workflowPath = '.github/workflows/ui-code-insight.yml';
    const workflowDir = path.dirname(workflowPath);
    
    if (!fs.existsSync(workflowDir)) {
      fs.mkdirSync(workflowDir, { recursive: true });
    }
    
    fs.writeFileSync(workflowPath, workflow);
    console.log(chalk.green(`✅ GitHub Actions workflow created: ${workflowPath}`));
  }

  /**
   * Generate GitLab CI configuration
   */
  generateGitLabCIConfig() {
    const config = `stages:
  - audit

code-audit:
  stage: audit
  image: node:18
  script:
    - npm ci
    - npx ui-code-insight --ci --silent
  artifacts:
    paths:
      - report/
    reports:
      junit: report/ui-code-insight-junit.xml
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
`;

    const configPath = '.gitlab-ci.yml';
    fs.writeFileSync(configPath, config);
    console.log(chalk.green(`✅ GitLab CI configuration created: ${configPath}`));
  }

  /**
   * Generate Jenkins pipeline
   */
  generateJenkinsPipeline() {
    const pipeline = `pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Code Audit') {
            steps {
                sh 'npx ui-code-insight --ci --silent'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'report/**/*', fingerprint: true
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'report',
                        reportFiles: 'index.html',
                        reportName: 'UI Code Insight Report'
                    ])
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}`;

    const pipelinePath = 'Jenkinsfile';
    fs.writeFileSync(pipelinePath, pipeline);
    console.log(chalk.green(`✅ Jenkins pipeline created: ${pipelinePath}`));
  }
}

export default CIIntegration; 