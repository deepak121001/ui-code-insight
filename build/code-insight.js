import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import fsp, { writeFile, mkdir, readFile } from 'fs/promises';
import { execSync } from 'child_process';
import { globby } from 'globby';
import { fileURLToPath } from 'url';
import { ESLint } from 'eslint';
import pLimit from 'p-limit';
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';
import { createRequire } from 'module';
import stylelint from 'stylelint';
import fetch from 'node-fetch';

// Centralized globby file patterns for all audits

const defaultJsFilePathPattern = [
  '**/*.{js,ts,jsx,tsx}',
  '!**/node_modules/**',
  '!**/.storybook/**',
  '!**/storybook/**',
  '!**/report/**',
  '!build/**',
  '!dist/**',
  '!coverage/**',
  '!.git/**',
  '!bin/**',
  '!**/__dropins__/**',
  '!**/cypress/**',
  '!**/*.min.js',
];

const defaultHtmlFilePathPattern = [
  '**/*.{html,js,ts,jsx,tsx}',
  '!**/node_modules/**',
  '!**/.storybook/**',
  '!**/storybook/**',
  '!**/report/**',
  '!build/**',
  '!dist/**',
  '!coverage/**',
  '!.git/**',
  '!bin/**',
  '!**/__dropins__/**',
  '!**/cypress/**',
];

const defaultScssFilePathPattern = [
  '**/*.{scss,less,css}',
  '!**/node_modules/**',
  '!**/.storybook/**',
  '!**/storybook/**',
  '!**/report/**',
  '!build/**',
  '!dist/**',
  '!coverage/**',
  '!.git/**',
  '!bin/**',
  '!**/__dropins__/**',
  '!**/cypress/**',
];

const assetGlobs = [
  'public/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'assets/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'static/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'src/assets/**/*.{png,jpg,jpeg,bmp,tiff,gif}'
];

// Add more as needed for CSS, JSON, etc.

let cachedConfig = null;
let warnedAboutDefaultConfig = false;

function loadConfig() {
  if (cachedConfig) return cachedConfig;
  
  // Get the directory where this config-loader.js file is located
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Priority order for config file locations:
  // 1. Project root (where audit is run)
  // 2. Package directory (where tool is installed)
  // 3. Default empty config
  
  const possibleConfigPaths = [
    // Project root (current working directory)
    path.resolve(process.cwd(), 'ui-code-insight.config.json'),
    // Package directory (where this tool is installed)
    path.resolve(__dirname, '..', '..', 'ui-code-insight.config.json'),
    // Alternative package paths
    path.resolve(__dirname, '..', 'ui-code-insight.config.json'),
    path.resolve(__dirname, 'ui-code-insight.config.json')
  ];
  
  let configFound = false;
  
  for (const configPath of possibleConfigPaths) {
    if (fs.existsSync(configPath)) {
      try {
        cachedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`[ui-code-insight] ✅ Config loaded from: ${configPath}`);
        configFound = true;
        break;
      } catch (error) {
        console.warn(`[ui-code-insight] ⚠️  Error reading config from ${configPath}:`, error.message);
        continue;
      }
    }
  }
  
  if (!configFound) {
    cachedConfig = {};
    if (!warnedAboutDefaultConfig) {
      console.log('[ui-code-insight] ℹ️  No ui-code-insight.config.json found. Using default file patterns and settings.');
      console.log('[ui-code-insight] ℹ️  Searched locations:');
      possibleConfigPaths.forEach((configPath, index) => {
        console.log(`[ui-code-insight]    ${index + 1}. ${configPath}`);
      });
      warnedAboutDefaultConfig = true;
    }
  }
  
  return cachedConfig;
}

function getConfigPattern(key) {
  const config = loadConfig();
  if (key === 'jsFilePathPattern') return config.jsFilePathPattern || defaultJsFilePathPattern;
  if (key === 'htmlFilePathPattern') return config.htmlFilePathPattern || defaultHtmlFilePathPattern;
  if (key === 'scssFilePathPattern') return config.scssFilePathPattern || defaultScssFilePathPattern;
  return [];
}

function getExcludeRules(auditType) {
  const config = loadConfig();
  const excludeConfig = config.excludeRules || {};
  const auditConfig = excludeConfig[auditType] || {};
  
  return {
    enabled: auditConfig.enabled !== false, // Default to true
    overrideDefault: auditConfig.overrideDefault === true,
    additionalRules: auditConfig.additionalRules || []
  };
}

function getMergedExcludeRules(auditType, defaultRules) {
  const excludeConfig = getExcludeRules(auditType);
  
  if (!excludeConfig.enabled) {
    return [];
  }
  
  if (excludeConfig.overrideDefault) {
    return excludeConfig.additionalRules;
  }
  
  // Merge default rules with additional rules
  return [...defaultRules, ...excludeConfig.additionalRules];
}

const __filename$1 = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename$1);

const CONFIG_FOLDER$3 = "config";
const ESLINTRC_JSON$2 = ".eslintrc.json";
const ESLINTRC_JS$1 = ".eslintrc.js";
const ESLINTRC_YML$1 = ".eslintrc.yml";
const ESLINTRC$1 = ".eslintrc";
const ESLINTRC_REACT$1 = "eslintrc.react.json";
const ESLINTRC_NODE$1 = "eslintrc.node.json";
const ESLINTRC_VANILLA$1 = "eslintrc.vanilla.json";
const ESLINTRC_TS$1 = "eslintrc.typescript.json";
const ESLINTRC_TSREACT$1 = "eslintrc.tsreact.json";

const getLintConfigFile$3 = (recommendedLintRules = false, projectType = '') => {
  let configFileName = ESLINTRC_JSON$2;

  if (projectType && typeof projectType === 'string') {
    const type = projectType.toLowerCase();
    if (type === 'react') configFileName = ESLINTRC_REACT$1;
    else if (type === 'node') configFileName = ESLINTRC_NODE$1;
    else if (type === 'vanilla') configFileName = ESLINTRC_VANILLA$1;
    else if (type === 'typescript') configFileName = ESLINTRC_TS$1;
    else if (type === 'typescript + react' || type === 'tsreact') configFileName = ESLINTRC_TSREACT$1;
  }

  const configFilePath = path.join(__dirname, CONFIG_FOLDER$3, configFileName);
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // fallback to default logic
  const recommendedLintRulesConfigFile = path.join(__dirname, CONFIG_FOLDER$3, ESLINTRC_JSON$2);
  const moduleDir = path.join(process.cwd(), "node_modules", "ui-code-insight");
  const eslintLintFilePathFromModule = path.join(moduleDir, ESLINTRC_JSON$2);

  if (recommendedLintRules) {
    return recommendedLintRulesConfigFile;
  }

  const configFiles = [
    ESLINTRC$1,
    ESLINTRC_JS$1,
    ESLINTRC_YML$1,
    ESLINTRC_JSON$2,
    eslintLintFilePathFromModule,
  ];

  return configFiles.find((file) => fs.existsSync(file));
};

