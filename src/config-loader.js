import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { IgnoreHandler } from './utils/ignore-handler.js';

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

export function getConfigPattern(key) {
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

export function getExcludeRules(auditType) {
  const config = loadConfig();
  const excludeConfig = config.excludeRules || {};
  const auditConfig = excludeConfig[auditType] || {};
  
  return {
    enabled: auditConfig.enabled !== false, // Default to true
    overrideDefault: auditConfig.overrideDefault === true,
    additionalRules: auditConfig.additionalRules || []
  };
}

export function getMergedExcludeRules(auditType, defaultRules) {
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

export function getConfig() {
  return loadConfig();
}

export function getConfigSearchPaths() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  return [
    path.resolve(process.cwd(), 'ui-code-insight.config.json'),
    path.resolve(__dirname, '..', '..', 'ui-code-insight.config.json'),
    path.resolve(__dirname, '..', 'ui-code-insight.config.json'),
    path.resolve(__dirname, 'ui-code-insight.config.json')
  ];
}

export function printConfigHelp() {
  console.log('\n📋 ui-code-insight Configuration Help:');
  console.log('=====================================');
  console.log('The tool searches for ui-code-insight.config.json in the following order:');
  console.log('1. Project root (where you run the audit)');
  console.log('2. Package directory (where the tool is installed)');
  console.log('3. Default settings (if no config found)');
  console.log('\n💡 To create a config file, add ui-code-insight.config.json to your project root.');
  console.log('📖 See the documentation for configuration options.\n');
} 