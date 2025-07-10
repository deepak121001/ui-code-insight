import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { globby } from 'globby';
import { writeFile } from 'fs/promises';
import { getConfigPattern } from '../config-loader.js';
import fsp from 'fs/promises';

/**
 * Accessibility audit module for detecting accessibility issues
 */
export class AccessibilityAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.accessibilityIssues = [];
    this.issuesFile = path.join(this.folderPath, 'accessibility-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) fs.unlinkSync(this.issuesFile);
    this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
  }

  async addAccessibilityIssue(issue) {
    this.issueStream.write(JSON.stringify(issue) + '\n');
  }

  // Helper to get code and context lines
  async getCodeContext(filePath, line, contextRadius = 2) {
    try {
      const content = await fsp.readFile(filePath, "utf8");
      const lines = content.split('\n');
      const idx = line - 1;
      const start = Math.max(0, idx - contextRadius);
      const end = Math.min(lines.length - 1, idx + contextRadius);
      // Only include the specific line for code
      let code = (lines[idx] || '').trim();
      if (code.length > 200) code = code.slice(0, 200) + '... (truncated)';
      // Clean context: trim, remove all-blank, collapse blank lines
      let contextLines = lines.slice(start, end + 1).map(l => l.trim());
      while (contextLines.length && contextLines[0] === '') contextLines.shift();
      while (contextLines.length && contextLines[contextLines.length - 1] === '') contextLines.pop();
      let lastWasBlank = false;
      contextLines = contextLines.filter(l => {
        if (l === '') {
          if (lastWasBlank) return false;
          lastWasBlank = true;
          return true;
        } else {
          lastWasBlank = false;
          return true;
        }
      });
      const context = contextLines.map((l, i) => {
        const n = start + i + 1;
        const marker = n === line ? '>>>' : '   ';
        let lineText = l;
        if (lineText.length > 200) lineText = lineText.slice(0, 200) + '... (truncated)';
        return `${marker} ${n}: ${lineText}`;
      }).join('\n');
      return { code, context };
    } catch {
      return { code: '', context: '' };
    }
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

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js'],
    });
    const BATCH_SIZE = 5;
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Image Accessibility] Progress: ${processed}/${files.length} files checked`);
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            for (const pattern of imagePatterns) {
              const matches = line.match(pattern);
              if (matches) {
                for (const match of matches) {
                  if (!match.includes('alt=') || match.includes('alt=""')) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'missing_alt',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'high',
                      message: 'Image missing alt attribute or has empty alt',
                      code,
                      context,
                      source: 'custom'
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
        }
      }));
      // batch memory is released here
    }
    process.stdout.write(`\r[Image Accessibility] Progress: ${files.length}/${files.length} files checked\n`);
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

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Heading Structure] Progress: ${processed}/${files.length} files checked`);
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            for (let level = 0; level < headingPatterns.length; level++) {
              const pattern = headingPatterns[level];
              if (pattern.test(line)) {
                // Check for skipped heading levels
                if (level > 0) {
                  const prevHeadingPattern = new RegExp(`<h${level}[^>]*>`, 'gi');
                  const hasPreviousHeading = content.substring(0, content.indexOf(line)).match(prevHeadingPattern);
                  
                  if (!hasPreviousHeading) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'skipped_heading',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'medium',
                      message: `Heading level ${level + 1} used without previous level ${level}`,
                      code,
                      context,
                      source: 'custom'
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
        }
      }));
    }
    process.stdout.write(`\r[Heading Structure] Progress: ${files.length}/${files.length} files checked\n`);
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

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Form Labels] Progress: ${processed}/${files.length} files checked`);
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            for (const pattern of formPatterns) {
              const matches = line.match(pattern);
              if (matches) {
                for (const match of matches) {
                  // Check if input has proper labeling
                  const hasLabel = match.includes('aria-label=') || 
                                 match.includes('aria-labelledby=') || 
                                 match.includes('id=');
                  
                  if (!hasLabel && !match.includes('type="hidden"')) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'missing_form_label',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'high',
                      message: 'Form control missing proper labeling',
                      code,
                      context,
                      source: 'custom'
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
        }
      }));
    }
    process.stdout.write(`\r[Form Labels] Progress: ${files.length}/${files.length} files checked\n`);
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

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Color Contrast] Progress: ${processed}/${files.length} files checked`);
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            for (const pattern of colorPatterns) {
              if (pattern.test(line)) {
                // This is a basic check - in a real implementation, you'd want to
                // actually calculate contrast ratios
                const { code, context } = await this.getCodeContext(file, index + 1);
                await this.addAccessibilityIssue({
                  type: 'color_contrast',
                  file: path.relative(process.cwd(), file),
                  line: index + 1,
                  severity: 'medium',
                  message: 'Color usage detected - verify contrast ratios meet WCAG guidelines',
                  code,
                  context,
                  recommendation: 'Use tools like axe-core or Lighthouse to check actual contrast ratios',
                  source: 'custom'
                });
              }
            }
          }
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
        }
      }));
    }
    process.stdout.write(`\r[Color Contrast] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for keyboard navigation support
   */
  async checkKeyboardNavigation() {
    console.log(chalk.blue('♿ Checking keyboard navigation...'));
    
    const keyboardPatterns = [
      /onClick\s*=/gi,
      /onclick\s*=/gi,
      /addEventListener\s*\(\s*['"]click['"]\)/gi,
    ];

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Keyboard Navigation] Progress: ${processed}/${files.length} files checked`);
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            for (const pattern of keyboardPatterns) {
              if (pattern.test(line)) {
                // Check if there's also keyboard event handling
                const hasKeyboardSupport = line.includes('onKeyDown') || 
                                         line.includes('onKeyUp') || 
                                         line.includes('onKeyPress') ||
                                         line.includes('addEventListener') && 
                                         (line.includes('keydown') || line.includes('keyup') || line.includes('keypress'));
                
                if (!hasKeyboardSupport) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'keyboard_navigation',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Click handler without keyboard support',
                    code,
                    context,
                    recommendation: 'Add keyboard event handlers or use semantic HTML elements',
                    source: 'custom'
                  });
                }
              }
            }
          }
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
        }
      }));
    }
    process.stdout.write(`\r[Keyboard Navigation] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for ARIA attributes
   */
  async checkARIAUsage() {
    console.log(chalk.blue('♿ Checking ARIA usage...'));
    
    const ariaPatterns = [
      /aria-[a-zA-Z-]+/gi,
    ];

    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[ARIA Usage] Progress: ${processed}/${files.length} files checked`);
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            for (const pattern of ariaPatterns) {
              const matches = line.match(pattern);
              if (matches) {
                for (const match of matches) {
                  // Check for common ARIA mistakes
                  if (match.includes('aria-label=""') || match.includes('aria-labelledby=""')) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'empty_aria',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'medium',
                      message: 'Empty ARIA attribute detected',
                      code,
                      context,
                      source: 'custom'
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
        }
      }));
    }
    process.stdout.write(`\r[ARIA Usage] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for tab order and focus management
   */
  async checkTabOrderAndFocus() {
    console.log(chalk.blue('♿ Checking tab order and focus management...'));
    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Tab Order/Focus] Progress: ${processed}/${files.length} files checked`);
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            // Check for interactive elements without tabindex
            if ((/<(button|a|input|select|textarea|div|span)[^>]*>/i.test(line) || /onClick=|onKeyDown=|onFocus=/.test(line)) && !/tabindex=/i.test(line)) {
              const { code, context } = await this.getCodeContext(file, index + 1);
              await this.addAccessibilityIssue({
                type: 'tab_order_focus',
                file: path.relative(process.cwd(), file),
                line: index + 1,
                severity: 'medium',
                message: 'Interactive element may be missing tabindex or focus management',
                code,
                context,
                source: 'custom'
              });
            }
            // Check for modals/dialogs without focus trap
            if (/<(dialog|Modal|modal)[^>]*>/i.test(line) && !/focusTrap|trapFocus|tabindex/i.test(line)) {
              const { code, context } = await this.getCodeContext(file, index + 1);
              await this.addAccessibilityIssue({
                type: 'focus_management',
                file: path.relative(process.cwd(), file),
                line: index + 1,
                severity: 'medium',
                message: 'Modal/dialog may be missing focus trap or focus management',
                code,
                context,
                source: 'custom'
              });
            }
          }
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
        }
      }));
    }
    process.stdout.write(`\r[Tab Order/Focus] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Look for missing landmark roles and skip links
   */
  async checkLandmarksAndSkipLinks() {
    console.log(chalk.blue('♿ Checking for landmark roles and skip links...'));
    const files = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js'],
    });
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Landmarks/Skip Links] Progress: ${processed}/${files.length} files checked`);
        try {
          const content = await fsp.readFile(file, 'utf8');
          if (/<(main|nav|aside|header|footer)[^>]*>/i.test(content)) foundLandmark = true;
          if (/<a[^>]+href=["']#main-content["'][^>]*>.*skip to main content.*<\/a>/i.test(content)) foundSkipLink = true;
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
        }
      }));
    }
    process.stdout.write(`\r[Landmarks/Skip Links] Progress: ${files.length}/${files.length} files checked\n`);
    if (!foundLandmark) {
      await this.addAccessibilityIssue({
        type: 'missing_landmark',
        severity: 'medium',
        message: 'No landmark roles (<main>, <nav>, <aside>, <header>, <footer>) found in project',
        recommendation: 'Add semantic landmark elements for better accessibility',
        source: 'custom'
      });
    }
    if (!foundSkipLink) {
      await this.addAccessibilityIssue({
        type: 'missing_skip_link',
        severity: 'medium',
        message: 'No skip link found (e.g., <a href="#main-content">Skip to main content</a>)',
        recommendation: 'Add a skip link for keyboard users',
        source: 'custom'
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
    
    this.issueStream.end();
    // Load issues from file
    if (fs.existsSync(this.issuesFile)) {
      const lines = fs.readFileSync(this.issuesFile, 'utf8').split('\n').filter(Boolean);
      const seen = new Set();
      const uniqueIssues = [];
      for (const line of lines) {
        try {
          const issue = JSON.parse(line);
          if (!issue.source) issue.source = 'custom';
          const key = `${issue.file || ''}:${issue.line || ''}:${issue.type}:${issue.message}`;
          if (!seen.has(key)) {
            uniqueIssues.push(issue);
            seen.add(key);
          }
        } catch {}
      }
      this.accessibilityIssues = uniqueIssues;
    }

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