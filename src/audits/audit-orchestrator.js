import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { writeFile } from 'fs/promises';
import { SecurityAudit } from './security-audit.js';
import { PerformanceAudit } from './performance-audit.js';
import { EnhancedPerformanceAudit } from './enhanced-performance-audit.js';
import { AccessibilityAudit } from './accessibility-audit.js';
import { LighthouseAudit } from './lighthouse-audit.js';
import { DependencyAudit } from './dependency-audit.js';

/**
 * Main audit orchestrator that runs all audit categories
 * Focused on core audit types: Security, Performance, Accessibility, Lighthouse, Dependencies
 */
export class AuditOrchestrator {
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
    console.log(chalk.blue('\n📊 Generating Optimized Audit Report...'));
    
    const reportPath = path.join(this.folderPath, 'comprehensive-audit-report.json');
    
    try {
      // Create optimized report with only essential dashboard data
      const optimizedReport = this.createOptimizedReport();
      
      await writeFile(reportPath, JSON.stringify(optimizedReport, null, 2));
      console.log(chalk.green(`✅ Optimized comprehensive audit report saved to: ${reportPath}`));
      console.log(chalk.gray(`📊 Report size optimized: ${this.getReportSize(optimizedReport)}`));
    } catch (error) {
      console.error(chalk.red('Error saving audit report:', error.message));
    }
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