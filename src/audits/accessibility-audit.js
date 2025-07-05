import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { globby } from 'globby';
import { writeFile } from 'fs/promises';
import { jsTsGlobs, htmlGlobs } from './file-globs.js';

/**
 * Accessibility audit module for detecting accessibility issues
 */
export class AccessibilityAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.accessibilityIssues = [];
  }

  /**
   * Check for missing alt attributes on images
   */
  async checkImageAccessibility() {
    console.log(chalk.blue('♿ Checking image accessibility...'));
    
    const imagePatterns = [
      /<img[^>]*>/gi,
      /<Image[^>]*>/gi,
    ];

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          imagePatterns.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
              matches.forEach(match => {
                if (!match.includes('alt=') || match.includes('alt=""')) {
                  this.accessibilityIssues.push({
                    type: 'missing_alt',
                    file,
                    line: index + 1,
                    severity: 'high',
                    message: 'Image missing alt attribute or has empty alt',
                    code: line.trim()
                  });
                }
              });
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Check for proper heading structure
   */
  async checkHeadingStructure() {
    console.log(chalk.blue('♿ Checking heading structure...'));
    
    const headingPatterns = [
      /<h1[^>]*>/gi,
      /<h2[^>]*>/gi,
      /<h3[^>]*>/gi,
      /<h4[^>]*>/gi,
      /<h5[^>]*>/gi,
      /<h6[^>]*>/gi,
    ];

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          headingPatterns.forEach((pattern, level) => {
            if (pattern.test(line)) {
              // Check for skipped heading levels
              if (level > 0) {
                const prevHeadingPattern = new RegExp(`<h${level}[^>]*>`, 'gi');
                const hasPreviousHeading = content.substring(0, content.indexOf(line)).match(prevHeadingPattern);
                
                if (!hasPreviousHeading) {
                  this.accessibilityIssues.push({
                    type: 'skipped_heading',
                    file,
                    line: index + 1,
                    severity: 'medium',
                    message: `Heading level ${level + 1} used without previous level ${level}`,
                    code: line.trim()
                  });
                }
              }
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Check for proper form labels
   */
  async checkFormLabels() {
    console.log(chalk.blue('♿ Checking form accessibility...'));
    
    const formPatterns = [
      /<input[^>]*>/gi,
      /<textarea[^>]*>/gi,
      /<select[^>]*>/gi,
    ];

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          formPatterns.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
              matches.forEach(match => {
                // Check if input has proper labeling
                const hasLabel = match.includes('aria-label=') || 
                               match.includes('aria-labelledby=') || 
                               match.includes('id=');
                
                if (!hasLabel && !match.includes('type="hidden"')) {
                  this.accessibilityIssues.push({
                    type: 'missing_form_label',
                    file,
                    line: index + 1,
                    severity: 'high',
                    message: 'Form control missing proper labeling',
                    code: line.trim()
                  });
                }
              });
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Check for color contrast issues
   */
  async checkColorContrast() {
    console.log(chalk.blue('♿ Checking color contrast...'));
    
    const colorPatterns = [
      /color:\s*#[0-9a-fA-F]{3,6}/gi,
      /background-color:\s*#[0-9a-fA-F]{3,6}/gi,
      /color:\s*rgb\([^)]+\)/gi,
      /background-color:\s*rgb\([^)]+\)/gi,
    ];

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          colorPatterns.forEach(pattern => {
            if (pattern.test(line)) {
              // This is a basic check - in a real implementation, you'd want to
              // actually calculate contrast ratios
              this.accessibilityIssues.push({
                type: 'color_contrast',
                file,
                line: index + 1,
                severity: 'medium',
                message: 'Color usage detected - verify contrast ratios meet WCAG guidelines',
                code: line.trim(),
                recommendation: 'Use tools like axe-core or Lighthouse to check actual contrast ratios'
              });
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Check for keyboard navigation support
   */
  async checkKeyboardNavigation() {
    console.log(chalk.blue('♿ Checking keyboard navigation...'));
    
    const keyboardPatterns = [
      /onClick\s*=/gi,
      /onclick\s*=/gi,
      /addEventListener\s*\(\s*['"]click['"]/gi,
    ];

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          keyboardPatterns.forEach(pattern => {
            if (pattern.test(line)) {
              // Check if there's also keyboard event handling
              const hasKeyboardSupport = line.includes('onKeyDown') || 
                                       line.includes('onKeyUp') || 
                                       line.includes('onKeyPress') ||
                                       line.includes('addEventListener') && 
                                       (line.includes('keydown') || line.includes('keyup') || line.includes('keypress'));
              
              if (!hasKeyboardSupport) {
                this.accessibilityIssues.push({
                  type: 'keyboard_navigation',
                  file,
                  line: index + 1,
                  severity: 'medium',
                  message: 'Click handler without keyboard support',
                  code: line.trim(),
                  recommendation: 'Add keyboard event handlers or use semantic HTML elements'
                });
              }
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Check for ARIA attributes
   */
  async checkARIAUsage() {
    console.log(chalk.blue('♿ Checking ARIA usage...'));
    
    const ariaPatterns = [
      /aria-[a-zA-Z-]+/gi,
    ];

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          ariaPatterns.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
              matches.forEach(match => {
                // Check for common ARIA mistakes
                if (match.includes('aria-label=""') || match.includes('aria-labelledby=""')) {
                  this.accessibilityIssues.push({
                    type: 'empty_aria',
                    file,
                    line: index + 1,
                    severity: 'medium',
                    message: 'Empty ARIA attribute detected',
                    code: line.trim()
                  });
                }
              });
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Check for tab order and focus management
   */
  async checkTabOrderAndFocus() {
    console.log(chalk.blue('♿ Checking tab order and focus management...'));
    const files = await globby(jsTsGlobs);
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          // Check for interactive elements without tabindex
          if ((/<(button|a|input|select|textarea|div|span)[^>]*>/i.test(line) || /onClick=|onKeyDown=|onFocus=/.test(line)) && !/tabindex=/i.test(line)) {
            this.accessibilityIssues.push({
              type: 'tab_order_focus',
              file,
              line: index + 1,
              severity: 'medium',
              message: 'Interactive element may be missing tabindex or focus management',
              code: line.trim()
            });
          }
          // Check for modals/dialogs without focus trap
          if (/<(dialog|Modal|modal)[^>]*>/i.test(line) && !/focusTrap|trapFocus|tabindex/i.test(line)) {
            this.accessibilityIssues.push({
              type: 'focus_management',
              file,
              line: index + 1,
              severity: 'medium',
              message: 'Modal/dialog may be missing focus trap or focus management',
              code: line.trim()
            });
          }
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Look for missing landmark roles and skip links
   */
  async checkLandmarksAndSkipLinks() {
    console.log(chalk.blue('♿ Checking for landmark roles and skip links...'));
    const files = await globby(jsTsGlobs);
    let foundLandmark = false;
    let foundSkipLink = false;
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (/<(main|nav|aside|header|footer)[^>]*>/i.test(content)) foundLandmark = true;
        if (/<a[^>]+href=["']#main-content["'][^>]*>.*skip to main content.*<\/a>/i.test(content)) foundSkipLink = true;
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
    if (!foundLandmark) {
      this.accessibilityIssues.push({
        type: 'missing_landmark',
        severity: 'medium',
        message: 'No landmark roles (<main>, <nav>, <aside>, <header>, <footer>) found in project',
        recommendation: 'Add semantic landmark elements for better accessibility'
      });
    }
    if (!foundSkipLink) {
      this.accessibilityIssues.push({
        type: 'missing_skip_link',
        severity: 'medium',
        message: 'No skip link found (e.g., <a href="#main-content">Skip to main content</a>)',
        recommendation: 'Add a skip link for keyboard users'
      });
    }
  }

  /**
   * Run all accessibility checks
   */
  async runAccessibilityAudit() {
    console.log(chalk.blue('♿ Starting Accessibility Audit...'));
    
    await this.checkImageAccessibility();
    await this.checkHeadingStructure();
    await this.checkFormLabels();
    await this.checkColorContrast();
    await this.checkKeyboardNavigation();
    await this.checkARIAUsage();
    await this.checkTabOrderAndFocus();
    await this.checkLandmarksAndSkipLinks();
    
    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.accessibilityIssues.length,
      highSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'low').length,
      issues: this.accessibilityIssues
    };

    // Generate JSON report
    try {
      const reportPath = path.join(this.folderPath, 'accessibility-audit-report.json');
      await writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`✅ Accessibility audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving accessibility audit report:', error.message));
    }

    // Display summary
    console.log(chalk.blue('\n♿ ACCESSIBILITY AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(40)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));

    return results;
  }
} 