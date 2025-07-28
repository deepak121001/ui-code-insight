#!/usr/bin/env node

/**
 * Memory-optimized performance audit runner
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { PerformanceAudit } from '../src/audits/performance-audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  batchSize: 25,
  memoryLimit: 0.7
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--batch-size' && args[i + 1]) {
    options.batchSize = parseInt(args[i + 1]);
    i++;
  } else if (arg === '--memory-limit' && args[i + 1]) {
    options.memoryLimit = parseFloat(args[i + 1]);
    i++;
  }
}

// Set environment variables for memory optimization
process.env.NODE_ENV = 'production';
process.env.PERFORMANCE_BATCH_SIZE = options.batchSize.toString();
process.env.PERFORMANCE_MEMORY_THRESHOLD = options.memoryLimit.toString();

console.log(chalk.blue('⚡ Starting Memory-Optimized Performance Audit...'));
console.log(chalk.gray(`Batch Size: ${options.batchSize}`));
console.log(chalk.gray(`Memory Threshold: ${options.memoryLimit * 100}%`));

// Log initial memory usage
const initialMemory = process.memoryUsage();
console.log(chalk.gray('Initial Memory Usage:'));
console.log(chalk.gray(`  - Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`));
console.log(chalk.gray(`  - Heap Total: ${(initialMemory.heapTotal / 1024 / 1024).toFixed(1)}MB`));

try {
  const audit = new PerformanceAudit('./reports');
  
  console.log(chalk.blue('\n⚡ Starting Performance Audit...'));
  
  const startTime = Date.now();
  const results = await audit.runPerformanceAudit();
  const duration = Date.now() - startTime;
  
  // Log final memory usage
  const finalMemory = process.memoryUsage();
  console.log(chalk.green(`\n✅ Performance audit completed in ${duration}ms`));
  console.log(chalk.gray('Final Memory Usage:'));
  console.log(chalk.gray(`  - Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`));
  console.log(chalk.gray(`  - Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(1)}MB`));
  
  console.log(chalk.green(`\n📊 Performance Audit Results:`));
  console.log(chalk.green(`  - Total Issues: ${results.totalIssues}`));
  console.log(chalk.red(`  - High Severity: ${results.highSeverity}`));
  console.log(chalk.yellow(`  - Medium Severity: ${results.mediumSeverity}`));
  console.log(chalk.blue(`  - Low Severity: ${results.lowSeverity}`));
  
} catch (error) {
  console.error(chalk.red('❌ Error running performance audit:'), error.message);
  process.exit(1);
} 