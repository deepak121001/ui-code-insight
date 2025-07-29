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
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let configFileName = 'eslintrc.simple.json'; // Default to simple config

  if (projectType && typeof projectType === 'string') {
    const type = projectType.toLowerCase();
    if (type === 'react') configFileName = ESLINTRC_REACT;
    else if (type === 'node') configFileName = ESLINTRC_NODE;
    else if (type === 'vanilla') configFileName = ESLINTRC_VANILLA;
    else if (type === 'typescript') configFileName = ESLINTRC_TS;
    else if (type === 'typescript + react' || type === 'tsreact') configFileName = ESLINTRC_TSREACT;
  }

  const configFilePath = path.join(__dirname, CONFIG_FOLDER, configFileName);
  
  // Check if the target config exists, otherwise fallback to simple config
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // Fallback to simple config to avoid module resolution issues
  const simpleConfigPath = path.join(__dirname, CONFIG_FOLDER, 'eslintrc.simple.json');
  if (fs.existsSync(simpleConfigPath)) {
    console.log(chalk.yellow(`⚠️  Using simplified ESLint config to avoid module resolution issues`));
    return simpleConfigPath;
  }

  // Final fallback to default logic
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

  const foundConfig = configFiles.find((file) => fs.existsSync(file));
  
  // If no config found, return simple config to avoid node_modules
  return foundConfig || simpleConfigPath;
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

// Memory management constants
const BATCH_SIZE = process.env.SECURITY_BATCH_SIZE ? 
  parseInt(process.env.SECURITY_BATCH_SIZE) : 
  (process.env.NODE_ENV === 'production' ? 25 : 50);
const MAX_FILES_PER_BATCH = 500;
const MEMORY_THRESHOLD = process.env.SECURITY_MEMORY_THRESHOLD ? 
  parseFloat(process.env.SECURITY_MEMORY_THRESHOLD) : 0.7;
const MAX_IN_MEMORY_ISSUES = 5000;
const FORCE_GC_INTERVAL = 50;

