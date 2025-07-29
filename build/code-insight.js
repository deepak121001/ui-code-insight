import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import fsp, { writeFile, mkdir, readFile } from 'fs/promises';
import { execSync } from 'child_process';
import { globby } from 'globby';
import { fileURLToPath } from 'url';
import { ESLint } from 'eslint';
import 'p-limit';
import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import { createRequire } from 'module';
import stylelint from 'stylelint';

const __filename$2 = fileURLToPath(import.meta.url);
path.dirname(__filename$2);

/**
 * Ignore file handler for UI Code Insight
 * Reads and parses .ui-code-insight-ignore files
 */
class IgnoreHandler {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.ignoreFile = '.ui-code-insight-ignore';
    this.ignorePatterns = [];
    this.loaded = false;
  }

  /**
   * Load ignore patterns from .ui-code-insight-ignore file
   */
  loadIgnorePatterns() {
    if (this.loaded) {
      return this.ignorePatterns;
    }

    const ignoreFilePath = path.join(this.projectRoot, this.ignoreFile);
    
    try {
      if (fs.existsSync(ignoreFilePath)) {
        const content = fs.readFileSync(ignoreFilePath, 'utf8');
        this.ignorePatterns = this.parseIgnoreFile(content);
        console.log(`📁 Loaded ignore patterns from ${this.ignoreFile}`);
      } else {
        console.log(`⚠️  No ${this.ignoreFile} file found, using default patterns`);
        this.ignorePatterns = this.getDefaultPatterns();
      }
    } catch (error) {
      console.warn(`⚠️  Error reading ${this.ignoreFile}:`, error.message);
      this.ignorePatterns = this.getDefaultPatterns();
    }

    this.loaded = true;
    return this.ignorePatterns;
  }

  /**
   * Parse ignore file content into patterns
   */
  parseIgnoreFile(content) {
    const patterns = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Convert ignore patterns to glob patterns
      let pattern = trimmedLine;
      
      // Handle negation patterns (starting with !)
      if (pattern.startsWith('!')) {
        pattern = pattern.substring(1);
      }

      // Convert to glob pattern if needed
      if (!pattern.includes('*') && !pattern.includes('{') && !pattern.includes('[')) {
        // Simple file/directory pattern
        if (pattern.endsWith('/')) {
          // Directory pattern
          pattern = `**/${pattern}**`;
        } else if (!pattern.includes('/')) {
          // File pattern
          pattern = `**/${pattern}`;
        } else {
          // Path pattern
          pattern = `**/${pattern}`;
        }
      }

      // Add negation back if it was present
      if (trimmedLine.startsWith('!')) {
        pattern = `!${pattern}`;
      }

      patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Get default ignore patterns
   */
  getDefaultPatterns() {
    return [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/coverage/**',
      '**/report/**',
      '**/reports/**',
      '**/*.log',
      '**/.vscode/**',
      '**/.idea/**',
      '**/*.swp',
      '**/*.swo',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/*.min.js',
      '**/*.min.css',
      '**/*.bundle.js',
      '**/*.bundle.css',
      '**/__tests__/**',
      '**/test/**',
      '**/tests/**',
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.test.jsx',
      '**/*.test.tsx',
      '**/*.spec.js',
      '**/*.spec.ts',
      '**/*.spec.jsx',
      '**/*.spec.tsx',
      '**/docs/**',
      '**/*.md',
      '!**/README.md',
      '**/.tmp/**',
      '**/.cache/**',
      '**/.temp/**',
      '**/.git/**'
    ];
  }

  /**
   * Apply ignore patterns to file patterns
   */
  applyIgnorePatterns(filePatterns) {
    const ignorePatterns = this.loadIgnorePatterns();
    
    // Combine file patterns with ignore patterns
    const combinedPatterns = [...filePatterns];
    
    // Add ignore patterns as exclusions
    ignorePatterns.forEach(pattern => {
      if (pattern.startsWith('!')) {
        // This is already a negation pattern
        combinedPatterns.push(pattern);
      } else {
        // Convert to negation pattern
        combinedPatterns.push(`!${pattern}`);
      }
    });

    return combinedPatterns;
  }

  /**
   * Check if a file should be ignored
   */
  shouldIgnoreFile(filePath) {
    const ignorePatterns = this.loadIgnorePatterns();
    const relativePath = path.relative(this.projectRoot, filePath);
    
    return ignorePatterns.some(pattern => {
      if (pattern.startsWith('!')) {
        // Negation pattern - check if it matches
        const negPattern = pattern.substring(1);
        return this.matchesPattern(relativePath, negPattern);
      } else {
        // Regular pattern - check if it matches
        return this.matchesPattern(relativePath, pattern);
      }
    });
  }

  /**
   * Check if a path matches a glob pattern
   */
  matchesPattern(filePath, pattern) {
    // Simple pattern matching - can be enhanced with proper glob library
    if (pattern.includes('*')) {
      const regex = this.globToRegex(pattern);
      return regex.test(filePath);
    } else {
      return filePath.includes(pattern);
    }
  }

  /**
   * Convert glob pattern to regex
   */
  globToRegex(pattern) {
    let regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[([^\]]+)\]/g, '[$1]');
    
    return new RegExp(`^${regexStr}$`);
  }

  /**
   * Get ignore file path
   */
  getIgnoreFilePath() {
    return path.join(this.projectRoot, this.ignoreFile);
  }

  /**
   * Check if ignore file exists
   */
  hasIgnoreFile() {
    return fs.existsSync(this.getIgnoreFilePath());
  }

  /**
   * Get ignore patterns for debugging
   */
  getIgnorePatterns() {
    return this.loadIgnorePatterns();
  }
}

// Default patterns - moved here to break circular dependency
const defaultJsFilePathPattern = [
  '**/*.{js,ts,jsx,tsx}',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/coverage/**',
  '!**/report/**',
  '!**/*.min.js',
  '!**/tools/**'
];

const defaultHtmlFilePathPattern = [
  '**/*.{html,htm}',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/coverage/**',
  '!**/report/**',
  '!**/tools/**'
];

const defaultScssFilePathPattern = [
  '**/*.{css,scss,sass,less}',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/coverage/**',
  '!**/report/**',
  '!**/reports/**',
  '!**/tools/**',
  '!**/*.min.css',
  '!**/*.bundle.css',
  '!**/*.map',
  '!**/.git/**',
  '!**/vendor/**',
  '!**/bower_components/**'
];

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
  let patterns = [];
  
  if (key === 'jsFilePathPattern') {
    patterns = config.jsFilePathPattern || defaultJsFilePathPattern;
  } else if (key === 'htmlFilePathPattern') {
    patterns = config.htmlFilePathPattern || defaultHtmlFilePathPattern;
  } else if (key === 'scssFilePathPattern') {
    patterns = config.scssFilePathPattern || defaultScssFilePathPattern;
  } else {
    return [];
  }

  // Apply ignore file patterns if enabled
  const ignoreConfig = config.ignoreFileConfig;
  if (ignoreConfig && ignoreConfig.enabled !== false) {
    const ignoreHandler = new IgnoreHandler(process.cwd());
    patterns = ignoreHandler.applyIgnorePatterns(patterns);
  }

  return patterns;
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
const __dirname$1 = path.dirname(__filename$1);

const CONFIG_FOLDER$3 = "config";
const ESLINTRC_JSON$2 = ".eslintrc.json";
const ESLINTRC_JS$2 = ".eslintrc.js";
const ESLINTRC_YML$2 = ".eslintrc.yml";
const ESLINTRC$2 = ".eslintrc";
const ESLINTRC_REACT$2 = "eslintrc.react.json";
const ESLINTRC_NODE$2 = "eslintrc.node.json";
const ESLINTRC_VANILLA$2 = "eslintrc.vanilla.json";
const ESLINTRC_TS$2 = "eslintrc.typescript.json";
const ESLINTRC_TSREACT$2 = "eslintrc.tsreact.json";

const getLintConfigFile$3 = (recommendedLintRules = false, projectType = '') => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let configFileName = 'eslintrc.simple.json'; // Default to simple config

  if (projectType && typeof projectType === 'string') {
    const type = projectType.toLowerCase();
    if (type === 'react') configFileName = ESLINTRC_REACT$2;
    else if (type === 'node') configFileName = ESLINTRC_NODE$2;
    else if (type === 'vanilla') configFileName = ESLINTRC_VANILLA$2;
    else if (type === 'typescript') configFileName = ESLINTRC_TS$2;
    else if (type === 'typescript + react' || type === 'tsreact') configFileName = ESLINTRC_TSREACT$2;
  }

  const configFilePath = path.join(__dirname, CONFIG_FOLDER$3, configFileName);
  
  // Check if the target config exists, otherwise fallback to simple config
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // Fallback to simple config to avoid module resolution issues
  const simpleConfigPath = path.join(__dirname, CONFIG_FOLDER$3, 'eslintrc.simple.json');
  if (fs.existsSync(simpleConfigPath)) {
    console.log(chalk.yellow(`⚠️  Using simplified ESLint config to avoid module resolution issues`));
    return simpleConfigPath;
  }

  // Final fallback to default logic
  const recommendedLintRulesConfigFile = path.join(__dirname, CONFIG_FOLDER$3, ESLINTRC_JSON$2);
  const moduleDir = path.join(process.cwd(), "node_modules", "ui-code-insight");
  const eslintLintFilePathFromModule = path.join(moduleDir, ESLINTRC_JSON$2);

  if (recommendedLintRules) {
    return recommendedLintRulesConfigFile;
  }

  const configFiles = [
    ESLINTRC$2,
    ESLINTRC_JS$2,
    ESLINTRC_YML$2,
    ESLINTRC_JSON$2,
    eslintLintFilePathFromModule,
  ];

  const foundConfig = configFiles.find((file) => fs.existsSync(file));
  
  // If no config found, return simple config to avoid node_modules
  return foundConfig || simpleConfigPath;
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

// Memory management constants
const BATCH_SIZE$5 = process.env.SECURITY_BATCH_SIZE ? 
  parseInt(process.env.SECURITY_BATCH_SIZE) : 
  (process.env.NODE_ENV === 'production' ? 25 : 50);
const MAX_FILES_PER_BATCH$2 = 500;
const MEMORY_THRESHOLD$2 = process.env.SECURITY_MEMORY_THRESHOLD ? 
  parseFloat(process.env.SECURITY_MEMORY_THRESHOLD) : 0.7;
const MAX_IN_MEMORY_ISSUES$2 = 5000;
const FORCE_GC_INTERVAL$2 = 50;

// Memory management class
class MemoryManager$2 {
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
    return usage.heapUsed / usage.heapTotal > MEMORY_THRESHOLD$2;
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

class SecurityAudit {
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
    for (let i = 0; i < files.length; i += MAX_FILES_PER_BATCH$2) {
      batches.push(files.slice(i, i + MAX_FILES_PER_BATCH$2));
    }

    let batchProcessedFiles = 0;
    let filesSinceLastGC = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Check memory before processing batch
      if (MemoryManager$2.isMemoryHigh()) {
        console.log(chalk.yellow('⚠️ High memory usage detected, forcing garbage collection...'));
        MemoryManager$2.logMemoryUsage(`Before batch ${batchIndex + 1}`);
        await MemoryManager$2.forceGarbageCollection();
      }

