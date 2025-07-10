import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { globby } from 'globby';
import { writeFile } from 'fs/promises';
import { assetGlobs } from './file-globs.js';
import { getConfigPattern } from '../config-loader.js';
import fsp from "fs/promises";
import { ESLint } from "eslint";
import { fileURLToPath } from "url";

const CONFIG_FOLDER = "config";
const ESLINTRC_JSON = ".eslintrc.json";
const getLintConfigFile = (recommendedLintRules = false, projectType = '') => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let configFileName = ESLINTRC_JSON;
  const configFilePath = path.join(__dirname, CONFIG_FOLDER, configFileName);
  if (fs.existsSync(configFilePath)) return configFilePath;
  return null;
};

async function getCodeContext(filePath, line, contextRadius = 2) {
  try {
    const content = await fsp.readFile(filePath, "utf8");
    const lines = content.split('\n');
    const idx = line - 1;
    const start = Math.max(0, idx - contextRadius);
    const end = Math.min(lines.length - 1, idx + contextRadius);
    const code = (lines[idx] || '').slice(0, 200) + ((lines[idx] || '').length > 200 ? '... (truncated)' : '');
    const context = lines.slice(start, end + 1)
      .map((l, i) => {
        const n = start + i + 1;
        let lineText = l.length > 200 ? l.slice(0, 200) + '... (truncated)' : l;
        const marker = n === line ? '>>>' : '   ';
        return `${marker} ${n}: ${lineText}`;
      }).join('\n');
    return { code, context };
  } catch {
    return { code: '', context: '' };
  }
}

/**
 * Performance audit module for detecting performance issues
 */
