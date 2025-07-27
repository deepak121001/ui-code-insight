// Centralized file patterns for all audits
// This is the single source of truth for all file patterns used across the audit system

// Default patterns - defined here to avoid circular dependency
export const defaultJsFilePathPattern = [
  '**/*.{js,ts,jsx,tsx}',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/coverage/**',
  '!**/report/**',
  '!**/*.min.js',
  '!**/tools/**'
];

export const defaultHtmlFilePathPattern = [
  '**/*.{html,htm}',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/coverage/**',
  '!**/report/**',
  '!**/tools/**'
];

export const defaultScssFilePathPattern = [
  '**/*.{css,scss,sass,less}',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/coverage/**',
  '!**/report/**',
  '!**/tools/**'
];

// ============================================================================
// CORE FILE PATTERNS
// ============================================================================

/**
 * Get JavaScript/TypeScript file patterns
 * Used by: ESLint, Security, Performance, Testing, Accessibility audits
 */
export function getJavaScriptPatterns() {
  return defaultJsFilePathPattern;
}

/**
 * Get HTML file patterns
 * Used by: Security, Accessibility audits
 */
export function getHtmlPatterns() {
  return defaultHtmlFilePathPattern;
}

/**
 * Get Stylesheet file patterns
 * Used by: Stylelint, Performance, Accessibility audits
 */
export function getStylesheetPatterns() {
  return defaultScssFilePathPattern;
}

/**
 * Get Asset file patterns
 * Used by: Performance audit
 */
