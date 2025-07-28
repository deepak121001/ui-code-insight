import fs from "fs";
import fsp from "fs/promises";
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { globby } from 'globby';
import { getConfigPattern } from '../config-loader.js';
import { ESLint } from "eslint";
import { fileURLToPath } from 'url';
import pLimit from 'p-limit';
import { getMergedExcludeRules } from '../config-loader.js';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FOLDER = "config";
const ESLINTRC_JSON = ".eslintrc.json";
const ESLINTRC_JS = ".eslintrc.js";
const ESLINTRC_YML = ".eslintrc.yml";
const ESLINTRC = ".eslintrc";
const ESLINTRC_REACT = "eslintrc.react.json";
const ESLINTRC_NODE = "eslintrc.node.json";
const ESLINTRC_VANILLA = "eslintrc.vanilla.json";
const ESLINTRC_TS = "eslintrc.typescript.json";
const ESLINTRC_TSREACT = "eslintrc.tsreact.json";

const getLintConfigFile = (recommendedLintRules = false, projectType = '') => {
  let configFileName = ESLINTRC_JSON;

  if (projectType && typeof projectType === 'string') {
    const type = projectType.toLowerCase();
    if (type === 'react') configFileName = ESLINTRC_REACT;
    else if (type === 'node') configFileName = ESLINTRC_NODE;
    else if (type === 'vanilla') configFileName = ESLINTRC_VANILLA;
    else if (type === 'typescript') configFileName = ESLINTRC_TS;
    else if (type === 'typescript + react' || type === 'tsreact') configFileName = ESLINTRC_TSREACT;
  }

  const configFilePath = path.join(__dirname, CONFIG_FOLDER, configFileName);
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // fallback to default logic
  const recommendedLintRulesConfigFile = path.join(__dirname, CONFIG_FOLDER, ESLINTRC_JSON);
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

// Helper to get code and context lines
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

export class SecurityAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.securityIssues = [];
    this.browser = null;
  }

  /**
   * Initialize browser for live URL testing
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
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
              if (
                message.ruleId &&
                (
                  message.ruleId.startsWith('security/') ||
                  message.ruleId.startsWith('no-unsanitized/') ||
                  message.ruleId === 'no-unsanitized/method' ||
                  message.ruleId === 'no-unsanitized/property'
                )
              ) {
                const { code, context } = await getCodeContext(result.filePath, message.line);
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

  /**
   * Test security headers and CSP on live URLs
   */
  async testLiveUrlSecurity(url) {
    console.log(chalk.blue(`🔒 Testing security headers for: ${url}`));
    
    try {
      const page = await this.browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the URL and capture response headers
      const response = await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      if (!response) {
        console.warn(chalk.yellow(`⚠️ No response received for ${url}`));
        await page.close();
        return;
      }
      
      const headers = response.headers();
      
      // Check for security headers
      const securityHeaders = {
        'Content-Security-Policy': headers['content-security-policy'],
        'Strict-Transport-Security': headers['strict-transport-security'],
        'X-Frame-Options': headers['x-frame-options'],
        'X-Content-Type-Options': headers['x-content-type-options'],
        'X-XSS-Protection': headers['x-xss-protection'],
        'Referrer-Policy': headers['referrer-policy'],
        'Permissions-Policy': headers['permissions-policy']
      };
      
      // Check for missing security headers
      const missingHeaders = [];
      const weakHeaders = [];
      
      if (!securityHeaders['Content-Security-Policy']) {
        missingHeaders.push('Content-Security-Policy');
      } else {
        // Check for weak CSP configurations
        const csp = securityHeaders['Content-Security-Policy'];
        if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
          weakHeaders.push({
            header: 'Content-Security-Policy',
            issue: 'Contains unsafe-inline or unsafe-eval directives',
            value: csp
          });
        }
      }
      
      if (!securityHeaders['Strict-Transport-Security']) {
        missingHeaders.push('Strict-Transport-Security');
      }
      
      if (!securityHeaders['X-Frame-Options']) {
        missingHeaders.push('X-Frame-Options');
      }
      
      if (!securityHeaders['X-Content-Type-Options']) {
        missingHeaders.push('X-Content-Type-Options');
      }
      
      if (!securityHeaders['X-XSS-Protection']) {
        missingHeaders.push('X-XSS-Protection');
      }
      
      // Add issues for missing headers
      missingHeaders.forEach(header => {
        this.securityIssues.push({
          type: 'missing_security_header',
          file: url,
          line: 1,
          severity: header === 'Content-Security-Policy' ? 'high' : 'medium',
          message: `Missing ${header} security header`,
          code: `HTTP Response Headers`,
          context: `Live URL: ${url}`,
          recommendation: `Add ${header} header to server configuration`,
          source: 'live-url',
          url: url,
          header: header
        });
      });
      
      // Add issues for weak headers
      weakHeaders.forEach(({ header, issue, value }) => {
        this.securityIssues.push({
          type: 'weak_security_header',
          file: url,
          line: 1,
          severity: 'high',
          message: `${header}: ${issue}`,
          code: `${header}: ${value}`,
          context: `Live URL: ${url}`,
          recommendation: `Strengthen ${header} configuration by removing unsafe directives`,
          source: 'live-url',
          url: url,
          header: header,
          value: value
        });
      });
      
      // Check for HTTPS usage
      if (!url.startsWith('https://')) {
        this.securityIssues.push({
          type: 'insecure_transport',
          file: url,
          line: 1,
          severity: 'high',
          message: 'Insecure HTTP transport detected',
          code: `URL: ${url}`,
          context: `Live URL uses HTTP instead of HTTPS`,
          recommendation: 'Use HTTPS for all web traffic',
          source: 'live-url',
          url: url
        });
      }
      
      // Test for common security vulnerabilities
      const securityTests = await page.evaluate(() => {
        const results = {};
        
        // Check for XSS vulnerabilities in DOM
        results.hasInnerHTML = document.querySelectorAll('[innerHTML]').length > 0;
        results.hasDangerouslySetInnerHTML = document.querySelectorAll('[dangerouslySetInnerHTML]').length > 0;
        
        // Check for inline scripts
        results.hasInlineScripts = document.querySelectorAll('script:not([src])').length > 0;
        
        // Check for inline event handlers
        results.hasInlineEvents = document.querySelectorAll('[onclick], [onload], [onerror], [onmouseover]').length > 0;
        
        return results;
      });
      
      // Add issues for security vulnerabilities
      if (securityTests.hasInnerHTML || securityTests.hasDangerouslySetInnerHTML) {
        this.securityIssues.push({
          type: 'xss_dom_vulnerability',
          file: url,
          line: 1,
          severity: 'high',
          message: 'Potential XSS vulnerability: innerHTML or dangerouslySetInnerHTML usage detected',
          code: 'DOM manipulation with innerHTML',
          context: `Live URL: ${url}`,
          recommendation: 'Avoid using innerHTML, use textContent or safe DOM manipulation methods',
          source: 'live-url',
          url: url
        });
      }
      
      if (securityTests.hasInlineScripts) {
        this.securityIssues.push({
          type: 'inline_scripts',
          file: url,
          line: 1,
          severity: 'medium',
          message: 'Inline scripts detected (potential XSS risk)',
          code: 'Inline <script> tags found',
          context: `Live URL: ${url}`,
          recommendation: 'Move scripts to external files and use CSP to block inline scripts',
          source: 'live-url',
          url: url
        });
      }
      
      if (securityTests.hasInlineEvents) {
        this.securityIssues.push({
          type: 'inline_event_handlers',
          file: url,
          line: 1,
          severity: 'medium',
          message: 'Inline event handlers detected (potential XSS risk)',
          code: 'Inline event handlers (onclick, onload, etc.) found',
          context: `Live URL: ${url}`,
          recommendation: 'Use addEventListener instead of inline event handlers',
          source: 'live-url',
          url: url
        });
      }
      
      await page.close();
      console.log(chalk.green(`✅ Security testing completed for: ${url}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error testing security for ${url}: ${error.message}`));
      console.error(chalk.gray('Stack trace:'), error.stack);
    }
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
    
  
  async runSecurityAudit(urls = []) {
    console.log(chalk.cyan.bold('\n🔍 Running Full Security Audit...'));
    
    // Run code scanning
    await this.checkForSecrets();
    await this.checkESLintSecurityIssues();
    await this.checkFileUploadSecurity();
    await this.checkInputValidation();
    await this.runEnhancedPatternChecks();

    // Run live URL testing if URLs provided
    if (urls && urls.length > 0) {
      console.log(chalk.blue('\n🌐 Running Live URL Security Testing...'));
      
      try {
        await this.initBrowser();
        console.log(chalk.green('✅ Browser initialized successfully'));
        
        for (const url of urls) {
          await this.testLiveUrlSecurity(url);
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ Error during live URL security testing: ${error.message}`));
        console.error(chalk.gray('Stack trace:'), error.stack);
      } finally {
        await this.closeBrowser();
      }
    }

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