export class PerformanceAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.performanceIssues = [];
    this.issuesFile = path.join(this.folderPath, 'performance-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) fs.unlinkSync(this.issuesFile);
    this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
  }

  async addPerformanceIssue(issue) {
    this.issueStream.write(JSON.stringify(issue) + '\n');
  }

  /**
   * Check for large bundle sizes
   */
  async checkBundleSize() {
    console.log(chalk.blue('⚡ Checking bundle sizes...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};
      
      // Check if build script exists and run it to analyze bundle
      if (scripts.build) {
        try {
          execSync('npm run build', { stdio: 'pipe' });
          
          // Look for build output directories
          const buildDirs = ['dist', 'build', 'out'];
          for (const dir of buildDirs) {
            if (fs.existsSync(dir)) {
              const files = await globby([`${dir}/**/*.{js,css}`]);
              let totalSize = 0;
              
              for (const file of files) {
                const stats = fs.statSync(file);
                totalSize += stats.size;
              }
              
              const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
              
              if (totalSize > 1024 * 1024) { // 1MB threshold
                await this.addPerformanceIssue({
                  type: 'large_bundle',
                  severity: 'medium',
                  message: `Bundle size is ${sizeInMB}MB, consider code splitting`,
                  recommendation: 'Implement code splitting and lazy loading'
                });
              }
            }
          }
        } catch (error) {
          console.warn(chalk.yellow('Warning: Could not run build script'));
        }
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not read package.json'));
    }
  }

  /**
   * Check for inefficient loops and operations
   */
  async checkInefficientOperations() {
    console.log(chalk.blue('⚡ Checking for inefficient operations...'));
    const inefficientPatterns = [
      {
        pattern: /for\s*\(\s*let\s+\w+\s*=\s*0;\s*\w+\s*<\s*array\.length;\s*\w+\+\+\)/g,
        message: 'Consider using forEach or for...of instead of traditional for loop',
        severity: 'low'
      },
      {
        pattern: /\.map\(.*\)\.filter\(.*\)/g,
        message: 'Consider combining map and filter operations',
        severity: 'low'
      },
      {
        pattern: /\.filter\(.*\)\.map\(.*\)/g,
        message: 'Consider combining filter and map operations',
        severity: 'low'
      },
      {
        pattern: /JSON\.parse\(JSON\.stringify\(/g,
        message: 'Deep cloning with JSON.parse/stringify is inefficient',
        severity: 'medium'
      },
      {
        pattern: /\.innerHTML\s*=\s*['"`][^'"`]*['"`]/g,
        message: 'Consider using textContent for text-only content',
        severity: 'low'
      }
    ];

    try {
      const files = await globby(getConfigPattern('jsFilePathPattern'), { absolute: true });
      for (const file of files) {
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            for (const { pattern, message, severity } of inefficientPatterns) {
              if (pattern.test(line)) {
                const { code, context } = await getCodeContext(file, index + 1);
                await this.addPerformanceIssue({
                  type: 'inefficient_operation',
                  file,
                  line: index + 1,
                  severity,
                  message,
                  code,
                  context,
                  source: 'custom'
                });
              }
            }
          }
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
        }
      }
    } catch (err) {
      console.error(chalk.red(`❌ Failed to glob files: ${err.message}`));
    }
  }

  /**
   * Check for memory leaks
   */
  async checkMemoryLeaks() {
    console.log(chalk.blue('⚡ Checking for potential memory leaks...'));
    const memoryLeakPatterns = [
      {
        pattern: /addEventListener\([^)]+\)(?!\s*removeEventListener)/g,
        message: 'Event listener added without removal - potential memory leak',
        severity: 'medium'
      },
      {
        pattern: /setInterval\([^)]+\)(?!\s*clearInterval)/g,
        message: 'setInterval used without clearInterval - potential memory leak',
        severity: 'high'
      },
      {
        pattern: /setTimeout\([^)]+\)(?!\s*clearTimeout)/g,
        message: 'setTimeout used without clearTimeout - potential memory leak',
        severity: 'medium'
      }
    ];

    try {
      const files = await globby(getConfigPattern('jsFilePathPattern'), { absolute: true });
      for (const file of files) {
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            for (const { pattern, message, severity } of memoryLeakPatterns) {
              if (pattern.test(line)) {
                const { code, context } = await getCodeContext(file, index + 1);
                await this.addPerformanceIssue({
                  type: 'memory_leak',
                  file,
                  line: index + 1,
                  severity,
                  message,
                  code,
                  context,
                  source: 'custom'
                });
              }
            }
          }
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
        }
      }
    } catch (err) {
      console.error(chalk.red(`❌ Failed to glob files: ${err.message}`));
    }
  }

  /**
   * Check for large dependencies
   */
  async checkLargeDependencies() {
    console.log(chalk.blue('⚡ Checking for large dependencies...'));
    try {
      const data = await fsp.readFile("package.json", "utf8");
      const packageJson = JSON.parse(data);
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      const largePackages = [
        'lodash', 'moment', 'date-fns', 'ramda', 'immutable',
        'bootstrap', 'material-ui', 'antd', 'semantic-ui',
      ];
      largePackages.forEach(async pkg => {
        if (allDeps[pkg]) {
          await this.addPerformanceIssue({
            type: 'large_dependency',
            package: pkg,
            severity: 'low',
            message: `Large dependency detected: ${pkg}`,
            recommendation: 'Consider using lighter alternatives or tree-shaking',
          });
        }
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(chalk.yellow('No package.json found in this directory. Please run the audit from the root of a Node.js project.'));
      } else {
        console.warn(chalk.yellow('Warning: Could not read package.json'));
        console.warn(chalk.gray(error.message));
      }
    }
  }

  /**
   * Check for unused imports and dead code
   */
  async checkUnusedCode() {
    console.log(chalk.blue('⚡ Checking for unused code...'));
    try {
      const eslintConfig = getLintConfigFile();
      if (!eslintConfig) {
        throw new Error(".eslintrc file is missing");
      }
      const eslint = new ESLint({
        useEslintrc: false,
        overrideConfigFile: eslintConfig,
      });
      const files = await globby(getConfigPattern('jsFilePathPattern'));
      const results = await eslint.lintFiles(files);
      for (const file of results) {
        for (const message of file.messages) {
          if (
            message.ruleId === 'no-unused-vars' ||
            message.ruleId === '@typescript-eslint/no-unused-vars'
          ) {
            const { code, context } = await getCodeContext(file.filePath, message.line);
            await this.addPerformanceIssue({
              type: 'unused_code',
              file: file.filePath,
              line: message.line,
              severity: 'low',
              message: 'Unused variable or import detected',
              ruleId: message.ruleId,
              code,
              context,
              source: 'eslint'
            });
          }
        }
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not run ESLint for unused code check'));
      if (error && error.message) {
        console.warn(chalk.yellow(error.message));
      }
    }
  }

  /**
   * Detect synchronous/blocking code in async contexts
   */
  async checkBlockingCodeInAsync() {
    console.log(chalk.blue('⚡ Checking for blocking code in async contexts...'));
    try {
      const files = await globby(getConfigPattern('jsFilePathPattern'), { absolute: true });
      const blockingPatterns = [
        /while\s*\(true\)/i,
        /for\s*\(.*;.*;.*\)/i,
        /setTimeout\s*\(.*,[^)]{5,}\)/i, // setTimeout with long duration
        /setInterval\s*\(.*,[^)]{5,}\)/i
      ];
      for (const file of files) {
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          let inAsync = false;
          lines.forEach(async (line, index) => {
            if (/async\s+function|async\s*\(/.test(line)) inAsync = true;
            if (inAsync) {
              for (const pattern of blockingPatterns) {
                if (pattern.test(line)) {
                  const { code, context } = await getCodeContext(file, index + 1);
                  await this.addPerformanceIssue({
                    type: 'blocking_code_in_async',
                    file,
                    line: index + 1,
                    severity: 'medium',
                    message: 'Potential blocking code in async context',
                    code,
                    context,
                    source: "custom"
                  });
                }
              }
            }
            if (/}/.test(line)) inAsync = false;
          });
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
        }
      }
    } catch (err) {
      console.error(chalk.red(`❌ Failed to glob files: ${err.message}`));
    }
  }

  /**
   * Warn about unoptimized images/assets
   */
  async checkUnoptimizedAssets() {
    console.log(chalk.blue('⚡ Checking for unoptimized images/assets...'));
    const assetDirs = ['public', 'assets', 'static', 'src/assets'];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.gif'];
    for (const dir of assetDirs) {
      if (fs.existsSync(dir)) {
        const files = await globby(assetGlobs);
        for (const file of files) {
          try {
            const stats = fs.statSync(file);
            if (stats.size > 500 * 1024) { // >500KB
              await this.addPerformanceIssue({
                type: 'unoptimized_asset',
                file,
                severity: 'medium',
                message: `Large image asset detected (${(stats.size/1024).toFixed(0)} KB)`,
                recommendation: 'Compress or optimize this image for web'
              });
            }
            if (['.bmp', '.tiff'].some(ext => file.endsWith(ext))) {
              await this.addPerformanceIssue({
                type: 'unoptimized_asset',
                file,
                severity: 'medium',
                message: 'Non-web-optimized image format detected',
                recommendation: 'Convert to PNG, JPEG, or WebP'
              });
            }
          } catch (error) {
            console.warn(chalk.yellow(`Warning: Could not stat file ${file}`));
          }
        }
      }
    }
  }

  /**
   * Check for promise/async issues with ESLint plugins
   */
  async checkESLintPromiseIssues() {
    console.log(chalk.blue('⚡ Checking for promise/async issues with ESLint plugins...'));
    console.log(chalk.gray('🔌 Using ESLint plugin: eslint-plugin-promise'));
    try {
      const eslintConfig = getLintConfigFile();
      if (!eslintConfig) {
        throw new Error(".eslintrc file is missing");
      }
      const eslint = new ESLint({
        useEslintrc: false,
        overrideConfigFile: eslintConfig,
      });
      const files = await globby(getConfigPattern('jsFilePathPattern'));
      let processed = 0;
      for (const file of files) {
        try {
          const results = await eslint.lintFiles([file]);
          for (const result of results) {
            for (const message of result.messages) {
              if (message.ruleId && message.ruleId.startsWith('promise/')) {
                const { code, context } = await getCodeContext(result.filePath, message.line);
                await this.addPerformanceIssue({
                  type: 'eslint_promise',
                  file: result.filePath,
                  line: message.line,
                  severity: message.severity === 2 ? 'high' : 'medium',
                  message: message.message,
                  ruleId: message.ruleId,
                  code,
                  context,
                  source: 'eslint'
                });
              }
            }
          }
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ ESLint failed on file ${file}: ${err.message}`));
        }
        processed++;
        if (processed % 10 === 0 || processed === files.length) {
          process.stdout.write(`\rESLint Promise Progress: ${processed}/${files.length} files checked`);
        }
      }
      process.stdout.write(`\rESLint Promise Progress: ${files.length}/${files.length} files checked\n`);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not run ESLint for promise plugin checks'));
      if (error && error.message) {
        console.warn(chalk.yellow(error.message));
      }
    }
  }

  /**
   * Run all performance checks
   */
  async runPerformanceAudit() {
    console.log(chalk.blue('⚡ Starting Performance Audit...'));
    
    await this.checkBundleSize();
    await this.checkInefficientOperations();
    await this.checkMemoryLeaks();
    await this.checkLargeDependencies();
    await this.checkUnusedCode();
    await this.checkBlockingCodeInAsync();
    await this.checkUnoptimizedAssets();
    await this.checkESLintPromiseIssues();
    
    // Deduplicate issues and mark source
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
          const key = `${issue.file || ''}:${issue.line || ''}:${issue.ruleId || issue.type}:${issue.message}`;
          if (!seen.has(key)) {
            uniqueIssues.push(issue);
            seen.add(key);
          }
        } catch {}
      }
      this.performanceIssues = uniqueIssues;
    }

    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.performanceIssues.length,
      highSeverity: this.performanceIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.performanceIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.performanceIssues.filter(issue => issue.severity === 'low').length,
      issues: this.performanceIssues
    };

    // Generate JSON report
    try {
      const reportPath = path.join(this.folderPath, 'performance-audit-report.json');
      await writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`✅ Performance audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving performance audit report:', error.message));
    }

    // Display summary
    console.log(chalk.blue('\n⚡ PERFORMANCE AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(40)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));

    return results;
  }
} 