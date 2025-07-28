import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ignore file handler for UI Code Insight
 * Reads and parses .ui-code-insight-ignore files
 */
export class IgnoreHandler {
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