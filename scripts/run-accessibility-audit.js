#!/usr/bin/env node

/**
 * Script to run accessibility audit with memory optimization
 * Usage: node scripts/run-accessibility-audit.js [options]
 */

import { AccessibilityAudit } from '../src/audits/accessibility-audit.js';
import chalk from 'chalk';

// Memory optimization flags
const NODE_FLAGS = [
  '--max-old-space-size=8192',  // 8GB heap
  '--expose-gc',                // Enable garbage collection
  '--optimize-for-size',        // Optimize for memory usage
  '--gc-interval=100'           // More frequent GC
];

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  urls: [],
  codeScan: true,
  liveUrlTest: false,
  useAxeCore: true,
  useLighthouse: false,
  memoryLimit: '8GB',
  batchSize: 1000
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  switch (arg) {
    case '--urls':
      if (args[i + 1]) {
        options.urls = args[i + 1].split(',');
        i++;
      }
      break;
    case '--no-code-scan':
      options.codeScan = false;
      break;
    case '--live-url-test':
      options.liveUrlTest = true;
      break;
    case '--no-axe-core':
      options.useAxeCore = false;
      break;
    case '--use-lighthouse':
      options.useLighthouse = true;
      break;
    case '--memory-limit':
      if (args[i + 1]) {
        options.memoryLimit = args[i + 1];
        i++;
      }
      break;
    case '--batch-size':
      if (args[i + 1]) {
        options.batchSize = parseInt(args[i + 1]);
        i++;
      }
      break;
    case '--help':
      showHelp();
      process.exit(0);
      break;
  }
}

function showHelp() {
  console.log(chalk.blue(`
Accessibility Audit Runner with Memory Optimization

Usage: node scripts/run-accessibility-audit.js [options]

Options:
  --urls <urls>              Comma-separated list of URLs for live testing
  --no-code-scan             Skip code scanning (live URL testing only)
  --live-url-test            Enable live URL testing
  --no-axe-core              Disable axe-core for live testing
  --use-lighthouse           Use Lighthouse for live testing
  --memory-limit <size>      Memory limit (default: 8GB)
  --batch-size <number>      Files per batch (default: 1000)
  --help                     Show this help

Examples:
  # Code scanning only
  node scripts/run-accessibility-audit.js

  # Live URL testing only
  node scripts/run-accessibility-audit.js --no-code-scan --live-url-test --urls "https://example.com,https://google.com"

  # Both code scanning and live testing
  node scripts/run-accessibility-audit.js --live-url-test --urls "https://example.com"

  # Custom memory settings
  node scripts/run-accessibility-audit.js --memory-limit 16GB --batch-size 500
`));
}

async function runAccessibilityAudit() {
  console.log(chalk.blue('♿ Starting Accessibility Audit with Memory Optimization...\n'));
  
  // Log memory settings
  const memUsage = process.memoryUsage();
  console.log(chalk.gray(`Memory Settings:`));
  console.log(chalk.gray(`  - Heap Limit: ${options.memoryLimit}`));
  console.log(chalk.gray(`  - Batch Size: ${options.batchSize} files`));
  console.log(chalk.gray(`  - Current Heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`));
  console.log(chalk.gray(`  - Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)}MB\n`));
  
  try {
    const audit = new AccessibilityAudit('./reports');
    
    // Set environment variables for memory optimization
    process.env.NODE_ENV = 'production';
    process.env.MAX_FILES_PER_BATCH = options.batchSize.toString();
    
    const startTime = Date.now();
    
    await audit.runAccessibilityAudit(options.urls, {
      codeScan: options.codeScan,
      liveUrlTest: options.liveUrlTest,
      useAxeCore: options.useAxeCore,
      useLighthouse: options.useLighthouse
    });
    
    const duration = Date.now() - startTime;
    console.log(chalk.green(`\n✅ Accessibility audit completed in ${duration}ms`));
    
    // Final memory usage
    const finalMemUsage = process.memoryUsage();
    console.log(chalk.gray(`Final Memory Usage:`));
    console.log(chalk.gray(`  - Heap Used: ${(finalMemUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`));
    console.log(chalk.gray(`  - Heap Total: ${(finalMemUsage.heapTotal / 1024 / 1024).toFixed(1)}MB`));
    
  } catch (error) {
    console.error(chalk.red(`❌ Accessibility audit failed: ${error.message}`));
    console.error(chalk.gray('Stack trace:'), error.stack);
    process.exit(1);
  }
}

// Run the audit
runAccessibilityAudit(); 