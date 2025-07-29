/**
 * Efficient Issue Display System
 * Prioritizes performance while maintaining functionality
 */

/**
 * Generate efficient issue data without code snippets
 */
export function generateEfficientIssueData(issues) {
  return issues.map(issue => ({
    // Essential metadata
    type: issue.type,
    severity: issue.severity,
    message: issue.message,
    file: issue.file,
    line: issue.line,
    column: issue.column,
    
    // File reference for navigation
    fileReference: `${issue.file}:${issue.line}`,
    
    // Issue summary instead of full code
    summary: generateIssueSummary(issue),
    
    // Category and tags for filtering
    category: issue.category || issue.type,
    tags: generateIssueTags(issue),
    
    // Quick fix suggestion (text only)
    quickFix: generateQuickFix(issue),
    
    // Severity indicators
    priority: getPriorityLevel(issue.severity),
    impact: getImpactLevel(issue.type),
    
    // Timestamp for tracking
    timestamp: new Date().toISOString()
  }));
}

/**
 * Generate issue summary
 */
function generateIssueSummary(issue) {
  const summaries = {
    // Security issues
    'xss': 'Potential XSS vulnerability - user input directly inserted into DOM',
    'sql_injection': 'SQL injection vulnerability - unvalidated user input in query',
    'hardcoded_secret': 'Hardcoded secret detected - API key or password in code',
    'eval_usage': 'Dangerous eval() usage - potential code injection',
    'innerHTML': 'innerHTML usage with user input - XSS risk',
    
    // Accessibility issues
    'missing_alt': 'Image missing alt attribute - accessibility issue',
    'missing_label': 'Form input missing label - accessibility issue',
    'color_contrast': 'Insufficient color contrast - WCAG violation',
    'heading_structure': 'Improper heading hierarchy - accessibility issue',
    'keyboard_navigation': 'Missing keyboard navigation support',
    
    // Performance issues
    'inefficient_loop': 'Inefficient loop - array length recalculated',
    'memory_leak': 'Potential memory leak - event listeners not removed',
    'large_bundle': 'Large bundle size - consider code splitting',
    'unused_code': 'Unused code detected - dead code elimination needed',
    'expensive_operation': 'Expensive operation in render cycle',
    
    // Code quality issues
    'var_usage': 'Using var instead of const/let - scope issues',
    'missing_semicolon': 'Missing semicolon - style consistency',
    'unused_variable': 'Unused variable - dead code',
    'console_log': 'Console.log in production code',
    'debugger_statement': 'Debugger statement in code'
  };

  return summaries[issue.type] || 'Code quality issue detected';
}

/**
 * Generate issue tags for filtering
 */
function generateIssueTags(issue) {
  const tags = [];
  
  // Add severity tag
  tags.push(issue.severity);
  
  // Add category tag
  if (issue.type) {
    tags.push(issue.type);
  }
  
  // Add file type tag
  if (issue.file) {
    const extension = issue.file.split('.').pop();
    tags.push(extension);
  }
  
  // Add specific tags based on issue type
  if (issue.type === 'xss' || issue.type === 'sql_injection') {
    tags.push('security');
    tags.push('critical');
  }
  
  if (issue.type === 'missing_alt' || issue.type === 'color_contrast') {
    tags.push('accessibility');
    tags.push('wcag');
  }
  
  if (issue.type === 'inefficient_loop' || issue.type === 'memory_leak') {
    tags.push('performance');
  }
  
  return tags;
}

/**
 * Generate quick fix suggestion
 */
function generateQuickFix(issue) {
  const fixes = {
    'xss': 'Use textContent instead of innerHTML for user input',
    'missing_alt': 'Add alt attribute to image element',
    'inefficient_loop': 'Cache array length in variable',
    'var_usage': 'Replace var with const or let',
    'missing_semicolon': 'Add semicolon at end of statement',
    'unused_variable': 'Remove unused variable',
    'console_log': 'Remove console.log statement',
    'debugger_statement': 'Remove debugger statement'
  };

  return fixes[issue.type] || 'Review and fix according to best practices';
}

/**
 * Get priority level
 */
function getPriorityLevel(severity) {
  const levels = {
    'high': 1,
    'medium': 2,
    'low': 3
  };
  return levels[severity] || 2;
}

/**
 * Get impact level
 */
function getImpactLevel(type) {
  const impacts = {
    'xss': 'critical',
    'sql_injection': 'critical',
    'hardcoded_secret': 'high',
    'missing_alt': 'medium',
    'inefficient_loop': 'low',
    'var_usage': 'low'
  };
  return impacts[type] || 'medium';
}

/**
 * Create efficient dashboard display
 */
export function createEfficientDashboardDisplay(issues) {
  const groupedIssues = groupIssuesByCategory(issues);
  
  return {
    summary: generateSummary(issues),
    categories: groupedIssues,
    filters: generateFilters(issues),
    navigation: generateNavigation(issues)
  };
}

