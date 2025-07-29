import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { globby } from 'globby';
import { writeFile } from 'fs/promises';
import { assetGlobs } from './file-globs.js';
import { getConfigPattern } from '../config-loader.js';
import fsp from "fs/promises";
import { ESLint } from "eslint";
import { fileURLToPath } from "url";

// Enhanced performance audit with better tools and reliability
export class EnhancedPerformanceAudit {
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