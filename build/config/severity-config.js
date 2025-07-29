/**
 * Severity Configuration for ESLint and Stylelint
 * This allows teams to define custom severity levels for different types of issues
 */

class SeverityConfig {
  constructor() {
    this.defaultConfig = {
      eslint: {
        // ESLint severity mapping (0=off, 1=warn, 2=error)
        severityMapping: {
          // Critical issues - should always be errors
          'no-unused-vars': 2,
          'no-undef': 2,
          'no-console': 1, // Can be warning in development
          'no-debugger': 2,
          'no-alert': 2,
          
          // Code quality issues - can be warnings
          'prefer-const': 1,
          'no-var': 1,
          'eqeqeq': 1,
          'curly': 1,
          'no-eval': 2,
          
          // Style issues - can be warnings or off
          'indent': 1,
          'quotes': 1,
          'semi': 1,
          'comma-dangle': 1,
          'space-before-function-paren': 1,
          
          // Performance issues - warnings
          'no-loop-func': 1,
          'no-new-func': 2,
          
          // Security issues - always errors
          'no-implied-eval': 2,
          'no-new-object': 1,
          'no-array-constructor': 1,
          
          // Accessibility issues - warnings
          'jsx-a11y/alt-text': 1,
          'jsx-a11y/anchor-is-valid': 1,
          'jsx-a11y/click-events-have-key-events': 1,
          
          // React specific - warnings
          'react/prop-types': 1,
          'react/no-unused-state': 1,
          'react/jsx-key': 1,
          'react/jsx-no-duplicate-props': 2,
          'react/jsx-no-undef': 2,
          
          // TypeScript specific - errors for type issues
          '@typescript-eslint/no-explicit-any': 1,
          '@typescript-eslint/no-unused-vars': 2,
          '@typescript-eslint/no-non-null-assertion': 1,
          
          // Default severity for unknown rules
          'default': 1
        },
        
        // Custom severity overrides for specific projects
        projectOverrides: {
          // Example: For a strict project
          'strict': {
            'no-console': 2,
            'no-debugger': 2,
            'prefer-const': 2,
            'eqeqeq': 2
          },
          
          // Example: For a development project
          'development': {
            'no-console': 0,
            'no-debugger': 1,
            'prefer-const': 1
          }
        }
      },
      
      stylelint: {
        // Stylelint severity mapping ('error' or 'warning')
        severityMapping: {
          // Critical CSS issues
          'declaration-no-important': 'error',
          'selector-no-qualifying-type': 'error',
          'selector-max-specificity': 'error',
          'declaration-block-no-duplicate-properties': 'error',
          'declaration-block-no-shorthand-property-overrides': 'error',
          
          // Code quality issues
          'color-no-invalid-hex': 'error',
          'font-family-no-duplicate-names': 'error',
          'function-calc-no-unspaced-operator': 'error',
          'string-no-newline': 'error',
          'unit-no-unknown': 'error',
          
          // Style consistency issues
          'indentation': 'warning',
          'color-hex-case': 'warning',
          'color-hex-length': 'warning',
          'color-named': 'warning',
          'font-family-name-quotes': 'warning',
          'font-weight-notation': 'warning',
          'function-url-quotes': 'warning',
          'number-leading-zero': 'warning',
          'number-no-trailing-zeros': 'warning',
          'string-quotes': 'warning',
          'length-zero-no-unit': 'warning',
          'value-no-vendor-prefix': 'warning',
          'property-no-vendor-prefix': 'warning',
          'selector-no-vendor-prefix': 'warning',
          'media-feature-name-no-vendor-prefix': 'warning',
          
          // Best practices
          'declaration-block-no-redundant-longhand-properties': 'warning',
          'declaration-block-single-line-max-declarations': 'warning',
          'declaration-colon-newline-after': 'warning',
          'declaration-colon-space-after': 'warning',
          'declaration-empty-line-before': 'warning',
          'declaration-block-semicolon-newline-after': 'warning',
          'declaration-block-trailing-semicolon': 'warning',
          'block-closing-brace-newline-after': 'warning',
          'block-opening-brace-newline-after': 'warning',
          'block-opening-brace-space-before': 'warning',
          'selector-combinator-space-after': 'warning',
          'selector-combinator-space-before': 'warning',
          'selector-list-comma-newline-after': 'warning',
          'selector-list-comma-space-after': 'warning',
          'selector-pseudo-element-colon-notation': 'warning',
          'selector-pseudo-element-no-unknown': 'warning',
          'selector-type-no-unknown': 'warning',
          'selector-max-empty-lines': 'warning',
          'rule-empty-line-before': 'warning',
          'comment-empty-line-before': 'warning',
          'comment-whitespace-inside': 'warning',
          'comment-no-empty': 'warning',
          'at-rule-no-unknown': 'warning',
          'at-rule-empty-line-before': 'warning',
          'at-rule-name-space-after': 'warning',
          'at-rule-semicolon-newline-after': 'warning',
          'at-rule-semicolon-space-before': 'warning',
          
          // Default severity for unknown rules
          'default': 'warning'
        },
        
        // Custom severity overrides for specific projects
        projectOverrides: {
          // Example: For a strict project
          'strict': {
            'indentation': 'error',
            'color-hex-case': 'error',
            'string-quotes': 'error',
            'declaration-block-trailing-semicolon': 'error'
          },
          
          // Example: For a development project
          'development': {
            'indentation': 'warning',
            'color-hex-case': 'warning',
            'string-quotes': 'warning'
          }
        }
      }
    };
  }