/**
 * Group issues by category
 */
function groupIssuesByCategory(issues) {
  const categories = {};
  
  issues.forEach(issue => {
    const category = issue.category || 'other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(issue);
  });
  
  return categories;
}

/**
 * Generate summary statistics
 */
function generateSummary(issues) {
  const summary = {
    total: issues.length,
    bySeverity: {
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    },
    byCategory: {},
    byFile: {}
  };
  
  // Count by category
  issues.forEach(issue => {
    const category = issue.category;
    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
  });
  
  // Count by file
  issues.forEach(issue => {
    if (issue.file) {
      summary.byFile[issue.file] = (summary.byFile[issue.file] || 0) + 1;
    }
  });
  
  return summary;
}

/**
 * Generate filters for dashboard
 */
function generateFilters(issues) {
  const filters = {
    severity: ['high', 'medium', 'low'],
    categories: [...new Set(issues.map(i => i.category))],
    files: [...new Set(issues.map(i => i.file).filter(Boolean))],
    tags: [...new Set(issues.flatMap(i => i.tags))]
  };
  
  return filters;
}

/**
 * Generate navigation data
 */
function generateNavigation(issues) {
  const navigation = {
    files: [...new Set(issues.map(i => i.file).filter(Boolean))],
    quickActions: generateQuickActions(issues)
  };
  
  return navigation;
}

/**
 * Generate quick actions
 */
function generateQuickActions(issues) {
  const actions = [];
  
  // Add IDE integration actions
  if (issues.some(i => i.file)) {
    actions.push({
      type: 'ide_integration',
      label: 'Open in VS Code',
      action: 'vscode://file/{file}:{line}',
      description: 'Open issue location in VS Code'
    });
    
    actions.push({
      type: 'ide_integration',
      label: 'Open in WebStorm',
      action: 'webstorm://open?file={file}&line={line}',
      description: 'Open issue location in WebStorm'
    });
  }
  
  // Add fix suggestions
  const fixableIssues = issues.filter(i => i.quickFix);
  if (fixableIssues.length > 0) {
    actions.push({
      type: 'bulk_fix',
      label: 'Apply Quick Fixes',
      action: 'apply_fixes',
      description: `Apply ${fixableIssues.length} quick fixes`
    });
  }
  
  return actions;
}

/**
 * Create on-demand code loading system
 */
export function createOnDemandCodeLoader() {
  return {
    // Load code snippet when requested
    async loadCodeSnippet(file, line, context = 3) {
      try {
        // This would read the actual file and extract the code
        const code = await readFileLines(file, line - context, line + context);
        return {
          code,
          file,
          line,
          context: context
        };
      } catch (error) {
        return {
          error: 'Could not load code snippet',
          file,
          line
        };
      }
    },
    
    // Load fix suggestion
    async loadFixSuggestion(issue) {
      // Generate fix based on issue type
      return generateFixSuggestion(issue);
    },
    
    // Load issue context
    async loadIssueContext(issue) {
      // Load surrounding code and context
      return await this.loadCodeSnippet(issue.file, issue.line, 5);
    }
  };
}

/**
 * Simulate file reading (in real implementation, this would read actual files)
 */
async function readFileLines(file, startLine, endLine) {
  // This is a simulation - in real implementation, read actual file
  const mockCode = {
    'src/components/Button.js': [
      'import React from "react";',
      '',
      'const Button = ({ children, onClick }) => {',
      '  return (',
      '    <button onClick={onClick}>',
      '      {children}',
      '    </button>',
      '  );',
      '};',
      '',
      'export default Button;'
    ]
  };
  
  const lines = mockCode[file] || ['// File not found'];
  return lines.slice(Math.max(0, startLine - 1), endLine).join('\n');
}

/**
 * Generate fix suggestion
 */
function generateFixSuggestion(issue) {
  const suggestions = {
    'xss': {
      before: 'document.getElementById("output").innerHTML = userInput;',
      after: 'document.getElementById("output").textContent = userInput;',
      explanation: 'Use textContent instead of innerHTML to prevent XSS'
    },
    'missing_alt': {
      before: '<img src="logo.png" />',
      after: '<img src="logo.png" alt="Company Logo" />',
      explanation: 'Add descriptive alt text for accessibility'
    },
    'inefficient_loop': {
      before: 'for (let i = 0; i < array.length; i++) {',
      after: 'for (let i = 0, len = array.length; i < len; i++) {',
      explanation: 'Cache array length to avoid recalculation'
    }
  };
  
  return suggestions[issue.type] || {
    before: '// Original code',
    after: '// Fixed code',
    explanation: 'Review and apply appropriate fix'
  };
}

export default {
  generateEfficientIssueData,
  createEfficientDashboardDisplay,
  createOnDemandCodeLoader
}; 