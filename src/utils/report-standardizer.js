/**
 * Report Standardizer - Creates industry-standard, lightweight reports
 * Follows SARIF (Static Analysis Results Interchange Format) principles
 * for better tool integration and open source adoption
 */

export class ReportStandardizer {
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