      console.log(chalk.gray(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`));
      
      // Process sub-batches for better memory control
      for (let i = 0; i < batch.length; i += BATCH_SIZE$5) {
        const subBatch = batch.slice(i, i + BATCH_SIZE$5);
        await Promise.all(subBatch.map(processor));
        
        batchProcessedFiles += subBatch.length;
        filesSinceLastGC += subBatch.length;
        process.stdout.write(`\r[Progress] ${batchProcessedFiles}/${files.length} files processed`);
        
        // Force GC more frequently
        if (filesSinceLastGC >= FORCE_GC_INTERVAL$2) {
          await MemoryManager$2.forceGarbageCollection();
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
                if (this.issueCount >= MAX_IN_MEMORY_ISSUES$2) {
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
              if (this.issueCount >= MAX_IN_MEMORY_ISSUES$2) {
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
      const eslintConfig = getLintConfigFile$3();
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
        const simpleConfigPath = path.join(__dirname$1, CONFIG_FOLDER$3, 'eslintrc.simple.json');
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
                const { code, context } = await getCodeContext$1(result.filePath, message.line);
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

// Centralized file patterns for all audits

/**
 * Get Asset file patterns
 * Used by: Performance audit
 */
function getAssetPatterns() {
  return [
    'public/**/*.{png,jpg,jpeg,bmp,tiff,gif,svg,webp}',
    'assets/**/*.{png,jpg,jpeg,bmp,tiff,gif,svg,webp}',
    'static/**/*.{png,jpg,jpeg,bmp,tiff,gif,svg,webp}',
    'src/assets/**/*.{png,jpg,jpeg,bmp,tiff,gif,svg,webp}',
    '!**/node_modules/**',
    '!**/report/**',
    '!build/**',
    '!dist/**'
  ];
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

// Legacy exports for backward compatibility
const assetGlobs = getAssetPatterns();

// Memory management constants
const BATCH_SIZE$4 = process.env.PERFORMANCE_BATCH_SIZE ? 
  parseInt(process.env.PERFORMANCE_BATCH_SIZE) : 
  (process.env.NODE_ENV === 'production' ? 25 : 50);
const MAX_FILES_PER_BATCH$1 = 500;
const MEMORY_THRESHOLD$1 = process.env.PERFORMANCE_MEMORY_THRESHOLD ? 
  parseFloat(process.env.PERFORMANCE_MEMORY_THRESHOLD) : 0.7;
const MAX_IN_MEMORY_ISSUES$1 = 5000;
const FORCE_GC_INTERVAL$1 = 50;

// Memory management class
class MemoryManager$1 {
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
    return usage.heapUsed / usage.heapTotal > MEMORY_THRESHOLD$1;
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

const CONFIG_FOLDER$2 = "config";
const ESLINTRC_JSON$1 = ".eslintrc.json";
const getLintConfigFile$2 = (recommendedLintRules = false, projectType = '') => {
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

  const configFilePath = path.join(__dirname, CONFIG_FOLDER$2, configFileName);
  
  // Check if the target config exists, otherwise fallback to simple config
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // Fallback to simple config to avoid module resolution issues
  const simpleConfigPath = path.join(__dirname, CONFIG_FOLDER$2, 'eslintrc.simple.json');
  if (fs.existsSync(simpleConfigPath)) {
    console.log(chalk.yellow(`⚠️  Using simplified ESLint config to avoid module resolution issues`));
    return simpleConfigPath;
  }

  // Final fallback to default logic
  const recommendedLintRulesConfigFile = path.join(__dirname, CONFIG_FOLDER$2, ESLINTRC_JSON$1);
  const moduleDir = path.join(process.cwd(), "node_modules", "ui-code-insight");
  const eslintLintFilePathFromModule = path.join(moduleDir, ESLINTRC_JSON$1);

  if (recommendedLintRules) {
    return recommendedLintRulesConfigFile;
  }

  const configFiles = [
    ESLINTRC,
    ESLINTRC_JS,
    ESLINTRC_YML,
    ESLINTRC_JSON$1,
    eslintLintFilePathFromModule,
  ];

  const foundConfig = configFiles.find((file) => fs.existsSync(file));
  
  // If no config found, return simple config to avoid node_modules
  return foundConfig || simpleConfigPath;
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
    this.issueCount = 0;
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) fs.unlinkSync(this.issuesFile);
    this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
  }

  async addPerformanceIssue(issue) {
    // Limit in-memory issues
    if (this.issueCount >= MAX_IN_MEMORY_ISSUES$1) {
      console.warn(chalk.yellow('⚠️ Maximum in-memory issues reached, skipping further issues'));
      return;
    }
    
    this.issueStream.write(JSON.stringify(issue) + '\n');
    this.issueCount++;
  }

  /**
   * Process files in batches with memory management
   */
  async processFilesInBatches(files, processor, auditType = 'performance') {
    const batches = [];
    for (let i = 0; i < files.length; i += MAX_FILES_PER_BATCH$1) {
      batches.push(files.slice(i, i + MAX_FILES_PER_BATCH$1));
    }

    let batchProcessedFiles = 0;
    let filesSinceLastGC = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Check memory before processing batch
      if (MemoryManager$1.isMemoryHigh()) {
        console.log(chalk.yellow('⚠️ High memory usage detected, forcing garbage collection...'));
        MemoryManager$1.logMemoryUsage(`Before batch ${batchIndex + 1}`);
        await MemoryManager$1.forceGarbageCollection();
      }

      console.log(chalk.gray(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`));
      
      // Process sub-batches for better memory control
      for (let i = 0; i < batch.length; i += BATCH_SIZE$4) {
        const subBatch = batch.slice(i, i + BATCH_SIZE$4);
        await Promise.all(subBatch.map(processor));
        
        batchProcessedFiles += subBatch.length;
        filesSinceLastGC += subBatch.length;
        process.stdout.write(`\r[Progress] ${batchProcessedFiles}/${files.length} files processed`);
        
        // Force GC more frequently
        if (filesSinceLastGC >= FORCE_GC_INTERVAL$1) {
          await MemoryManager$1.forceGarbageCollection();
          filesSinceLastGC = 0;
        }
      }
    }
    
    console.log(chalk.green(`\n✅ ${auditType} audit completed: ${batchProcessedFiles} files processed`));
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
      