export function getAssetPatterns() {
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

/**
 * Get Configuration file patterns
 * Used by: Dependency audit
 */
export function getConfigPatterns() {
  return [
    '**/*.{json,yml,yaml,config.js}',
    '!**/node_modules/**',
    '!**/report/**',
    '!build/**',
    '!dist/**',
    '!coverage/**',
    '!.git/**',
    '!**/package-lock.json',
    '!**/yarn.lock'
  ];
}

/**
 * Get Documentation file patterns
 * Used by: Documentation audit (future)
 */
export function getDocumentationPatterns() {
  return [
    '**/*.{md,mdx,txt}',
    '!**/node_modules/**',
    '!**/report/**',
    '!build/**',
    '!dist/**',
    '!coverage/**',
    '!.git/**'
  ];
}

// ============================================================================
// AUDIT-SPECIFIC PATTERN COMBINATIONS
// ============================================================================

/**
 * Get patterns for ESLint audit
 * Uses: JavaScript patterns only
 */
export function getESLintPatterns() {
  return getJavaScriptPatterns();
}

/**
 * Get patterns for Stylelint audit
 * Uses: Stylesheet patterns only
 */
export function getStylelintPatterns() {
  return getStylesheetPatterns();
}

/**
 * Get patterns for Security audit
 * Uses: JavaScript + HTML patterns
 */
export function getSecurityPatterns() {
  return [...getJavaScriptPatterns(), ...getHtmlPatterns()];
}

/**
 * Get patterns for Performance audit
 * Uses: JavaScript + Stylesheet + Asset patterns
 */
export function getPerformancePatterns() {
  return [...getJavaScriptPatterns(), ...getStylesheetPatterns(), ...getAssetPatterns()];
}

/**
 * Get patterns for Accessibility audit
 * Uses: JavaScript + HTML + Stylesheet patterns
 */
export function getAccessibilityPatterns() {
  return [...getJavaScriptPatterns(), ...getHtmlPatterns(), ...getStylesheetPatterns()];
}

/**
 * Get patterns for Testing audit
 * Uses: JavaScript patterns only
 */
export function getTestingPatterns() {
  return getJavaScriptPatterns();
}

/**
 * Get patterns for Dependency audit
 * Uses: Configuration patterns only
 */
export function getDependencyPatterns() {
  return getConfigPatterns();
}

/**
 * Get patterns for Lighthouse audit
 * Uses: No file patterns (live URL testing only)
 */
export function getLighthousePatterns() {
  return [];
}

// ============================================================================
// SPECIALIZED PATTERNS
// ============================================================================

/**
 * Get test file patterns
 * Used by: Testing audit to identify test files
 */
export function getTestFilePatterns() {
  return [
    '**/__tests__/**',
    '**/test/**',
    '**/tests/**',
    '**/*.test.js',
    '**/*.spec.js',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/*.test.tsx',
    '**/*.spec.tsx',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/out/**'
  ];
}

/**
 * Get package.json patterns
 * Used by: Dependency audit
 */
export function getPackageJsonPatterns() {
  return [
    '**/package.json',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**'
  ];
}

/**
 * Get lock file patterns
 * Used by: Dependency audit
 */
export function getLockFilePatterns() {
  return [
    '**/package-lock.json',
    '**/yarn.lock',
    '**/pnpm-lock.yaml',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**'
  ];
}

// ============================================================================
// COMMON EXCLUSION PATTERNS
// ============================================================================

/**
 * Get common exclusion patterns for all audits
 */
export function getCommonExclusions() {
  return [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/coverage/**',
    '**/.git/**',
    '**/report/**',
    '**/tools/**',
    '**/*.min.js',
    '**/*.min.css',
    '**/webpack.config.js',
    '**/webpack.*.js',
    '**/webpack.config.*.js'
  ];
}

/**
 * Get exclusion patterns for development files
 */
export function getDevelopmentExclusions() {
  return [
    '**/.storybook/**',
    '**/storybook/**',
    '**/cypress/**',
    '**/__mocks__/**',
    '**/__dropins__/**',
    '**/bin/**'
  ];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get patterns for a specific audit type
 * @param {string} auditType - The audit type (eslint, stylelint, security, etc.)
 * @returns {string[]} Array of file patterns
 */
export function getAuditPatterns(auditType) {
  const patternMap = {
    'eslint': getESLintPatterns,
    'stylelint': getStylelintPatterns,
    'security': getSecurityPatterns,
    'performance': getPerformancePatterns,
    'accessibility': getAccessibilityPatterns,
    'testing': getTestingPatterns,
    'dependency': getDependencyPatterns,
    'lighthouse': getLighthousePatterns
  };

  const patternFunction = patternMap[auditType];
  return patternFunction ? patternFunction() : [];
}

/**
 * Get all patterns for multiple audit types
 * @param {string[]} auditTypes - Array of audit types
 * @returns {string[]} Combined array of file patterns
 */
export function getMultiAuditPatterns(auditTypes) {
  const allPatterns = new Set();
  
  auditTypes.forEach(auditType => {
    const patterns = getAuditPatterns(auditType);
    patterns.forEach(pattern => allPatterns.add(pattern));
  });
  
  return Array.from(allPatterns);
}

/**
 * Get patterns with custom exclusions
 * @param {string[]} basePatterns - Base file patterns
 * @param {string[]} additionalExclusions - Additional exclusion patterns
 * @returns {string[]} Patterns with exclusions
 */
export function getPatternsWithExclusions(basePatterns, additionalExclusions = []) {
  const exclusions = [...getCommonExclusions(), ...additionalExclusions];
  return [...basePatterns, ...exclusions.map(exclusion => `!${exclusion}`)];
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

// Legacy exports for backward compatibility
export const assetGlobs = getAssetPatterns();

// Legacy function names for backward compatibility
export function getJsFilePathPattern() {
  return getJavaScriptPatterns();
}

export function getHtmlFilePathPattern() {
  return getHtmlPatterns();
}

export function getScssFilePathPattern() {
  return getStylesheetPatterns();
}

// ============================================================================
// PATTERN VALIDATION
// ============================================================================

/**
 * Validate file patterns
 * @param {string[]} patterns - Array of file patterns to validate
 * @returns {boolean} True if patterns are valid
 */
export function validatePatterns(patterns) {
  if (!Array.isArray(patterns)) {
    return false;
  }
  
  return patterns.every(pattern => {
    if (typeof pattern !== 'string') {
      return false;
    }
    
    // Basic validation for glob patterns
    if (pattern.includes('**') && !pattern.includes('*')) {
      return false;
    }
    
    return true;
  });
}

/**
 * Get pattern statistics
 * @param {string[]} patterns - Array of file patterns
 * @returns {Object} Statistics about the patterns
 */
export function getPatternStats(patterns) {
  const stats = {
    total: patterns.length,
    includes: patterns.filter(p => !p.startsWith('!')).length,
    excludes: patterns.filter(p => p.startsWith('!')).length,
    extensions: new Set(),
    directories: new Set()
  };
  
  patterns.forEach(pattern => {
    // Extract file extensions
    const extMatch = pattern.match(/\{([^}]+)\}/);
    if (extMatch) {
      extMatch[1].split(',').forEach(ext => {
        stats.extensions.add(ext.trim());
      });
    }
    
    // Extract directories
    const dirMatch = pattern.match(/\*\*\/([^\/\*]+)\/\*\*/);
    if (dirMatch) {
      stats.directories.add(dirMatch[1]);
    }
  });
  
  stats.extensions = Array.from(stats.extensions);
  stats.directories = Array.from(stats.directories);
  
  return stats;
} 