// Helper to get code and context lines
async function getCodeContext$1(filePath, line, contextRadius = 2) {
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

class SecurityAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.securityIssues = [];
  }

  printContext(lines, index) {
    const contextStart = Math.max(0, index - 2);
    const contextEnd = Math.min(lines.length - 1, index + 2);
    return lines.slice(contextStart, contextEnd + 1)
      .map((line, i) => {
        const lineNum = contextStart + i + 1;
        const marker = lineNum === index + 1 ? chalk.red('>>>') : '   ';
        return `${marker} ${lineNum}: ${line}`;
      }).join('\n');
  }

  /**
   * Check for hardcoded secrets
   */
  async checkForSecrets() {
    console.log(chalk.blue('🔒 Checking for hardcoded secrets...'));
  
    const secretPatterns = [
      /\b(const|let|var)\s+\w*(password|api[_-]?key|secret|token|auth|access[_-]?token|refresh[_-]?token|private[_-]?key|client[_-]?id|client[_-]?secret|firebase[_-]?key|connection\s*string)\w*\s*=\s*['"][^'"`]+['"]/i,
      /['"]?(password|api[_-]?key|secret|token|auth|access[_-]?token|refresh[_-]?token|private[_-]?key|client[_-]?id|client[_-]?secret)['"]?\s*:\s*['"][^'"`]+['"]/i,
      /\b(PASSWORD|SECRET|TOKEN|KEY|ACCESS_KEY|PRIVATE_KEY)\s*=\s*[^'"`\n\r]+/i,
      /-----BEGIN\s+\w+PRIVATE KEY-----[\s\S]+?-----END\s+\w+PRIVATE KEY-----/g,
      /\b(const|let|var)\s+\w*(api|access|secret|auth|token|key)\w*\s*=\s*['"][\w\-]{16,}['"]/i,
    ];
  
    const CONCURRENCY = 10; // Limit number of files processed in parallel
    const BATCH_SIZE = 50; // Process files in batches
    try {
      const files = await globby(getConfigPattern('jsFilePathPattern'), {
        absolute: true,
      });
      console.log(chalk.gray(`📁 Scanning ${files.length} files for secrets...`));
      const limit = pLimit(CONCURRENCY);
      let processed = 0;
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(file => limit(async () => {
          try {
            const content = await fsp.readFile(file, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('//')) return;
              for (const pattern of secretPatterns) {
                if (
                  pattern.test(trimmed) &&
                  /=\s*['"][^'"`]+['"]/ .test(trimmed) &&
                  !/(===|!==|==|!=)/.test(trimmed) &&
                  !/\w+\s*\(/.test(trimmed) &&
                  !/`.*`/.test(trimmed)
                ) {
                  this.securityIssues.push({
                    type: 'hardcoded_secret',
                    file,
                    line: index + 1,
                    severity: 'high',
                    message: 'Potential hardcoded secret detected',
                    code: trimmed,
                    context: this.printContext(lines, index),
                  });
                  break;
                }
              }
            });
            // Release memory
            for (let j = 0; j < lines.length; j++) lines[j] = null;
          } catch (err) {
            console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
          }
          processed++;
          if (processed % 25 === 0 || processed === files.length) {
            process.stdout.write(`\rProgress: ${processed}/${files.length} files processed`);
          }
        })));
        // Optionally force garbage collection if available
        if (global.gc) global.gc();
      }
      // Final progress output
      process.stdout.write(`\rProgress: ${files.length}/${files.length} files processed\n`);
    } catch (err) {
      console.error(chalk.red(`❌ Failed to glob files: ${err.message}`));
    }
  }
  
  /**
   * Common function to scan files with given patterns
   */
  async patternScan(files, patterns, type) {
    const CONCURRENCY = 10;
    const BATCH_SIZE = 50;
    const limit = pLimit(CONCURRENCY);
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(file => limit(async () => {
        try {
          const content = await fs.readFile(file, 'utf8');
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) return;
            patterns.forEach(({ pattern, message, severity }) => {
              if (pattern.test(trimmed)) {
                this.securityIssues.push({
                  type,
                  file,
                  line: index + 1,
                  severity,
                  message,
                  code: trimmed,
                  context: this.printContext(lines, index)
                });
              }
            });
          });
          // Release memory
          for (let j = 0; j < lines.length; j++) lines[j] = null;
        } catch {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}`));
        }
        processed++;
        if (processed % 25 === 0 || processed === files.length) {
          process.stdout.write(`\rProgress: ${processed}/${files.length} files processed`);
        }
      })));
      if (global.gc) global.gc();
    }
    // Final progress output
    process.stdout.write(`\rProgress: ${files.length}/${files.length} files processed\n`);
  }

/**
   * Check for outdated dependencies with known vulnerabilities
   */
async checkDependencyVulnerabilities() {
  console.log(chalk.blue('🔒 Checking for dependency vulnerabilities...'));
  
  try {
    // Run npm audit to check for vulnerabilities
    const auditResult = execSync('npm audit --json', { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    const auditData = JSON.parse(auditResult);
    
    if (auditData.vulnerabilities && Object.keys(auditData.vulnerabilities).length > 0) {
      Object.keys(auditData.vulnerabilities).forEach(packageName => {
        const vuln = auditData.vulnerabilities[packageName];
        this.securityIssues.push({
          type: 'dependency_vulnerability',
          package: packageName,
          severity: vuln.severity || 'medium',
          message: `Vulnerability in ${packageName}: ${vuln.title || 'Unknown vulnerability'}`,
          recommendation: vuln.recommendation || 'Update package version'
        });
      });
    } else {
      // No vulnerabilities found - this is good!
      this.securityIssues.push({
        type: 'no_vulnerabilities',
        severity: 'info',
        message: 'No known vulnerabilities found in dependencies',
        positive: true
      });
    }
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities are found
    if (error.status === 1) {
      try {
        const output = error.stdout.toString();
        const auditData = JSON.parse(output);
        
        if (auditData.vulnerabilities) {
          Object.keys(auditData.vulnerabilities).forEach(packageName => {
            const vuln = auditData.vulnerabilities[packageName];
            this.securityIssues.push({
              type: 'dependency_vulnerability',
              package: packageName,
              severity: vuln.severity || 'medium',
              message: `Vulnerability in ${packageName}: ${vuln.title || 'Unknown vulnerability'}`,
              recommendation: vuln.recommendation || 'Update package version'
            });
          });
        }
      } catch (parseError) {
        console.warn(chalk.yellow('Warning: Could not parse npm audit results'));
      }
    } else {
      console.warn(chalk.yellow('Warning: Could not run npm audit - this may be due to network issues or npm configuration'));
    }
  }
}

  async checkESLintSecurityIssues() {
    console.log(chalk.blue('🔍 Checking for security issues with ESLint plugins...'));
    const issuesFile = path.join(this.folderPath, 'security-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(issuesFile)) fs.unlinkSync(issuesFile);
    const stream = fs.createWriteStream(issuesFile, { flags: 'a' });
    try {
      const eslintConfig = getLintConfigFile$3();
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
              if (
                message.ruleId &&
                (
                  message.ruleId.startsWith('security/') ||
                  message.ruleId.startsWith('no-unsanitized/') ||
                  message.ruleId === 'no-unsanitized/method' ||
                  message.ruleId === 'no-unsanitized/property'
                )
              ) {
                const { code, context } = await getCodeContext$1(result.filePath, message.line);
                const issue = {
                  type: 'eslint_security',
                  file: result.filePath,
                  line: message.line,
                  severity: message.severity === 2 ? 'high' : 'medium',
                  message: message.message,
                  ruleId: message.ruleId,
                  code,
                  context,
                  source: 'eslint'
                };
                stream.write(JSON.stringify(issue) + '\n');
              }
            }
          }
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ ESLint failed on file ${file}: ${err.message}`));
        }
        processed++;
        if (processed % 10 === 0 || processed === files.length) {
          process.stdout.write(`\rESLint Progress: ${processed}/${files.length} files checked`);
        }
        if (global.gc) global.gc();
      }
      process.stdout.write(`\rESLint Progress: ${files.length}/${files.length} files checked\n`);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not run ESLint for security plugin checks'));
      if (error && error.message) {
        console.warn(chalk.yellow(error.message));
      }
    } finally {
      stream.end();
    }
    // After all files, read issues from file and add to this.securityIssues
    if (fs.existsSync(issuesFile)) {
      const lines = fs.readFileSync(issuesFile, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          this.securityIssues.push(JSON.parse(line));
        } catch {}
      }
    }
  }

  async checkFileUploadSecurity() {
    console.log(chalk.blue('🔒 Checking file upload security (UI)...'));
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'));
    for (const file of htmlFiles) {
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          // File input without accept attribute
          const fileInputMatches = [...trimmed.matchAll(/<input[^>]+type=["']file["'][^>]*>/gi)];
          for (const match of fileInputMatches) {
            if (!/accept=/.test(match[0])) {
              this.securityIssues.push({
                type: 'file_upload_no_type_restriction',
                file,
                line: index + 1,
                severity: 'medium',
                message: 'File input without file type restriction (accept attribute missing)',
                code: trimmed,
                context: this.printContext(lines, index)
              });
            }
          }
          
          // File input without size validation (look for max attribute)
          for (const match of fileInputMatches) {
            if (!/max/.test(match[0])) {
              this.securityIssues.push({
                type: 'file_upload_no_size_limit',
                file,
                line: index + 1,
                severity: 'medium',
                message: 'File input without file size limit (max attribute missing)',
                code: trimmed,
                context: this.printContext(lines, index)
              });
            }
          }
        });
      } catch (err) {
        console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
      }
    }
    
    // JS: look for direct use of file.name (no sanitization)
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'));
    for (const file of jsFiles) {
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          if (/\.name\b/.test(trimmed) && !/sanitize|replace|slugify/.test(trimmed)) {
            this.securityIssues.push({
              type: 'file_upload_filename_no_sanitization',
              file,
              line: index + 1,
              severity: 'medium',
              message: 'File name used directly in upload logic (no sanitization/renaming detected)',
              code: trimmed,
              context: this.printContext(lines, index)
            });
          }
        });
      } catch (err) {
        console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
      }
    }
  }

  async checkInputValidation() {
    console.log(chalk.blue('🔒 Checking input validation (UI)...'));
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'));
    for (const file of htmlFiles) {
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          // Check for inputs without validation attributes
          const inputMatches = [...trimmed.matchAll(/<input[^>]+>/gi)];
          for (const match of inputMatches) {
            if (!/required|pattern|maxlength/.test(match[0])) {
              this.securityIssues.push({
                type: 'input_no_validation',
                file,
                line: index + 1,
                severity: 'medium',
                message: 'Input field missing validation attributes (required, pattern, maxlength)',
                code: trimmed,
                context: this.printContext(lines, index)
              });
            }
          }
          
          // Check for unsafe DOM insertion
          if (/innerHTML|dangerouslySetInnerHTML/.test(trimmed)) {
            this.securityIssues.push({
              type: 'input_unsafe_dom_insertion',
              file,
              line: index + 1,
              severity: 'high',
              message: 'Potential unsafe DOM insertion (innerHTML or dangerouslySetInnerHTML)',
              code: trimmed,
              context: this.printContext(lines, index)
            });
          }
        });
      } catch (err) {
        console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
      }
    }
  }

  async checkSecurityHeaders() {
    console.log(chalk.blue('🔒 Checking for security headers in HTML files only...'));
    
    // Explicitly target only HTML files - never scan JS files for CSP
    const htmlFiles = await globby([
      '**/*.html',
      '**/*.htm', 
      '**/*.jsp',
      '**/*.htl',
      '**/*.xhtml',
      '**/*.shtml',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/build/**',
      '!**/.git/**'
    ]);
    
    console.log(chalk.gray(`📁 Scanning ${htmlFiles.length} HTML files for CSP and security headers...`));
    
    for (const file of htmlFiles) {
      try {
        // Double-check: ensure we're only processing HTML files
        if (!/\.(html|htm|jsp|htl|xhtml|shtml)$/i.test(file)) {
          console.warn(chalk.yellow(`⚠️ Skipping non-HTML file: ${file}`));
          continue;
        }
        
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        // Check if any security headers are present in the file
        const hasCSP = /<meta[^>]+http-equiv=["']Content-Security-Policy["']/i.test(content);
        const hasHSTS = /<meta[^>]+http-equiv=["']Strict-Transport-Security["']/i.test(content);
        const hasXFO = /<meta[^>]+http-equiv=["']X-Frame-Options["']/i.test(content);
        
        // If no security headers found, report the first line of the file
        if (!hasCSP || !hasHSTS || !hasXFO) {
          const firstNonEmptyLine = lines.findIndex(line => line.trim() && !line.trim().startsWith('<!DOCTYPE') && !line.trim().startsWith('<html'));
          const reportLine = firstNonEmptyLine >= 0 ? firstNonEmptyLine : 0;
          
          if (!hasCSP) {
            this.securityIssues.push({
              type: 'missing_csp_header',
              file,
              line: reportLine + 1,
              severity: 'high',
              message: 'Missing Content-Security-Policy (CSP) header in HTML',
              code: lines[reportLine] || '<html>',
              context: this.printContext(lines, reportLine)
            });
          }
          
          if (!hasHSTS) {
            this.securityIssues.push({
              type: 'missing_hsts_header',
              file,
              line: reportLine + 1,
              severity: 'medium',
              message: 'Missing Strict-Transport-Security (HSTS) header in HTML',
              code: lines[reportLine] || '<html>',
              context: this.printContext(lines, reportLine)
            });
          }
          
          if (!hasXFO) {
            this.securityIssues.push({
              type: 'missing_xfo_header',
              file,
              line: reportLine + 1,
              severity: 'medium',
              message: 'Missing X-Frame-Options header in HTML',
              code: lines[reportLine] || '<html>',
              context: this.printContext(lines, reportLine)
            });
          }
        }
        
        // Also check for weak CSP configurations on each line
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          // Check for weak CSP configurations
          if (/Content-Security-Policy.*'unsafe-inline'/.test(trimmed)) {
            this.securityIssues.push({
              type: 'weak_csp_configuration',
              file,
              line: index + 1,
              severity: 'high',
              message: 'Weak Content-Security-Policy: unsafe-inline detected',
              code: trimmed,
              context: this.printContext(lines, index)
            });
          }
          
          // Check for missing or weak security headers
          if (/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*content=["'][^"']*["']/.test(trimmed)) {
            const cspContent = trimmed.match(/content=["']([^"']*)["']/);
            if (cspContent && cspContent[1].includes("'unsafe-inline'")) {
              this.securityIssues.push({
                type: 'weak_csp_inline',
                file,
                line: index + 1,
                severity: 'high',
                message: 'Content-Security-Policy allows unsafe-inline',
                code: trimmed,
                context: this.printContext(lines, index)
              });
            }
          }
        });
        
      } catch (err) {
        console.warn(chalk.yellow(`⚠️ Could not read HTML file ${file}: ${err.message}`));
      }
    }
    
    console.log(chalk.green(`✅ CSP scanning completed - ${htmlFiles.length} HTML files processed`));
  }

  

  async runEnhancedPatternChecks() {
    console.log(chalk.blue('🔍 Running enhanced pattern checks...'));

    const SUSPICIOUS_PATTERNS = [
      { type: 'eval_usage', pattern: /\beval\s*\(/, message: 'Avoid using eval()', severity: 'high' },
      { type: 'function_constructor', pattern: /new Function\s*\(/, message: 'Avoid using Function constructor', severity: 'high' },
      { type: 'insecure_transport', pattern: /fetch\(['"]http:\/\//, message: 'Insecure HTTP request detected', severity: 'high' },
      { type: 'token_exposure', pattern: /Authorization:\s*Bearer\s+[\w\-]+\.[\w\-]+\.[\w\-]+/, message: 'Bearer token might be exposed in code', severity: 'high' },
      { type: 'dev_url', pattern: /['"]http:\/\/localhost[:\/]/, message: 'Dev/localhost URL found in code', severity: 'medium' },
      { type: 'xss_dom', pattern: /\.innerHTML\s*=|\.outerHTML\s*=|\.insertAdjacentHTML\s*\(/, message: 'Potential DOM XSS with innerHTML or related API', severity: 'high' },
    ];
    
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'));
    for (const file of jsFiles) {
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          for (const rule of SUSPICIOUS_PATTERNS) {
            if (rule.pattern.test(trimmed)) {
              this.securityIssues.push({
                type: rule.type,
                file,
                line: index + 1,
                severity: rule.severity,
                message: rule.message,
                code: trimmed,
                context: this.printContext(lines, index)
              });
            }
          }
        });
      } catch (err) {
        console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
      }
    }
  }
    
  
  async runSecurityAudit() {
    console.log(chalk.cyan.bold('\n🔍 Running Full Security Audit...'));
    //await this.checkDependencyVulnerabilities();
    await this.checkForSecrets();
    await this.checkESLintSecurityIssues();
    await this.checkFileUploadSecurity();
    await this.checkInputValidation();
    await this.checkSecurityHeaders();
    await this.runEnhancedPatternChecks();

    // Apply excludeRules from config
    const excludeRules = getMergedExcludeRules('security', []);
    this.securityIssues = this.securityIssues.filter(issue => {
      // Exclude by ruleId
      if (issue.ruleId && excludeRules.includes(issue.ruleId)) return false;
      // Exclude by code pattern
      if (issue.code && excludeRules.some(pattern => issue.code && issue.code.includes(pattern))) return false;
      return true;
    });

    // Deduplicate issues and mark source
    const uniqueIssues = [];
    const seen = new Set();
    for (const issue of this.securityIssues) {
      if (!issue.source) issue.source = 'custom';
      const key = `${issue.file || ''}:${issue.line || issue.type}:${issue.ruleId || issue.type}:${issue.message}`;
      if (!seen.has(key)) {
        uniqueIssues.push(issue);
        seen.add(key);
      }
    }
    this.securityIssues = uniqueIssues;

    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.securityIssues.length,
      highSeverity: this.securityIssues.filter(i => i.severity === 'high').length,
      mediumSeverity: this.securityIssues.filter(i => i.severity === 'medium').length,
      lowSeverity: this.securityIssues.filter(i => i.severity === 'low').length,
      issues: this.securityIssues
    };

    const reportPath = path.join(this.folderPath, 'security-audit-report.json');
    await fsp.writeFile(reportPath, JSON.stringify(results, null, 2));

    console.log(chalk.green(`\n✅ Report saved: ${reportPath}`));
    console.log(chalk.bold(`\n📋 Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`🔴 High: ${results.highSeverity}`));
    console.log(chalk.yellow(`🟠 Medium: ${results.mediumSeverity}`));
    console.log(chalk.blue(`🔵 Low: ${results.lowSeverity}`));

    return results;
  }
}

const CONFIG_FOLDER$2 = "config";
const ESLINTRC_JSON$1 = ".eslintrc.json";
const getLintConfigFile$2 = (recommendedLintRules = false, projectType = '') => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let configFileName = ESLINTRC_JSON$1;
  const configFilePath = path.join(__dirname, CONFIG_FOLDER$2, configFileName);
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
class PerformanceAudit {
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
      const eslintConfig = getLintConfigFile$2();
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
      const eslintConfig = getLintConfigFile$2();
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

const BATCH_SIZE$4 = 5;

/**
 * Accessibility audit module for detecting accessibility issues
 */
class AccessibilityAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.accessibilityIssues = [];
    this.issuesFile = path.join(this.folderPath, 'accessibility-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) fs.unlinkSync(this.issuesFile);
    this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
  }

  async addAccessibilityIssue(issue) {
    this.issueStream.write(JSON.stringify(issue) + '\n');
  }

  // Helper to get code and context lines
  async getCodeContext(filePath, line, contextRadius = 2) {
    try {
      const content = await fsp.readFile(filePath, "utf8");
      const lines = content.split('\n');
      const idx = line - 1;
      const start = Math.max(0, idx - contextRadius);
      const end = Math.min(lines.length - 1, idx + contextRadius);
      // Only include the specific line for code
      let code = (lines[idx] || '').trim();
      if (code.length > 200) code = code.slice(0, 200) + '... (truncated)';
      // Clean context: trim, remove all-blank, collapse blank lines
      let contextLines = lines.slice(start, end + 1).map(l => l.trim());
      while (contextLines.length && contextLines[0] === '') contextLines.shift();
      while (contextLines.length && contextLines[contextLines.length - 1] === '') contextLines.pop();
      let lastWasBlank = false;
      contextLines = contextLines.filter(l => {
        if (l === '') {
          if (lastWasBlank) return false;
          lastWasBlank = true;
          return true;
        } else {
          lastWasBlank = false;
          return true;
        }
      });
      const context = contextLines.map((l, i) => {
        const n = start + i + 1;
        const marker = n === line ? '>>>' : '   ';
        let lineText = l;
        if (lineText.length > 200) lineText = lineText.slice(0, 200) + '... (truncated)';
        return `${marker} ${n}: ${lineText}`;
      }).join('\n');
      return { code, context };
    } catch {
      return { code: '', context: '' };
    }
  }

  /**
   * Check for missing alt attributes on images
   */
  async checkImageAccessibility() {
    console.log(chalk.blue('♿ Checking image accessibility...'));
    
    const imagePatterns = [
      /<img[^>]*>/gi,
      /<Image[^>]*>/gi,
    ];

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE$4) {
      const batch = files.slice(i, i + BATCH_SIZE$4);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Image Accessibility] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (const pattern of imagePatterns) {
            const matches = line.match(pattern);
            if (matches) {
              for (const match of matches) {
                if (!match.includes('alt=') || match.includes('alt=""')) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'missing_alt',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'high',
                    message: 'Image missing alt attribute or has empty alt',
                    code,
                    context,
                    source: 'custom'
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
      }));
      // batch memory is released here
    }
    process.stdout.write(`\r[Image Accessibility] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for proper heading structure
   */
  async checkHeadingStructure() {
    console.log(chalk.blue('♿ Checking heading structure...'));
    
    const headingPatterns = [
      /<h1[^>]*>/gi,
      /<h2[^>]*>/gi,
      /<h3[^>]*>/gi,
      /<h4[^>]*>/gi,
      /<h5[^>]*>/gi,
      /<h6[^>]*>/gi,
    ];

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE$4) {
      const batch = files.slice(i, i + BATCH_SIZE$4);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Heading Structure] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (let level = 0; level < headingPatterns.length; level++) {
            const pattern = headingPatterns[level];
            if (pattern.test(line)) {
              // Check for skipped heading levels
              if (level > 0) {
                const prevHeadingPattern = new RegExp(`<h${level}[^>]*>`, 'gi');
                const hasPreviousHeading = content.substring(0, content.indexOf(line)).match(prevHeadingPattern);
                
                if (!hasPreviousHeading) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'skipped_heading',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: `Heading level ${level + 1} used without previous level ${level}`,
                    code,
                    context,
                    source: 'custom'
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
      }));
    }
    process.stdout.write(`\r[Heading Structure] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for proper form labels
   */
  async checkFormLabels() {
    console.log(chalk.blue('♿ Checking form accessibility...'));
    
    const formPatterns = [
      /<input[^>]*>/gi,
      /<textarea[^>]*>/gi,
      /<select[^>]*>/gi,
    ];

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE$4) {
      const batch = files.slice(i, i + BATCH_SIZE$4);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Form Labels] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (const pattern of formPatterns) {
            const matches = line.match(pattern);
            if (matches) {
              for (const match of matches) {
                // Check if input has proper labeling
                const hasLabel = match.includes('aria-label=') || 
                               match.includes('aria-labelledby=') || 
                               match.includes('id=');
                
                if (!hasLabel && !match.includes('type="hidden"')) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'missing_form_label',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'high',
                    message: 'Form control missing proper labeling',
                    code,
                    context,
                    source: 'custom'
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
      }));
    }
    process.stdout.write(`\r[Form Labels] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for color contrast issues
   */
  async checkColorContrast() {
    console.log(chalk.blue('♿ Checking color contrast...'));
    
    const colorPatterns = [
      /color:\s*#[0-9a-fA-F]{3,6}/gi,
      /background-color:\s*#[0-9a-fA-F]{3,6}/gi,
      /color:\s*rgb\([^)]+\)/gi,
      /background-color:\s*rgb\([^)]+\)/gi,
    ];

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE$4) {
      const batch = files.slice(i, i + BATCH_SIZE$4);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Color Contrast] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (const pattern of colorPatterns) {
            if (pattern.test(line)) {
              // This is a basic check - in a real implementation, you'd want to
              // actually calculate contrast ratios
              const { code, context } = await this.getCodeContext(file, index + 1);
              await this.addAccessibilityIssue({
                type: 'color_contrast',
                file: path.relative(process.cwd(), file),
                line: index + 1,
                severity: 'medium',
                message: 'Color usage detected - verify contrast ratios meet WCAG guidelines',
                code,
                context,
                recommendation: 'Use tools like axe-core or Lighthouse to check actual contrast ratios',
                source: 'custom'
              });
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
      }));
    }
    process.stdout.write(`\r[Color Contrast] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for keyboard navigation support
   */
  async checkKeyboardNavigation() {
    console.log(chalk.blue('♿ Checking keyboard navigation...'));
    
    const keyboardPatterns = [
      /onClick\s*=/gi,
      /onclick\s*=/gi,
      /addEventListener\s*\(\s*['"]click['"]\)/gi,
    ];

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE$4) {
      const batch = files.slice(i, i + BATCH_SIZE$4);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Keyboard Navigation] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (const pattern of keyboardPatterns) {
            if (pattern.test(line)) {
              // Check if there's also keyboard event handling
              const hasKeyboardSupport = line.includes('onKeyDown') || 
                                       line.includes('onKeyUp') || 
                                       line.includes('onKeyPress') ||
                                       line.includes('addEventListener') && 
                                       (line.includes('keydown') || line.includes('keyup') || line.includes('keypress'));
              
              if (!hasKeyboardSupport) {
                const { code, context } = await this.getCodeContext(file, index + 1);
                await this.addAccessibilityIssue({
                  type: 'keyboard_navigation',
                  file: path.relative(process.cwd(), file),
                  line: index + 1,
                  severity: 'medium',
                  message: 'Click handler without keyboard support',
                  code,
                  context,
                  recommendation: 'Add keyboard event handlers or use semantic HTML elements',
                  source: 'custom'
                });
              }
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
      }));
    }
    process.stdout.write(`\r[Keyboard Navigation] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for ARIA attributes
   */
  async checkARIAUsage() {
    console.log(chalk.blue('♿ Checking ARIA usage...'));
    
    const ariaPatterns = [
      /aria-[a-zA-Z-]+/gi,
    ];

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE$4) {
      const batch = files.slice(i, i + BATCH_SIZE$4);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[ARIA Usage] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (const pattern of ariaPatterns) {
            const matches = line.match(pattern);
            if (matches) {
              for (const match of matches) {
                // Check for common ARIA mistakes
                if (match.includes('aria-label=""') || match.includes('aria-labelledby=""')) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'empty_aria',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Empty ARIA attribute detected',
                    code,
                    context,
                    source: 'custom'
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
      }));
    }
    process.stdout.write(`\r[ARIA Usage] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for tab order and focus management
   */
  async checkTabOrderAndFocus() {
    console.log(chalk.blue('♿ Checking tab order and focus management...'));
    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE$4) {
      const batch = files.slice(i, i + BATCH_SIZE$4);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Tab Order/Focus] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          // Check for interactive elements without tabindex
          if ((/<(button|a|input|select|textarea|div|span)[^>]*>/i.test(line) || /onClick=|onKeyDown=|onFocus=/.test(line)) && !/tabindex=/i.test(line)) {
            const { code, context } = await this.getCodeContext(file, index + 1);
            await this.addAccessibilityIssue({
              type: 'tab_order_focus',
              file: path.relative(process.cwd(), file),
              line: index + 1,
              severity: 'medium',
              message: 'Interactive element may be missing tabindex or focus management',
              code,
              context,
              source: 'custom'
            });
          }
          // Check for modals/dialogs without focus trap
          if (/<(dialog|Modal|modal)[^>]*>/i.test(line) && !/focusTrap|trapFocus|tabindex/i.test(line)) {
            const { code, context } = await this.getCodeContext(file, index + 1);
            await this.addAccessibilityIssue({
              type: 'focus_management',
              file: path.relative(process.cwd(), file),
              line: index + 1,
              severity: 'medium',
              message: 'Modal/dialog may be missing focus trap or focus management',
              code,
              context,
              source: 'custom'
            });
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
      }));
    }
    process.stdout.write(`\r[Tab Order/Focus] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Look for missing landmark roles and skip links
   */
  async checkLandmarksAndSkipLinks() {
    console.log(chalk.blue('♿ Checking for landmark roles and skip links...'));
    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    let foundLandmark = false, foundSkipLink = false;
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE$4) {
      const batch = files.slice(i, i + BATCH_SIZE$4);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Landmarks/Skip Links] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        if (/<(main|nav|aside|header|footer)[^>]*>/i.test(content)) foundLandmark = true;
        if (/<a[^>]+href=["']#main-content["'][^>]*>.*skip to main content.*<\/a>/i.test(content)) foundSkipLink = true;
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
      }));
    }
    process.stdout.write(`\r[Landmarks/Skip Links] Progress: ${files.length}/${files.length} files checked\n`);
    if (!foundLandmark) {
      await this.addAccessibilityIssue({
        type: 'missing_landmark',
        severity: 'medium',
        message: 'No landmark roles (<main>, <nav>, <aside>, <header>, <footer>) found in project',
        recommendation: 'Add semantic landmark elements for better accessibility',
        source: 'custom'
      });
    }
    if (!foundSkipLink) {
      await this.addAccessibilityIssue({
        type: 'missing_skip_link',
        severity: 'medium',
        message: 'No skip link found (e.g., <a href="#main-content">Skip to main content</a>)',
        recommendation: 'Add a skip link for keyboard users',
        source: 'custom'
      });
    }
  }

  /**
   * Run all accessibility checks
   */
  async runAccessibilityAudit() {
    console.log(chalk.blue('♿ Starting Accessibility Audit...'));
    
    await this.checkImageAccessibility();
    await this.checkHeadingStructure();
    await this.checkFormLabels();
    await this.checkColorContrast();
    await this.checkKeyboardNavigation();
    await this.checkARIAUsage();
    await this.checkTabOrderAndFocus();
    await this.checkLandmarksAndSkipLinks();
    
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
      this.accessibilityIssues = uniqueIssues;
    }

    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.accessibilityIssues.length,
      highSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'low').length,
      issues: this.accessibilityIssues
    };

    // Generate JSON report
    try {
      const reportPath = path.join(this.folderPath, 'accessibility-audit-report.json');
      await writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`✅ Accessibility audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving accessibility audit report:', error.message));
    }

    // Display summary
    console.log(chalk.blue('\n♿ ACCESSIBILITY AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(40)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));

    return results;
  }
}

const __filename = fileURLToPath(import.meta.url);
path.dirname(__filename);

/**
 * Lighthouse Audit Module
 * Tests live websites for performance, accessibility, best practices, and SEO
 */
class LighthouseAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.lighthouseResults = [];
  }

  /**
   * Combine Lighthouse data from multiple URLs into a single report
   */
  async combineLightHouseData(urls) {
    const folderPath = path.resolve(process.cwd(), "report");
    const lightHouseResult = [];
    
    for (const url of urls) {
      const outputName = url.replace(/^https?:\/\//, "").replace(/\//g, "");
      const desktopReportPath = path.join(folderPath, `${outputName}.desktop.report.json`);
      const mobileReportPath = path.join(folderPath, `${outputName}.mobile.report.json`);
      
      const urlResult = {
        url: url,
        desktop: null,
        mobile: null,
        timestamp: new Date().toISOString()
      };
      
      // Process desktop report
      try {
        if (fs.existsSync(desktopReportPath)) {
          const desktopData = await fsp.readFile(desktopReportPath, "utf8");
          const desktopReport = JSON.parse(desktopData);
          urlResult.desktop = {
            performance: desktopReport.categories?.performance?.score * 100,
            accessibility: desktopReport.categories?.accessibility?.score * 100,
            bestPractices: desktopReport.categories?.["best-practices"]?.score * 100,
            seo: desktopReport.categories?.seo?.score * 100,
            issues: this.extractLighthouseIssues(desktopReport)
          };
        } else {
          console.log(chalk.yellow(`  ⚠️  No desktop report found for ${url}`));
          urlResult.desktop = {
            performance: null,
            accessibility: null,
            bestPractices: null,
            seo: null,
            issues: [],
            error: 'Desktop report file not found'
          };
        }
      } catch (error) {
        console.error(chalk.red(`Error processing desktop report for ${url}:`, error.message));
        urlResult.desktop = {
          performance: null,
          accessibility: null,
          bestPractices: null,
          seo: null,
          issues: [],
          error: error.message
        };
      }
      
      // Process mobile report
      try {
        if (fs.existsSync(mobileReportPath)) {
          const mobileData = await fsp.readFile(mobileReportPath, "utf8");
          const mobileReport = JSON.parse(mobileData);
          urlResult.mobile = {
            performance: mobileReport.categories?.performance?.score * 100,
            accessibility: mobileReport.categories?.accessibility?.score * 100,
            bestPractices: mobileReport.categories?.["best-practices"]?.score * 100,
            seo: mobileReport.categories?.seo?.score * 100,
            issues: this.extractLighthouseIssues(mobileReport)
          };
        } else {
          console.log(chalk.yellow(`  ⚠️  No mobile report found for ${url}`));
          urlResult.mobile = {
            performance: null,
            accessibility: null,
            bestPractices: null,
            seo: null,
            issues: [],
            error: 'Mobile report file not found'
          };
        }
      } catch (error) {
        console.error(chalk.red(`Error processing mobile report for ${url}:`, error.message));
        urlResult.mobile = {
          performance: null,
          accessibility: null,
          bestPractices: null,
          seo: null,
          issues: [],
          error: error.message
        };
      }
      
      lightHouseResult.push(urlResult);
    }
    
    await fsp.writeFile(
      `${folderPath}/lightHouseCombine-report.json`,
      JSON.stringify(lightHouseResult, null, 2)
    );
    
    return lightHouseResult;
  }

  /**
   * Extract issues from Lighthouse report
   */
  extractLighthouseIssues(report) {
    const issues = [];
    
    // Process each category
    Object.entries(report.categories || {}).forEach(([categoryName, category]) => {
      if (category.auditRefs) {
        category.auditRefs.forEach(auditRef => {
          const audit = report.audits[auditRef.id];
          if (audit && audit.score !== null && audit.score < 1) {
            issues.push({
              type: `${categoryName}_${auditRef.id}`,
              severity: audit.score < 0.5 ? 'high' : audit.score < 0.8 ? 'medium' : 'low',
              message: audit.title,
              description: audit.description,
              category: categoryName,
              score: audit.score,
              recommendation: audit.details?.type === 'opportunity' ? audit.details?.summary : null
            });
          }
        });
      }
    });
    
    return issues;
  }

  /**
   * Generate Lighthouse reports using programmatic API
   */
  async generateLightHouseReport(urls) {
    if (!urls || urls.length === 0) {
      console.log(chalk.yellow('No URLs provided for Lighthouse audit.'));
      return [];
    }

    const folderPath = path.resolve(process.cwd(), "report");
    await fsp.mkdir(folderPath, { recursive: true });

    console.log(chalk.blue(`🚀 Running Lighthouse audit on ${urls.length} URL(s) for desktop and mobile...`));

    // Launch browser for Lighthouse
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const generateReport = async (url, deviceType = 'desktop') => {
      const maxRetries = 2;
      let attempt = 0;
      
      while (attempt <= maxRetries) {
        try {
          const outputName = url.replace(/^https?:\/\//, "").replace(/\//g, "");
          const deviceSuffix = deviceType === 'mobile' ? '.mobile' : '.desktop';
          const jsonOutputPath = path.join(folderPath, `${outputName}${deviceSuffix}.report.json`);
          
          // Check if reports already exist
          const reportsExist = fs.existsSync(jsonOutputPath);
          const actionText = reportsExist ? 'Updating existing' : 'Creating new';
          
          if (attempt > 0) {
            console.log(chalk.yellow(`  🔄 Retry attempt ${attempt} for ${deviceType} report: ${url}`));
          } else {
            console.log(chalk.blue(`  📊 Testing: ${url} (${deviceType})`));
            console.log(chalk.blue(`  📝 ${actionText} reports for: ${outputName}${deviceSuffix}`));
          }
          
          // Lighthouse configuration - optimized to match PageSpeed Insights
          const options = {
            port: (new URL(browser.wsEndpoint())).port,
            output: ['json'], // Only generate JSON, not HTML
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
            formFactor: deviceType,
            throttling: deviceType === 'mobile' ? {
              // Mobile throttling settings
              cpuSlowdownMultiplier: 4,
              networkRttMs: 150,
              networkThroughputKbps: 1638.4,
              requestLatencyMs: 0
            } : {
              // Desktop throttling settings
              cpuSlowdownMultiplier: 1,
              networkRttMs: 40,
              networkThroughputKbps: 10240,
              requestLatencyMs: 0
            },
            maxWaitForLoad: 60000, // Increased timeout
            maxWaitForFcp: 30000,  // Add FCP timeout
            maxWaitForLcp: 45000,  // Add LCP timeout
            screenEmulation: deviceType === 'mobile' ? {
              mobile: true,
              width: 375,
              height: 667,
              deviceScaleFactor: 2,
              disabled: false
            } : {
              mobile: false,
              width: 1350,
              height: 940,
              deviceScaleFactor: 1,
              disabled: false
            },
            // Additional settings to match PageSpeed Insights
            disableStorageReset: false,
            disableDeviceEmulation: false,
            emulatedUserAgent: deviceType === 'mobile' 
              ? 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36'
              : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            // Add stability improvements
            skipAudits: ['uses-http2'], // Skip some problematic audits
            onlyAudits: [], // Run all audits
            // Add performance improvements
            disableBackgroundThrottling: true,
            disableCpuThrottling: false,
            // Add navigation timeout
            navigationTimeout: 60000
          };

          // Run Lighthouse
          const runnerResult = await lighthouse(url, options);
          const report = runnerResult.lhr;
          
          // Save JSON report (overwrite if exists)
          await fsp.writeFile(jsonOutputPath, JSON.stringify(report, null, 2));
          
          // Generate custom HTML report with PageSpeed Insights-like UI
          const customHtmlFileName = await this.generateCustomHtmlReport(url, deviceType, report);
          
          console.log(chalk.blue(`  📄 Reports saved: ${outputName}${deviceSuffix}.report.json & ${customHtmlFileName}`));
          
          const successText = reportsExist ? 'Updated' : 'Generated';
          console.log(chalk.green(`  ✅ ${successText} ${deviceType} report for: ${url}`));
          
          return {
            url: url,
            deviceType: deviceType,
            performance: report.categories?.performance?.score * 100,
            accessibility: report.categories?.accessibility?.score * 100,
            bestPractices: report.categories?.["best-practices"]?.score * 100,
            seo: report.categories?.seo?.score * 100,
            issues: this.extractLighthouseIssues(report),
            customHtmlFile: customHtmlFileName
          };
        } catch (err) {
          attempt++;
          
          // Check if it's a performance mark error and we haven't exceeded retries
          if (err.message.includes('performance mark') && attempt <= maxRetries) {
            console.log(chalk.yellow(`  ⚠️  Performance mark error on attempt ${attempt}, retrying in 3 seconds...`));
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          
          // If we've exhausted retries or it's a different error, log and return error
          console.error(chalk.red(`  ❌ Error generating ${deviceType} report for ${url} (attempt ${attempt}): ${err.message}`));
          return {
            url: url,
            deviceType: deviceType,
            error: err.message,
            performance: null,
            accessibility: null,
            bestPractices: null,
            seo: null,
            issues: [],
            timestamp: new Date().toISOString()
          };
        }
      }
    };

    try {
      // Generate reports for both desktop and mobile
      const allResults = [];
      
      // Run desktop first
      console.log(chalk.blue('  🖥️  Running desktop reports...'));
      for (const url of urls) {
        const desktopResult = await generateReport(url, 'desktop');
        allResults.push(desktopResult);
      }
      
      // Add a small delay before running mobile reports
      console.log(chalk.blue('  ⏳ Waiting 2 seconds before running mobile reports...'));
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Run mobile reports
      console.log(chalk.blue('  📱 Running mobile reports...'));
      for (const url of urls) {
        const mobileResult = await generateReport(url, 'mobile');
        allResults.push(mobileResult);
      }
      
      console.log(chalk.blue('📋 Combining Lighthouse results...'));
      const combinedResults = await this.combineLightHouseData(urls);
      
      return combinedResults;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate custom HTML report with PageSpeed Insights-like UI
   */
  async generateCustomHtmlReport(url, deviceType, reportData) {
    const outputName = url.replace(/^https?:\/\//, "").replace(/\//g, "");
    const deviceSuffix = deviceType === 'mobile' ? '.mobile' : '.desktop';
    const htmlOutputPath = path.join(path.resolve(process.cwd(), "report"), `${outputName}${deviceSuffix}.custom.html`);
    
    const htmlContent = this.createCustomHtmlReport(url, deviceType, reportData);
    await fsp.writeFile(htmlOutputPath, htmlContent);
    
    return `${outputName}${deviceSuffix}.custom.html`;
  }

  /**
   * Create custom HTML report content
   */
  createCustomHtmlReport(url, deviceType, reportData) {
    const scores = {
      performance: reportData.categories?.performance?.score * 100 || 0,
      accessibility: reportData.categories?.accessibility?.score * 100 || 0,
      bestPractices: reportData.categories?.["best-practices"]?.score * 100 || 0,
      seo: reportData.categories?.seo?.score * 100 || 0
    };

    const issues = this.extractLighthouseIssues(reportData);
    const opportunities = this.extractOpportunities(reportData);
    const diagnostics = this.extractDiagnostics(reportData);
    const performanceMetrics = this.extractPerformanceMetrics(reportData);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lighthouse Report - ${url} (${deviceType})</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'score-green': '#0f9d58',
                        'score-orange': '#f4b400',
                        'score-red': '#db4437'
                    }
                }
            }
        }
    </script>
    <style>
        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin: 0 auto;
        }
        .score-green { background: linear-gradient(135deg, #0f9d58, #0b8043); }
        .score-orange { background: linear-gradient(135deg, #f4b400, #f57c00); }
        .score-red { background: linear-gradient(135deg, #db4437, #c53929); }
        .metric-card {
            transition: transform 0.2s;
        }
        .metric-card:hover {
            transform: translateY(-2px);
        }
        .issue-severity-high { border-left: 4px solid #db4437; }
        .issue-severity-medium { border-left: 4px solid #f4b400; }
        .issue-severity-low { border-left: 4px solid #0f9d58; }
        
        /* Improved Performance Metrics Styling */
        .performance-metric {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
        }
        .performance-metric:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateY(-2px);
        }
        .metric-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }
        .metric-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin: 0;
        }
        .metric-score {
            font-size: 28px;
            font-weight: 700;
            padding: 8px 16px;
            border-radius: 8px;
            color: white;
        }
        .metric-score.good { background: linear-gradient(135deg, #10b981, #059669); }
        .metric-score.needs-improvement { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .metric-score.poor { background: linear-gradient(135deg, #ef4444, #dc2626); }
        
        .metric-progress {
            width: 100%;
            height: 8px;
            background: #f3f4f6;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 12px;
        }
        .metric-progress-bar {
            height: 100%;
            border-radius: 4px;
            transition: width 0.8s ease;
        }
        .metric-progress-bar.good { background: linear-gradient(90deg, #10b981, #059669); }
        .metric-progress-bar.needs-improvement { background: linear-gradient(90deg, #f59e0b, #d97706); }
        .metric-progress-bar.poor { background: linear-gradient(90deg, #ef4444, #dc2626); }
        
        .metric-description {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.5;
            margin-bottom: 8px;
        }
        .metric-details {
            font-size: 13px;
            color: #9ca3af;
            font-weight: 500;
        }
        
        .opportunity-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
        }
        .opportunity-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .opportunity-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }
        .opportunity-title {
            font-weight: 600;
            font-size: 16px;
            color: #1f2937;
        }
        .opportunity-savings {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
        }
        .resource-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .resource-table th,
        .resource-table td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid #f3f4f6;
        }
        .resource-table th {
            background: #f9fafb;
            font-weight: 600;
            font-size: 12px;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .resource-table td {
            font-size: 13px;
            color: #4b5563;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .badge-analytics { background: #d1fae5; color: #065f46; }
        .badge-tag-manager { background: #fef3c7; color: #92400e; }
        .badge-script { background: #dbeafe; color: #1e40af; }
        
        /* Section Headers */
        .section-header {
            display: flex;
            align-items: center;
            margin-bottom: 24px;
        }
        .section-icon {
            font-size: 24px;
            margin-right: 12px;
        }
        .section-title {
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
        }
        
        /* Responsive Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .fade-in-up {
            animation: fadeInUp 0.6s ease-out;
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <!-- Header -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">Lighthouse Performance Report</h1>
                    <p class="text-gray-600">${url}</p>
                    <div class="flex items-center mt-2">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          deviceType === 'mobile' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }">
                            ${deviceType === 'mobile' ? '📱 Mobile' : '💻 Desktop'}
                        </span>
                        <span class="ml-3 text-sm text-gray-500">
                            Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                        </span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="score-circle ${this.getScoreClass(scores.performance)}">
                        ${Math.round(scores.performance)}
                    </div>
                    <p class="text-center mt-2 text-sm font-medium text-gray-700">Performance Score</p>
                </div>
            </div>
        </div>

        <!-- Core Web Vitals Section -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div class="section-header">
                <div class="section-icon">🚀</div>
                <h2 class="section-title">Core Web Vitals</h2>
            </div>
            <div class="metrics-grid">
                ${this.renderCoreWebVitals(performanceMetrics)}
            </div>
        </div>

        <!-- Performance Metrics Section -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div class="section-header">
                <div class="section-icon">⚡</div>
                <h2 class="section-title">Performance Metrics</h2>
            </div>
            <div class="metrics-grid">
                ${this.renderPerformanceMetrics(performanceMetrics)}
            </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="metric-card bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Performance</h3>
                    <span class="text-2xl font-bold ${this.getScoreTextClass(scores.performance)}">
                        ${Math.round(scores.performance)}
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full ${this.getScoreClass(scores.performance)}" 
                         style="width: ${scores.performance}%"></div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Accessibility</h3>
                    <span class="text-2xl font-bold ${this.getScoreTextClass(scores.accessibility)}">
                        ${Math.round(scores.accessibility)}
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full ${this.getScoreClass(scores.accessibility)}" 
                         style="width: ${scores.accessibility}%"></div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Best Practices</h3>
                    <span class="text-2xl font-bold ${this.getScoreTextClass(scores.bestPractices)}">
                        ${Math.round(scores.bestPractices)}
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full ${this.getScoreClass(scores.bestPractices)}" 
                         style="width: ${scores.bestPractices}%"></div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">SEO</h3>
                    <span class="text-2xl font-bold ${this.getScoreTextClass(scores.seo)}">
                        ${Math.round(scores.seo)}
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full ${this.getScoreClass(scores.seo)}" 
                         style="width: ${scores.seo}%"></div>
                </div>
            </div>
        </div>

        <!-- Opportunities Section -->
        ${opportunities.length > 0 ? `
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div class="section-header">
                <div class="section-icon">💡</div>
                <h2 class="section-title">Performance Opportunities (${opportunities.length})</h2>
            </div>
            <div class="space-y-4">
                ${opportunities.map(opp => this.renderOpportunity(opp)).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Issues Section -->
        ${issues.length > 0 ? `
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div class="section-header">
                <div class="section-icon">⚠️</div>
                <h2 class="section-title">Issues Found (${issues.length})</h2>
            </div>
            <div class="space-y-4">
                ${issues.map(issue => `
                <div class="issue-severity-${issue.severity} bg-gray-50 rounded-lg p-4">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h4 class="text-lg font-semibold text-gray-900 mb-2">${issue.message}</h4>
                            <p class="text-gray-600 mb-3">${issue.description}</p>
                            <div class="flex items-center space-x-4 text-sm">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                                  issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }">
                                    ${issue.severity.toUpperCase()}
                                </span>
                                <span class="text-gray-500">Category: ${issue.category}</span>
                                <span class="text-gray-500">Score: ${Math.round(issue.score * 100)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : `
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div class="text-center py-8">
                <div class="text-6xl mb-4">🎉</div>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">No Issues Found!</h2>
                <p class="text-gray-600">Great job! Your page is performing well across all metrics.</p>
            </div>
        </div>
        `}

        <!-- Diagnostics Section -->
        ${diagnostics.length > 0 ? `
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div class="section-header">
                <div class="section-icon">🔍</div>
                <h2 class="section-title">Diagnostics (${diagnostics.length})</h2>
            </div>
            <div class="space-y-4">
                ${diagnostics.map(diag => `
                <div class="border border-gray-200 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-gray-900 mb-2">${diag.title}</h4>
                    <p class="text-gray-600">${diag.description}</p>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="text-center text-gray-500">
                <p>Report generated by UI Code Insight Lighthouse Audit</p>
                <p class="text-sm mt-2">
                    <a href="${url}" target="_blank" class="text-blue-600 hover:text-blue-800">
                        View Original Page
                    </a>
                </p>
            </div>
        </div>
    </div>

    <script>
        // Add some interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Animate score bars on load
            const progressBars = document.querySelectorAll('.h-2.rounded-full');
            progressBars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.transition = 'width 1s ease-in-out';
                    bar.style.width = width;
                }, 500);
            });

            // Add click handlers for expandable sections
            const issueCards = document.querySelectorAll('.issue-severity-high, .issue-severity-medium, .issue-severity-low');
            issueCards.forEach(card => {
                card.addEventListener('click', function() {
                    this.classList.toggle('ring-2');
                    this.classList.toggle('ring-blue-500');
                });
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * Extract opportunities from Lighthouse report
   */
  extractOpportunities(report) {
    const opportunities = [];
    
    Object.entries(report.audits || {}).forEach(([id, audit]) => {
      if (audit.details?.type === 'opportunity' && audit.score !== null && audit.score < 1) {
        opportunities.push({
          title: audit.title,
          description: audit.description,
          savings: audit.details?.summary || null,
          score: audit.score
        });
      }
    });
    
    return opportunities;
  }

  /**
   * Extract diagnostics from Lighthouse report
   */
  extractDiagnostics(report) {
    const diagnostics = [];
    
    Object.entries(report.audits || {}).forEach(([id, audit]) => {
      if (audit.details?.type === 'diagnostic' && audit.score !== null) {
        diagnostics.push({
          title: audit.title,
          description: audit.description,
          score: audit.score
        });
      }
    });
    
    return diagnostics;
  }

  /**
   * Extract performance metrics from Lighthouse report
   */
  extractPerformanceMetrics(report) {
    const metrics = [];

    // Core Web Vitals
    metrics.push({
      title: 'Largest Contentful Paint (LCP)',
      description: 'The time it takes for the largest image or text block to load on the page.',
      score: report.audits?.['largest-contentful-paint']?.score,
      value: report.audits?.['largest-contentful-paint']?.numericValue,
      unit: 'seconds',
      category: 'Core Web Vitals'
    });

    metrics.push({
      title: 'First Contentful Paint (FCP)',
      description: 'The time it takes for the first text or image to load on the page.',
      score: report.audits?.['first-contentful-paint']?.score,
      value: report.audits?.['first-contentful-paint']?.numericValue,
      unit: 'seconds',
      category: 'Core Web Vitals'
    });

    metrics.push({
      title: 'Cumulative Layout Shift (CLS)',
      description: 'The sum of all layout shifts that occur during the page load.',
      score: report.audits?.['cumulative-layout-shift']?.score,
      value: report.audits?.['cumulative-layout-shift']?.numericValue,
      unit: 'N/A',
      category: 'Core Web Vitals'
    });

    // Performance Metrics
    metrics.push({
      title: 'Total Blocking Time (TBT)',
      description: 'The total amount of time the main thread is blocked, preventing interactive updates.',
      score: report.audits?.['total-blocking-time']?.score,
      value: report.audits?.['total-blocking-time']?.numericValue,
      unit: 'milliseconds',
      category: 'Performance'
    });

    metrics.push({
      title: 'Time to Interactive (TTI)',
      description: 'The time it takes for the page to become fully interactive.',
      score: report.audits?.['interactive']?.score,
      value: report.audits?.['interactive']?.numericValue,
      unit: 'seconds',
      category: 'Performance'
    });

    metrics.push({
      title: 'First Input Delay (FID)',
      description: 'The time it takes for the browser to respond to user interaction.',
      score: report.audits?.['first-input-delay']?.score,
      value: report.audits?.['first-input-delay']?.numericValue,
      unit: 'milliseconds',
      category: 'Performance'
    });

    // Add more metrics as needed
    return metrics;
  }

  /**
   * Render Core Web Vitals section for HTML report
   */
  renderCoreWebVitals(metrics) {
    let html = '';
    metrics.forEach(metric => {
      if (metric.category === 'Core Web Vitals' && metric.score !== null && metric.score !== undefined) {
        const scorePercent = Math.round(metric.score * 100);
        const displayValue = metric.value ? `${metric.value} ${metric.unit}` : 'N/A';
        this.getScoreClass(metric.score);
        const scoreLabel = scorePercent >= 90 ? 'good' : scorePercent >= 50 ? 'needs-improvement' : 'poor';
        
        html += `
        <div class="performance-metric fade-in-up">
            <div class="metric-header">
                <h4 class="metric-title">${metric.title}</h4>
                <span class="metric-score ${scoreLabel}">${scorePercent}</span>
            </div>
            <div class="metric-progress">
                <div class="metric-progress-bar ${scoreLabel}" style="width: ${scorePercent}%"></div>
            </div>
            <p class="metric-description">${metric.description}</p>
            <p class="metric-details">Score: ${scorePercent}% (${displayValue})</p>
        </div>
        `;
      }
    });
    return html;
  }

  /**
   * Render Performance Metrics section for HTML report
   */
  renderPerformanceMetrics(metrics) {
    let html = '';
    metrics.forEach(metric => {
      if (metric.category === 'Performance' && metric.score !== null && metric.score !== undefined) {
        const scorePercent = Math.round(metric.score * 100);
        const displayValue = metric.value ? `${metric.value} ${metric.unit}` : 'N/A';
        this.getScoreClass(metric.score);
        const scoreLabel = scorePercent >= 90 ? 'good' : scorePercent >= 50 ? 'needs-improvement' : 'poor';
        
        html += `
        <div class="performance-metric fade-in-up">
            <div class="metric-header">
                <h4 class="metric-title">${metric.title}</h4>
                <span class="metric-score ${scoreLabel}">${scorePercent}</span>
            </div>
            <div class="metric-progress">
                <div class="metric-progress-bar ${scoreLabel}" style="width: ${scorePercent}%"></div>
            </div>
            <p class="metric-description">${metric.description}</p>
            <p class="metric-details">Score: ${scorePercent}% (${displayValue})</p>
        </div>
        `;
      }
    });
    return html;
  }

  /**
   * Render an opportunity card for HTML report
   */
  renderOpportunity(opportunity) {
    return `
    <div class="opportunity-card">
        <div class="opportunity-header">
            <h4 class="opportunity-title">${opportunity.title}</h4>
            ${opportunity.savings ? `<span class="opportunity-savings">Potential savings: ${opportunity.savings}</span>` : ''}
        </div>
        <p class="text-gray-600 mb-3">${opportunity.description}</p>
        <p class="text-sm text-gray-500">Score: ${Math.round(opportunity.score * 100)}%</p>
    </div>
    `;
  }

  /**
   * Get score class for styling
   */
  getScoreClass(score) {
    if (score === null || score === undefined) return 'score-red';
    // Handle both percentage (0-100) and decimal (0-1) scores
    const normalizedScore = score > 1 ? score / 100 : score;
    if (normalizedScore >= 0.9) return 'score-green';
    if (normalizedScore >= 0.5) return 'score-orange';
    return 'score-red';
  }

  /**
   * Get score text class for styling
   */
  getScoreTextClass(score) {
    if (score === null || score === undefined) return 'text-score-red';
    // Handle both percentage (0-100) and decimal (0-1) scores
    const normalizedScore = score > 1 ? score / 100 : score;
    if (normalizedScore >= 0.9) return 'text-score-green';
    if (normalizedScore >= 0.5) return 'text-score-orange';
    return 'text-score-red';
  }

  /**
   * Run Lighthouse audit and return structured results
   */
  async runLighthouseAudit(urls) {
    console.log(chalk.blue('🚀 Starting Lighthouse Audit...'));
    
    if (!urls || urls.length === 0) {
      console.log(chalk.yellow('No URLs provided. Skipping Lighthouse audit.'));
      return {
        totalIssues: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [],
        scores: {},
        urls: []
      };
    }

    try {
      const results = await this.generateLightHouseReport(urls);
      
      // Calculate summary statistics for both desktop and mobile
      let totalIssues = 0;
      let highSeverity = 0;
      let mediumSeverity = 0;
      let lowSeverity = 0;
      const allIssues = [];
      const scores = {};

      results.forEach(result => {
        // Process desktop results
        if (result.desktop && result.desktop.issues) {
          result.desktop.issues.forEach(issue => {
            totalIssues++;
            allIssues.push({ ...issue, deviceType: 'desktop', url: result.url });
            if (issue.severity === 'high') highSeverity++;
            else if (issue.severity === 'medium') mediumSeverity++;
            else lowSeverity++;
          });
        }

        // Process mobile results
        if (result.mobile && result.mobile.issues) {
          result.mobile.issues.forEach(issue => {
            totalIssues++;
            allIssues.push({ ...issue, deviceType: 'mobile', url: result.url });
            if (issue.severity === 'high') highSeverity++;
            else if (issue.severity === 'medium') mediumSeverity++;
            else lowSeverity++;
          });
        }

        // Store scores for both device types
        if (result.url) {
          scores[result.url] = {
            desktop: result.desktop ? {
              performance: result.desktop.performance,
              accessibility: result.desktop.accessibility,
              bestPractices: result.desktop.bestPractices,
              seo: result.desktop.seo
            } : null,
            mobile: result.mobile ? {
              performance: result.mobile.performance,
              accessibility: result.mobile.accessibility,
              bestPractices: result.mobile.bestPractices,
              seo: result.mobile.seo
            } : null
          };
        }
      });

      // Display summary
      this.displayLighthouseSummary(results, scores);

      return {
        totalIssues,
        highSeverity,
        mediumSeverity,
        lowSeverity,
        issues: allIssues,
        scores,
        urls: urls,
        timestamp: new Date().toISOString(),
        results
      };

    } catch (error) {
      console.error(chalk.red('Error running Lighthouse audit:', error.message));
      return {
        totalIssues: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [],
        scores: {},
        urls: urls,
        error: error.message
      };
    }
  }

  /**
   * Display Lighthouse audit summary
   */
  displayLighthouseSummary(results, scores) {
    console.log(chalk.blue('\n📊 Lighthouse Audit Summary:'));
    console.log(chalk.blue('='.repeat(50)));
    
    results.forEach(result => {
      console.log(chalk.cyan(`\n🌐 ${result.url}:`));
      
      // Display desktop results
      if (result.desktop) {
        if (result.desktop.error) {
          console.log(chalk.red(`  💻 Desktop: ${result.desktop.error}`));
        } else {
          console.log(chalk.blue('  💻 Desktop:'));
          console.log(`    Performance: ${this.getScoreDisplay(result.desktop.performance)}`);
          console.log(`    Accessibility: ${this.getScoreDisplay(result.desktop.accessibility)}`);
          console.log(`    Best Practices: ${this.getScoreDisplay(result.desktop.bestPractices)}`);
          console.log(`    SEO: ${this.getScoreDisplay(result.desktop.seo)}`);
          
          if (result.desktop.issues && result.desktop.issues.length > 0) {
            console.log(chalk.yellow(`    Issues found: ${result.desktop.issues.length}`));
          } else {
            console.log(chalk.green('    ✅ No issues found'));
          }
        }
      } else {
        console.log(chalk.gray('  💻 Desktop: No data available'));
      }
      
      // Display mobile results
      if (result.mobile) {
        if (result.mobile.error) {
          console.log(chalk.red(`  📱 Mobile: ${result.mobile.error}`));
        } else {
          console.log(chalk.blue('  📱 Mobile:'));
          console.log(`    Performance: ${this.getScoreDisplay(result.mobile.performance)}`);
          console.log(`    Accessibility: ${this.getScoreDisplay(result.mobile.accessibility)}`);
          console.log(`    Best Practices: ${this.getScoreDisplay(result.mobile.bestPractices)}`);
          console.log(`    SEO: ${this.getScoreDisplay(result.mobile.seo)}`);
          
          if (result.mobile.issues && result.mobile.issues.length > 0) {
            console.log(chalk.yellow(`    Issues found: ${result.mobile.issues.length}`));
          } else {
            console.log(chalk.green('    ✅ No issues found'));
          }
        }
      } else {
        console.log(chalk.gray('  📱 Mobile: No data available'));
      }
    });
  }

  /**
   * Get formatted score display
   */
  getScoreDisplay(score) {
    if (score === null || score === undefined) return chalk.gray('N/A');
    // Handle both percentage (0-100) and decimal (0-1) scores
    const normalizedScore = score > 1 ? score : score * 100;
    if (normalizedScore >= 90) return chalk.green(`${Math.round(normalizedScore)}%`);
    if (normalizedScore >= 50) return chalk.yellow(`${Math.round(normalizedScore)}%`);
    return chalk.red(`${Math.round(normalizedScore)}%`);
  }
}

const BATCH_SIZE$3 = 5;

/**
 * Testing audit module for detecting testing practices and coverage
 */
class TestingAudit {
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
    for (let i = 0; i < testFiles.length; i += BATCH_SIZE$3) {
      const batch = testFiles.slice(i, i + BATCH_SIZE$3);
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
    for (let i = 0; i < testFiles.length; i += BATCH_SIZE$3) {
      const batch = testFiles.slice(i, i + BATCH_SIZE$3);
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

const BATCH_SIZE$2 = 5;

/**
 * Dependency audit module for detecting dependency issues
 */
class DependencyAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.dependencyIssues = [];
    this.issuesFile = path.join(this.folderPath, 'dependency-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) fs.unlinkSync(this.issuesFile);
    this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
  }

  async addDependencyIssue(issue) {
    this.issueStream.write(JSON.stringify(issue) + '\n');
  }

  /**
   * Check for outdated dependencies
   */
  async checkOutdatedDependencies() {
    console.log(chalk.blue('📦 Checking for outdated dependencies...'));
    
    try {
      const outdatedResult = execSync('npm outdated --json', { 
        encoding: 'utf8', 
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      const outdatedData = JSON.parse(outdatedResult);
      
      const keys = Object.keys(outdatedData);
      for (let i = 0; i < keys.length; i += BATCH_SIZE$2) {
        const batch = keys.slice(i, i + BATCH_SIZE$2);
        batch.forEach((packageName, idx) => {
          process.stdout.write(`\r[Outdated Dependencies] Progress: ${i + idx + 1}/${keys.length} checked`);
        const packageInfo = outdatedData[packageName];
        this.addDependencyIssue({
          type: 'outdated_dependency',
          package: packageName,
          current: packageInfo.current,
          wanted: packageInfo.wanted,
          latest: packageInfo.latest,
          severity: packageInfo.latest !== packageInfo.wanted ? 'medium' : 'low',
          message: `${packageName} is outdated (current: ${packageInfo.current}, latest: ${packageInfo.latest})`,
          recommendation: `Update ${packageName} to version ${packageInfo.latest}`
        });
      });
      }
      process.stdout.write(`\r[Outdated Dependencies] Progress: ${keys.length}/${keys.length} checked\n`);
    } catch (error) {
      // npm outdated returns non-zero exit code when there are outdated packages
      if (error.status === 1) {
        try {
          const output = error.stdout.toString();
          const lines = output.split('\n');
          
          // Parse the table output
          lines.forEach(line => {
            const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/);
            if (match) {
              const [, packageName, current, wanted, latest] = match;
              if (packageName !== 'Package' && current !== 'Current') {
                this.addDependencyIssue({
                  type: 'outdated_dependency',
                  package: packageName,
                  current,
                  wanted,
                  latest,
                  severity: latest !== wanted ? 'medium' : 'low',
                  message: `${packageName} is outdated (current: ${current}, latest: ${latest})`,
                  recommendation: `Update ${packageName} to version ${latest}`
                });
              }
            }
          });
        } catch (parseError) {
          console.warn(chalk.yellow('Warning: Could not parse outdated dependencies'));
        }
      } else {
        console.warn(chalk.yellow('Warning: Could not check for outdated dependencies'));
      }
    }
  }

  /**
   * Check for duplicate dependencies
   */
  async checkDuplicateDependencies() {
    console.log(chalk.blue('📦 Checking for duplicate dependencies...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const packageNames = Object.keys(allDeps);
      for (let i = 0; i < packageNames.length; i += BATCH_SIZE$2) {
        const batch = packageNames.slice(i, i + BATCH_SIZE$2);
        batch.forEach((name, idx) => {
          process.stdout.write(`\r[Duplicate Dependencies] Progress: ${i + idx + 1}/${packageNames.length} checked`);
          if (packageNames.indexOf(name) !== i + idx) {
          this.addDependencyIssue({
            type: 'duplicate_dependency',
              package: name,
            severity: 'medium',
              message: `Duplicate dependency found: ${name}`,
            recommendation: 'Remove duplicate entry from package.json'
          });
          }
        });
      }
      process.stdout.write(`\r[Duplicate Dependencies] Progress: ${packageNames.length}/${packageNames.length} checked\n`);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check for duplicate dependencies'));
    }
  }

  /**
   * Check for unused dependencies
   */
  async checkUnusedDependencies() {
    console.log(chalk.blue('📦 Checking for unused dependencies...'));
    const { spawnSync } = await import('child_process');
    let depcheckPath;
    try {
      // Use createRequire for ESM compatibility
      let require;
      try {
        const { createRequire } = await import('module');
        require = createRequire(import.meta.url);
        depcheckPath = require.resolve('depcheck');
      } catch (resolveErr) {
        depcheckPath = null;
      }
      if (!depcheckPath) {
        console.warn(chalk.yellow('depcheck is not installed. Please run: npm install depcheck --save-dev'));
        this.addDependencyIssue({
          type: 'depcheck_missing',
          severity: 'medium',
          message: 'depcheck is not installed. Unused dependency check skipped.',
          recommendation: 'Run npm install depcheck --save-dev'
        });
        return;
      }
      // Run depcheck
      const depcheckResult = spawnSync('npx', ['depcheck', '--json'], { encoding: 'utf8' });
      if (depcheckResult.error) {
        throw depcheckResult.error;
      }
      // Accept nonzero exit code if output is present (depcheck returns 1 if unused found)
      let depcheckData;
      const output = depcheckResult.stdout ? depcheckResult.stdout.trim() : '';
      if (!output && depcheckResult.stderr) {
        console.warn(chalk.yellow('depcheck stderr output:'));
        console.warn(depcheckResult.stderr);
      }
      try {
        depcheckData = JSON.parse(output);
      } catch (parseErr) {
        console.warn(chalk.yellow('Warning: Could not parse depcheck output as JSON.'));
        if (output) {
          console.warn(chalk.gray('depcheck output was:'));
          console.warn(output);
        }
        this.addDependencyIssue({
          type: 'depcheck_parse_error',
          severity: 'medium',
          message: 'depcheck output could not be parsed as JSON.',
          recommendation: 'Try running depcheck manually to debug.'
        });
        return;
      }
      if (depcheckData.dependencies && depcheckData.dependencies.length > 0) {
        for (let i = 0; i < depcheckData.dependencies.length; i += BATCH_SIZE$2) {
          const batch = depcheckData.dependencies.slice(i, i + BATCH_SIZE$2);
          batch.forEach((dep, idx) => {
            process.stdout.write(`\r[Unused Dependencies] Progress: ${i + idx + 1}/${depcheckData.dependencies.length} checked`);
          this.addDependencyIssue({
            type: 'unused_dependency',
            package: dep,
            file: dep || undefined, // Only set file to dep if no file info is present
            severity: 'low',
            message: `Unused dependency: ${dep}`,
            recommendation: `Remove ${dep} from package.json if not needed`
          });
        });
        }
        process.stdout.write(`\r[Unused Dependencies] Progress: ${depcheckData.dependencies.length}/${depcheckData.dependencies.length} checked\n`);
      }
      if (depcheckData.devDependencies && depcheckData.devDependencies.length > 0) {
        for (let i = 0; i < depcheckData.devDependencies.length; i += BATCH_SIZE$2) {
          const batch = depcheckData.devDependencies.slice(i, i + BATCH_SIZE$2);
          batch.forEach((dep, idx) => {
            process.stdout.write(`\r[Unused Dev Dependencies] Progress: ${i + idx + 1}/${depcheckData.devDependencies.length} checked`);
          this.addDependencyIssue({
            type: 'unused_dev_dependency',
            package: dep,
            file: dep || undefined, // Only set file to dep if no file info is present
            severity: 'low',
            message: `Unused dev dependency: ${dep}`,
            recommendation: `Remove ${dep} from devDependencies if not needed`
          });
        });
        }
        process.stdout.write(`\r[Unused Dev Dependencies] Progress: ${depcheckData.devDependencies.length}/${depcheckData.devDependencies.length} checked\n`);
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check for unused dependencies.'));
      if (error && error.message) {
        console.warn(chalk.yellow(error.message));
      }
      this.addDependencyIssue({
        type: 'depcheck_error',
        severity: 'medium',
        message: 'Error occurred while running depcheck.',
        recommendation: 'Try running depcheck manually to debug.'
      });
    }
  }

  /**
   * Check for missing dependencies
   */
  async checkMissingDependencies() {
    console.log(chalk.blue('📦 Checking for missing dependencies...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check if node_modules exists
      if (!fs.existsSync('node_modules')) {
        this.addDependencyIssue({
          type: 'missing_node_modules',
          severity: 'high',
          message: 'node_modules directory not found',
          recommendation: 'Run npm install to install dependencies'
        });
        return;
      }
      
      // Check for missing packages in node_modules
      const depKeys = Object.keys(allDeps);
      for (let i = 0; i < depKeys.length; i += BATCH_SIZE$2) {
        const batch = depKeys.slice(i, i + BATCH_SIZE$2);
        batch.forEach((packageName, idx) => {
          process.stdout.write(`\r[Missing Packages] Progress: ${i + idx + 1}/${depKeys.length} checked`);
        const packagePath = path.join('node_modules', packageName);
        if (!fs.existsSync(packagePath)) {
          this.addDependencyIssue({
            type: 'missing_package',
            package: packageName,
            severity: 'high',
            message: `Package ${packageName} is missing from node_modules`,
            recommendation: `Run npm install to install ${packageName}`
          });
        }
      });
      }
      process.stdout.write(`\r[Missing Packages] Progress: ${depKeys.length}/${depKeys.length} checked\n`);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check for missing dependencies'));
    }
  }

  /**
   * Check for peer dependency issues
   */
  async checkPeerDependencies() {
    console.log(chalk.blue('📦 Checking peer dependencies...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      if (packageJson.peerDependencies) {
        const peerKeys = Object.keys(packageJson.peerDependencies);
        for (let i = 0; i < peerKeys.length; i += BATCH_SIZE$2) {
          const batch = peerKeys.slice(i, i + BATCH_SIZE$2);
          batch.forEach((peerDep, idx) => {
            process.stdout.write(`\r[Peer Dependencies] Progress: ${i + idx + 1}/${peerKeys.length} checked`);
          const requiredVersion = packageJson.peerDependencies[peerDep];
          const packagePath = path.join('node_modules', peerDep);
          if (!fs.existsSync(packagePath)) {
            this.addDependencyIssue({
              type: 'missing_peer_dependency',
              package: peerDep,
              requiredVersion,
              severity: 'high',
              message: `Peer dependency ${peerDep}@${requiredVersion} is not installed`,
              recommendation: `Install ${peerDep}@${requiredVersion}`
            });
          }
        });
        }
        process.stdout.write(`\r[Peer Dependencies] Progress: ${peerKeys.length}/${peerKeys.length} checked\n`);
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check peer dependencies'));
    }
  }

  /**
   * Check for dependency size issues
   */
  async checkDependencySizes() {
    console.log(chalk.blue('📦 Checking dependency sizes...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Known large packages
      const largePackages = [
        'lodash', 'moment', 'date-fns', 'ramda', 'immutable',
        'bootstrap', 'material-ui', 'antd', 'semantic-ui',
        'jquery', 'angular', 'vue', 'react-dom'
      ];
      
      for (let i = 0; i < largePackages.length; i += BATCH_SIZE$2) {
        const batch = largePackages.slice(i, i + BATCH_SIZE$2);
        batch.forEach((pkg, idx) => {
          process.stdout.write(`\r[Large Dependencies] Progress: ${i + idx + 1}/${largePackages.length} checked`);
        if (allDeps[pkg]) {
          this.addDependencyIssue({
            type: 'large_dependency',
            package: pkg,
            severity: 'low',
            message: `Large dependency detected: ${pkg}`,
            recommendation: 'Consider using lighter alternatives or tree-shaking'
          });
        }
      });
      }
      process.stdout.write(`\r[Large Dependencies] Progress: ${largePackages.length}/${largePackages.length} checked\n`);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check dependency sizes'));
    }
  }

  /**
   * Check for license compliance
   */
  async checkLicenseCompliance() {
    console.log(chalk.blue('📦 Checking license compliance...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      if (!packageJson.license) {
        this.addDependencyIssue({
          type: 'missing_license',
          severity: 'medium',
          message: 'No license specified in package.json',
          recommendation: 'Add a license field to package.json'
        });
      }
      
      // Check for problematic licenses in dependencies
      try {
        const licenseResult = execSync('npx license-checker --json', { 
          encoding: 'utf8', 
          cwd: process.cwd(),
          stdio: 'pipe'
        });
        
        const licenseData = JSON.parse(licenseResult);
        
        const problematicLicenses = ['GPL', 'AGPL', 'LGPL'];
        
        const licenseKeys = Object.keys(licenseData);
        for (let i = 0; i < licenseKeys.length; i += BATCH_SIZE$2) {
          const batch = licenseKeys.slice(i, i + BATCH_SIZE$2);
          batch.forEach((packageName, idx) => {
            process.stdout.write(`\r[License Compliance] Progress: ${i + idx + 1}/${licenseKeys.length} checked`);
          const packageInfo = licenseData[packageName];
          if (packageInfo.licenses) {
            problematicLicenses.forEach(license => {
              if (packageInfo.licenses.includes(license)) {
                this.addDependencyIssue({
                  type: 'problematic_license',
                  package: packageName,
                  license: packageInfo.licenses,
                  severity: 'medium',
                  message: `Package ${packageName} uses ${packageInfo.licenses} license`,
                  recommendation: 'Review license compatibility with your project'
                });
              }
            });
          }
        });
        }
        process.stdout.write(`\r[License Compliance] Progress: ${licenseKeys.length}/${licenseKeys.length} checked\n`);
      } catch (licenseError) {
        console.warn(chalk.yellow('Warning: Could not check dependency licenses (license-checker not available)'));
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check license compliance'));
    }
  }

  /**
   * Run all dependency checks
   */
  async runDependencyAudit() {
    console.log(chalk.blue('📦 Starting Dependency Audit...'));
    
    await this.checkOutdatedDependencies();
    await this.checkDuplicateDependencies();
    await this.checkUnusedDependencies();
    await this.checkMissingDependencies();
    await this.checkPeerDependencies();
    await this.checkDependencySizes();
    await this.checkLicenseCompliance();
    
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
      this.dependencyIssues = uniqueIssues;
    }

    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.dependencyIssues.length,
      highSeverity: this.dependencyIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.dependencyIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.dependencyIssues.filter(issue => issue.severity === 'low').length,
      issues: this.dependencyIssues
    };

    // Generate JSON report
    try {
      const reportPath = path.join(this.folderPath, 'dependency-audit-report.json');
      await writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`✅ Dependency audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving dependency audit report:', error.message));
    }

    // Display summary
    console.log(chalk.blue('\n📦 DEPENDENCY AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(40)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));

    return results;
  }
}

/**
 * Main audit orchestrator that runs all audit categories
 */
class AuditOrchestrator {
  constructor(folderPath, lighthouseUrl = null) {
    this.folderPath = folderPath;
    this.lighthouseUrl = lighthouseUrl;
    this.auditResults = {};
  }

  /**
   * Run all audits
   */
  async runAllAudits() {
    console.log(chalk.blue('🚀 Starting Comprehensive Code Audit...\n'));
    
    const startTime = Date.now();
    
    try {
      // Run all audit categories with error handling
      const auditPromises = [
        this.runSecurityAudit().catch(error => {
          console.warn(chalk.yellow('⚠️  Security audit failed:', error.message));
          return { totalIssues: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0, issues: [] };
        }),
        this.runPerformanceAudit().catch(error => {
          console.warn(chalk.yellow('⚠️  Performance audit failed:', error.message));
          return { totalIssues: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0, issues: [] };
        }),
        this.runAccessibilityAudit().catch(error => {
          console.warn(chalk.yellow('⚠️  Accessibility audit failed:', error.message));
          return { totalIssues: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0, issues: [] };
        }),
        this.runLighthouseAudit().catch(error => {
          console.warn(chalk.yellow('⚠️  Lighthouse audit failed:', error.message));
          return { totalIssues: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0, issues: [] };
        }),
        this.runTestingAudit().catch(error => {
          console.warn(chalk.yellow('⚠️  Testing audit failed:', error.message));
          return { totalIssues: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0, issues: [] };
        }),
        this.runDependencyAudit().catch(error => {
          console.warn(chalk.yellow('⚠️  Dependency audit failed:', error.message));
          return { totalIssues: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0, issues: [] };
        })
      ];

      const [
        securityResults,
        performanceResults,
        accessibilityResults,
        lighthouseResults,
        testingResults,
        dependencyResults
      ] = await Promise.all(auditPromises);

      // Compile results
      this.auditResults = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        summary: {
          totalIssues: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0,
          positivePractices: 0
        },
        categories: {
          security: securityResults,
          performance: performanceResults,
          accessibility: accessibilityResults,
          lighthouse: lighthouseResults,
          testing: testingResults,
          dependency: dependencyResults
        }
      };

      // Calculate summary
      Object.values(this.auditResults.categories).forEach(category => {
        this.auditResults.summary.totalIssues += category.totalIssues || 0;
        this.auditResults.summary.highSeverity += category.highSeverity || 0;
        this.auditResults.summary.mediumSeverity += category.mediumSeverity || 0;
        this.auditResults.summary.lowSeverity += category.lowSeverity || 0;
      });

      // Generate report
      await this.generateAuditReport();
      
      // Display summary
      this.displaySummary();
      
      return this.auditResults;
      
    } catch (error) {
      console.error(chalk.red('Error running audits:', error.message));
      throw error;
    }
  }

  /**
   * Run security audit
   */
  async runSecurityAudit() {
    console.log(chalk.blue('🔒 Running Security Audit...'));
    const securityAudit = new SecurityAudit(this.folderPath);
    return await securityAudit.runSecurityAudit();
  }

  /**
   * Run performance audit
   */
  async runPerformanceAudit() {
    console.log(chalk.blue('⚡ Running Performance Audit...'));
    const performanceAudit = new PerformanceAudit(this.folderPath);
    return await performanceAudit.runPerformanceAudit();
  }

  /**
   * Run accessibility audit
   */
  async runAccessibilityAudit() {
    console.log(chalk.blue('♿ Running Accessibility Audit...'));
    const accessibilityAudit = new AccessibilityAudit(this.folderPath);
    return await accessibilityAudit.runAccessibilityAudit();
  }

  /**
   * Run Lighthouse audit
   */
  async runLighthouseAudit() {
    if (!this.lighthouseUrl) {
      console.log(chalk.yellow('No Lighthouse URL provided. Skipping Lighthouse audit.'));
      return {
        totalIssues: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [],
        scores: {},
        urls: []
      };
    }
    
    console.log(chalk.blue('🚀 Running Lighthouse Audit...'));
    const lighthouseAudit = new LighthouseAudit(this.folderPath);
    return await lighthouseAudit.runLighthouseAudit([this.lighthouseUrl]);
  }

  /**
   * Run testing audit
   */
  async runTestingAudit() {
    console.log(chalk.blue('🧪 Running Testing Audit...'));
    const testingAudit = new TestingAudit(this.folderPath);
    return await testingAudit.runTestingAudit();
  }

  /**
   * Run dependency audit
   */
  async runDependencyAudit() {
    console.log(chalk.blue('📦 Running Dependency Audit...'));
    const dependencyAudit = new DependencyAudit(this.folderPath);
    return await dependencyAudit.runDependencyAudit();
  }

  /**
   * Generate comprehensive audit report
   */
  async generateAuditReport() {
    console.log(chalk.blue('\n📊 Generating Audit Report...'));
    
    const reportPath = path.join(this.folderPath, 'comprehensive-audit-report.json');
    
    try {
      await writeFile(reportPath, JSON.stringify(this.auditResults, null, 2));
      console.log(chalk.green(`✅ Comprehensive audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving audit report:', error.message));
    }
  }

  /**
   * Display audit summary
   */
  displaySummary() {
    console.log(chalk.blue('\n📋 AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(50)));
    
    const { summary, categories } = this.auditResults;
    
    // Overall summary
    console.log(chalk.white(`\n🔍 Total Issues Found: ${summary.totalIssues}`));
    console.log(chalk.red(`🚨 High Severity: ${summary.highSeverity}`));
    console.log(chalk.yellow(`⚠️  Medium Severity: ${summary.mediumSeverity}`));
    console.log(chalk.blue(`ℹ️  Low Severity: ${summary.lowSeverity}`));
    
    // Category breakdown
    console.log(chalk.white('\n📊 Category Breakdown:'));
    console.log(chalk.blue('-'.repeat(30)));
    
    Object.entries(categories).forEach(([category, results]) => {
      const icon = this.getCategoryIcon(category);
      const total = results.totalIssues || 0;
      const high = results.highSeverity || 0;
      const medium = results.mediumSeverity || 0;
      const low = results.lowSeverity || 0;
      
      console.log(chalk.white(`${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}:`));
      console.log(chalk.white(`   Total: ${total} | High: ${high} | Medium: ${medium} | Low: ${low}`));
    });
    
    // Recommendations
    this.displayRecommendations();
  }

  /**
   * Get icon for audit category
   */
  getCategoryIcon(category) {
    const icons = {
      security: '🔒',
      performance: '⚡',
      accessibility: '♿',
      lighthouse: '🚀',
      testing: '🧪',
      dependency: '📦'
    };
    return icons[category] || '📋';
  }

  /**
   * Display recommendations based on audit results
   */
  displayRecommendations() {
    console.log(chalk.white('\n💡 RECOMMENDATIONS'));
    console.log(chalk.blue('-'.repeat(30)));
    
    const { categories } = this.auditResults;
    
    // Security recommendations
    if (categories.security.highSeverity > 0) {
      console.log(chalk.red('🔒 Security: Address high-severity security issues immediately'));
    }
    
    // Performance recommendations
    if (categories.performance.highSeverity > 0) {
      console.log(chalk.yellow('⚡ Performance: Fix memory leaks and optimize bundle size'));
    }
    
    // Accessibility recommendations
    if (categories.accessibility.highSeverity > 0) {
      console.log(chalk.blue('♿ Accessibility: Fix missing alt attributes and form labels'));
    }
    
    // Lighthouse recommendations
    if (categories.lighthouse && categories.lighthouse.totalIssues > 0) {
      console.log(chalk.magenta('🚀 Lighthouse: Optimize your website for better performance and accessibility'));
    }
    
    // Testing recommendations
    if (categories.testing.highSeverity > 0) {
      console.log(chalk.magenta('🧪 Testing: Add test files and testing framework'));
    }
    
    // Dependency recommendations
    if (categories.dependency.highSeverity > 0) {
      console.log(chalk.cyan('📦 Dependencies: Install missing dependencies and update outdated packages'));
    }
    
    console.log(chalk.white('\n📄 Detailed report saved to: comprehensive-audit-report.json'));
  }

  /**
   * Run specific audit category
   */
  async runSpecificAudit(category) {
    const auditMethods = {
      security: () => this.runSecurityAudit(),
      performance: () => this.runPerformanceAudit(),
      accessibility: () => this.runAccessibilityAudit(),
      lighthouse: () => this.runLighthouseAudit(),
      testing: () => this.runTestingAudit(),
      dependency: () => this.runDependencyAudit()
    };

    if (auditMethods[category]) {
      return await auditMethods[category]();
    } else {
      throw new Error(`Unknown audit category: ${category}`);
    }
  }
}

const copyFile = (sourcePath, targetPath) => {
  fs.copyFileSync(sourcePath, targetPath);
};

const copyStaticFiles = async (folderPath) => {
  const dist = "../build";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  await mkdir(folderPath, { recursive: true });
  const sourcePath = path.join(__dirname, dist, "index.html");
  const targetPath = path.join(folderPath, "index.html");
  copyFile(sourcePath, targetPath);
  const mainJsSourcePath = path.join(__dirname, dist, "bundle.js");
  const mainJsTargetPath = path.join(folderPath, "bundle.js");
  copyFile(mainJsSourcePath, mainJsTargetPath);
  const mainCssSourcePath = path.join(__dirname, dist, "bundle.css");
  const mainCssTargetPath = path.join(folderPath, "bundle.css");
  copyFile(mainCssSourcePath, mainCssTargetPath);
};

// Default ESLint rules to exclude (commonly disabled by project architects)
const DEFAULT_ESLINT_EXCLUDE_RULES = [
  // Formatting and style rules
  'indent', 'quotes', 'semi', 'comma-dangle', 'no-trailing-spaces', 'eol-last',
  'no-multiple-empty-lines', 'space-before-function-paren', 'space-before-blocks',
  'keyword-spacing', 'space-infix-ops', 'object-curly-spacing', 'array-bracket-spacing',
  'comma-spacing', 'key-spacing', 'brace-style', 'camelcase', 'new-cap',
  'no-underscore-dangle', 'no-unused-vars', 'no-console', 'no-debugger',
  'prefer-const', 'no-var', 'arrow-spacing', 'no-spaced-func', 'func-call-spacing',
  'no-multi-spaces', 'no-trailing-spaces', 'no-mixed-spaces-and-tabs',
  'no-tabs', 'no-mixed-operators', 'operator-linebreak', 'nonblock-statement-body-position',
  'no-else-return', 'no-nested-ternary', 'no-unneeded-ternary', 'object-shorthand',
  'prefer-template', 'template-curly-spacing', 'prefer-arrow-callback', 'arrow-body-style',
  'no-duplicate-imports', 'import/order', 'import/no-unresolved', 'import/extensions',
  'import/no-extraneous-dependencies', 'import/prefer-default-export',
  'react/jsx-indent', 'react/jsx-indent-props', 'react/jsx-closing-bracket-location',
  'react/jsx-closing-tag-location', 'react/jsx-curly-spacing', 'react/jsx-equals-spacing',
  'react/jsx-first-prop-new-line', 'react/jsx-max-props-per-line', 'react/jsx-one-expression-per-line',
  'react/jsx-props-no-multi-spaces', 'react/jsx-tag-spacing', 'react/jsx-wrap-multilines',
  'react/self-closing-comp', 'react/jsx-boolean-value', 'react/jsx-curly-brace-presence',
  'react/jsx-no-bind', 'react/jsx-no-literals', 'react/jsx-pascal-case',
  'react/jsx-sort-default-props', 'react/jsx-sort-props', 'react/no-array-index-key',
  'react/no-danger', 'react/no-deprecated', 'react/no-did-mount-set-state',
  'react/no-did-update-set-state', 'react/no-direct-mutation-state',
  'react/no-find-dom-node', 'react/no-is-mounted', 'react/no-multi-comp',
  'react/no-render-return-value', 'react/no-set-state', 'react/no-string-refs',
  'react/no-unescaped-entities', 'react/no-unknown-property', 'react/no-unsafe',
  'react/no-unused-prop-types', 'react/no-unused-state', 'react/prefer-es6-class',
  'react/prefer-stateless-function', 'react/prop-types', 'react/react-in-jsx-scope',
  'react/require-default-props', 'react/require-optimization', 'react/require-render-return',
  'react/sort-comp', 'react/sort-prop-types', 'react/style-prop-object',
  'react/void-dom-elements-no-children', 'react/jsx-key', 'react/jsx-no-duplicate-props',
  'react/jsx-no-undef', 'react/jsx-uses-react', 'react/jsx-uses-vars',
  'react/no-array-index-key', 'react/no-danger', 'react/no-deprecated',
  'react/no-did-mount-set-state', 'react/no-did-update-set-state',
  'react/no-direct-mutation-state', 'react/no-find-dom-node', 'react/no-is-mounted',
  'react/no-multi-comp', 'react/no-render-return-value', 'react/no-set-state',
  'react/no-string-refs', 'react/no-unescaped-entities', 'react/no-unknown-property',
  'react/no-unsafe', 'react/no-unused-prop-types', 'react/no-unused-state',
  'react/prefer-es6-class', 'react/prefer-stateless-function', 'react/prop-types',
  'react/react-in-jsx-scope', 'react/require-default-props', 'react/require-optimization',
  'react/require-render-return', 'react/sort-comp', 'react/sort-prop-types',
  'react/style-prop-object', 'react/void-dom-elements-no-children', 'import/no-cycle', 
  'max-len', 'no-param-reassign'
];

// Helper to get all rules enabled by a config
function getRulesForConfig(configName) {
  const require = createRequire(import.meta.url);
  let rules = {};
  try {
    if (configName === 'airbnb') {
      // Airbnb base config aggregates these files
      const airbnbRuleFiles = [
        'eslint-config-airbnb-base/rules/best-practices',
        'eslint-config-airbnb-base/rules/errors',
        'eslint-config-airbnb-base/rules/node',
        'eslint-config-airbnb-base/rules/style',
        'eslint-config-airbnb-base/rules/variables',
        'eslint-config-airbnb-base/rules/imports',
        'eslint-config-airbnb-base/rules/strict',
        'eslint-config-airbnb-base/rules/es6',
      ];
      airbnbRuleFiles.forEach(file => {
        try {
          const mod = require(file);
          if (mod && mod.rules) {
            rules = { ...rules, ...mod.rules };
          }
        } catch (e) {}
      });
    } else if (configName === 'eslint:recommended') {
      // Try to load recommended config if available
      try {
        const recommended = require('eslint/conf/eslint-recommended');
        if (recommended && recommended.rules) {
          rules = { ...rules, ...recommended.rules };
        }
      } catch (e) {}
    }
    // Add more configs as needed
  } catch (e) {}
  return Object.keys(rules);
}

// Helper to get config extends from config file
function getConfigExtends(configPath) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (Array.isArray(config.extends)) return config.extends;
    if (typeof config.extends === 'string') return [config.extends];
  } catch (e) {}
  return [];
}

// Constants for configuration files
const CONFIG_FOLDER$1 = "config";
const ESLINTRC_JSON = ".eslintrc.json";
const ESLINTRC_JS = ".eslintrc.js";
const ESLINTRC_YML = ".eslintrc.yml";
const ESLINTRC = ".eslintrc";
const ESLINTRC_REACT = "eslintrc.react.json";
const ESLINTRC_NODE = "eslintrc.node.json";
const ESLINTRC_VANILLA = "eslintrc.vanilla.json";
const ESLINTRC_TS = "eslintrc.typescript.json";
const ESLINTRC_TSREACT = "eslintrc.tsreact.json";

/**
 * Function to determine ESLint configuration file path
 * @param {boolean} recommendedLintRules
 * @param {string} projectType
 * @returns {string} lintConfigFile
 */
const getLintConfigFile$1 = (recommendedLintRules, projectType = '') => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let configFileName = ESLINTRC_JSON;

  if (projectType.toLowerCase() === 'react') {
    configFileName = ESLINTRC_REACT;
  } else if (projectType.toLowerCase() === 'node') {
    configFileName = ESLINTRC_NODE;
  } else if (projectType.toLowerCase() === 'vanilla') {
    configFileName = ESLINTRC_VANILLA;
  } else if (projectType.toLowerCase() === 'typescript') {
    configFileName = ESLINTRC_TS;
  } else if (projectType.toLowerCase() === 'typescript + react' || projectType.toLowerCase() === 'tsreact') {
    configFileName = ESLINTRC_TSREACT;
  }

  const configFilePath = path.join(__dirname, CONFIG_FOLDER$1, configFileName);
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // fallback to default logic
  const recommendedLintRulesConfigFile = path.join(
    __dirname,
    CONFIG_FOLDER$1,
    ESLINTRC_JSON
  );
  const moduleDir = path.join(process.cwd(), "node_modules", "ui-code-insight");
  const eslintLintFilePathFromModule = path.join(moduleDir, ESLINTRC_JSON);

  if (recommendedLintRules) {
    return recommendedLintRulesConfigFile;
  }

  const configFiles = [
    ESLINTRC,
    ESLINTRC_JS,
    ESLINTRC_YML,
    ESLINTRC_JSON,
    eslintLintFilePathFromModule,
  ];

  return configFiles.find((file) => fs.existsSync(file));
};

/**
 * Function to lint a single file
 * @param {string} filePath
 * @param {ESLint} eslint
 * @returns {Promise<Object|null>} lint result
 */
const lintFile$1 = async (filePath, eslint) => {
  try {
    // Read file content
    const data = await readFile(filePath, "utf8");

    // Lint the file
    const messages = await eslint.lintText(data, {
      filePath,
    });

    // if (messages[0].errorCount) {
    //   logError(filePath);
    // } else if (messages[0].warningCount) {
    //   logWarning(filePath);
    // } else {
    //   logSuccess(filePath);
    // }

    return {
      filePath,
      errorCount: messages[0].errorCount,
      warningCount: messages[0].warningCount,
      messages: messages[0].messages,
    };
  } catch (err) {
    console.error(chalk.red(`Error reading file ${filePath}: ${err}`));
    return null;
  }
};

const BATCH_SIZE$1 = 5;

/**
 * Function to lint all files
 * @param {Array<string>} files
 * @param {string} folderPath
 * @param {ESLint} eslint
 * @param {string} projectType
 * @param {Array<string>} reports
 */
const lintAllFiles$1 = async (files, folderPath, eslint, projectType, reports) => {
  console.log(
    chalk.green(
      `Total files count is ${files.length} This linting task will take some time.`
    )
  );

  // Get merged exclude rules from config
  const excludeRules = getMergedExcludeRules('eslint', DEFAULT_ESLINT_EXCLUDE_RULES);

  let results = [];
  let processed = 0;
  for (let i = 0; i < files.length; i += BATCH_SIZE$1) {
    const batch = files.slice(i, i + BATCH_SIZE$1);
    const batchResults = await Promise.all(batch.map(async (filePath) => {
      processed++;
      process.stdout.write(`\r[ESLint] Progress: ${processed}/${files.length} files checked`);
      return await lintFile$1(filePath, eslint);
    }));
    results.push(...batchResults);
  }
  process.stdout.write(`\r[ESLint] Progress: ${files.length}/${files.length} files checked\n`);

  const lintConfigFile = getLintConfigFile$1(false, projectType); // Pass false for recommendedLintRules
  const configExtends = getConfigExtends(lintConfigFile);
  const configRuleMap = {};
  configExtends.forEach(cfg => {
    // Normalize config name
    let name = cfg;
    if (name.startsWith('plugin:')) name = name.split(':')[1].split('/')[0];
    if (name.startsWith('eslint-config-')) name = name.replace('eslint-config-', '');
    if (name === 'airbnb-base' || name === 'airbnb') name = 'airbnb';
    if (name === 'recommended') name = 'eslint:recommended';
    const rules = getRulesForConfig(name);
    rules.forEach(rule => {
      if (!configRuleMap[rule]) configRuleMap[rule] = [];
      configRuleMap[rule].push(cfg);
    });
  });

  const jsonReport = {
    projectType,
    reports,
    excludeRules: {
      enabled: excludeRules.length > 0,
      rules: excludeRules,
      count: excludeRules.length
    },
    results: results
      .map((result) => {
        let filteredMessages = result?.messages
          .filter(message => !excludeRules.includes(message.ruleId))
          .map((message) => ({
            ruleId: message.ruleId,
            severity: message.severity,
            line: message.line,
            column: message.column,
            endLine: message.endLine,
            endColumn: message.endColumn,
            message: message.message,
            fix: message.fix,
            suggestions: message.suggestions,
            fatal: message.fatal,
            ruleSource: message.ruleId
              ? (message.ruleId.startsWith('react/') ? 'React Plugin'
                : message.ruleId.startsWith('@typescript-eslint/') ? 'TypeScript ESLint Plugin'
                : message.ruleId.startsWith('import/') ? 'Import Plugin'
                : 'ESLint core')
              : '',
            configSource: message.ruleId && configRuleMap[message.ruleId] ? configRuleMap[message.ruleId] : [],
          }));
        // If errorCount > 0 but messages is empty, omit this file from the report
        if ((result?.errorCount > 0) && (!filteredMessages || filteredMessages.length === 0)) {
          return null;
        }
        return {
          filePath: result?.filePath,
          errorCount: filteredMessages.length,
          warningCount: 0,
          messages: filteredMessages,
        };
      })
      .filter(Boolean),
  };

  await writeFile(
    path.join(folderPath, "eslint-report.json"),
    JSON.stringify(jsonReport, null, 2)
  );
};

/**
 * Function for linting all matched files
 * @param {String} folderPath
 * @param {String} jsFilePathPattern
 * @param {Boolean} recommendedLintRules
 * @param {String} projectType
 * @param {Array<string>} reports
 */
const generateESLintReport = async (
  folderPath,
  recommendedLintRules,
  projectType = '',
  reports = []
) => {
  const lintConfigFile = getLintConfigFile$1(recommendedLintRules, projectType);
  if (!lintConfigFile) {
    throw new Error(".eslintrc file is missing");
  }

  console.log(chalk.blue(`Using ESLint config: ${lintConfigFile}`));

  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfigFile: lintConfigFile,
  });

  const files = await globby(getConfigPattern('jsFilePathPattern'));
  console.log(chalk.blue(`📁 ESLint scanning ${files.length} files with pattern: ${getConfigPattern('jsFilePathPattern').join(', ')}`));
  // console.log(chalk.gray(`Files being processed:`));
  // files.slice(0, 10).forEach(file => console.log(chalk.gray(`  - ${file}`)));
  // if (files.length > 10) {
  //   console.log(chalk.gray(`  ... and ${files.length - 10} more files`));
  // }
  await lintAllFiles$1(files, folderPath, eslint, projectType, reports);

  try {
    const auditOutput = execSync('npm audit --json', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    try {
      // Only try to parse if output looks like JSON
      if (auditOutput.trim().startsWith('{')) {
        const audit = JSON.parse(auditOutput);
        // ... process audit ...
      } else {
        console.warn(chalk.yellow('npm audit did not return JSON output.'));
        console.warn(auditOutput);
      }
    } catch (parseErr) {
      console.warn(chalk.yellow('⚠️ Could not parse audit JSON. Output was:'));
      console.warn(auditOutput);
    }
  } catch (error) {
    // ... existing error handling ...
  }
};

const { lint } = stylelint;

// Default Stylelint rules to exclude (commonly disabled by project architects)
const DEFAULT_STYLELINT_EXCLUDE_RULES = [
  // Formatting and style rules
  'indentation', 'string-quotes', 'color-hex-case', 'color-hex-length',
  'color-named', 'color-no-invalid-hex', 'font-family-name-quotes',
  'font-weight-notation', 'function-calc-no-unspaced-operator',
  'function-comma-newline-after', 'function-comma-newline-before',
  'function-comma-space-after', 'function-comma-space-before',
  'function-max-empty-lines', 'function-name-case', 'function-parentheses-newline-inside',
  'function-parentheses-space-inside', 'function-url-quotes', 'function-whitespace-after',
  'number-leading-zero', 'number-max-precision', 'number-no-trailing-zeros',
  'string-no-newline', 'unit-case', 'unit-no-unknown', 'value-keyword-case',
  'value-list-comma-newline-after', 'value-list-comma-newline-before',
  'value-list-comma-space-after', 'value-list-comma-space-before',
  'value-list-max-empty-lines', 'value-no-vendor-prefix', 'property-case',
  'property-no-vendor-prefix', 'declaration-bang-space-after',
  'declaration-bang-space-before', 'declaration-colon-newline-after',
  'declaration-colon-space-after', 'declaration-colon-space-before',
  'declaration-block-no-duplicate-properties', 'declaration-block-no-redundant-longhand-properties',
  'declaration-block-no-shorthand-property-overrides', 'declaration-block-semicolon-newline-after',
  'declaration-block-semicolon-newline-before', 'declaration-block-semicolon-space-after',
  'declaration-block-semicolon-space-before', 'declaration-block-trailing-semicolon',
  'block-closing-brace-empty-line-before', 'block-closing-brace-newline-after',
  'block-closing-brace-newline-before', 'block-closing-brace-space-after',
  'block-closing-brace-space-before', 'block-no-empty', 'block-opening-brace-newline-after',
  'block-opening-brace-newline-before', 'block-opening-brace-space-after',
  'block-opening-brace-space-before', 'selector-attribute-brackets-space-inside',
  'selector-attribute-operator-space-after', 'selector-attribute-operator-space-before',
  'selector-attribute-quotes', 'selector-combinator-space-after',
  'selector-combinator-space-before', 'selector-descendant-combinator-no-non-space',
  'selector-max-compound-selectors', 'selector-max-specificity', 'selector-no-qualifying-type',
  'selector-pseudo-class-case', 'selector-pseudo-class-no-unknown',
  'selector-pseudo-class-parentheses-space-inside', 'selector-pseudo-element-case',
  'selector-pseudo-element-colon-notation', 'selector-pseudo-element-no-unknown',
  'selector-type-case', 'selector-type-no-unknown', 'selector-max-empty-lines',
  'rule-empty-line-before', 'at-rule-empty-line-before', 'at-rule-name-case',
  'at-rule-name-newline-after', 'at-rule-name-space-after', 'at-rule-no-unknown',
  'at-rule-semicolon-newline-after', 'at-rule-semicolon-space-before',
  'comment-empty-line-before', 'comment-no-empty', 'comment-whitespace-inside',
  'comment-word-blacklist', 'max-empty-lines', 'max-line-length', 'max-nesting-depth',
  'no-browser-hacks', 'no-descending-specificity', 'no-duplicate-selectors',
  'no-empty-source', 'no-eol-whitespace', 'no-extra-semicolons', 'no-invalid-double-slash-comments',
  'no-missing-end-of-source-newline', 'no-unknown-animations', 'alpha-value-notation',
  'color-function-notation', 'hue-degree-notation', 'import-notation',
  'keyframe-selector-notation', 'media-feature-name-value-allowed-list',
  'media-feature-range-notation', 'selector-not-notation', 'shorthand-property-no-redundant-values',
  
  // Naming convention rules commonly disabled
  'selector-class-pattern',
  'selector-id-pattern',
  'selector-nested-pattern',
  'custom-property-pattern',
  'keyframes-name-pattern',
  'class-name-pattern',
  'id-pattern',
  
  // SCSS specific rules commonly disabled
  'scss/selector-no-redundant-nesting-selector',
  'scss/at-rule-no-unknown',
  'scss/at-import-partial-extension',
  'scss/at-import-no-partial-leading-underscore',
  'scss/at-import-partial-extension-blacklist',
  'scss/at-import-partial-extension-whitelist',
  'scss/at-rule-conditional-no-parentheses',
  'scss/at-rule-no-vendor-prefix',
  'scss/comment-no-empty',
  'scss/comment-no-loud',
  'scss/declaration-nested-properties',
  'scss/declaration-nested-properties-no-divided-groups',
  'scss/dollar-variable-colon-newline-after',
  'scss/dollar-variable-colon-space-after',
  'scss/dollar-variable-colon-space-before',
  'scss/dollar-variable-default',
  'scss/dollar-variable-empty-line-after',
  'scss/dollar-variable-empty-line-before',
  'scss/dollar-variable-first-in-block',
  'scss/dollar-variable-no-missing-interpolation',
  'scss/dollar-variable-pattern',
  'scss/double-slash-comment-whitespace-inside',
  'scss/function-color-relative',
  'scss/function-no-unknown',
  'scss/function-quote-no-quoted-strings-inside',
  'scss/function-unquote-no-unquoted-strings-inside',
  'scss/map-keys-quotes',
  'scss/media-feature-value-dollar-variable',
  'scss/no-duplicate-dollar-variables',
  'scss/no-duplicate-mixins',
  'scss/no-global-function-names',
  'scss/operator-no-newline-after',
  'scss/operator-no-newline-before',
  'scss/operator-no-unspaced',
  'scss/partial-no-import',
  'scss/percent-placeholder-pattern',
  'scss/selector-nest-combinators',
  'scss/selector-no-union-class-name',
  
  // Prettier-related rules to exclude (since we removed Prettier config)
  'prettier/prettier',
  'stylelint-config-prettier',
  'stylelint-config-prettier-scss'
];

// Constants for configuration files
const CONFIG_FOLDER = "config";
const STYLELINTRC_JSON = ".stylelintrc.json";
const STYLELINTRC_JS = ".stylelintrc.js";
const STYLELINTRC_YML = ".stylelintrc.yml";
const STYLELINTRC_CONFIG = "stylelint.config.js";

/**
 * Function to determine Stylelint configuration file path
 * @param {boolean} recommendedLintRules
 * @returns {string} lintStyleConfigFile
 */
const getLintConfigFile = (recommendedLintRules) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const recommendedLintRulesConfigFile = path.join(
    __dirname,
    CONFIG_FOLDER,
    STYLELINTRC_JSON
  );
  const moduleDir = path.join(process.cwd(), "node_modules", "ui-code-insight");
  const styleLintFilePathFromModule = path.join(moduleDir, STYLELINTRC_JSON);

  const configFiles = [
    STYLELINTRC_CONFIG,
    STYLELINTRC_JS,
    STYLELINTRC_YML,
    STYLELINTRC_JSON,
    styleLintFilePathFromModule,
  ];

  return recommendedLintRules
    ? recommendedLintRulesConfigFile
    : configFiles.find((file) => fs.existsSync(file));
};

/**
 * Function to handle errors during file reading
 * @param {string} filePath
 * @param {Error} error
 * @returns {null}
 */
const handleFileReadError = (filePath, error) => {
  console.error(chalk.red(`Error reading file ${filePath}: ${error}`));
  return null;
};

/**
 * Function to lint a single file
 * @param {string} filePath
 * @param {string} lintStyleConfigFile
 * @returns {Promise<Object|null>} lint result
 */
const lintFile = async (filePath, lintStyleConfigFile) => {
  try {
    // Read file content
    const data = await readFile(filePath, "utf8");
    // Lint the file
    const item = await lint({
      code: data,
      configFile: lintStyleConfigFile,
    });

    const output = JSON.parse(item.output);
    
    // Debug logging for files with errors but no messages
    // if (output[0] && output[0].warnings && output[0].warnings.length > 0) {
    //   console.log(`[Stylelint Debug] ${filePath}: ${output[0].warnings.length} warnings found`);
    //   output[0].warnings.forEach((warning, index) => {
    //     console.log(`[Stylelint Debug]   Warning ${index + 1}: ${warning.rule} - ${warning.text}`);
    //   });
    // } else if (output[0] && output[0].errored) {
    //   console.log(`[Stylelint Debug] ${filePath}: File has errors but no warnings array`);
    //   console.log(`[Stylelint Debug] Output structure:`, JSON.stringify(output[0], null, 2));
    // }

    // Safeguard against malformed output
    const warnings = output[0] && output[0].warnings ? output[0].warnings : [];
    
    // Determine friendly config source
    let configSourceValue = path.basename(lintStyleConfigFile);
    try {
      const configContent = JSON.parse(fs.readFileSync(lintStyleConfigFile, 'utf8'));
      if (Array.isArray(configContent.extends) && configContent.extends.length > 0) {
        configSourceValue = configContent.extends[0];
      } else if (typeof configContent.extends === 'string') {
        configSourceValue = configContent.extends;
      }
    } catch (e) {}

    return {
      filePath,
      errorCount: warnings.length,
      warningCount: 0,
      messages: warnings.map((message) => ({
        line: message.line,
        column: message.column,
        endLine: message.endLine,
        endColumn: message.endColumn,
        severity: message.severity,
        rule: message.rule,
        message: message.text,
        fix: message.fix,
        suggestions: message.suggestions,
        ruleSource: message.rule
          ? (message.rule.startsWith('scss/') ? 'SCSS Plugin'
            : message.rule.startsWith('order/') ? 'Order Plugin'
            : 'Stylelint core')
          : '',
        configSource: [configSourceValue],
      })),
    };
  } catch (err) {
    return handleFileReadError(filePath, err);
  }
};

const BATCH_SIZE = 5;

/**
 * Function to lint all files
 * @param {Array<string>} files
 * @param {string} folderPath
 * @param {string} lintStyleConfigFile
 */
const lintAllFiles = async (files, folderPath, lintStyleConfigFile, projectType, reports) => {
  console.log(
    chalk.green(
      `Total files count is ${files.length} This linting task will take some time.`
    )
  );

  // Get merged exclude rules from config
  const excludeRules = getMergedExcludeRules('stylelint', DEFAULT_STYLELINT_EXCLUDE_RULES);

  let results = [];
  let processed = 0;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(async (filePath) => {
      processed++;
      process.stdout.write(`\r[Stylelint] Progress: ${processed}/${files.length} files checked`);
      return await lintFile(filePath, lintStyleConfigFile);
    }));
    results.push(...batchResults);
  }
  process.stdout.write(`\r[Stylelint] Progress: ${files.length}/${files.length} files checked\n`);

  // Filter messages based on exclude rules and update error counts
  const filteredResults = results.map(result => {
    const filteredMessages = result.messages.filter(message => !excludeRules.includes(message.rule));
    
    // Ensure error count matches actual message count
    const actualErrorCount = filteredMessages.length;
    
    // Log if there's a mismatch between error count and message count
    if (result.errorCount > 0 && actualErrorCount === 0) {
      console.log(`[Stylelint Warning] ${result.filePath}: Error count (${result.errorCount}) doesn't match message count (${actualErrorCount})`);
    }
    
    return {
      ...result,
      errorCount: actualErrorCount,
      warningCount: 0,
      messages: filteredMessages
    };
  });

  // BEM naming convention check
  let bemFound = false;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (/\.[a-z]+__[a-z]+(--[a-z]+)?/.test(content)) {
      bemFound = true;
      break;
    }
  }
  const bemNaming = {
    type: 'bem-naming',
    passed: bemFound,
    message: bemFound ? 'BEM naming convention detected.' : 'No BEM naming convention detected.'
  };

  const jsonReport = {
    projectType,
    reports,
    excludeRules: {
      enabled: excludeRules.length > 0,
      rules: excludeRules,
      count: excludeRules.length
    },
    results: filteredResults,
    bemNaming // <-- add BEM naming result
  };

  await fs.promises.writeFile(
    path.join(folderPath, "stylelint-report.json"),
    JSON.stringify(jsonReport, null, 2)
  );
};

/**
 * Function for linting all matched files
 * @param {String} folderPath
 * @param {Boolean} recommendedLintRules
 * @param {String} projectType
 * @param {Array<string>} reports
 */
const generateStyleLintReport = async (
  folderPath,
  recommendedLintRules,
  projectType = '',
  reports = []
) => {
  const lintStyleConfigFile = getLintConfigFile(recommendedLintRules);
  if (!lintStyleConfigFile) {
    throw new Error(".stylelintrc.json file is missing");
  }

  // Use config-driven pattern for SCSS/CSS/LESS files
  const files = await globby(getConfigPattern('scssFilePathPattern'));

  await lintAllFiles(files, folderPath, lintStyleConfigFile, projectType, reports);
};

const kbToMb = (kilobytes) => kilobytes / 1024;

const generateNpmPackageReport = async () => {
  const folderPath = path.resolve(process.cwd(), "report");
  try {
    const data = await readFile("package.json", "utf8");
    const packageJson = JSON.parse(data);
    const dependencies = packageJson?.dependencies || {};
    const devDependencies = packageJson?.devDependencies || {};
    let npmPackagesData = {
      dependencies: [],
      devDependencies: [],
    };

    const processPackage = async (packageName, isDevDependency = false) => {
      // console.log(chalk.green(`Validating ${packageName}`));
      try {
        const response = await fetch(
          `https://registry.npmjs.org/${packageName}`
        );

        const packageInfo = await response.json();
        const {
          name,
          version,
          dist: { tarball, unpackedSize },
          license,
          bugs,
          description,
          deprecated,
        } = packageInfo?.versions[packageInfo["dist-tags"]?.latest];

        const packageData = {
          name,
          version,
          license,
          download: tarball,
          description,
          unpackedSize: unpackedSize
            ? `${kbToMb(unpackedSize).toFixed(2)} MB`
            : "Not available", // Convert to MB
          deprecated: deprecated ? "Deprecated" : "Not deprecated",
        };

        if (isDevDependency) {
          npmPackagesData.devDependencies.push(packageData);
        } else {
          npmPackagesData.dependencies.push(packageData);
        }
      } catch (err) {
        console.log(
          chalk.red(`Something went wrong with ${packageName} package`)
        );
      }
    };

    const depNames = Object.keys(dependencies);
    let processed = 0;
    for (const packageName of depNames) {
      processed++;
      process.stdout.write(`\r[NPM Packages] Progress: ${processed}/${depNames.length} dependencies checked`);
      await processPackage(packageName);
    }
    process.stdout.write(`\r[NPM Packages] Progress: ${depNames.length}/${depNames.length} dependencies checked\n`);

    // Process devDependencies
    const devDepNames = Object.keys(devDependencies);
    let devProcessed = 0;
    for (const packageName of devDepNames) {
      devProcessed++;
      process.stdout.write(`\r[NPM Dev Packages] Progress: ${devProcessed}/${devDepNames.length} devDependencies checked`);
      await processPackage(packageName, true);
    }
    process.stdout.write(`\r[NPM Dev Packages] Progress: ${devDepNames.length}/${devDepNames.length} devDependencies checked\n`);

    await writeFile(
      `${folderPath}/npm-report.json`,
      JSON.stringify(npmPackagesData, null, 2)
    );
  } catch (error) {
    console.error("Error:", error);
  }
};

// Function to make the API request
async function makeAPIRequest(
  accessToken,
  aemBasePath,
  aemContentPath,
  aemAppsPath,
  slingResourceTypeBase
) {
  const componentListQuery = new URLSearchParams();
  componentListQuery.append("p.limit", "-1");
  componentListQuery.append("path", aemAppsPath);
  componentListQuery.append("type", "cq:Component");

  // API endpoint URL
  const componentQueryURL = `${aemBasePath}/bin/querybuilder.json?${componentListQuery.toString()}`;

  // Create the headers object
  const headers = {
    Cookie: `login-token=${accessToken}`, // Set the access token as a cookie
  };

  // Make the API request
  const response = await fetch(componentQueryURL, { headers });

  // Parse the response
  const data = await response.json();

  let result = [];
  for (const component of data.hits) {
    const componentPropertiesQuery = new URLSearchParams();
    componentPropertiesQuery.append("p.limit", "5");
    componentPropertiesQuery.append("path", aemContentPath);
    componentPropertiesQuery.append("property", "sling:resourceType");
    componentPropertiesQuery.append(
      "property.value",
      `${slingResourceTypeBase}${component.name}`
    );
    componentPropertiesQuery.append("type", "nt:unstructured");

    // API endpoint URL
    const componentPropertiesURL = `${aemBasePath}/bin/querybuilder.json?${componentPropertiesQuery.toString()}`;
    const resp = await fetch(componentPropertiesURL, { headers });
    const json = await resp.json();
    result.push(Object.assign({}, component, { usageCount: await json.total }));
  }

  return result;
}

const generateComponentUsageReport = async (
  reportFolderPath,
  accessToken,
  aemBasePath,
  aemContentPath,
  aemAppsPath,
  slingResourceTypeBase
) => {
  const data = await makeAPIRequest(
    accessToken,
    aemBasePath,
    aemContentPath,
    aemAppsPath,
    slingResourceTypeBase
  );

  await writeFile(
    path.join(reportFolderPath, "component-usage-report.json"),
    JSON.stringify(data, null, 2)
  );

  return data;
};

/**
 * Main function to initialize code insight tool
 */
async function codeInsightInit(options = {}) {
  const {
    projectType = 'Other',
    reports = ['all'],
    eslintConfig = 'airbnb',
    stylelintConfig = 'standard',
    lighthouseUrl = null
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
    const orchestrator = new AuditOrchestrator(reportDir, lighthouseUrl);
      
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

export { codeInsightInit };
