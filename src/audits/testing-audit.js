import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { globby } from 'globby';
import { writeFile } from 'fs/promises';
import { getConfigPattern } from '../config-loader.js';

const BATCH_SIZE = 5;

/**
 * Testing audit module for detecting testing practices and coverage
 */
export class TestingAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.testingIssues = [];
    this.issuesFile = path.join(this.folderPath, 'testing-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) fs.unlinkSync(this.issuesFile);
    this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
  }

  async addTestingIssue(issue) {
    this.issueStream.write(JSON.stringify(issue) + '\n');
  }

  /**
   * Check for test files and testing framework usage
   */
  async checkTestFiles() {
    console.log(chalk.blue('🧪 Checking test files...'));
    
    const testFiles = await globby(getConfigPattern('jsFilePathPattern'));
    
    if (testFiles.length === 0) {
      await this.addTestingIssue({
        type: 'no_test_files',
        severity: 'high',
        message: 'No test files found',
        recommendation: 'Create test files with .test.js or .spec.js extensions'
      });
    } else {
      await this.addTestingIssue({
        type: 'test_files_found',
        severity: 'info',
        message: `Found ${testFiles.length} test files`,
        positive: true
      });
    }

    // Check for testing frameworks
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const testingFrameworks = [
        'jest', 'mocha', 'vitest', 'ava', 'tape', 'jasmine',
        '@testing-library/react', '@testing-library/jest-dom',
        'cypress', 'playwright', 'puppeteer'
      ];
      
      const foundFrameworks = testingFrameworks.filter(framework => allDeps[framework]);
      
      if (foundFrameworks.length === 0) {
        await this.addTestingIssue({
          type: 'no_testing_framework',
          severity: 'high',
          message: 'No testing framework detected',
          recommendation: 'Install a testing framework like Jest, Mocha, or Vitest'
        });
      } else {
        await this.addTestingIssue({
          type: 'testing_framework_found',
          severity: 'info',
          message: `Testing frameworks detected: ${foundFrameworks.join(', ')}`,
          positive: true
        });
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not read package.json'));
    }
  }

  /**
   * Check for test coverage
   */
  async checkTestCoverage() {
    console.log(chalk.blue('🧪 Checking test coverage...'));
    
    try {
      // Try to run test coverage if available
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};
      
      const coverageScripts = Object.keys(scripts).filter(script => 
        script.includes('test') && (script.includes('coverage') || script.includes('cov'))
      );
      
      if (coverageScripts.length > 0) {
        try {
          const coverageScript = coverageScripts[0];
          execSync(`npm run ${coverageScript}`, { stdio: 'pipe' });
          
          // Look for coverage reports
          const coverageDirs = ['coverage', '.nyc_output'];
          for (const dir of coverageDirs) {
            if (fs.existsSync(dir)) {
              await this.addTestingIssue({
                type: 'coverage_report_generated',
                severity: 'info',
                message: 'Test coverage report generated',
                positive: true
              });
              break;
            }
          }
        } catch (error) {
          await this.addTestingIssue({
            type: 'coverage_failed',
            severity: 'medium',
            message: 'Test coverage generation failed',
            recommendation: 'Check test configuration and ensure tests pass'
          });
        }
      } else {
        await this.addTestingIssue({
          type: 'no_coverage_script',
          severity: 'medium',
          message: 'No test coverage script found',
          recommendation: 'Add a coverage script to package.json (e.g., "test:coverage": "jest --coverage")'
        });
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check test coverage'));
    }
  }

  /**
   * Check for common testing patterns
   */
  async checkTestingPatterns() {
    console.log(chalk.blue('🧪 Checking testing patterns...'));
    
    const testFiles = await globby(getConfigPattern('jsFilePathPattern'));
    let processed = 0;
    for (let i = 0; i < testFiles.length; i += BATCH_SIZE) {
      const batch = testFiles.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Test Patterns] Progress: ${processed}/${testFiles.length} files checked`);
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          getConfigPattern('testPatterns').forEach(({ pattern, name, positive }) => {
            if (pattern.test(line)) {
              if (positive) {
                this.testingIssues.push({
                  type: 'testing_pattern_found',
                  file,
                  line: index + 1,
                  severity: 'info',
                  message: `Testing ${name} detected`,
                  code: line.trim(),
                  positive: true
                });
              }
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read test file ${file}`));
      }
      }));
    }
    process.stdout.write(`\r[Test Patterns] Progress: ${testFiles.length}/${testFiles.length} files checked\n`);
  }

  /**
   * Check for mocking and stubbing patterns
   */
  async checkMockingPatterns() {
    console.log(chalk.blue('🧪 Checking mocking patterns...'));
    
    const testFiles = await globby(getConfigPattern('jsFilePathPattern'));
    let processed = 0;
    for (let i = 0; i < testFiles.length; i += BATCH_SIZE) {
      const batch = testFiles.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Mocking Patterns] Progress: ${processed}/${testFiles.length} files checked`);
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          getConfigPattern('mockPatterns').forEach(({ pattern, name, positive }) => {
            if (pattern.test(line)) {
              if (positive) {
                this.testingIssues.push({
                  type: 'mocking_pattern_found',
                  file,
                  line: index + 1,
                  severity: 'info',
                  message: `${name} detected`,
                  code: line.trim(),
                  positive: true
                });
              }
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read test file ${file}`));
      }
      }));
    }
    process.stdout.write(`\r[Mocking Patterns] Progress: ${testFiles.length}/${testFiles.length} files checked\n`);
  }

  /**
   * Check for E2E testing setup
   */
  async checkE2ETesting() {
    console.log(chalk.blue('🧪 Checking E2E testing setup...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const e2eFrameworks = ['cypress', 'playwright', 'puppeteer', 'selenium-webdriver'];
      const foundE2EFrameworks = e2eFrameworks.filter(framework => allDeps[framework]);
      
      if (foundE2EFrameworks.length === 0) {
        this.testingIssues.push({
          type: 'no_e2e_framework',
          severity: 'medium',
          message: 'No E2E testing framework detected',
          recommendation: 'Consider adding Cypress, Playwright, or Puppeteer for E2E testing'
        });
      } else {
        this.testingIssues.push({
          type: 'e2e_framework_found',
          severity: 'info',
          message: `E2E testing framework detected: ${foundE2EFrameworks.join(', ')}`,
          positive: true
        });
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check E2E testing setup'));
    }
  }

  /**
   * Check for test configuration files
   */
  async checkTestConfiguration() {
    console.log(chalk.blue('🧪 Checking test configuration...'));
    
    const configFiles = [
      'jest.config.js', 'jest.config.ts', 'jest.config.json',
      'cypress.config.js', 'cypress.config.ts',
      'playwright.config.js', 'playwright.config.ts',
      'vitest.config.js', 'vitest.config.ts',
      '.mocharc.js', '.mocharc.json'
    ];
    
    const foundConfigs = configFiles.filter(file => fs.existsSync(file));
    
    if (foundConfigs.length === 0) {
      this.testingIssues.push({
        type: 'no_test_config',
        severity: 'medium',
        message: 'No test configuration file found',
        recommendation: 'Create a configuration file for your testing framework'
      });
    } else {
      this.testingIssues.push({
        type: 'test_config_found',
        severity: 'info',
        message: `Test configuration files found: ${foundConfigs.join(', ')}`,
        positive: true
      });
    }
  }

  /**
   * Run all testing checks
   */
  async runTestingAudit() {
    console.log(chalk.blue('🧪 Starting Testing Audit...'));

    // Check for common test folders or files before running the rest of the audit
    const testPatterns = [
      '**/__tests__/**',
      '**/test/**',
      '**/tests/**',
      '**/*.test.js',
      '**/*.spec.js',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.test.tsx',
      '**/*.spec.tsx',
    ];
    const foundTestFiles = (await globby(testPatterns, { ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/out/**'] })).length > 0;
    if (!foundTestFiles) {
      await this.addTestingIssue({
        type: 'no_test_files',
        severity: 'high',
        message: 'No test files or folders found. Test case not written.',
        recommendation: 'Create test files in __tests__, test, or tests folders, or use .test.js/.spec.js/.test.ts file naming.'
      });
      this.issueStream.end();
      // Write minimal report and return
      const results = {
        timestamp: new Date().toISOString(),
        totalIssues: 1,
        positivePractices: 0,
        highSeverity: 1,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [
          {
            type: 'no_test_files',
            severity: 'high',
            message: 'No test files or folders found. Test case not written.',
            recommendation: 'Create test files in __tests__, test, or tests folders, or use .test.js/.spec.js/.test.ts file naming.'
          }
        ]
      };
      try {
        const reportPath = path.join(this.folderPath, 'testing-audit-report.json');
        await writeFile(reportPath, JSON.stringify(results, null, 2));
        console.log(chalk.green(`✅ Testing audit report saved to: ${reportPath}`));
      } catch (error) {
        console.error(chalk.red('Error saving testing audit report:', error.message));
      }
      // Display summary
      console.log(chalk.blue('\n🧪 TESTING AUDIT SUMMARY'));
      console.log(chalk.blue('='.repeat(40)));
      console.log(chalk.white('Total Issues: 1'));
      console.log(chalk.green('Positive Practices: 0'));
      console.log(chalk.red('High Severity: 1'));
      console.log(chalk.yellow('Medium Severity: 0'));
      console.log(chalk.blue('Low Severity: 0'));
      return results;
    }
    
    await this.checkTestFiles();
    await this.checkTestCoverage();
    await this.checkTestingPatterns();
    await this.checkMockingPatterns();
    await this.checkE2ETesting();
    await this.checkTestConfiguration();
    
    this.issueStream.end();
    // Load issues from file
    if (fs.existsSync(this.issuesFile)) {
      const lines = fs.readFileSync(this.issuesFile, 'utf8').split('\n').filter(Boolean);
      const seen = new Set();
      const uniqueIssues = [];
      for (const line of lines) {
        try {
          const issue = JSON.parse(line);
          if (!issue.source) issue.source = 'custom';
          const key = `${issue.file || ''}:${issue.line || ''}:${issue.type}:${issue.message}`;
          if (!seen.has(key)) {
            uniqueIssues.push(issue);
            seen.add(key);
          }
        } catch {}
      }
      this.testingIssues = uniqueIssues;
    }

    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.testingIssues.length,
      positivePractices: this.testingIssues.filter(issue => issue.positive).length,
      highSeverity: this.testingIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.testingIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.testingIssues.filter(issue => issue.severity === 'low').length,
      issues: this.testingIssues
    };

    // Generate JSON report
    try {
      const reportPath = path.join(this.folderPath, 'testing-audit-report.json');
      await writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`✅ Testing audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving testing audit report:', error.message));
    }

    // Display summary
    console.log(chalk.blue('\n🧪 TESTING AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(40)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.green(`Positive Practices: ${results.positivePractices}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));

    return results;
  }
} 