  /**
   * Get severity for ESLint rule
   */
  getESLintSeverity(ruleName, projectType = 'default') {
    const config = this.defaultConfig.eslint;
    const projectOverride = config.projectOverrides[projectType];
    
    // Check project-specific override first
    if (projectOverride && projectOverride[ruleName] !== undefined) {
      return projectOverride[ruleName];
    }
    
    // Check general severity mapping
    if (config.severityMapping[ruleName] !== undefined) {
      return config.severityMapping[ruleName];
    }
    
    // Return default severity
    return config.severityMapping.default;
  }

  /**
   * Get severity for Stylelint rule
   */
  getStylelintSeverity(ruleName, projectType = 'default') {
    const config = this.defaultConfig.stylelint;
    const projectOverride = config.projectOverrides[projectType];
    
    // Check project-specific override first
    if (projectOverride && projectOverride[ruleName] !== undefined) {
      return projectOverride[ruleName];
    }
    
    // Check general severity mapping
    if (config.severityMapping[ruleName] !== undefined) {
      return config.severityMapping[ruleName];
    }
    
    // Return default severity
    return config.severityMapping.default;
  }

  /**
   * Convert severity to dashboard severity level
   */
  convertToDashboardSeverity(severity, tool = 'eslint') {
    if (tool === 'eslint') {
      // ESLint: 0=off, 1=warn, 2=error
      switch (severity) {
        case 2: return 'Critical';
        case 1: return 'Medium';
        case 0: return 'Low';
        default: return 'Medium';
      }
    } else if (tool === 'stylelint') {
      // Stylelint: 'error' or 'warning'
      switch (severity) {
        case 'error': return 'Critical';
        case 'warning': return 'Medium';
        default: return 'Medium';
      }
    }
    return 'Medium';
  }

  /**
   * Get severity configuration for a project
   */
  getProjectSeverityConfig(projectType = 'default') {
    return {
      eslint: this.defaultConfig.eslint.projectOverrides[projectType] || {},
      stylelint: this.defaultConfig.stylelint.projectOverrides[projectType] || {}
    };
  }

  /**
   * Update severity configuration
   */
  updateSeverityConfig(newConfig) {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig };
  }

  /**
   * Export configuration for ESLint
   */
  exportESLintConfig(projectType = 'default') {
    const config = {};
    const projectOverride = this.defaultConfig.eslint.projectOverrides[projectType];
    
    // Apply general severity mapping
    Object.entries(this.defaultConfig.eslint.severityMapping).forEach(([rule, severity]) => {
      if (rule !== 'default') {
        config[rule] = severity;
      }
    });
    
    // Apply project-specific overrides
    if (projectOverride) {
      Object.entries(projectOverride).forEach(([rule, severity]) => {
        config[rule] = severity;
      });
    }
    
    return config;
  }

  /**
   * Export configuration for Stylelint
   */
  exportStylelintConfig(projectType = 'default') {
    const config = {};
    const projectOverride = this.defaultConfig.stylelint.projectOverrides[projectType];
    
    // Apply general severity mapping
    Object.entries(this.defaultConfig.stylelint.severityMapping).forEach(([rule, severity]) => {
      if (rule !== 'default') {
        config[rule] = severity;
      }
    });
    
    // Apply project-specific overrides
    if (projectOverride) {
      Object.entries(projectOverride).forEach(([rule, severity]) => {
        config[rule] = severity;
      });
    }
    
    return config;
  }
}

export default SeverityConfig; 