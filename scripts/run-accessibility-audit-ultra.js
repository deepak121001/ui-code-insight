#!/usr/bin/env node

/**
 * Ultra-aggressive accessibility audit script for very large projects
 * Uses maximum memory optimization settings
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { AccessibilityAudit } from '../src/audits/accessibility-audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const urls = [];
const options = {
  codeScan: true,
  liveUrlTest: false,
  useAxeCore: true,
  useLighthouse: false,
  batchSize: 250, // Ultra-small batch size
  memoryLimit: 0.5 // 50% memory threshold
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--urls' && args[i + 1]) {
    urls.push(...args[i + 1].split(','));
    i++;
  } else if (arg === '--live-url-test') {
    options.liveUrlTest = true;
  } else if (arg === '--no-code-scan') {
    options.codeScan = false;
  } else if (arg === '--batch-size' && args[i + 1]) {
    options.batchSize = parseInt(args[i + 1]);
    i++;
  } else if (arg === '--memory-limit' && args[i + 1]) {
    options.memoryLimit = parseFloat(args[i + 1]);
    i++;
  } else if (arg === '--help') {
    console.log(`
Ultra-Aggressive Accessibility Audit Script

Usage: node scripts/run-accessibility-audit-ultra.js [options]

Options:
  --urls <urls>              Comma-separated list of URLs to test
  --live-url-test            Enable live URL testing
  --no-code-scan            Disable code scanning
  --batch-size <number>      Files per batch (default: 250)
  --memory-limit <number>    Memory threshold 0.0-1.0 (default: 0.5)
  --help                     Show this help

Examples:
  # Ultra-aggressive settings for very large projects
  node scripts/run-accessibility-audit-ultra.js --batch-size 100 --memory-limit 0.4

  # Live URL testing only
  node scripts/run-accessibility-audit-ultra.js --live-url-test --no-code-scan --urls "https://example.com"

Memory Settings:
  - Heap Limit: 16GB
  - Batch Size: 250 files (configurable)
  - Memory Threshold: 50% (configurable)
  - Force GC: Every 25 files
  - In-Memory Issues: 2500 max
`);
    process.exit(0);
  }
}

// Set ultra-aggressive environment variables
process.env.NODE_ENV = 'production';
process.env.ACCESSIBILITY_BATCH_SIZE = options.batchSize.toString();
process.env.ACCESSIBILITY_MEMORY_THRESHOLD = options.memoryLimit.toString();

console.log(chalk.blue('♿ Starting Ultra-Aggressive Accessibility Audit...'));
console.log(chalk.gray('Memory Settings:'));
console.log(chalk.gray(`  - Heap Limit: 16GB`));
console.log(chalk.gray(`  - Batch Size: ${options.batchSize} files`));
console.log(chalk.gray(`  - Memory Threshold: ${Math.round(options.memoryLimit * 100)}%`));
console.log(chalk.gray(`  - Force GC: Every 25 files`));
console.log(chalk.gray(`  - In-Memory Issues: 2500 max`));

// Log initial memory usage
const initialMemory = process.memoryUsage();
console.log(chalk.gray(`  - Current Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`));
console.log(chalk.gray(`  - Heap Total: ${(initialMemory.heapTotal / 1024 / 1024).toFixed(1)}MB`));

try {
  const audit = new AccessibilityAudit('./reports');
  
  console.log(chalk.blue('\n♿ Starting Accessibility Audit...'));
  
  const startTime = Date.now();
  const results = await audit.runAccessibilityAudit(urls, options);
  const duration = Date.now() - startTime;
  
  // Log final memory usage
  const finalMemory = process.memoryUsage();
  console.log(chalk.green(`\n✅ Accessibility audit completed in ${duration}ms`));
  console.log(chalk.gray('Final Memory Usage:'));
  console.log(chalk.gray(`  - Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`));
  console.log(chalk.gray(`  - Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(1)}MB`));
  
} catch (error) {
  console.error(chalk.red('❌ Error running accessibility audit:'), error.message);
  process.exit(1);
} 