      const processor = async (file) => {
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
          
          // Clear lines array to free memory
          lines.length = 0;
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
        }
      };
      
      await this.processFilesInBatches(files, processor, 'inefficient_operations');
      
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
      
      const processor = async (file) => {
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
          
          // Clear lines array to free memory
          lines.length = 0;
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
        }
      };
      
      await this.processFilesInBatches(files, processor, 'memory_leaks');
      
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
        const simpleConfigPath = path.join(__dirname, CONFIG_FOLDER$2, 'eslintrc.simple.json');
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
      const results = await eslint.lintFiles(files);
      
      // Validate results before processing
      if (!results || !Array.isArray(results)) {
        console.warn(chalk.yellow('⚠️ Invalid ESLint results for unused code check'));
        return;
      }
      
      for (const file of results) {
        // Validate file structure
        if (!file || !file.messages || !Array.isArray(file.messages)) {
          console.warn(chalk.yellow('⚠️ Invalid ESLint file result structure'));
          continue;
        }
        
        for (const message of file.messages) {
          // Validate message structure
          if (!message || !message.ruleId) {
            continue;
          }
          
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
        const simpleConfigPath = path.join(__dirname, CONFIG_FOLDER$2, 'eslintrc.simple.json');
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
      
      const processor = async (file) => {
        try {
          const results = await eslint.lintFiles([file]);
          
          // Validate results before processing
          if (!results || !Array.isArray(results)) {
            console.warn(chalk.yellow(`⚠️ Invalid ESLint results for file ${file}`));
            return;
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
              
              if (message.ruleId.startsWith('promise/')) {
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
      };
      
      await this.processFilesInBatches(files, processor, 'eslint_promise');
      
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

// Enhanced performance audit with better tools and reliability
class EnhancedPerformanceAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.performanceIssues = [];
    this.issuesFile = path.join(folderPath, 'performance-issues.jsonl');
    this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'w' });
    this.issueCount = 0;
  }

  async addPerformanceIssue(issue) {
    if (this.issueCount >= 5000) {
      console.warn(chalk.yellow('⚠️ Maximum performance issues reached'));
      return;
    }
    
    this.performanceIssues.push(issue);
    this.issueStream.write(JSON.stringify(issue) + '\n');
    this.issueCount++;
  }

  /**
   * Enhanced bundle analysis with multiple tools
   */
  async checkEnhancedBundleAnalysis() {
    console.log(chalk.blue('📦 Running enhanced bundle analysis...'));
    
    try {
      // 1. Check if webpack-bundle-analyzer is available
      try {
        execSync('npx webpack-bundle-analyzer --version', { stdio: 'pipe' });
        console.log(chalk.green('✅ webpack-bundle-analyzer available'));
        
        // Generate bundle analysis
        execSync('npx webpack-bundle-analyzer build/stats.json --mode static --report', { 
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        await this.addPerformanceIssue({
          type: 'bundle_analysis',
          severity: 'info',
          message: 'Bundle analysis report generated',
          recommendation: 'Review bundle-analyzer-report.html for detailed analysis'
        });
      } catch (error) {
        console.log(chalk.yellow('⚠️ webpack-bundle-analyzer not available'));
      }

      // 2. Check bundle size with size-limit
      try {
        const sizeLimitResult = execSync('npx size-limit', { 
          encoding: 'utf8',
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        if (sizeLimitResult.includes('FAIL')) {
          await this.addPerformanceIssue({
            type: 'bundle_size_limit',
            severity: 'high',
            message: 'Bundle size exceeds limits',
            recommendation: 'Implement code splitting and tree shaking'
          });
        }
      } catch (error) {
        console.log(chalk.yellow('⚠️ size-limit not configured'));
      }

      // 3. Analyze dependencies with dependency-cruiser
      try {
        execSync('npx depcruise --config .dependency-cruiser.js --output-type dot src | dot -T svg > dependency-graph.svg', {
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        await this.addPerformanceIssue({
          type: 'dependency_analysis',
          severity: 'info',
          message: 'Dependency graph generated',
          recommendation: 'Review dependency-graph.svg for circular dependencies'
        });
      } catch (error) {
        console.log(chalk.yellow('⚠️ dependency-cruiser not configured'));
      }

    } catch (error) {
      console.warn(chalk.yellow('Warning: Enhanced bundle analysis failed'));
    }
  }

  /**
   * Check for performance anti-patterns
   */
  async checkPerformanceAntiPatterns() {
    console.log(chalk.blue('🚫 Checking for performance anti-patterns...'));
    
    const antiPatterns = [
      {
        pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\},\s*\[\s*\]\s*\)/g,
        message: 'Empty dependency array in useEffect may cause issues',
        severity: 'medium'
      },
      {
        pattern: /\.map\s*\(\s*\([^)]*\)\s*=>\s*\{[^}]*\}/g,
        message: 'Consider using React.memo for expensive map operations',
        severity: 'low'
      },
      {
        pattern: /useState\s*\(\s*\[\s*\]\s*\)/g,
        message: 'Empty array state initialization may cause unnecessary re-renders',
        severity: 'low'
      },
      {
        pattern: /useCallback\s*\(\s*\([^)]*\)\s*=>\s*\{[^}]*\},\s*\[\s*\]\s*\)/g,
        message: 'Empty dependency array in useCallback may cause stale closures',
        severity: 'medium'
      },
      {
        pattern: /useMemo\s*\(\s*\([^)]*\)\s*=>\s*\{[^}]*\},\s*\[\s*\]\s*\)/g,
        message: 'Empty dependency array in useMemo may cause stale values',
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
            for (const { pattern, message, severity } of antiPatterns) {
              if (pattern.test(line)) {
                await this.addPerformanceIssue({
                  type: 'performance_anti_pattern',
                  file,
                  line: index + 1,
                  severity,
                  message,
                  code: line.trim(),
                  recommendation: 'Review React performance best practices'
                });
              }
            }
          }
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
        }
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Performance anti-pattern check failed'));
    }
  }

  /**
   * Check for large dependencies and suggest alternatives
   */
  async checkLargeDependencies() {
    console.log(chalk.blue('📦 Checking for large dependencies...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Known large packages and alternatives
      const largePackages = {
        'lodash': { size: '~70KB', alternative: 'Use native JavaScript methods or lodash-es' },
        'moment': { size: '~230KB', alternative: 'Use date-fns or native Date API' },
        'jquery': { size: '~30KB', alternative: 'Use native DOM APIs' },
        'axios': { size: '~13KB', alternative: 'Use native fetch API' },
        'react-router': { size: '~30KB', alternative: 'Consider code splitting routes' }
      };

      for (const [pkg, info] of Object.entries(largePackages)) {
        if (dependencies[pkg]) {
          await this.addPerformanceIssue({
            type: 'large_dependency',
            severity: 'medium',
            message: `Large dependency detected: ${pkg} (${info.size})`,
            recommendation: info.alternative
          });
        }
      }

      // Check for duplicate dependencies
      const allDeps = Object.keys(dependencies);
      const duplicates = allDeps.filter((item, index) => allDeps.indexOf(item) !== index);
      
      if (duplicates.length > 0) {
        await this.addPerformanceIssue({
          type: 'duplicate_dependencies',
          severity: 'medium',
          message: `Duplicate dependencies found: ${duplicates.join(', ')}`,
          recommendation: 'Remove duplicate dependencies to reduce bundle size'
        });
      }

    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not analyze dependencies'));
    }
  }

  /**
   * Check for image optimization opportunities
   */
  async checkImageOptimization() {
    console.log(chalk.blue('🖼️ Checking for image optimization opportunities...'));
    
    try {
      const imageFiles = await globby(['**/*.{png,jpg,jpeg,gif,svg,webp}'], {
        ignore: ['node_modules/**', 'dist/**', 'build/**']
      });

      for (const file of imageFiles) {
        try {
          const stats = fs.statSync(file);
          const sizeInKB = stats.size / 1024;
          
          if (sizeInKB > 500) {
            await this.addPerformanceIssue({
              type: 'large_image',
              file,
              severity: 'medium',
              message: `Large image detected: ${file} (${sizeInKB.toFixed(0)}KB)`,
              recommendation: 'Optimize image using tools like imagemin or convert to WebP'
            });
          }

          // Check for non-optimized formats
          if (file.endsWith('.png') && sizeInKB > 100) {
            await this.addPerformanceIssue({
              type: 'image_format',
              file,
              severity: 'low',
              message: `Consider converting PNG to WebP: ${file}`,
              recommendation: 'WebP provides better compression for web use'
            });
          }

        } catch (error) {
          console.warn(chalk.yellow(`⚠️ Could not analyze image ${file}`));
        }
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Image optimization check failed'));
    }
  }

  /**
   * Run all enhanced performance checks
   */
  async runEnhancedPerformanceAudit() {
    console.log(chalk.cyan.bold('\n⚡ Running Enhanced Performance Audit...'));
    
    await this.checkEnhancedBundleAnalysis();
    await this.checkPerformanceAntiPatterns();
    await this.checkLargeDependencies();
    await this.checkImageOptimization();
    
    // Generate comprehensive report
    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.performanceIssues.length,
      highSeverity: this.performanceIssues.filter(i => i.severity === 'high').length,
      mediumSeverity: this.performanceIssues.filter(i => i.severity === 'medium').length,
      lowSeverity: this.performanceIssues.filter(i => i.severity === 'low').length,
      issues: this.performanceIssues
    };

    const reportPath = path.join(this.folderPath, 'enhanced-performance-audit-report.json');
    await writeFile(reportPath, JSON.stringify(results, null, 2));
    
    console.log(chalk.green(`✅ Enhanced performance audit report saved to: ${reportPath}`));
    console.log(chalk.blue('\n⚡ ENHANCED PERFORMANCE AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(50)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));

    return results;
  }
}

/**
 * Accessibility Audit Configuration
 * 
 * This file allows customization of accessibility audit settings
 */

const ACCESSIBILITY_CONFIG = {
  // Custom components that handle accessibility properly
  accessibleComponents: [
    'ImageOnly',
    'AccessibleImage', 
    'ImageWithAlt',
    'ResponsiveImage',
    'OptimizedImage',
    'AccessibleImg',
    'ImgWithAlt',
    'Picture',
    'Figure',
    'AccessibleFigure'
  ],

  // Accessibility-related props that indicate proper handling
  accessibilityProps: [
    'imgSrc',
    'imgAlt', 
    'alt',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'accessibility',
    'accessible',
    'screenReaderText',
    'altText'
  ],

  // Patterns to ignore (components that are known to be accessible)
  ignorePatterns: [
    /<ImageOnly[^>]*imgSrc=[^>]*imgAlt=[^>]*>/gi,
    /<AccessibleImage[^>]*>/gi,
    /<ImageWithAlt[^>]*>/gi,
    /<ResponsiveImage[^>]*>/gi,
    /<OptimizedImage[^>]*>/gi
  ],

  // Severity levels for different issues
  severityLevels: {
    missing_alt: 'high',
    empty_alt: 'medium', 
    generic_alt: 'medium',
    multiple_h1: 'medium',
    empty_heading: 'low',
    missing_label: 'high',
    missing_aria: 'medium',
    keyboard_navigation: 'medium',
    color_contrast: 'medium',
    tab_order: 'medium'
  },

  // WCAG guidelines mapping
  wcagMapping: {
    missing_alt: '1.1.1',
    empty_alt: '1.1.1',
    generic_alt: '1.1.1',
    multiple_h1: '1.3.1',
    empty_heading: '1.3.1',
    missing_label: '3.3.2',
    missing_aria: '4.1.2',
    keyboard_navigation: '2.1.1',
    color_contrast: '1.4.3',
    tab_order: '2.4.3'
  }
};

/**
 * Get accessible components list
 */
function getAccessibleComponents() {
  return ACCESSIBILITY_CONFIG.accessibleComponents;
}

/**
 * Get accessibility props list
 */
function getAccessibilityProps() {
  return ACCESSIBILITY_CONFIG.accessibilityProps;
}

/**
 * Check if a line should be ignored
 */
function shouldIgnoreLine(line) {
  return ACCESSIBILITY_CONFIG.ignorePatterns.some(pattern => 
    pattern.test(line)
  );
}

// Memory optimization: Ultra-aggressive settings for very large projects
const BATCH_SIZE$3 = process.env.ACCESSIBILITY_BATCH_SIZE ? 
  parseInt(process.env.ACCESSIBILITY_BATCH_SIZE) : 
  (process.env.NODE_ENV === 'production' ? 1 : 2);
const MAX_FILES_PER_BATCH = 500; // Reduced from 1000 to 500
const MEMORY_THRESHOLD = process.env.ACCESSIBILITY_MEMORY_THRESHOLD ? 
  parseFloat(process.env.ACCESSIBILITY_MEMORY_THRESHOLD) : 0.6;
const MAX_IN_MEMORY_ISSUES = 2500; // Reduced from 5000 to 2500
const FORCE_GC_INTERVAL = 25; // Force GC every 25 files instead of every batch

/**
 * Memory management utility
 */
class MemoryManager {
  static getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed / 1024 / 1024, // MB
      heapTotal: usage.heapTotal / 1024 / 1024, // MB
      external: usage.external / 1024 / 1024, // MB
      rss: usage.rss / 1024 / 1024 // MB
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

/**
 * Accessibility audit module for detecting accessibility issues
 * 
 * @example
 * // Code scanning only (default)
 * const audit = new AccessibilityAudit('./reports');
 * await audit.runAccessibilityAudit();
 * 
 * @example
 * // Live URL testing with axe-core
 * const audit = new AccessibilityAudit('./reports');
 * await audit.runAccessibilityAudit(
 *   ['https://example.com', 'https://google.com'],
 *   {
 *     codeScan: true,        // Run code scanning (default: true)
 *     liveUrlTest: true,     // Run live URL testing (default: false)
 *     useAxeCore: true,      // Use axe-core for live testing (default: true)
 *     useLighthouse: false   // Use Lighthouse for live testing (default: false)
 *   }
 * );
 * 
 * @example
 * // Live URL testing only (no code scanning)
 * const audit = new AccessibilityAudit('./reports');
 * await audit.runAccessibilityAudit(
 *   ['https://example.com'],
 *   {
 *     codeScan: false,
 *     liveUrlTest: true,
 *     useAxeCore: true
 *   }
 * );
 */
class AccessibilityAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.accessibilityIssues = [];
    this.currentAuditType = '';
    this.currentBatchIndex = 0;
    
    // Ensure the reports directory exists
    if (!fs.existsSync(this.folderPath)) {
      fs.mkdirSync(this.folderPath, { recursive: true });
    }
    
    this.issuesFile = path.join(this.folderPath, 'accessibility-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) {
      fs.unlinkSync(this.issuesFile);
    }
    
    // Create the write stream with error handling
    try {
      this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not create issue stream: ${error.message}`));
      this.issueStream = null;
    }
    
    this.browser = null;
  }

  async addAccessibilityIssue(issue) {
    // Add to in-memory array (with size limit)
    if (this.accessibilityIssues.length < MAX_IN_MEMORY_ISSUES) { // Limit in-memory issues
      this.accessibilityIssues.push(issue);
    }
    
    // Write to file if stream is available
    if (this.issueStream) {
      try {
        this.issueStream.write(JSON.stringify(issue) + '\n');
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not write issue to file: ${error.message}`));
      }
    } else {
      console.warn(chalk.yellow('Issue stream not initialized, issue added to memory only.'));
    }
  }

  /**
   * Process files in batches to manage memory
   */
  async processFilesInBatches(files, processor, auditType = '') {
    const batches = [];
    for (let i = 0; i < files.length; i += MAX_FILES_PER_BATCH) {
      batches.push(files.slice(i, i + MAX_FILES_PER_BATCH));
    }

    console.log(chalk.blue(`📁 Processing ${files.length} files in ${batches.length} batches for ${auditType}`));
    
    let batchProcessedFiles = 0;
    let filesSinceLastGC = 0;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Check memory before processing batch
      if (MemoryManager.isMemoryHigh()) {
        console.log(chalk.yellow(`⚠️  High memory usage detected, forcing garbage collection...`));
        await MemoryManager.forceGarbageCollection();
        MemoryManager.logMemoryUsage(`Before batch ${batchIndex + 1}`);
      }
      
      console.log(chalk.gray(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`));
      
      // Process batch
      for (let i = 0; i < batch.length; i += BATCH_SIZE$3) {
        const subBatch = batch.slice(i, i + BATCH_SIZE$3);
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
      
      // Force garbage collection after each batch
      await MemoryManager.forceGarbageCollection();
    }
    
    console.log(`\n✅ ${auditType} processing completed`);
  }

  /**
   * Initialize Puppeteer browser for live URL testing
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Test accessibility using axe-core for live URLs
   */
  async testLiveUrlAccessibility(url) {
    console.log(chalk.blue(`♿ Testing accessibility for: ${url}`));
    
    try {
      const page = await this.browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the URL
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for headings on the page
      const headingCount = await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return headings.length;
      });
      
      // If no headings found, add an issue
      if (headingCount === 0) {
        await this.addAccessibilityIssue({
          type: 'no_headings',
          file: url,
          line: 1,
          severity: 'medium',
          message: 'No heading elements found on page',
          code: 'Page appears to lack heading structure',
          context: 'Page should have heading elements to structure content',
          recommendation: 'Add heading elements (h1, h2, h3, etc.) to structure the page content',
          source: 'axe-core',
          wcag: '1.3.1',
          url: url
        });
      }
      
      // Check for skipped heading levels
      const headingHierarchy = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.map(h => parseInt(h.tagName.charAt(1)));
      });
      
      // Check for skipped heading levels
      for (let i = 0; i < headingHierarchy.length; i++) {
        const currentLevel = headingHierarchy[i];
        if (currentLevel > 1) {
          const previousLevel = currentLevel - 1;
          const hasPreviousHeading = headingHierarchy.slice(0, i).some(level => level === previousLevel);
          
          if (!hasPreviousHeading) {
            await this.addAccessibilityIssue({
              type: 'skipped_heading',
              file: url,
              line: 1,
              severity: 'medium',
              message: `Heading level ${currentLevel} used without previous level ${previousLevel}`,
              code: 'Page has heading hierarchy issues',
              context: `Page contains h${currentLevel} without preceding h${previousLevel}`,
              recommendation: 'Use heading levels in sequential order (h1, h2, h3, etc.)',
              source: 'axe-core',
              wcag: '1.3.1',
              url: url
            });
          }
        }
      }
      
      // Inject axe-core
      await page.addScriptTag({
        url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.0/axe.min.js'
      });
      
      // Wait for axe-core to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Run axe-core analysis
      const results = await page.evaluate(() => {
        if (typeof axe === 'undefined') {
          return { error: 'axe-core not loaded' };
        }
        
        return axe.run({
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'best-practice']
          }
        });
      });
      
      if (results.error) {
        console.warn(chalk.yellow(`Warning: ${results.error} for ${url}`));
        return;
      }
      
      // Process axe-core results
      if (results.violations && results.violations.length > 0) {
        for (const violation of results.violations) {
          for (const node of violation.nodes) {
            await this.addAccessibilityIssue({
              type: 'axe_violation',
              file: url,
              line: 1,
              severity: violation.impact === 'critical' ? 'high' : 
                       violation.impact === 'serious' ? 'medium' : 'low',
              message: violation.description,
              code: node.html || 'N/A',
              context: violation.help,
              recommendation: violation.helpUrl,
              source: 'axe-core',
              wcag: violation.tags.find(tag => tag.startsWith('wcag')) || 'N/A',
              url: url,
              impact: violation.impact
            });
          }
        }
      }
      
      await page.close();
      console.log(chalk.green(`✅ Accessibility testing completed for: ${url}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error testing ${url}: ${error.message}`));
      console.error(chalk.gray('Stack trace:'), error.stack);
    }
  }

  /**
   * Process axe-core results and convert to our issue format
   */
  async processAxeResults(url, results) {
    const violations = results.violations || [];
    const passes = results.passes || [];
    
    console.log(chalk.blue(`  📊 Found ${violations.length} violations and ${passes.length} passes`));
    
    // Process violations
    for (const violation of violations) {
      const severity = this.mapAxeImpactToSeverity(violation.impact);
      
      for (const node of violation.nodes) {
        const issue = {
          type: 'axe_violation',
          url: url,
          severity: severity,
          message: violation.description,
          code: node.html || 'N/A',
          context: `Selector: ${node.target.join(' > ')}`,
          recommendation: violation.help,
          source: 'axe-core',
          category: violation.tags.join(', '),
          impact: violation.impact,
          ruleId: violation.id
        };
        
        await this.addAccessibilityIssue(issue);
      }
    }
    
    // Process passes (for reporting)
    for (const pass of passes) {
      console.log(chalk.green(`  ✅ ${pass.description}`));
    }
  }

  /**
   * Map axe-core impact levels to our severity levels
   */
  mapAxeImpactToSeverity(impact) {
    switch (impact) {
      case 'critical':
      case 'serious':
        return 'high';
      case 'moderate':
        return 'medium';
      case 'minor':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Test accessibility for live URLs using Lighthouse
   */
  async testLighthouseAccessibility(urls) {
    if (!urls || urls.length === 0) {
      console.log(chalk.yellow('⚠️  No URLs provided for Lighthouse accessibility testing'));
      return;
    }

    console.log(chalk.blue('♿ Starting Lighthouse Accessibility Testing...'));
    
    try {
      const browser = await this.initBrowser();
      console.log(chalk.green('✅ Browser initialized successfully'));
      
      for (const url of urls) {
        console.log(chalk.blue(`\n♿ Testing Lighthouse accessibility for: ${url}`));
        
        try {
          const page = await browser.newPage();
          console.log(chalk.gray('  📄 Created new page'));
          
          // Set viewport and user agent
          await page.setViewport({ width: 1280, height: 720 });
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
          console.log(chalk.gray('  🖥️  Set viewport and user agent'));
          
          // Navigate to the page
          console.log(chalk.gray('  🌐 Navigating to page...'));
          await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
          });
          console.log(chalk.gray('  ✅ Page loaded successfully'));
          
          // Wait for page to fully load
          console.log(chalk.gray('  ⏳ Waiting for page to stabilize...'));
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Run Lighthouse audit
          console.log(chalk.gray('  🔍 Running Lighthouse audit...'));
          const cdp = await page.target().createCDPSession();
          await cdp.send('Performance.enable');
          
          // Get accessibility audit results
          const results = await page.evaluate(() => {
            return new Promise((resolve) => {
              // This is a simplified version - in a real implementation,
              // you'd want to use the full Lighthouse API
              const accessibilityIssues = [];
              
              // Check for common accessibility issues
              const images = document.querySelectorAll('img');
              images.forEach(img => {
                if (!img.alt && !img.getAttribute('aria-label')) {
                  accessibilityIssues.push({
                    type: 'missing_alt',
                    message: 'Image missing alt attribute',
                    element: img.outerHTML,
                    selector: this.getSelector(img)
                  });
                }
              });
              
              const buttons = document.querySelectorAll('button');
              buttons.forEach(button => {
                if (!button.textContent.trim() && !button.getAttribute('aria-label')) {
                  accessibilityIssues.push({
                    type: 'empty_button',
                    message: 'Button missing accessible text',
                    element: button.outerHTML,
                    selector: this.getSelector(button)
                  });
                }
              });
              
              const inputs = document.querySelectorAll('input:not([type="hidden"])');
              inputs.forEach(input => {
                if (!input.labels.length && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
                  accessibilityIssues.push({
                    type: 'missing_label',
                    message: 'Input missing label',
                    element: input.outerHTML,
                    selector: this.getSelector(input)
                  });
                }
              });
              
              resolve(accessibilityIssues);
            });
          });
          
          console.log(chalk.gray(`  📊 Found ${results.length} accessibility issues`));
          
          // Process results
          for (const issue of results) {
            await this.addAccessibilityIssue({
              type: issue.type,
              url: url,
              severity: 'medium',
              message: issue.message,
              code: issue.element,
              context: `Selector: ${issue.selector}`,
              source: 'lighthouse'
            });
          }
          
          await page.close();
          console.log(chalk.gray('  🗂️  Page closed'));
          
        } catch (error) {
          console.log(chalk.red(`❌ Error testing ${url}: ${error.message}`));
          console.log(chalk.gray(`   Stack: ${error.stack}`));
        }
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Error initializing browser: ${error.message}`));
      console.log(chalk.gray(`   Stack: ${error.stack}`));
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Get CSS selector for an element
   */
  getSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className) {
      return `.${element.className.split(' ').join('.')}`;
    }
    return element.tagName.toLowerCase();
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
      /<img[^>]*\/>/gi,
      /<Image[^>]*\/>/gi,
    ];

    // Get accessible components from configuration
    const accessibleComponents = getAccessibleComponents();
    const accessibilityProps = getAccessibilityProps();

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    await this.processFilesInBatches(files, async (file) => {
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          
          // Check if this line should be ignored based on configuration
          if (shouldIgnoreLine(line)) {
            continue;
          }
          
          // Check for accessible custom components first
          const hasAccessibleComponent = accessibleComponents.some(component => 
            line.includes(`<${component}`) || line.includes(`<${component}/`)
          );
          
          // Skip if this line contains an accessible custom component
          if (hasAccessibleComponent) {
            continue;
          }
          
          // Check for custom components with accessibility props
          const customComponentPattern = /<([A-Z][a-zA-Z]*)[^>]*>/g;
          const customMatches = line.match(customComponentPattern);
          if (customMatches) {
            for (const match of customMatches) {
              // Check if component has accessibility-related props
              const hasAccessibilityProps = accessibilityProps.some(prop => 
                match.includes(`${prop}=`)
              );
              
              // Skip if component has accessibility props
              if (hasAccessibilityProps) {
                continue;
              }
            }
          }
          
          for (const pattern of imagePatterns) {
            const matches = line.match(pattern);
            if (matches) {
              for (const match of matches) {
                // Check for missing alt attribute
                if (!match.includes('alt=')) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'missing_alt',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'high',
                    message: 'Image missing alt attribute',
                    code,
                    context,
                    recommendation: 'Add descriptive alt text for screen readers',
                    source: 'custom',
                    wcag: '1.1.1'
                  });
                }
                // Check for empty alt attribute
                else if (match.includes('alt=""') || match.includes("alt=''")) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'empty_alt',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Image has empty alt attribute',
                    code,
                    context,
                    recommendation: 'Add descriptive alt text or use alt="" only for decorative images',
                    source: 'custom',
                    wcag: '1.1.1'
                  });
                }
                // Check for generic alt text
                else if (match.includes('alt="image"') || match.includes("alt='image'") || 
                         match.includes('alt="img"') || match.includes("alt='img'") ||
                         match.includes('alt="photo"') || match.includes("alt='photo'")) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'generic_alt',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Image has generic alt text',
                    code,
                    context,
                    recommendation: 'Use descriptive alt text that conveys the image content',
                    source: 'custom',
                    wcag: '1.1.1'
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }, 'Image Accessibility');
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

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    await this.processFilesInBatches(files, async (file) => {
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        // Track heading levels in this file
        const headingLevels = [];
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (let level = 0; level < headingPatterns.length; level++) {
            const pattern = headingPatterns[level];
            if (pattern.test(line)) {
              const headingLevel = level + 1;
              headingLevels.push({ level: headingLevel, line: index + 1 });
              
              // Check for multiple h1 elements (should typically be only one per page)
              if (headingLevel === 1) {
                const h1Count = headingLevels.filter(h => h.level === 1).length;
                if (h1Count > 1) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'multiple_h1',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Multiple h1 elements found',
                    code,
                    context,
                    recommendation: 'Use only one h1 element per page as the main heading',
                    source: 'custom',
                    wcag: '1.3.1'
                  });
                }
              }
              
              // Check for heading without content
              const nextLine = lines[index + 1];
              if (nextLine && nextLine.trim() === '') {
                const { code, context } = await this.getCodeContext(file, index + 1);
                await this.addAccessibilityIssue({
                  type: 'empty_heading',
                  file: path.relative(process.cwd(), file),
                  line: index + 1,
                  severity: 'low',
                  message: 'Heading appears to be empty',
                  code,
                  context,
                  recommendation: 'Ensure headings have meaningful content',
                  source: 'custom',
                  wcag: '1.3.1'
                });
              }
            }
          }
        }
        
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    });
    
  }

  /**
   * Check for proper form accessibility
   */
  async checkFormAccessibility() {
    console.log(chalk.blue('♿ Checking form accessibility...'));
    
    const formPatterns = [
      /<input[^>]*>/gi,
      /<textarea[^>]*>/gi,
      /<select[^>]*>/gi,
      /<button[^>]*>/gi,
      /<label[^>]*>/gi,
    ];

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    await this.processFilesInBatches(files, async (file) => {
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (const pattern of formPatterns) {
            const matches = line.match(pattern);
            if (matches) {
              for (const match of matches) {
                // Check input elements
                if (match.includes('<input')) {
                  // Skip hidden inputs
                  if (match.includes('type="hidden"')) continue;
                  
                  // Check for proper labeling
                  const hasLabel = match.includes('aria-label=') || 
                                 match.includes('aria-labelledby=') || 
                                 match.includes('id=');
                  
                  if (!hasLabel) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'missing_form_label',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'high',
                      message: 'Form input missing proper labeling',
                      code,
                      context,
                      recommendation: 'Add aria-label, aria-labelledby, or associate with a label element',
                      source: 'custom',
                      wcag: '3.3.2'
                    });
                  }
                  
                  // Check for required fields without aria-required
                  if (match.includes('required') && !match.includes('aria-required=')) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'missing_aria_required',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'medium',
                      message: 'Required field missing aria-required attribute',
                      code,
                      context,
                      recommendation: 'Add aria-required="true" for required fields',
                      source: 'custom',
                      wcag: '3.3.2'
                    });
                  }
                }
                
                // Check button elements
                if (match.includes('<button')) {
                  // Check for empty button text
                  if (!match.includes('>') || match.includes('></button>')) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'empty_button',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'high',
                      message: 'Button element is empty',
                      code,
                      context,
                      recommendation: 'Add text content or aria-label to button',
                      source: 'custom',
                      wcag: '4.1.2'
                    });
                  }
                  
                  // Check for buttons without accessible name
                  const hasAccessibleName = match.includes('aria-label=') || 
                                          match.includes('aria-labelledby=') ||
                                          match.includes('title=');
                  
                  if (!hasAccessibleName) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'button_no_accessible_name',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'medium',
                      message: 'Button missing accessible name',
                      code,
                      context,
                      recommendation: 'Add aria-label, aria-labelledby, or title attribute',
                      source: 'custom',
                      wcag: '4.1.2'
                    });
                  }
                }
                
                // Check label elements
                if (match.includes('<label')) {
                  // Check for empty labels
                  if (!match.includes('for=') && !match.includes('>')) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'empty_label',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'medium',
                      message: 'Label element is empty',
                      code,
                      context,
                      recommendation: 'Add text content to label element',
                      source: 'custom',
                      wcag: '3.3.2'
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    });
    
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

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    await this.processFilesInBatches(files, async (file) => {
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
    });
    
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

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    await this.processFilesInBatches(files, async (file) => {
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
    });
    
  }

  /**
   * Check for proper ARIA usage
   */
  async checkARIAUsage() {
    console.log(chalk.blue('♿ Checking ARIA usage...'));
    
    const ariaPatterns = [
      /aria-[a-zA-Z-]+/gi,
    ];

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    await this.processFilesInBatches(files, async (file) => {
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
                if (match.includes('aria-label=""') || match.includes('aria-label=\'\'')) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'empty_aria_label',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Empty ARIA label detected',
                    code,
                    context,
                    recommendation: 'Provide meaningful ARIA labels or remove empty ones',
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
    });
    
  }

  /**
   * Check for tab order and focus management
   */
  async checkTabOrderAndFocus() {
    console.log(chalk.blue('♿ Checking tab order and focus...'));
    
    const focusPatterns = [
      /tabIndex\s*=/gi,
      /tabindex\s*=/gi,
      /focus\(\)/gi,
      /blur\(\)/gi,
    ];

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    this.totalFiles = files.length; // Set total files for progress tracking
    await this.processFilesInBatches(files, async (file) => {
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (const pattern of focusPatterns) {
            if (pattern.test(line)) {
              // Check for potential tab order issues
              if (line.includes('tabIndex="-1"') || line.includes('tabindex="-1"')) {
                const { code, context } = await this.getCodeContext(file, index + 1);
                await this.addAccessibilityIssue({
                  type: 'tab_order_issue',
                  file: path.relative(process.cwd(), file),
                  line: index + 1,
                  severity: 'medium',
                  message: 'Negative tabIndex detected - verify tab order is logical',
                  code,
                  context,
                  recommendation: 'Ensure tab order follows logical document flow',
                  source: 'custom'
                });
              }
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    });
    
  }

  /**
   * Check for landmarks and skip links
   */
  async checkLandmarksAndSkipLinks() {
    console.log(chalk.blue('♿ Checking landmarks and skip links...'));
    
    const landmarkPatterns = [
      /<main[^>]*>/gi,
      /<nav[^>]*>/gi,
      /<header[^>]*>/gi,
      /<footer[^>]*>/gi,
      /<aside[^>]*>/gi,
      /<section[^>]*>/gi,
      /<article[^>]*>/gi,
    ];

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    this.totalFiles = files.length; // Set total files for progress tracking
    await this.processFilesInBatches(files, async (file) => {
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (const pattern of landmarkPatterns) {
            if (pattern.test(line)) {
              // Check for proper landmark usage
              const { code, context } = await this.getCodeContext(file, index + 1);
              await this.addAccessibilityIssue({
                type: 'landmark_usage',
                file: path.relative(process.cwd(), file),
                line: index + 1,
                severity: 'low',
                message: 'Landmark element detected - ensure proper semantic structure',
                code,
                context,
                recommendation: 'Use landmarks to create logical document structure',
                source: 'custom'
              });
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    });
    
  }

  /**
   * Check for semantic HTML and proper ARIA usage
   */
  async checkSemanticHTMLAndARIA() {
    console.log(chalk.blue('♿ Checking semantic HTML and ARIA usage...'));
    
    const semanticPatterns = [
      /<main[^>]*>/gi,
      /<nav[^>]*>/gi,
      /<header[^>]*>/gi,
      /<footer[^>]*>/gi,
      /<aside[^>]*>/gi,
      /<section[^>]*>/gi,
      /<article[^>]*>/gi,
      /<figure[^>]*>/gi,
      /<figcaption[^>]*>/gi,
      /<time[^>]*>/gi,
      /<mark[^>]*>/gi,
      /<details[^>]*>/gi,
      /<summary[^>]*>/gi,
    ];

    const ariaPatterns = [
      /aria-[a-zA-Z-]+/gi,
      /role\s*=/gi,
    ];

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**', '**/tools/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    this.totalFiles = files.length; // Set total files for progress tracking
    await this.processFilesInBatches(files, async (file) => {
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          
          // Check for semantic HTML usage
          for (const pattern of semanticPatterns) {
            if (pattern.test(line)) {
              // This is good - semantic HTML is being used
              // We could add positive feedback here if needed
            }
          }
          
          // Check for ARIA usage
          for (const pattern of ariaPatterns) {
            const matches = line.match(pattern);
            if (matches) {
              for (const match of matches) {
                // Check for common ARIA mistakes
                if (match.includes('aria-label=""') || match.includes('aria-label=\'\'')) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'empty_aria_label',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Empty ARIA label detected',
                    code,
                    context,
                    recommendation: 'Provide meaningful ARIA labels or remove empty ones',
                    source: 'custom',
                    wcag: '4.1.2'
                  });
                }
                
                // Check for invalid ARIA attributes
                if (match.includes('aria-invalid="true"') && !match.includes('aria-describedby=')) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'missing_aria_error_description',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Invalid form field missing error description',
                    code,
                    context,
                    recommendation: 'Add aria-describedby to link to error message',
                    source: 'custom',
                    wcag: '3.3.1'
                  });
                }
                
                // Check for redundant ARIA roles
                if ((match.includes('role="button"') && line.includes('<button')) ||
                    (match.includes('role="link"') && line.includes('<a')) ||
                    (match.includes('role="heading"') && /<h[1-6]/.test(line))) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'redundant_aria_role',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'low',
                    message: 'Redundant ARIA role on semantic element',
                    code,
                    context,
                    recommendation: 'Remove redundant ARIA role - semantic element already provides the role',
                    source: 'custom',
                    wcag: '4.1.2'
                  });
                }
              }
            }
          }
          
          // Check for non-semantic elements that should be semantic
          if (line.includes('<div') && (line.includes('onClick=') || line.includes('onclick='))) {
            const { code, context } = await this.getCodeContext(file, index + 1);
            await this.addAccessibilityIssue({
              type: 'non_semantic_interactive',
              file: path.relative(process.cwd(), file),
              line: index + 1,
              severity: 'medium',
              message: 'Non-semantic div used for interactive element',
              code,
              context,
              recommendation: 'Use semantic button element instead of div with click handler',
              source: 'custom',
              wcag: '4.1.2'
            });
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    });
    
  }

  /**
   * Run all accessibility checks
   * @param {string[]} urls - Optional array of URLs to test live accessibility
   * @param {Object} options - Options for testing
   * @param {boolean} options.codeScan - Whether to run code scanning (default: true)
   * @param {boolean} options.liveUrlTest - Whether to run live URL testing (default: false)
   * @param {boolean} options.useAxeCore - Whether to use axe-core for live testing (default: true)
   * @param {boolean} options.useLighthouse - Whether to use Lighthouse for live testing (default: false)
   */
  async runAccessibilityAudit(urls = [], options = {}) {
    const {
      codeScan = true,
      liveUrlTest = false,
      useAxeCore = true,
      useLighthouse = false
    } = options;

    console.log(chalk.blue('♿ Starting Accessibility Audit...'));
    
    // Run code scanning if enabled
    if (codeScan) {
      console.log(chalk.blue('\n📁 Running Code Scanning...'));
      await this.checkImageAccessibility();
      await this.checkHeadingStructure();
      await this.checkFormAccessibility();
      await this.checkColorContrast();
      await this.checkKeyboardNavigation();
      await this.checkARIAUsage();
      await this.checkTabOrderAndFocus();
      await this.checkLandmarksAndSkipLinks();
      await this.checkSemanticHTMLAndARIA();
    }
    
    // Run live URL testing if enabled
    if (liveUrlTest && urls && urls.length > 0) {
      console.log(chalk.blue('\n🌐 Running Live URL Testing...'));
      
      try {
        await this.initBrowser();
        console.log(chalk.green('✅ Browser initialized successfully'));
        
        for (const url of urls) {
          await this.testLiveUrlAccessibility(url);
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ Error during live URL testing: ${error.message}`));
        console.error(chalk.gray('Stack trace:'), error.stack);
      } finally {
        await this.closeBrowser();
      }
    }
    
    // Close the issue stream if it was successfully created
    if (this.issueStream) {
      this.issueStream.end();
    }

    // Use in-memory issues array (which was populated during scanning)
    // Remove duplicates based on a unique key
    const seen = new Set();
    const uniqueIssues = [];
    for (const issue of this.accessibilityIssues) {
      if (!issue.source) issue.source = 'custom';
      const key = `${issue.url || issue.file || ''}:${issue.line || ''}:${issue.type}:${issue.message}`;
      if (!seen.has(key)) {
        uniqueIssues.push(issue);
        seen.add(key);
      }
    }
    this.accessibilityIssues = uniqueIssues;

    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.accessibilityIssues.length,
      highSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'low').length,
      issues: this.accessibilityIssues,
      summary: {
        codeScanIssues: this.accessibilityIssues.filter(issue => issue.source === 'custom').length,
        liveUrlIssues: this.accessibilityIssues.filter(issue => issue.source !== 'custom').length,
        axeCoreIssues: this.accessibilityIssues.filter(issue => issue.source === 'axe-core').length,
        lighthouseIssues: this.accessibilityIssues.filter(issue => issue.source === 'lighthouse').length
      }
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
    console.log(chalk.blue('='.repeat(50)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));
    
    if (liveUrlTest && urls && urls.length > 0) {
      console.log(chalk.blue('\n🌐 LIVE URL TESTING SUMMARY'));
      console.log(chalk.blue('-'.repeat(30)));
      console.log(chalk.white(`URLs Tested: ${urls.length}`));
      console.log(chalk.white(`Code Scan Issues: ${results.summary.codeScanIssues}`));
      console.log(chalk.white(`Live URL Issues: ${results.summary.liveUrlIssues}`));
      if (useAxeCore) {
        console.log(chalk.white(`Axe-Core Issues: ${results.summary.axeCoreIssues}`));
      }
      if (useLighthouse) {
        console.log(chalk.white(`Lighthouse Issues: ${results.summary.lighthouseIssues}`));
      }
    }
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
            issues: this.extractLighthouseIssues(desktopReport),
            coreWebVitals: this.extractCoreWebVitals(desktopReport)
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
            issues: this.extractLighthouseIssues(mobileReport),
            coreWebVitals: this.extractCoreWebVitals(mobileReport)
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
   * Extract Core Web Vitals from Lighthouse report
   */
  extractCoreWebVitals(report) {
    const coreWebVitals = {};
    
    // Extract Core Web Vitals from audits
    const audits = report.audits || {};
    
    // Largest Contentful Paint (LCP)
    const lcpAudit = audits['largest-contentful-paint'];
    if (lcpAudit) {
      coreWebVitals.lcp = {
        score: lcpAudit.score,
        value: lcpAudit.numericValue ? (lcpAudit.numericValue / 1000).toFixed(2) : null,
        unit: 's',
        description: lcpAudit.description,
        displayValue: lcpAudit.displayValue
      };
    }
    
    // First Input Delay (FID) - Note: FID is deprecated, using Total Blocking Time instead
    const tbtAudit = audits['total-blocking-time'];
    if (tbtAudit) {
      coreWebVitals.tbt = {
        score: tbtAudit.score,
        value: tbtAudit.numericValue ? (tbtAudit.numericValue).toFixed(0) : null,
        unit: 'ms',
        description: tbtAudit.description,
        displayValue: tbtAudit.displayValue
      };
    }
    
    // Cumulative Layout Shift (CLS)
    const clsAudit = audits['cumulative-layout-shift'];
    if (clsAudit) {
      coreWebVitals.cls = {
        score: clsAudit.score,
        value: clsAudit.numericValue ? clsAudit.numericValue.toFixed(3) : null,
        unit: '',
        description: clsAudit.description,
        displayValue: clsAudit.displayValue
      };
    }
    
    // First Contentful Paint (FCP)
    const fcpAudit = audits['first-contentful-paint'];
    if (fcpAudit) {
      coreWebVitals.fcp = {
        score: fcpAudit.score,
        value: fcpAudit.numericValue ? (fcpAudit.numericValue / 1000).toFixed(2) : null,
        unit: 's',
        description: fcpAudit.description,
        displayValue: fcpAudit.displayValue
      };
    }
    
    // Interaction to Next Paint (INP) - if available
    const inpAudit = audits['interaction-to-next-paint'];
    if (inpAudit) {
      coreWebVitals.inp = {
        score: inpAudit.score,
        value: inpAudit.numericValue ? (inpAudit.numericValue).toFixed(0) : null,
        unit: 'ms',
        description: inpAudit.description,
        displayValue: inpAudit.displayValue
      };
    }
    
    return coreWebVitals;
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
 * Report Standardizer - Creates industry-standard, lightweight reports
 * Follows SARIF (Static Analysis Results Interchange Format) principles
 * for better tool integration and open source adoption
 */

class ReportStandardizer {
  constructor() {
    this.standardSeverityMap = {
      'critical': 'error',
      'high': 'error', 
      'medium': 'warning',
      'low': 'note',
      'info': 'note'
    };
  }

  /**
   * Create standardized report structure
   */
  createStandardReport(auditResults, options = {}) {
    const {
      projectName = 'Unknown Project',
      projectVersion = '1.0.0',
      auditTimestamp = new Date().toISOString(),
      auditDuration = 0,
      totalFiles = 0,
      totalLines = 0
    } = options;

    return {
      // Metadata
      metadata: {
        tool: 'UI Code Insight',
        version: '2.2.0',
        timestamp: auditTimestamp,
        duration: auditDuration,
        project: {
          name: projectName,
          version: projectVersion,
          files: totalFiles,
          lines: totalLines
        }
      },

      // Executive Summary
      summary: {
        totalIssues: this.calculateTotalIssues(auditResults),
        criticalIssues: this.calculateCriticalIssues(auditResults),
        highIssues: this.calculateHighIssues(auditResults),
        mediumIssues: this.calculateMediumIssues(auditResults),
        lowIssues: this.calculateLowIssues(auditResults),
        scores: this.calculateScores(auditResults),
        recommendations: this.generateTopRecommendations(auditResults)
      },

      // Categorized Results
      categories: {
        security: this.standardizeSecurityResults(auditResults.security),
        performance: this.standardizePerformanceResults(auditResults.performance),
        accessibility: this.standardizeAccessibilityResults(auditResults.accessibility),
        codeQuality: this.standardizeCodeQualityResults(auditResults),
        dependencies: this.standardizeDependencyResults(auditResults.dependency)
      },

      // Actionable Insights
      insights: {
        critical: this.getCriticalInsights(auditResults),
        quickWins: this.getQuickWins(auditResults),
        technicalDebt: this.getTechnicalDebt(auditResults),
        securityRisks: this.getSecurityRisks(auditResults),
        performanceOpportunities: this.getPerformanceOpportunities(auditResults)
      },

      // Compliance & Standards
      compliance: {
        wcag: this.getWCAGCompliance(auditResults),
        security: this.getSecurityCompliance(auditResults),
        performance: this.getPerformanceCompliance(auditResults),
        bestPractices: this.getBestPracticesCompliance(auditResults)
      }
    };
  }

  /**
   * Standardize security audit results
   */
  standardizeSecurityResults(securityData) {
    if (!securityData) return this.getEmptyCategoryResult();

    const issues = this.extractIssues(securityData.issues || []);
    
    return {
      score: this.calculateSecurityScore(securityData),
      totalIssues: securityData.totalIssues || 0,
      criticalIssues: this.countIssuesBySeverity(issues, 'critical'),
      highIssues: this.countIssuesBySeverity(issues, 'high'),
      mediumIssues: this.countIssuesBySeverity(issues, 'medium'),
      lowIssues: this.countIssuesBySeverity(issues, 'low'),
      
      // Categorized security issues
      categories: {
        vulnerabilities: this.filterIssuesByType(issues, 'vulnerability'),
        secrets: this.filterIssuesByType(issues, 'secret'),
        inputValidation: this.filterIssuesByType(issues, 'input-validation'),
        fileUpload: this.filterIssuesByType(issues, 'file-upload'),
        headers: this.filterIssuesByType(issues, 'security-headers')
      },

      // Top security issues (limited to 10 for performance)
      topIssues: this.getTopIssues(issues, 10),
      
      // Security recommendations
      recommendations: this.getSecurityRecommendations(issues)
    };
  }

  /**
   * Standardize performance audit results
   */
  standardizePerformanceResults(performanceData) {
    if (!performanceData) return this.getEmptyCategoryResult();

    const issues = this.extractIssues(performanceData.issues || []);
    
    return {
      score: this.calculatePerformanceScore(performanceData),
      totalIssues: performanceData.totalIssues || 0,
      criticalIssues: this.countIssuesBySeverity(issues, 'critical'),
      highIssues: this.countIssuesBySeverity(issues, 'high'),
      mediumIssues: this.countIssuesBySeverity(issues, 'medium'),
      lowIssues: this.countIssuesBySeverity(issues, 'low'),
      
      // Performance metrics
      metrics: {
        bundleSize: this.extractBundleMetrics(performanceData),
        memoryUsage: this.extractMemoryMetrics(performanceData),
        codeEfficiency: this.extractEfficiencyMetrics(performanceData)
      },

      // Categorized performance issues
      categories: {
        bundleOptimization: this.filterIssuesByType(issues, 'bundle'),
        memoryLeaks: this.filterIssuesByType(issues, 'memory'),
        inefficientCode: this.filterIssuesByType(issues, 'inefficient'),
        assetOptimization: this.filterIssuesByType(issues, 'assets')
      },

      topIssues: this.getTopIssues(issues, 10),
      recommendations: this.getPerformanceRecommendations(issues)
    };
  }

  /**
   * Standardize accessibility audit results
   */
  standardizeAccessibilityResults(accessibilityData) {
    if (!accessibilityData) return this.getEmptyCategoryResult();

    const issues = this.extractIssues(accessibilityData.issues || []);
    
    return {
      score: this.calculateAccessibilityScore(accessibilityData),
      totalIssues: accessibilityData.totalIssues || 0,
      criticalIssues: this.countIssuesBySeverity(issues, 'critical'),
      highIssues: this.countIssuesBySeverity(issues, 'high'),
      mediumIssues: this.countIssuesBySeverity(issues, 'medium'),
      lowIssues: this.countIssuesBySeverity(issues, 'low'),
      
      // WCAG compliance
      wcag: {
        levelA: this.getWCAGLevelCompliance(issues, 'A'),
        levelAA: this.getWCAGLevelCompliance(issues, 'AA'),
        levelAAA: this.getWCAGLevelCompliance(issues, 'AAA')
      },

      // Categorized accessibility issues
      categories: {
        images: this.filterIssuesByType(issues, 'image'),
        headings: this.filterIssuesByType(issues, 'heading'),
        forms: this.filterIssuesByType(issues, 'form'),
        keyboard: this.filterIssuesByType(issues, 'keyboard'),
        color: this.filterIssuesByType(issues, 'color'),
        aria: this.filterIssuesByType(issues, 'aria')
      },

      topIssues: this.getTopIssues(issues, 10),
      recommendations: this.getAccessibilityRecommendations(issues)
    };
  }

  /**
   * Standardize code quality results (ESLint + Stylelint)
   */
  standardizeCodeQualityResults(auditResults) {
    const eslintData = auditResults.eslint || {};
    const stylelintData = auditResults.stylelint || {};
    
    const eslintIssues = this.extractIssues(eslintData.issues || []);
    const stylelintIssues = this.extractIssues(stylelintData.issues || []);
    const allIssues = [...eslintIssues, ...stylelintIssues];

    return {
      score: this.calculateCodeQualityScore(eslintData, stylelintData),
      totalIssues: (eslintData.totalIssues || 0) + (stylelintData.totalIssues || 0),
      criticalIssues: this.countIssuesBySeverity(allIssues, 'critical'),
      highIssues: this.countIssuesBySeverity(allIssues, 'high'),
      mediumIssues: this.countIssuesBySeverity(allIssues, 'medium'),
      lowIssues: this.countIssuesBySeverity(allIssues, 'low'),
      
      // Breakdown by tool
      tools: {
        eslint: {
          totalIssues: eslintData.totalIssues || 0,
          topIssues: this.getTopIssues(eslintIssues, 5)
        },
        stylelint: {
          totalIssues: stylelintData.totalIssues || 0,
          topIssues: this.getTopIssues(stylelintIssues, 5)
        }
      },

      // Categorized code quality issues
      categories: {
        syntax: this.filterIssuesByType(allIssues, 'syntax'),
        style: this.filterIssuesByType(allIssues, 'style'),
        bestPractices: this.filterIssuesByType(allIssues, 'best-practices'),
        potentialBugs: this.filterIssuesByType(allIssues, 'potential-bug')
      },

      topIssues: this.getTopIssues(allIssues, 10),
      recommendations: this.getCodeQualityRecommendations(allIssues)
    };
  }

  /**
   * Standardize dependency audit results
   */
  standardizeDependencyResults(dependencyData) {
    if (!dependencyData) return this.getEmptyCategoryResult();

    const issues = this.extractIssues(dependencyData.issues || []);
    
    return {
      score: this.calculateDependencyScore(dependencyData),
      totalIssues: dependencyData.totalIssues || 0,
      criticalIssues: this.countIssuesBySeverity(issues, 'critical'),
      highIssues: this.countIssuesBySeverity(issues, 'high'),
      mediumIssues: this.countIssuesBySeverity(issues, 'medium'),
      lowIssues: this.countIssuesBySeverity(issues, 'low'),
      
      // Dependency metrics
      metrics: {
        totalDependencies: dependencyData.totalDependencies || 0,
        outdatedDependencies: dependencyData.outdatedDependencies || 0,
        vulnerableDependencies: dependencyData.vulnerableDependencies || 0,
        unusedDependencies: dependencyData.unusedDependencies || 0
      },

      // Categorized dependency issues
      categories: {
        vulnerabilities: this.filterIssuesByType(issues, 'vulnerability'),
        outdated: this.filterIssuesByType(issues, 'outdated'),
        unused: this.filterIssuesByType(issues, 'unused'),
        licenses: this.filterIssuesByType(issues, 'license')
      },

      topIssues: this.getTopIssues(issues, 10),
      recommendations: this.getDependencyRecommendations(issues)
    };
  }

  // Helper methods
  calculateTotalIssues(auditResults) {
    return Object.values(auditResults).reduce((total, category) => {
      return total + (category?.totalIssues || 0);
    }, 0);
  }

  calculateCriticalIssues(auditResults) {
    return Object.values(auditResults).reduce((total, category) => {
      return total + (category?.criticalIssues || 0);
    }, 0);
  }

  calculateHighIssues(auditResults) {
    return Object.values(auditResults).reduce((total, category) => {
      return total + (category?.highIssues || 0);
    }, 0);
  }

  calculateMediumIssues(auditResults) {
    return Object.values(auditResults).reduce((total, category) => {
      return total + (category?.mediumIssues || 0);
    }, 0);
  }

  calculateLowIssues(auditResults) {
    return Object.values(auditResults).reduce((total, category) => {
      return total + (category?.lowIssues || 0);
    }, 0);
  }

  calculateScores(auditResults) {
    return {
      security: this.calculateSecurityScore(auditResults.security),
      performance: this.calculatePerformanceScore(auditResults.performance),
      accessibility: this.calculateAccessibilityScore(auditResults.accessibility),
      codeQuality: this.calculateCodeQualityScore(auditResults.eslint, auditResults.stylelint),
      dependencies: this.calculateDependencyScore(auditResults.dependency),
      overall: this.calculateOverallScore(auditResults)
    };
  }

  calculateSecurityScore(securityData) {
    if (!securityData || !securityData.totalIssues) return 100;
    const criticalWeight = 0.5;
    const highWeight = 0.3;
    const mediumWeight = 0.2;
    
    const criticalPenalty = (securityData.criticalIssues || 0) * criticalWeight;
    const highPenalty = (securityData.highIssues || 0) * highWeight;
    const mediumPenalty = (securityData.mediumIssues || 0) * mediumWeight;
    
    return Math.max(0, 100 - (criticalPenalty + highPenalty + mediumPenalty) * 10);
  }

  calculatePerformanceScore(performanceData) {
    if (!performanceData || !performanceData.totalIssues) return 100;
    const criticalWeight = 0.4;
    const highWeight = 0.4;
    const mediumWeight = 0.2;
    
    const criticalPenalty = (performanceData.criticalIssues || 0) * criticalWeight;
    const highPenalty = (performanceData.highIssues || 0) * highWeight;
    const mediumPenalty = (performanceData.mediumIssues || 0) * mediumWeight;
    
    return Math.max(0, 100 - (criticalPenalty + highPenalty + mediumPenalty) * 8);
  }

  calculateAccessibilityScore(accessibilityData) {
    if (!accessibilityData || !accessibilityData.totalIssues) return 100;
    const criticalWeight = 0.5;
    const highWeight = 0.3;
    const mediumWeight = 0.2;
    
    const criticalPenalty = (accessibilityData.criticalIssues || 0) * criticalWeight;
    const highPenalty = (accessibilityData.highIssues || 0) * highWeight;
    const mediumPenalty = (accessibilityData.mediumIssues || 0) * mediumWeight;
    
    return Math.max(0, 100 - (criticalPenalty + highPenalty + mediumPenalty) * 10);
  }

  calculateCodeQualityScore(eslintData, stylelintData) {
    const eslintIssues = eslintData?.totalIssues || 0;
    const stylelintIssues = stylelintData?.totalIssues || 0;
    const totalIssues = eslintIssues + stylelintIssues;
    
    if (totalIssues === 0) return 100;
    
    // More lenient scoring for code quality issues
    return Math.max(0, 100 - totalIssues * 2);
  }

  calculateDependencyScore(dependencyData) {
    if (!dependencyData || !dependencyData.totalIssues) return 100;
    const criticalWeight = 0.6;
    const highWeight = 0.4;
    
    const criticalPenalty = (dependencyData.criticalIssues || 0) * criticalWeight;
    const highPenalty = (dependencyData.highIssues || 0) * highWeight;
    
    return Math.max(0, 100 - (criticalPenalty + highPenalty) * 15);
  }

  calculateOverallScore(auditResults) {
    const scores = this.calculateScores(auditResults);
    const weights = {
      security: 0.3,
      performance: 0.25,
      accessibility: 0.2,
      codeQuality: 0.15,
      dependencies: 0.1
    };
    
    return Object.entries(weights).reduce((total, [category, weight]) => {
      return total + (scores[category] * weight);
    }, 0);
  }

  extractIssues(issues) {
    if (!Array.isArray(issues)) return [];
    return issues.map(issue => ({
      ...issue,
      severity: this.standardSeverityMap[issue.severity] || issue.severity
    }));
  }

  countIssuesBySeverity(issues, severity) {
    return issues.filter(issue => issue.severity === severity).length;
  }

  filterIssuesByType(issues, type) {
    return issues.filter(issue => issue.type === type);
  }

  getTopIssues(issues, limit = 10) {
    return issues
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, limit);
  }

  getEmptyCategoryResult() {
    return {
      score: 100,
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      categories: {},
      topIssues: [],
      recommendations: []
    };
  }

  // Generate recommendations
  generateTopRecommendations(auditResults) {
    const recommendations = [];
    
    // Security recommendations
    if (auditResults.security?.criticalIssues > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'security',
        message: `Fix ${auditResults.security.criticalIssues} critical security vulnerabilities immediately`,
        impact: 'high'
      });
    }
    
    // Performance recommendations
    if (auditResults.performance?.highIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        message: `Address ${auditResults.performance.highIssues} high-priority performance issues`,
        impact: 'medium'
      });
    }
    
    // Accessibility recommendations
    if (auditResults.accessibility?.criticalIssues > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'accessibility',
        message: `Fix ${auditResults.accessibility.criticalIssues} critical accessibility violations`,
        impact: 'high'
      });
    }
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  getSecurityRecommendations(issues) {
    const recommendations = [];
    
    if (issues.some(i => i.type === 'vulnerability')) {
      recommendations.push('Update vulnerable dependencies immediately');
    }
    
    if (issues.some(i => i.type === 'secret')) {
      recommendations.push('Remove hardcoded secrets and use environment variables');
    }
    
    if (issues.some(i => i.type === 'input-validation')) {
      recommendations.push('Implement proper input validation and sanitization');
    }
    
    return recommendations;
  }

  getPerformanceRecommendations(issues) {
    const recommendations = [];
    
    if (issues.some(i => i.type === 'bundle')) {
      recommendations.push('Optimize bundle size by removing unused code');
    }
    
    if (issues.some(i => i.type === 'memory')) {
      recommendations.push('Fix memory leaks and optimize memory usage');
    }
    
    if (issues.some(i => i.type === 'assets')) {
      recommendations.push('Optimize images and other assets');
    }
    
    return recommendations;
  }

  getAccessibilityRecommendations(issues) {
    const recommendations = [];
    
    if (issues.some(i => i.type === 'image')) {
      recommendations.push('Add alt text to all images');
    }
    
    if (issues.some(i => i.type === 'heading')) {
      recommendations.push('Fix heading structure and hierarchy');
    }
    
    if (issues.some(i => i.type === 'keyboard')) {
      recommendations.push('Ensure keyboard navigation works properly');
    }
    
    return recommendations;
  }

  getCodeQualityRecommendations(issues) {
    const recommendations = [];
    
    if (issues.some(i => i.type === 'syntax')) {
      recommendations.push('Fix syntax errors and code style issues');
    }
    
    if (issues.some(i => i.type === 'best-practices')) {
      recommendations.push('Follow coding best practices and standards');
    }
    
    return recommendations;
  }

  getDependencyRecommendations(issues) {
    const recommendations = [];
    
    if (issues.some(i => i.type === 'vulnerability')) {
      recommendations.push('Update vulnerable dependencies');
    }
    
    if (issues.some(i => i.type === 'outdated')) {
      recommendations.push('Update outdated dependencies');
    }
    
    if (issues.some(i => i.type === 'unused')) {
      recommendations.push('Remove unused dependencies');
    }
    
    return recommendations;
  }

  // Compliance methods
  getWCAGCompliance(auditResults) {
    const accessibilityData = auditResults.accessibility;
    if (!accessibilityData) return { levelA: 0, levelAA: 0, levelAAA: 0 };
    
    return {
      levelA: this.getWCAGLevelCompliance(accessibilityData.issues || [], 'A'),
      levelAA: this.getWCAGLevelCompliance(accessibilityData.issues || [], 'AA'),
      levelAAA: this.getWCAGLevelCompliance(accessibilityData.issues || [], 'AAA')
    };
  }

  getWCAGLevelCompliance(issues, level) {
    const levelIssues = issues.filter(issue => issue.wcag === level);
    const totalIssues = issues.length;
    return totalIssues > 0 ? Math.max(0, 100 - (levelIssues.length / totalIssues) * 100) : 100;
  }

  getSecurityCompliance(auditResults) {
    const securityData = auditResults.security;
    if (!securityData) return { score: 100, status: 'compliant' };
    
    const score = this.calculateSecurityScore(securityData);
    return {
      score,
      status: score >= 80 ? 'compliant' : score >= 60 ? 'needs-improvement' : 'non-compliant'
    };
  }

  getPerformanceCompliance(auditResults) {
    const performanceData = auditResults.performance;
    if (!performanceData) return { score: 100, status: 'compliant' };
    
    const score = this.calculatePerformanceScore(performanceData);
    return {
      score,
      status: score >= 80 ? 'compliant' : score >= 60 ? 'needs-improvement' : 'non-compliant'
    };
  }

  getBestPracticesCompliance(auditResults) {
    const codeQualityData = this.standardizeCodeQualityResults(auditResults);
    const score = codeQualityData.score;
    
    return {
      score,
      status: score >= 80 ? 'compliant' : score >= 60 ? 'needs-improvement' : 'non-compliant'
    };
  }

  // Insights methods
  getCriticalInsights(auditResults) {
    const insights = [];
    
    if (auditResults.security?.criticalIssues > 0) {
      insights.push({
        type: 'security',
        severity: 'critical',
        message: `${auditResults.security.criticalIssues} critical security vulnerabilities detected`,
        action: 'immediate'
      });
    }
    
    if (auditResults.accessibility?.criticalIssues > 0) {
      insights.push({
        type: 'accessibility',
        severity: 'critical',
        message: `${auditResults.accessibility.criticalIssues} critical accessibility violations found`,
        action: 'immediate'
      });
    }
    
    return insights;
  }

  getQuickWins(auditResults) {
    const quickWins = [];
    
    if (auditResults.performance?.lowIssues > 0) {
      quickWins.push({
        type: 'performance',
        message: `${auditResults.performance.lowIssues} low-effort performance improvements available`,
        effort: 'low',
        impact: 'medium'
      });
    }
    
    if (auditResults.dependencies?.unusedDependencies > 0) {
      quickWins.push({
        type: 'dependencies',
        message: `${auditResults.dependencies.unusedDependencies} unused dependencies can be removed`,
        effort: 'low',
        impact: 'low'
      });
    }
    
    return quickWins;
  }

  getTechnicalDebt(auditResults) {
    const debt = [];
    
    const codeQualityIssues = (auditResults.eslint?.totalIssues || 0) + (auditResults.stylelint?.totalIssues || 0);
    if (codeQualityIssues > 0) {
      debt.push({
        type: 'code-quality',
        issues: codeQualityIssues,
        impact: 'maintainability',
        recommendation: 'Address code quality issues to improve maintainability'
      });
    }
    
    return debt;
  }

  getSecurityRisks(auditResults) {
    const risks = [];
    
    if (auditResults.security?.highIssues > 0) {
      risks.push({
        type: 'high-vulnerabilities',
        count: auditResults.security.highIssues,
        impact: 'security',
        recommendation: 'Address high-severity security vulnerabilities'
      });
    }
    
    return risks;
  }

  getPerformanceOpportunities(auditResults) {
    const opportunities = [];
    
    if (auditResults.performance?.highIssues > 0) {
      opportunities.push({
        type: 'performance-optimization',
        count: auditResults.performance.highIssues,
        impact: 'user-experience',
        recommendation: 'Optimize performance for better user experience'
      });
    }
    
    return opportunities;
  }

  // Utility methods for extracting specific metrics
  extractBundleMetrics(performanceData) {
    return {
      totalSize: performanceData.bundleSize?.total || 0,
      jsSize: performanceData.bundleSize?.js || 0,
      cssSize: performanceData.bundleSize?.css || 0,
      optimization: performanceData.bundleSize?.optimization || 0
    };
  }

  extractMemoryMetrics(performanceData) {
    return {
      leaks: performanceData.memoryLeaks?.count || 0,
      usage: performanceData.memoryUsage?.average || 0,
      optimization: performanceData.memoryUsage?.optimization || 0
    };
  }

  extractEfficiencyMetrics(performanceData) {
    return {
      inefficientOperations: performanceData.inefficientOperations?.count || 0,
      blockingCode: performanceData.blockingCode?.count || 0,
      optimization: performanceData.efficiency?.score || 0
    };
  }
}

/**
 * Main audit orchestrator that runs all audit categories
 * Focused on core audit types: Security, Performance, Accessibility, Lighthouse, Dependencies
 */
class AuditOrchestrator {
  constructor(folderPath, lighthouseUrl = null, accessibilityUrls = [], securityUrls = []) {
    this.folderPath = folderPath;
    this.lighthouseUrl = lighthouseUrl;
    this.accessibilityUrls = accessibilityUrls;
    this.securityUrls = securityUrls;
    this.auditResults = {};
  }

  /**
   * Run all audits
   */
  async runAllAudits() {
    console.log(chalk.blue('🚀 Starting Comprehensive Code Audit...\n'));
    
    const startTime = Date.now();
    
    try {
      // Run core audit categories with error handling
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
          dependency: dependencyResults
        }
      };

      // Calculate summary with better error handling
      Object.entries(this.auditResults.categories).forEach(([categoryName, category]) => {
        if (!category) {
          console.warn(chalk.yellow(`⚠️  ${categoryName} audit returned undefined, using fallback values`));
          category = { totalIssues: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0, issues: [] };
        }
        
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
    return await securityAudit.runSecurityAudit(this.securityUrls);
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
   * Run enhanced performance audit
   */
  async runEnhancedPerformanceAudit() {
    console.log(chalk.blue('🚀 Running Enhanced Performance Audit...'));
    const enhancedPerformanceAudit = new EnhancedPerformanceAudit(this.folderPath);
    return await enhancedPerformanceAudit.runEnhancedPerformanceAudit();
  }

  /**
   * Run accessibility audit
   */
  async runAccessibilityAudit() {
    console.log(chalk.blue('♿ Running Accessibility Audit...'));
    const accessibilityAudit = new AccessibilityAudit(this.folderPath);
    
    // If accessibility URLs are provided, run live URL testing
    if (this.accessibilityUrls && this.accessibilityUrls.length > 0) {
      console.log(chalk.blue(`🌐 Live URL testing enabled for ${this.accessibilityUrls.length} URL(s)`));
      return await accessibilityAudit.runAccessibilityAudit(
        this.accessibilityUrls,
        {
          codeScan: true,
          liveUrlTest: true,
          useAxeCore: true,
          useLighthouse: false
        }
      );
    } else {
      // Run code scanning only
      return await accessibilityAudit.runAccessibilityAudit();
    }
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
    console.log(chalk.blue('\n📊 Generating Standardized Audit Report...'));
    
    try {
      // Use the new ReportStandardizer to create industry-standard reports
      const standardizer = new ReportStandardizer();
      
      // Get project information
      const projectInfo = this.getProjectInfo();
      
      const standardizedReport = standardizer.createStandardReport(
        this.auditResults.categories,
        {
          projectName: projectInfo.name,
          projectVersion: projectInfo.version,
          auditTimestamp: this.auditResults.timestamp,
          auditDuration: this.auditResults.duration,
          totalFiles: this.auditResults.quickStats?.totalFiles || 0,
          totalLines: this.auditResults.quickStats?.totalLines || 0
        }
      );

      // Save the standardized report
      const standardizedReportPath = path.join(this.folderPath, 'standardized-report.json');
      await writeFile(standardizedReportPath, JSON.stringify(standardizedReport, null, 2));
      
      // Also save the legacy format for backward compatibility
      const legacyReport = this.createOptimizedReport();
      const legacyReportPath = path.join(this.folderPath, 'comprehensive-audit-report.json');
      await writeFile(legacyReportPath, JSON.stringify(legacyReport, null, 2));
      
      console.log(chalk.green('✅ Standardized audit report generated successfully!'));
      console.log(chalk.blue('📊 New standardized format: standardized-report.json'));
      console.log(chalk.blue('📊 Legacy format: comprehensive-audit-report.json'));
      console.log(chalk.gray(`📊 Report size optimized: ${this.getReportSize(standardizedReport)}`));
    } catch (error) {
      console.error(chalk.red('Error saving audit report:', error.message));
    }
  }

  /**
   * Get project information for the report
   */
  getProjectInfo() {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return {
          name: packageJson.name || 'Unknown Project',
          version: packageJson.version || '1.0.0'
        };
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not read package.json:', error.message));
    }
    
    return {
      name: 'Unknown Project',
      version: '1.0.0'
    };
  }

  /**
   * Create optimized report with only essential dashboard data
   */
  createOptimizedReport() {
    const { summary, categories } = this.auditResults;
    
    // Calculate dashboard-specific metrics
    const dashboardMetrics = this.calculateDashboardMetrics();
    
    return {
      timestamp: this.auditResults.timestamp,
      duration: this.auditResults.duration,
      
      // Essential summary for dashboard overview
      summary: {
        totalIssues: summary.totalIssues,
        highSeverity: summary.highSeverity,
        mediumSeverity: summary.mediumSeverity,
        lowSeverity: summary.lowSeverity
      },
      
      // Dashboard-specific metrics for score calculations
      dashboard: {
        securityScore: dashboardMetrics.securityScore,
        codePerformanceScore: dashboardMetrics.codePerformanceScore,
        runtimePerformanceScore: dashboardMetrics.runtimePerformanceScore,
        accessibilityScore: dashboardMetrics.accessibilityScore,
        totalFiles: dashboardMetrics.totalFiles,
        totalLines: dashboardMetrics.totalLines
      },
      
      // Category summaries (no detailed issues - use standalone reports)
      categories: {
        security: {
          totalIssues: categories.security?.totalIssues || 0,
          highSeverity: categories.security?.highSeverity || 0,
          mediumSeverity: categories.security?.mediumSeverity || 0,
          lowSeverity: categories.security?.lowSeverity || 0,
          score: dashboardMetrics.securityScore
        },
        performance: {
          totalIssues: categories.performance?.totalIssues || 0,
          highSeverity: categories.performance?.highSeverity || 0,
          mediumSeverity: categories.performance?.mediumSeverity || 0,
          lowSeverity: categories.performance?.lowSeverity || 0,
          score: dashboardMetrics.codePerformanceScore
        },
        accessibility: {
          totalIssues: categories.accessibility?.totalIssues || 0,
          highSeverity: categories.accessibility?.highSeverity || 0,
          mediumSeverity: categories.accessibility?.mediumSeverity || 0,
          lowSeverity: categories.accessibility?.lowSeverity || 0,
          score: dashboardMetrics.accessibilityScore
        },
        lighthouse: {
          totalIssues: categories.lighthouse?.totalIssues || 0,
          performance: categories.lighthouse?.performance || 0,
          accessibility: categories.lighthouse?.accessibility || 0,
          bestPractices: categories.lighthouse?.bestPractices || 0,
          seo: categories.lighthouse?.seo || 0,
          score: dashboardMetrics.runtimePerformanceScore
        },
        dependency: {
          totalIssues: categories.dependency?.totalIssues || 0,
          highSeverity: categories.dependency?.highSeverity || 0,
          mediumSeverity: categories.dependency?.mediumSeverity || 0,
          lowSeverity: categories.dependency?.lowSeverity || 0
        }
      },
      
      // Quick stats for dashboard header
      quickStats: {
        totalFiles: dashboardMetrics.totalFiles,
        totalLines: dashboardMetrics.totalLines,
        auditTime: Math.round(this.auditResults.duration / 1000),
        coverage: dashboardMetrics.coverage
      },
      
      // Chart data for dashboard visualizations
      charts: {
        issuesByCategory: {
          eslint: dashboardMetrics.eslintIssues,
          stylelint: dashboardMetrics.stylelintIssues,
          security: categories.security?.totalIssues || 0,
          performance: categories.performance?.totalIssues || 0,
          accessibility: categories.accessibility?.totalIssues || 0
        },
        issuesBySeverity: {
          critical: summary.highSeverity,
          high: summary.mediumSeverity,
          medium: summary.lowSeverity,
          low: Math.max(0, summary.totalIssues - summary.highSeverity - summary.mediumSeverity - summary.lowSeverity)
        }
      }
    };
  }

  /**
   * Calculate dashboard-specific metrics
   */
  calculateDashboardMetrics() {
    const { categories } = this.auditResults;
    
    // Calculate security score
    let securityScore = 100;
    if (categories.security) {
      const securityIssues = categories.security.totalIssues || 0;
      const highVulns = categories.security.highSeverity || 0;
      const criticalVulns = 0; // Assuming no critical vulnerabilities in summary
      securityScore = Math.max(0, 100 - (criticalVulns * 20) - (highVulns * 10) - (securityIssues * 2));
    }
    
    // Calculate code performance score (placeholder - will be calculated from individual reports)
    let codePerformanceScore = 100;
    if (categories.performance) {
      const performanceIssues = categories.performance.totalIssues || 0;
      const highSeverityIssues = categories.performance.highSeverity || 0;
      codePerformanceScore = Math.max(0, 100 - (highSeverityIssues * 10) - (performanceIssues * 3));
    }
    
    // Get runtime performance from Lighthouse
    let runtimePerformanceScore = 100;
    if (categories.lighthouse && categories.lighthouse.performance) {
      runtimePerformanceScore = categories.lighthouse.performance;
    }
    
    // Calculate accessibility score
    let accessibilityScore = 100;
    if (categories.accessibility) {
      const accessibilityIssues = categories.accessibility.totalIssues || 0;
      const highSeverityIssues = categories.accessibility.highSeverity || 0;
      accessibilityScore = Math.max(0, 100 - (highSeverityIssues * 10) - (accessibilityIssues * 3));
    }
    
    // Estimate file and line counts (these would be better calculated during actual file processing)
    const totalFiles = 1000; // Placeholder - should be calculated during audit
    const totalLines = 50000; // Placeholder - should be calculated during audit
    const coverage = 95; // Placeholder - should be calculated based on actual coverage
    
    // Placeholder values for chart data (will be calculated from individual reports)
    const eslintIssues = 0;
    const stylelintIssues = 0;
    
    return {
      securityScore: Math.round(securityScore),
      codePerformanceScore: Math.round(codePerformanceScore),
      runtimePerformanceScore: Math.round(runtimePerformanceScore),
      accessibilityScore: Math.round(accessibilityScore),
      totalFiles,
      totalLines,
      coverage,
      eslintIssues,
      stylelintIssues
    };
  }

  /**
   * Get report size for optimization feedback
   */
  getReportSize(report) {
    const size = JSON.stringify(report).length;
    if (size < 1024) {
      return `${size} bytes`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
      
      // Handle undefined results
      if (!results) {
        console.log(chalk.white(`${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}:`));
        console.log(chalk.white(`   Total: 0 | High: 0 | Medium: 0 | Low: 0`));
        return;
      }
      
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
    if (categories.accessibility && categories.accessibility.highSeverity > 0) {
      console.log(chalk.blue('♿ Accessibility: Fix missing alt attributes and form labels'));
    }
    
    // Lighthouse recommendations
    if (categories.lighthouse && categories.lighthouse.totalIssues > 0) {
      console.log(chalk.magenta('🚀 Lighthouse: Optimize your website for better performance and accessibility'));
    }
    
    // Dependency recommendations
    if (categories.dependency && categories.dependency.highSeverity > 0) {
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
  
  // Copy dashboard files
  const sourcePath = path.join(__dirname, dist, "index.html");
  const targetPath = path.join(folderPath, "index.html");
  copyFile(sourcePath, targetPath);
  
  const mainJsSourcePath = path.join(__dirname, dist, "bundle.js");
  const mainJsTargetPath = path.join(folderPath, "bundle.js");
  copyFile(mainJsSourcePath, mainJsTargetPath);
  
  const mainCssSourcePath = path.join(__dirname, dist, "bundle.css");
  const mainCssTargetPath = path.join(folderPath, "bundle.css");
  copyFile(mainCssSourcePath, mainCssTargetPath);
  
  // Copy config file if it exists
  const configSourcePath = path.join(process.cwd(), "ui-code-insight.config.json");
  const configTargetPath = path.join(folderPath, "ui-code-insight.config.json");
  
  if (fs.existsSync(configSourcePath)) {
    try {
      copyFile(configSourcePath, configTargetPath);
      console.log(chalk.green("✅ Config file copied to report folder"));
    } catch (error) {
      console.warn(chalk.yellow("⚠️  Could not copy config file:", error.message));
    }
  } else {
    console.log(chalk.blue("ℹ️  No config file found to copy"));
  }
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
const ESLINTRC_JS$1 = ".eslintrc.js";
const ESLINTRC_YML$1 = ".eslintrc.yml";
const ESLINTRC$1 = ".eslintrc";
const ESLINTRC_REACT$1 = "eslintrc.react.json";
const ESLINTRC_NODE$1 = "eslintrc.node.json";
const ESLINTRC_VANILLA$1 = "eslintrc.vanilla.json";
const ESLINTRC_TS$1 = "eslintrc.typescript.json";
const ESLINTRC_TSREACT$1 = "eslintrc.tsreact.json";

/**
 * Function to determine ESLint configuration file path
 * @param {boolean} recommendedLintRules
 * @param {string} projectType
 * @returns {string} lintConfigFile
 */
const getLintConfigFile$1 = (recommendedLintRules, projectType = '') => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let configFileName = 'eslintrc.simple.json'; // Default to simple config

  if (projectType.toLowerCase() === 'react') {
    configFileName = ESLINTRC_REACT$1;
  } else if (projectType.toLowerCase() === 'node') {
    configFileName = ESLINTRC_NODE$1;
  } else if (projectType.toLowerCase() === 'vanilla') {
    configFileName = ESLINTRC_VANILLA$1;
  } else if (projectType.toLowerCase() === 'typescript') {
    configFileName = ESLINTRC_TS$1;
  } else if (projectType.toLowerCase() === 'typescript + react' || projectType.toLowerCase() === 'tsreact') {
    configFileName = ESLINTRC_TSREACT$1;
  }

  const configFilePath = path.join(__dirname, CONFIG_FOLDER$1, configFileName);
  
  // Check if the target config exists, otherwise fallback to simple config
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // Fallback to simple config to avoid module resolution issues
  const simpleConfigPath = path.join(__dirname, CONFIG_FOLDER$1, 'eslintrc.simple.json');
  if (fs.existsSync(simpleConfigPath)) {
    console.log(chalk.yellow(`⚠️  Using simplified ESLint config to avoid module resolution issues`));
    return simpleConfigPath;
  }

  // Final fallback to default logic
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
    ESLINTRC$1,
    ESLINTRC_JS$1,
    ESLINTRC_YML$1,
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

    // Check if messages array exists and has content
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.warn(chalk.yellow(`⚠️  No lint results for ${filePath}`));
      return {
        filePath,
        errorCount: 0,
        warningCount: 0,
        messages: [],
      };
    }

    const firstMessage = messages[0];
    
    // Check if the message object has the expected properties
    if (!firstMessage || typeof firstMessage !== 'object') {
      console.warn(chalk.yellow(`⚠️  Invalid lint result for ${filePath}`));
      return {
        filePath,
        errorCount: 0,
        warningCount: 0,
        messages: [],
      };
    }

    return {
      filePath,
      errorCount: firstMessage.errorCount || 0,
      warningCount: firstMessage.warningCount || 0,
      messages: firstMessage.messages || [],
    };
  } catch (err) {
    console.error(chalk.red(`❌ Error processing file ${filePath}: ${err.message}`));
    return {
      filePath,
      errorCount: 0,
      warningCount: 0,
      messages: [],
      error: err.message
    };
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
  let errorCount = 0;
  
  for (let i = 0; i < files.length; i += BATCH_SIZE$1) {
    const batch = files.slice(i, i + BATCH_SIZE$1);
    
    try {
      const batchResults = await Promise.all(batch.map(async (filePath) => {
        processed++;
        process.stdout.write(`\r[ESLint] Progress: ${processed}/${files.length} files checked`);
        
        try {
          return await lintFile$1(filePath, eslint);
        } catch (fileError) {
          errorCount++;
          console.error(chalk.red(`❌ Error processing file ${filePath}: ${fileError.message}`));
          return {
            filePath,
            errorCount: 0,
            warningCount: 0,
            messages: [],
            error: fileError.message
          };
        }
      }));
      
      // Filter out null results and add valid ones
      const validResults = batchResults.filter(result => result !== null && result !== undefined);
      results.push(...validResults);
      
    } catch (batchError) {
      console.error(chalk.red(`❌ Error processing batch ${Math.floor(i / BATCH_SIZE$1) + 1}: ${batchError.message}`));
      errorCount += batch.length;
    }
  }
  
  if (errorCount > 0) {
    console.log(chalk.yellow(`⚠️  ${errorCount} files had processing errors`));
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
      .filter(result => result !== null && result !== undefined) // Filter out null/undefined results
      .map((result) => {
        // Ensure result has the expected structure
        if (!result || typeof result !== 'object') {
          console.warn(chalk.yellow(`⚠️  Skipping invalid result for file: ${result?.filePath || 'unknown'}`));
          return null;
        }

        // Ensure messages array exists
        const messages = result.messages || [];
        if (!Array.isArray(messages)) {
          console.warn(chalk.yellow(`⚠️  Invalid messages array for file: ${result.filePath}`));
          return {
            filePath: result.filePath,
            errorCount: 0,
            warningCount: 0,
            messages: [],
          };
        }

        let filteredMessages = messages
          .filter(message => message && !excludeRules.includes(message.ruleId))
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
        if ((result.errorCount > 0) && (!filteredMessages || filteredMessages.length === 0)) {
          return null;
        }

        return {
          filePath: result.filePath,
          errorCount: filteredMessages.length,
          warningCount: 0,
          messages: filteredMessages,
        };
      })
      .filter(Boolean), // Remove null results
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
  try {
    const lintConfigFile = getLintConfigFile$1(recommendedLintRules, projectType);
    if (!lintConfigFile) {
      throw new Error(".eslintrc file is missing");
    }

    console.log(chalk.blue(`Using ESLint config: ${lintConfigFile}`));

    let eslint;
    try {
      eslint = new ESLint({
        useEslintrc: false,
        overrideConfigFile: lintConfigFile,
        // Add error handling for module resolution
        errorOnUnmatchedPattern: false,
        allowInlineConfig: false,
      });
    } catch (error) {
      console.error(chalk.red(`❌ ESLint initialization error: ${error.message}`));
      console.log(chalk.yellow(`🔄 Trying with simplified configuration...`));
      
      // Try with simplified config
      const simpleConfigPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'config', 'eslintrc.simple.json');
      eslint = new ESLint({
        useEslintrc: false,
        overrideConfigFile: simpleConfigPath,
        errorOnUnmatchedPattern: false,
        allowInlineConfig: false,
      });
    }

    const files = await globby(getConfigPattern('jsFilePathPattern'));
    console.log(chalk.blue(`📁 ESLint scanning ${files.length} files with pattern: ${getConfigPattern('jsFilePathPattern').join(', ')}`));
    
    await lintAllFiles$1(files, folderPath, eslint, projectType, reports);
    
    console.log(chalk.green(`✅ ESLint report generated successfully`));
    
  } catch (error) {
    console.error(chalk.red(`❌ Error during ESLint report generation: ${error.message}`));
    
    // Create a minimal error report
    const errorReport = {
      projectType,
      reports,
      error: error.message,
      results: [],
      excludeRules: {
        enabled: false,
        rules: [],
        count: 0
      }
    };
    
    try {
      await writeFile(
        path.join(folderPath, "eslint-report.json"),
        JSON.stringify(errorReport, null, 2)
      );
      console.log(chalk.yellow(`⚠️  Created error report with minimal data`));
    } catch (writeError) {
      console.error(chalk.red(`❌ Failed to write error report: ${writeError.message}`));
    }
    
    throw error; // Re-throw to maintain error handling in calling code
  }

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

// Default Stylelint rules to exclude (minimal list - only user-requested exclusions)
const DEFAULT_STYLELINT_EXCLUDE_RULES = [
  // User-requested exclusions only
  'scss/double-slash-comment-empty-line-before',
  'scss/load-partial-extension',
  'declaration-empty-line-before',
  'color-function-notation',
  'selector-max-universal'
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
  // Fix path resolution for build directory
  const baseDir = __dirname.includes('build') ? path.join(__dirname, 'config') : path.join(__dirname, CONFIG_FOLDER);
  const recommendedLintRulesConfigFile = path.join(
    baseDir,
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
  console.error(chalk.red(`[Stylelint] Error reading file ${filePath}: ${error.message}`));
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
    // Log specific error types for better debugging
    if (err.code === 'ENOENT') {
      console.error(chalk.red(`[Stylelint] File not found: ${filePath}`));
    } else if (err.code === 'EACCES') {
      console.error(chalk.red(`[Stylelint] Permission denied: ${filePath}`));
    } else if (err.code === 'EISDIR') {
      console.error(chalk.red(`[Stylelint] Path is directory, not file: ${filePath}`));
    } else {
      console.error(chalk.red(`[Stylelint] Unexpected error reading ${filePath}: ${err.message}`));
    }
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

  // Filter out null results (files that couldn't be read) and filter messages based on exclude rules
  const filteredResults = results
    .filter(result => result !== null) // Remove null results from file read errors
    .map(result => {
      // Filter out messages for rules that are in the exclude list
      const filteredMessages = result.messages.filter(message => {
        // Don't filter out "Unknown rule" errors as they indicate configuration issues
        if (message.message && message.message.includes('Unknown rule')) {
          return true;
        }
        return !excludeRules.includes(message.rule);
      });
      
      // Count errors and warnings separately
      const actualErrors = filteredMessages.filter(msg => msg.severity === 'error').length;
      const actualWarnings = filteredMessages.filter(msg => msg.severity === 'warning').length;
      
      // Log if there's a mismatch between error count and message count
      if (result.errorCount > 0 && actualErrors === 0 && actualWarnings === 0) {
        console.log(`[Stylelint Warning] ${result.filePath}: Error count (${result.errorCount}) doesn't match message count (${filteredMessages.length})`);
      }
      
      return {
        ...result,
        errorCount: actualErrors,
        warningCount: actualWarnings,
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

  // Validate files before processing
  const validFiles = files.filter(filePath => {
    try {
      // Check if file exists and is readable
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        console.log(`[Stylelint] Skipping non-file: ${filePath}`);
        return false;
      }
      
      // Check if file has valid CSS/SCSS extension
      const ext = path.extname(filePath).toLowerCase();
      const validExtensions = ['.css', '.scss', '.sass', '.less'];
      if (!validExtensions.includes(ext)) {
        console.log(`[Stylelint] Skipping non-CSS file: ${filePath}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.log(`[Stylelint] Skipping inaccessible file: ${filePath} (${error.message})`);
      return false;
    }
  });

  console.log(`[Stylelint] Found ${files.length} files, ${validFiles.length} are valid for processing`);

  await lintAllFiles(validFiles, folderPath, lintStyleConfigFile, projectType, reports);
};

/**
 * Enhanced configuration system for UI Code Insight
 * Provides better defaults, validation, and customization options
 */
class EnhancedConfig {
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

/**
 * Enhanced error handling system for UI Code Insight
 * Provides graceful degradation, retry mechanisms, and detailed error reporting
 */
class ErrorHandler {
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

/**
 * CI/CD Integration system for UI Code Insight
 * Supports GitHub Actions, GitLab CI, and Jenkins
 */
class CIIntegration {
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

/**
 * Main function to initialize code insight tool
 * Focused on core audit types: Security, Performance, Accessibility, Lighthouse, Dependencies
 */
async function codeInsightInit(options = {}) {
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
  new EnhancedConfig();
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
async function initConfig() {
  const config = new EnhancedConfig();
  return config.initConfig();
}

/**
 * Create configuration wizard
 */
async function createConfigWizard() {
  const config = new EnhancedConfig();
  return await config.createConfigWizard();
}

/**
 * Generate CI/CD configurations
 */
function generateCIConfigs() {
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
function validateConfig() {
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

export { codeInsightInit, createConfigWizard, generateCIConfigs, initConfig, validateConfig };