// Memory management class
class MemoryManager {
  static getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      external: usage.external / 1024 / 1024
    };
  }

  static isMemoryHigh() {
    const usage = this.getMemoryUsage();
    return usage.heapUsed / usage.heapTotal > MEMORY_THRESHOLD;
  }

  static async forceGarbageCollection() {
    if (global.gc) {
      global.gc();
      // Force multiple GC cycles for better cleanup
      await new Promise(resolve => setTimeout(resolve, 50));
      if (global.gc) global.gc();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  static logMemoryUsage(label = '') {
    const usage = this.getMemoryUsage();
    console.log(chalk.gray(`[Memory] ${label}: Heap ${usage.heapUsed.toFixed(1)}MB / ${usage.heapTotal.toFixed(1)}MB`));
  }
}

export class SecurityAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.securityIssues = [];
    this.browser = null;
    this.issueCount = 0;
  }

  /**
   * Process files in batches with memory management
   */
  async processFilesInBatches(files, processor, auditType = 'security') {
    const batches = [];
    for (let i = 0; i < files.length; i += MAX_FILES_PER_BATCH) {
      batches.push(files.slice(i, i + MAX_FILES_PER_BATCH));
    }

    let batchProcessedFiles = 0;
    let filesSinceLastGC = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Check memory before processing batch
      if (MemoryManager.isMemoryHigh()) {
        console.log(chalk.yellow('⚠️ High memory usage detected, forcing garbage collection...'));
        MemoryManager.logMemoryUsage(`Before batch ${batchIndex + 1}`);
        await MemoryManager.forceGarbageCollection();
      }

      console.log(chalk.gray(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`));
      
      // Process sub-batches for better memory control
      for (let i = 0; i < batch.length; i += BATCH_SIZE) {
        const subBatch = batch.slice(i, i + BATCH_SIZE);
        await Promise.all(subBatch.map(processor));
        
        batchProcessedFiles += subBatch.length;
        filesSinceLastGC += subBatch.length;
        process.stdout.write(`\r[Progress] ${batchProcessedFiles}/${files.length} files processed`);
        
        // Force GC more frequently
        if (filesSinceLastGC >= FORCE_GC_INTERVAL) {
          await MemoryManager.forceGarbageCollection();
          filesSinceLastGC = 0;
        }
      }
    }
    
    console.log(chalk.green(`\n✅ ${auditType} audit completed: ${batchProcessedFiles} files processed`));
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
  
    // Enhanced pattern-based secret detection (modern approach)
    // Improved to avoid false positives like item.id, className, CSS selectors, etc.
    console.log(chalk.blue('🔐 Running enhanced secret detection...'));
    const secretPatterns = [
      // Enhanced secret detection patterns (more specific to avoid false positives)
      /\b(const|let|var)\s+\w*(password|api[_-]?key|secret|token|auth|access[_-]?token|refresh[_-]?token|private[_-]?key|client[_-]?id|client[_-]?secret)\w*\s*=\s*['"][^'"`]{12,}['"]/i,
      /['"]?(password|api[_-]?key|secret|token|auth|access[_-]?token|refresh[_-]?token|private[_-]?key|client[_-]?id|client[_-]?secret)['"]?\s*:\s*['"][^'"`]{12,}['"]/i,
      /\b(PASSWORD|SECRET|TOKEN|KEY|ACCESS_KEY|PRIVATE_KEY)\s*=\s*[^'"`\n\r]{12,}/i,
      /-----BEGIN\s+\w+PRIVATE KEY-----[\s\S]+?-----END\s+\w+PRIVATE KEY-----/g,
      /\b(const|let|var)\s+\w*(firebase[_-]?key|connection\s*string|database[_-]?url|db[_-]?url)\w*\s*=\s*['"][^'"`]{12,}['"]/i,
    ];
  
    try {
      const files = await globby(getConfigPattern('jsFilePathPattern'), {
        absolute: true,
      });
      console.log(chalk.gray(`📁 Scanning ${files.length} files for secrets...`));
      
      const processor = async (file) => {
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) continue;
            
            for (const pattern of secretPatterns) {
              if (
                pattern.test(trimmed) &&
                /=\s*['"][^'"`]+['"]/ .test(trimmed) &&
                !/(===|!==|==|!=)/.test(trimmed) &&
                !/\w+\s*\(/.test(trimmed) &&
                !/`.*`/.test(trimmed) &&
                // Exclude common false positives
                !/\.(id|key|name|type|value|label|text|content)\s*[:=]/.test(trimmed) &&
                !/\b(item|user|data|config|props|state|element|node|component)\./.test(trimmed) &&
                !/\b(className|style|href|src|alt|title|onClick|onChange|onSubmit)\s*[:=]/.test(trimmed) &&
                !/\b(div|span|p|h[1-6]|button|input|form|label)\s*[:=]/.test(trimmed) &&
                !/\b(key|ref|children|defaultValue|placeholder)\s*[:=]/.test(trimmed) &&
                // Exclude CSS selectors, jQuery selectors, and DOM queries
                !/['"`][.#][^'"`]*['"`]/.test(trimmed) &&
                !/['"`]\s*[.#][^'"`]*\s*[.#][^'"`]*['"`]/.test(trimmed) &&
                !/\b(document|window|jQuery|\$)\s*\./.test(trimmed) &&
                !/\b(querySelector|getElementById|getElementsByClassName)\s*\(/.test(trimmed) &&
                // Exclude common variable names that contain "password" but aren't secrets
                !/\b(password|Password)\s*=\s*['"`][^'"`]*[.#][^'"`]*['"`]/.test(trimmed) &&
                !/\b(password|Password)\s*=\s*['"`][^'"`]*selector[^'"`]*['"`]/i.test(trimmed) &&
                !/\b(password|Password)\s*=\s*['"`][^'"`]*form[^'"`]*['"`]/i.test(trimmed) &&
                !/\b(password|Password)\s*=\s*['"`][^'"`]*input[^'"`]*['"`]/i.test(trimmed) &&
                !/\b(password|Password)\s*=\s*['"`][^'"`]*field[^'"`]*['"`]/i.test(trimmed)
              ) {
                // Limit in-memory issues
                if (this.issueCount >= MAX_IN_MEMORY_ISSUES) {
                  console.warn(chalk.yellow('⚠️ Maximum in-memory issues reached, skipping further issues'));
                  return;
                }
                
                // Extract the secret type from the pattern match (more specific)
                let secretType = 'unknown';
                
                // Additional check to avoid false positives for CSS selectors and DOM queries
                const isLikelySelector = /['"`][.#][^'"`]*['"`]/.test(trimmed) || 
                                        /['"`][^'"`]*form[^'"`]*['"`]/i.test(trimmed) ||
                                        /['"`][^'"`]*input[^'"`]*['"`]/i.test(trimmed) ||
                                        /['"`][^'"`]*field[^'"`]*['"`]/i.test(trimmed);
                
                if (!isLikelySelector) {
                  if (trimmed.match(/\bpassword\b/i)) secretType = 'password';
                  else if (trimmed.match(/\bapi[_-]?key\b/i)) secretType = 'API key';
                  else if (trimmed.match(/\bsecret\b/i)) secretType = 'secret';
                  else if (trimmed.match(/\btoken\b/i)) secretType = 'token';
                  else if (trimmed.match(/\bprivate[_-]?key\b/i)) secretType = 'private key';
                  else if (trimmed.match(/\bclient[_-]?id\b/i)) secretType = 'client ID';
                  else if (trimmed.match(/\bclient[_-]?secret\b/i)) secretType = 'client secret';
                  else if (trimmed.match(/\bfirebase[_-]?key\b/i)) secretType = 'Firebase key';
                  else if (trimmed.match(/\bconnection\s*string\b/i)) secretType = 'connection string';
                  else if (trimmed.match(/\bdatabase[_-]?url\b/i)) secretType = 'database URL';
                }
                
                // Skip if it's likely a selector or DOM query
                if (isLikelySelector) {
                  continue;
                }
                
                this.securityIssues.push({
                  type: 'hardcoded_secret',
                  file,
                  line: index + 1,
                  severity: 'high',
                  message: `Potential hardcoded ${secretType} detected`,
                  description: `Line ${index + 1}: Hardcoded ${secretType} found in source code. This poses a significant security risk as secrets in source code can be exposed through version control, build artifacts, or code reviews. The ${secretType} should be moved to environment variables or a secure secrets management system.`,
                  code: trimmed,
                  context: this.printContext(lines, index),
                  recommendation: `Move the ${secretType} to environment variables (e.g., process.env.${secretType.toUpperCase().replace(/\s+/g, '_')}) or use a secure secrets management system`
                });
                this.issueCount++;
                break;
              }
            }
          }
          
          // Clear lines array to free memory
          lines.length = 0;
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
        }
      };
      
      await this.processFilesInBatches(files, processor, 'secrets');
      
    } catch (err) {
      console.error(chalk.red(`❌ Failed to glob files: ${err.message}`));
    }
  }
  
  /**
   * Common function to scan files with given patterns
   */
  async patternScan(files, patterns, type) {
    const processor = async (file) => {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('//')) continue;
          
          for (const { pattern, message, severity } of patterns) {
            if (pattern.test(trimmed)) {
              // Limit in-memory issues
              if (this.issueCount >= MAX_IN_MEMORY_ISSUES) {
                console.warn(chalk.yellow('⚠️ Maximum in-memory issues reached, skipping further issues'));
                return;
              }
              
              this.securityIssues.push({
                type,
                file,
                line: index + 1,
                severity,
                message,
                code: trimmed,
                context: this.printContext(lines, index)
              });
              this.issueCount++;
            }
          }
        }
        
        // Clear lines array to free memory
        lines.length = 0;
      } catch (err) {
        console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
      }
    };
    
    await this.processFilesInBatches(files, processor, type);
  }

/**
   * Check for outdated dependencies with known vulnerabilities
   */
async checkDependencyVulnerabilities() {
  console.log(chalk.blue('🔒 Checking for dependency vulnerabilities (production dependencies only)...'));
  
  try {
    // Run npm audit to check for vulnerabilities - EXCLUDING devDependencies
    const auditResult = execSync('npm audit --json --omit dev', { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    const auditData = JSON.parse(auditResult);
    
    if (auditData.vulnerabilities && Object.keys(auditData.vulnerabilities).length > 0) {
      Object.keys(auditData.vulnerabilities).forEach(packageName => {
        const vuln = auditData.vulnerabilities[packageName];
        
        // Extract vulnerability details with better fallbacks
        const title = vuln.title || vuln.name || 'Unknown vulnerability';
        const description = vuln.description || vuln.summary || 'No description available';
        const severity = vuln.severity || 'medium';
        const recommendation = vuln.recommendation || vuln.fix || 'Update package version';
        const version = vuln.version || vuln.installedVersion || 'unknown';
        
        this.securityIssues.push({
          type: 'dependency_vulnerability',
          package: `${packageName}@${version}`,
          severity: severity,
          message: `Vulnerability in ${packageName}: ${title}`,
          description: `Package ${packageName} (version ${version}) has a ${severity} severity vulnerability: ${title}. ${description} This vulnerability affects a production dependency and should be addressed promptly.`,
          recommendation: recommendation
        });
      });
    } else {
      // No vulnerabilities found - this is good!
      this.securityIssues.push({
        type: 'no_vulnerabilities',
        severity: 'info',
        message: 'No known vulnerabilities found in dependencies',
        description: 'All production dependencies (excluding devDependencies) have been scanned and no known security vulnerabilities were detected. This is excellent for security posture.',
        positive: true
      });
    }
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities are found
    if (error.status === 1) {
      try {
        const output = error.stdout.toString();
        console.log(chalk.gray('🔍 npm audit output length:', output.length));
        const auditData = JSON.parse(output);
        
        if (auditData.vulnerabilities) {
          Object.keys(auditData.vulnerabilities).forEach(packageName => {
            const vuln = auditData.vulnerabilities[packageName];
            
            // Extract vulnerability details with better fallbacks
            const title = vuln.title || vuln.name || 'Unknown vulnerability';
            const description = vuln.description || vuln.summary || 'No description available';
            const severity = vuln.severity || 'medium';
            const recommendation = vuln.recommendation || vuln.fix || 'Update package version';
            const version = vuln.version || vuln.installedVersion || 'unknown';
            
            this.securityIssues.push({
              type: 'dependency_vulnerability',
              package: `${packageName}@${version}`,
              severity: severity,
              message: `Vulnerability in ${packageName}: ${title}`,
              description: `Package ${packageName} (version ${version}) has a ${severity} severity vulnerability: ${title}. ${description} This vulnerability affects a production dependency and should be addressed promptly.`,
              recommendation: recommendation
            });
          });
        }
      } catch (parseError) {
        console.warn(chalk.yellow('Warning: Could not parse npm audit results'));
      }
    } else {
      console.warn(chalk.yellow('Warning: Could not run npm audit - this may be due to network issues or npm configuration'));
      
      // Add a fallback message
      this.securityIssues.push({
        type: 'npm_audit_error',
        severity: 'warning',
        message: 'npm audit could not be executed',
        description: 'This may be due to network issues, npm configuration, or permission problems',
        recommendation: 'Try running "npm audit" manually to check for vulnerabilities'
      });
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
      
      let eslint;
      try {
        eslint = new ESLint({
          useEslintrc: false,
          overrideConfigFile: eslintConfig,
          errorOnUnmatchedPattern: false,
          allowInlineConfig: false
        });
      } catch (initError) {
        console.warn(chalk.yellow(`⚠️ ESLint initialization failed with config ${eslintConfig}, falling back to simple config`));
        const simpleConfigPath = path.join(__dirname, CONFIG_FOLDER, 'eslintrc.simple.json');
        if (fs.existsSync(simpleConfigPath)) {
          eslint = new ESLint({
            useEslintrc: false,
            overrideConfigFile: simpleConfigPath,
            errorOnUnmatchedPattern: false,
            allowInlineConfig: false
          });
        } else {
          throw new Error("No valid ESLint configuration found");
        }
      }
      const files = await globby(getConfigPattern('jsFilePathPattern'));
      let processed = 0;
      for (const file of files) {
        try {
          const results = await eslint.lintFiles([file]);
          
          // Validate results before processing
          if (!results || !Array.isArray(results)) {
            console.warn(chalk.yellow(`⚠️ Invalid ESLint results for file ${file}`));
            continue;
          }
          
          for (const result of results) {
            // Validate result structure
            if (!result || !result.messages || !Array.isArray(result.messages)) {
              console.warn(chalk.yellow(`⚠️ Invalid ESLint result structure for file ${file}`));
              continue;
            }
            
            for (const message of result.messages) {
              // Validate message structure
              if (!message || !message.ruleId) {
                continue;
              }
              
              if (
                message.ruleId.startsWith('security/') ||
                message.ruleId.startsWith('no-unsanitized/') ||
                message.ruleId === 'no-unsanitized/method' ||
                message.ruleId === 'no-unsanitized/property'
              ) {
                const { code, context } = await getCodeContext(result.filePath, message.line);
                const issue = {
                  type: 'eslint_security',
                  file: result.filePath,
                  line: message.line,
                  severity: message.severity === 2 ? 'high' : 'medium',
                  message: message.message,
                  description: `Line ${message.line}: ESLint security rule violation (${message.ruleId}). This indicates a potential security vulnerability that should be addressed. The rule ${message.ruleId} has detected a security-related code pattern that requires attention.`,
                  ruleId: message.ruleId,
                  code,
                  context,
                  source: 'eslint',
                  recommendation: 'Review and fix the security issue according to the ESLint rule requirements. Check the ESLint documentation for specific guidance on this rule.'
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
          
          // File input without accept attribute (most critical)
          const fileInputMatches = [...trimmed.matchAll(/<input[^>]+type=["']file["'][^>]*>/gi)];
          for (const match of fileInputMatches) {
            if (!/accept=/.test(match[0])) {
              this.securityIssues.push({
                type: 'file_upload_no_type_restriction',
                file,
                line: index + 1,
                severity: 'medium',
                message: 'File input without file type restriction (accept attribute missing)',
                description: `Line ${index + 1}: File upload input found without accept attribute. This allows users to upload any file type, including potentially malicious files like executables, scripts, or other dangerous file types. The accept attribute provides client-side validation to restrict file types.`,
                code: trimmed,
                context: this.printContext(lines, index),
                recommendation: 'Add accept attribute to restrict file types (e.g., accept=".pdf,.doc,.docx" for documents, accept="image/*" for images)'
              });
            }
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
              description: `Line ${index + 1}: Input field found without validation attributes. This input lacks client-side validation which can lead to injection attacks, XSS vulnerabilities, or data integrity issues. Input validation helps prevent malicious data from reaching the server.`,
              code: trimmed,
              context: this.printContext(lines, index),
              recommendation: 'Add appropriate validation attributes: required (for mandatory fields), pattern (for format validation), maxlength/minlength (for length limits), or type-specific attributes like email, number, url'
            });
            }
          }
          
          // Check for unsafe DOM insertion
          if (/innerHTML|dangerouslySetInnerHTML/.test(trimmed)) {
            // Determine which unsafe method is being used
            let unsafeMethod = 'unknown';
            if (trimmed.includes('innerHTML')) unsafeMethod = 'innerHTML';
            else if (trimmed.includes('dangerouslySetInnerHTML')) unsafeMethod = 'dangerouslySetInnerHTML';
            
            this.securityIssues.push({
              type: 'input_unsafe_dom_insertion',
              file,
              line: index + 1,
              severity: 'high',
              message: `Potential unsafe DOM insertion (${unsafeMethod})`,
              description: `Line ${index + 1}: ${unsafeMethod} usage detected. This method can lead to XSS attacks if user input is not properly sanitized. ${unsafeMethod} bypasses React's built-in XSS protection and allows arbitrary HTML/JavaScript execution.`,
              code: trimmed,
              context: this.printContext(lines, index),
              recommendation: `Replace ${unsafeMethod} with safer alternatives: use textContent for plain text, createElement for DOM manipulation, or React components for dynamic content. If HTML insertion is necessary, use a sanitization library like DOMPurify`
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
        const headerDescriptions = {
          'Content-Security-Policy': 'Content Security Policy (CSP) helps prevent XSS attacks by controlling which resources can be loaded and executed. Missing CSP leaves your application vulnerable to various injection attacks.',
          'Strict-Transport-Security': 'HSTS forces browsers to use HTTPS for all future requests, preventing protocol downgrade attacks and cookie hijacking.',
          'X-Frame-Options': 'Prevents clickjacking attacks by controlling whether a browser should be allowed to render a page in a frame, iframe, embed, or object.',
          'X-Content-Type-Options': 'Prevents MIME type sniffing attacks by ensuring browsers respect the declared content type.',
          'X-XSS-Protection': 'Enables browser\'s built-in XSS protection (though CSP is more effective for modern applications).',
          'Referrer-Policy': 'Controls how much referrer information should be included with requests, helping with privacy and security.',
          'Permissions-Policy': 'Controls which browser features and APIs can be used, helping prevent abuse of powerful APIs.'
        };
        
        this.securityIssues.push({
          type: 'missing_security_header',
          file: url,
          line: 1,
          severity: header === 'Content-Security-Policy' ? 'high' : 'medium',
          message: `Missing ${header} security header`,
          description: headerDescriptions[header] || `Missing ${header} security header which helps protect against various web attacks.`,
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
          description: `Weak ${header} configuration contains unsafe directives that can be exploited by attackers. These directives bypass security protections and should be avoided.`,
          code: `${header}: ${value}`,
          context: `Live URL: ${url}`,
          recommendation: `Strengthen ${header} configuration by removing unsafe directives like 'unsafe-inline' and 'unsafe-eval'`,
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
          description: 'HTTP traffic is transmitted in plain text, making it vulnerable to interception, man-in-the-middle attacks, and data theft. All web traffic should use HTTPS encryption.',
          code: `URL: ${url}`,
          context: `Live URL uses HTTP instead of HTTPS`,
          recommendation: 'Use HTTPS for all web traffic and implement HSTS headers',
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

  




    
  
  async runSecurityAudit(urls = []) {
    console.log(chalk.cyan.bold('\n🔍 Running Full Security Audit...'));
    
    // Run industry-standard security tools
    console.log(chalk.blue('\n📦 Running npm audit (dependency vulnerabilities)...'));
    await this.checkDependencyVulnerabilities();
    
    console.log(chalk.blue('\n🔐 Running enhanced secret detection...'));
    await this.checkForSecrets();
    

    
    // Run existing custom security checks
    console.log(chalk.blue('\n🔍 Running ESLint security analysis...'));
    await this.checkESLintSecurityIssues();
    
    console.log(chalk.blue('\n📁 Running file upload security checks...'));
    await this.checkFileUploadSecurity();
    
    console.log(chalk.blue('\n✅ Running input validation checks...'));
    await this.checkInputValidation();

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
