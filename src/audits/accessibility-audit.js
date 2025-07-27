import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { globby } from 'globby';
import { writeFile } from 'fs/promises';
import { getConfigPattern } from '../config-loader.js';
import fsp from 'fs/promises';
import puppeteer from 'puppeteer';

const BATCH_SIZE = 5;

/**
 * Accessibility audit module for detecting accessibility issues
 * 
 * @example
 * // Code scanning only (default)
 * const audit = new AccessibilityAudit('./reports');
 * await audit.runAccessibilityAudit();
 * 
 * @example
 * // Live URL testing with axe-core
 * const audit = new AccessibilityAudit('./reports');
 * await audit.runAccessibilityAudit(
 *   ['https://example.com', 'https://google.com'],
 *   {
 *     codeScan: true,        // Run code scanning (default: true)
 *     liveUrlTest: true,     // Run live URL testing (default: false)
 *     useAxeCore: true,      // Use axe-core for live testing (default: true)
 *     useLighthouse: false   // Use Lighthouse for live testing (default: false)
 *   }
 * );
 * 
 * @example
 * // Live URL testing only (no code scanning)
 * const audit = new AccessibilityAudit('./reports');
 * await audit.runAccessibilityAudit(
 *   ['https://example.com'],
 *   {
 *     codeScan: false,
 *     liveUrlTest: true,
 *     useAxeCore: true
 *   }
 * );
 */
export class AccessibilityAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.accessibilityIssues = [];
    
    // Ensure the reports directory exists
    if (!fs.existsSync(this.folderPath)) {
      fs.mkdirSync(this.folderPath, { recursive: true });
    }
    
    this.issuesFile = path.join(this.folderPath, 'accessibility-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) {
      fs.unlinkSync(this.issuesFile);
    }
    
    // Create the write stream with error handling
    try {
      this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not create issue stream: ${error.message}`));
      this.issueStream = null;
    }
    
    this.browser = null;
  }

  async addAccessibilityIssue(issue) {
    // Add to in-memory array
    this.accessibilityIssues.push(issue);
    
    // Write to file if stream is available
    if (this.issueStream) {
      try {
        this.issueStream.write(JSON.stringify(issue) + '\n');
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not write issue to file: ${error.message}`));
      }
    } else {
      console.warn(chalk.yellow('Issue stream not initialized, issue added to memory only.'));
    }
  }

  /**
   * Initialize Puppeteer browser for live URL testing
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Test accessibility using axe-core for live URLs
   */
  async testLiveUrlAccessibility(url) {
    console.log(chalk.blue(`♿ Testing accessibility for: ${url}`));
    
    try {
      const page = await this.browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the URL
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for headings on the page
      const headingCount = await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return headings.length;
      });
      
      // If no headings found, add an issue
      if (headingCount === 0) {
        await this.addAccessibilityIssue({
          type: 'no_headings',
          file: url,
          line: 1,
          severity: 'medium',
          message: 'No heading elements found on page',
          code: 'Page appears to lack heading structure',
          context: 'Page should have heading elements to structure content',
          recommendation: 'Add heading elements (h1, h2, h3, etc.) to structure the page content',
          source: 'axe-core',
          wcag: '1.3.1',
          url: url
        });
      }
      
      // Check for skipped heading levels
      const headingHierarchy = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.map(h => parseInt(h.tagName.charAt(1)));
      });
      
      // Check for skipped heading levels
      for (let i = 0; i < headingHierarchy.length; i++) {
        const currentLevel = headingHierarchy[i];
        if (currentLevel > 1) {
          const previousLevel = currentLevel - 1;
          const hasPreviousHeading = headingHierarchy.slice(0, i).some(level => level === previousLevel);
          
          if (!hasPreviousHeading) {
            await this.addAccessibilityIssue({
              type: 'skipped_heading',
              file: url,
              line: 1,
              severity: 'medium',
              message: `Heading level ${currentLevel} used without previous level ${previousLevel}`,
              code: 'Page has heading hierarchy issues',
              context: `Page contains h${currentLevel} without preceding h${previousLevel}`,
              recommendation: 'Use heading levels in sequential order (h1, h2, h3, etc.)',
              source: 'axe-core',
              wcag: '1.3.1',
              url: url
            });
          }
        }
      }
      
      // Inject axe-core
      await page.addScriptTag({
        url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.0/axe.min.js'
      });
      
      // Wait for axe-core to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Run axe-core analysis
      const results = await page.evaluate(() => {
        if (typeof axe === 'undefined') {
          return { error: 'axe-core not loaded' };
        }
        
        return axe.run({
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'best-practice']
          }
        });
      });
      
      if (results.error) {
        console.warn(chalk.yellow(`Warning: ${results.error} for ${url}`));
        return;
      }
      
      // Process axe-core results
      if (results.violations && results.violations.length > 0) {
        for (const violation of results.violations) {
          for (const node of violation.nodes) {
            await this.addAccessibilityIssue({
              type: 'axe_violation',
              file: url,
              line: 1,
              severity: violation.impact === 'critical' ? 'high' : 
                       violation.impact === 'serious' ? 'medium' : 'low',
              message: violation.description,
              code: node.html || 'N/A',
              context: violation.help,
              recommendation: violation.helpUrl,
              source: 'axe-core',
              wcag: violation.tags.find(tag => tag.startsWith('wcag')) || 'N/A',
              url: url,
              impact: violation.impact
            });
          }
        }
      }
      
      await page.close();
      console.log(chalk.green(`✅ Accessibility testing completed for: ${url}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error testing ${url}: ${error.message}`));
      console.error(chalk.gray('Stack trace:'), error.stack);
    }
  }

  /**
   * Process axe-core results and convert to our issue format
   */
  async processAxeResults(url, results) {
    const violations = results.violations || [];
    const passes = results.passes || [];
    
    console.log(chalk.blue(`  📊 Found ${violations.length} violations and ${passes.length} passes`));
    
    // Process violations
    for (const violation of violations) {
      const severity = this.mapAxeImpactToSeverity(violation.impact);
      
      for (const node of violation.nodes) {
        const issue = {
          type: 'axe_violation',
          url: url,
          severity: severity,
          message: violation.description,
          code: node.html || 'N/A',
          context: `Selector: ${node.target.join(' > ')}`,
          recommendation: violation.help,
          source: 'axe-core',
          category: violation.tags.join(', '),
          impact: violation.impact,
          ruleId: violation.id
        };
        
        await this.addAccessibilityIssue(issue);
      }
    }
    
    // Process passes (for reporting)
    for (const pass of passes) {
      console.log(chalk.green(`  ✅ ${pass.description}`));
    }
  }

  /**
   * Map axe-core impact levels to our severity levels
   */
  mapAxeImpactToSeverity(impact) {
    switch (impact) {
      case 'critical':
      case 'serious':
        return 'high';
      case 'moderate':
        return 'medium';
      case 'minor':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Test accessibility for live URLs using Lighthouse
   */
  async testLighthouseAccessibility(urls) {
    if (!urls || urls.length === 0) {
      console.log(chalk.yellow('⚠️  No URLs provided for Lighthouse accessibility testing'));
      return;
    }

    console.log(chalk.blue('♿ Starting Lighthouse Accessibility Testing...'));
    
    try {
      const browser = await this.initBrowser();
      console.log(chalk.green('✅ Browser initialized successfully'));
      
      for (const url of urls) {
        console.log(chalk.blue(`\n♿ Testing Lighthouse accessibility for: ${url}`));
        
        try {
          const page = await browser.newPage();
          console.log(chalk.gray('  📄 Created new page'));
          
          // Set viewport and user agent
          await page.setViewport({ width: 1280, height: 720 });
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
          console.log(chalk.gray('  🖥️  Set viewport and user agent'));
          
          // Navigate to the page
          console.log(chalk.gray('  🌐 Navigating to page...'));
          await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
          });
          console.log(chalk.gray('  ✅ Page loaded successfully'));
          
          // Wait for page to fully load
          console.log(chalk.gray('  ⏳ Waiting for page to stabilize...'));
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Run Lighthouse audit
          console.log(chalk.gray('  🔍 Running Lighthouse audit...'));
          const cdp = await page.target().createCDPSession();
          await cdp.send('Performance.enable');
          
          // Get accessibility audit results
          const results = await page.evaluate(() => {
            return new Promise((resolve) => {
              // This is a simplified version - in a real implementation,
              // you'd want to use the full Lighthouse API
              const accessibilityIssues = [];
              
              // Check for common accessibility issues
              const images = document.querySelectorAll('img');
              images.forEach(img => {
                if (!img.alt && !img.getAttribute('aria-label')) {
                  accessibilityIssues.push({
                    type: 'missing_alt',
                    message: 'Image missing alt attribute',
                    element: img.outerHTML,
                    selector: this.getSelector(img)
                  });
                }
              });
              
              const buttons = document.querySelectorAll('button');
              buttons.forEach(button => {
                if (!button.textContent.trim() && !button.getAttribute('aria-label')) {
                  accessibilityIssues.push({
                    type: 'empty_button',
                    message: 'Button missing accessible text',
                    element: button.outerHTML,
                    selector: this.getSelector(button)
                  });
                }
              });
              
              const inputs = document.querySelectorAll('input:not([type="hidden"])');
              inputs.forEach(input => {
                if (!input.labels.length && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
                  accessibilityIssues.push({
                    type: 'missing_label',
                    message: 'Input missing label',
                    element: input.outerHTML,
                    selector: this.getSelector(input)
                  });
                }
              });
              
              resolve(accessibilityIssues);
            });
          });
          
          console.log(chalk.gray(`  📊 Found ${results.length} accessibility issues`));
          
          // Process results
          for (const issue of results) {
            await this.addAccessibilityIssue({
              type: issue.type,
              url: url,
              severity: 'medium',
              message: issue.message,
              code: issue.element,
              context: `Selector: ${issue.selector}`,
              source: 'lighthouse'
            });
          }
          
          await page.close();
          console.log(chalk.gray('  🗂️  Page closed'));
          
        } catch (error) {
          console.log(chalk.red(`❌ Error testing ${url}: ${error.message}`));
          console.log(chalk.gray(`   Stack: ${error.stack}`));
        }
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Error initializing browser: ${error.message}`));
      console.log(chalk.gray(`   Stack: ${error.stack}`));
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Get CSS selector for an element
   */
  getSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className) {
      return `.${element.className.split(' ').join('.')}`;
    }
    return element.tagName.toLowerCase();
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
      /<img[^>]*\/>/gi,
      /<Image[^>]*\/>/gi,
    ];

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    console.log(chalk.gray(`  📁 Scanning ${files.length} files for image accessibility issues`));
    
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
                // Check for missing alt attribute
                if (!match.includes('alt=')) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'missing_alt',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'high',
                    message: 'Image missing alt attribute',
                    code,
                    context,
                    recommendation: 'Add descriptive alt text for screen readers',
                    source: 'custom',
                    wcag: '1.1.1'
                  });
                }
                // Check for empty alt attribute
                else if (match.includes('alt=""') || match.includes("alt=''")) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'empty_alt',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Image has empty alt attribute',
                    code,
                    context,
                    recommendation: 'Add descriptive alt text or use alt="" only for decorative images',
                    source: 'custom',
                    wcag: '1.1.1'
                  });
                }
                // Check for generic alt text
                else if (match.includes('alt="image"') || match.includes("alt='image'") || 
                         match.includes('alt="img"') || match.includes("alt='img'") ||
                         match.includes('alt="photo"') || match.includes("alt='photo'")) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'generic_alt',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Image has generic alt text',
                    code,
                    context,
                    recommendation: 'Use descriptive alt text that conveys the image content',
                    source: 'custom',
                    wcag: '1.1.1'
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

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    console.log(chalk.gray(`  📁 Scanning ${files.length} files for heading structure issues`));
    
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Heading Structure] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        // Track heading levels in this file
        const headingLevels = [];
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (let level = 0; level < headingPatterns.length; level++) {
            const pattern = headingPatterns[level];
            if (pattern.test(line)) {
              const headingLevel = level + 1;
              headingLevels.push({ level: headingLevel, line: index + 1 });
              
              // Check for multiple h1 elements (should typically be only one per page)
              if (headingLevel === 1) {
                const h1Count = headingLevels.filter(h => h.level === 1).length;
                if (h1Count > 1) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'multiple_h1',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Multiple h1 elements found',
                    code,
                    context,
                    recommendation: 'Use only one h1 element per page as the main heading',
                    source: 'custom',
                    wcag: '1.3.1'
                  });
                }
              }
              
              // Check for heading without content
              const nextLine = lines[index + 1];
              if (nextLine && nextLine.trim() === '') {
                const { code, context } = await this.getCodeContext(file, index + 1);
                await this.addAccessibilityIssue({
                  type: 'empty_heading',
                  file: path.relative(process.cwd(), file),
                  line: index + 1,
                  severity: 'low',
                  message: 'Heading appears to be empty',
                  code,
                  context,
                  recommendation: 'Ensure headings have meaningful content',
                  source: 'custom',
                  wcag: '1.3.1'
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
    process.stdout.write(`\r[Heading Structure] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for proper form accessibility
   */
  async checkFormAccessibility() {
    console.log(chalk.blue('♿ Checking form accessibility...'));
    
    const formPatterns = [
      /<input[^>]*>/gi,
      /<textarea[^>]*>/gi,
      /<select[^>]*>/gi,
      /<button[^>]*>/gi,
      /<label[^>]*>/gi,
    ];

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    console.log(chalk.gray(`  📁 Scanning ${files.length} files for form accessibility issues`));
    
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Form Accessibility] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (const pattern of formPatterns) {
            const matches = line.match(pattern);
            if (matches) {
              for (const match of matches) {
                // Check input elements
                if (match.includes('<input')) {
                  // Skip hidden inputs
                  if (match.includes('type="hidden"')) continue;
                  
                  // Check for proper labeling
                  const hasLabel = match.includes('aria-label=') || 
                                 match.includes('aria-labelledby=') || 
                                 match.includes('id=');
                  
                  if (!hasLabel) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'missing_form_label',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'high',
                      message: 'Form input missing proper labeling',
                      code,
                      context,
                      recommendation: 'Add aria-label, aria-labelledby, or associate with a label element',
                      source: 'custom',
                      wcag: '3.3.2'
                    });
                  }
                  
                  // Check for required fields without aria-required
                  if (match.includes('required') && !match.includes('aria-required=')) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'missing_aria_required',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'medium',
                      message: 'Required field missing aria-required attribute',
                      code,
                      context,
                      recommendation: 'Add aria-required="true" for required fields',
                      source: 'custom',
                      wcag: '3.3.2'
                    });
                  }
                }
                
                // Check button elements
                if (match.includes('<button')) {
                  // Check for empty button text
                  if (!match.includes('>') || match.includes('></button>')) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'empty_button',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'high',
                      message: 'Button element is empty',
                      code,
                      context,
                      recommendation: 'Add text content or aria-label to button',
                      source: 'custom',
                      wcag: '4.1.2'
                    });
                  }
                  
                  // Check for buttons without accessible name
                  const hasAccessibleName = match.includes('aria-label=') || 
                                          match.includes('aria-labelledby=') ||
                                          match.includes('title=');
                  
                  if (!hasAccessibleName) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'button_no_accessible_name',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'medium',
                      message: 'Button missing accessible name',
                      code,
                      context,
                      recommendation: 'Add aria-label, aria-labelledby, or title attribute',
                      source: 'custom',
                      wcag: '4.1.2'
                    });
                  }
                }
                
                // Check label elements
                if (match.includes('<label')) {
                  // Check for empty labels
                  if (!match.includes('for=') && !match.includes('>')) {
                    const { code, context } = await this.getCodeContext(file, index + 1);
                    await this.addAccessibilityIssue({
                      type: 'empty_label',
                      file: path.relative(process.cwd(), file),
                      line: index + 1,
                      severity: 'medium',
                      message: 'Label element is empty',
                      code,
                      context,
                      recommendation: 'Add text content to label element',
                      source: 'custom',
                      wcag: '3.3.2'
                    });
                  }
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
    process.stdout.write(`\r[Form Accessibility] Progress: ${files.length}/${files.length} files checked\n`);
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

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    console.log(chalk.gray(`  📁 Scanning ${files.length} files for color contrast issues`));
    
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

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    console.log(chalk.gray(`  📁 Scanning ${files.length} files for keyboard navigation issues`));
    
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
   * Check for proper ARIA usage
   */
  async checkARIAUsage() {
    console.log(chalk.blue('♿ Checking ARIA usage...'));
    
    const ariaPatterns = [
      /aria-[a-zA-Z-]+/gi,
    ];

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    console.log(chalk.gray(`  📁 Scanning ${files.length} files for ARIA usage issues`));
    
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
                if (match.includes('aria-label=""') || match.includes('aria-label=\'\'')) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'empty_aria_label',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Empty ARIA label detected',
                    code,
                    context,
                    recommendation: 'Provide meaningful ARIA labels or remove empty ones',
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
    console.log(chalk.blue('♿ Checking tab order and focus...'));
    
    const focusPatterns = [
      /tabIndex\s*=/gi,
      /tabindex\s*=/gi,
      /focus\(\)/gi,
      /blur\(\)/gi,
    ];

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    console.log(chalk.gray(`  📁 Scanning ${files.length} files for tab order and focus issues`));
    
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Tab Order] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (const pattern of focusPatterns) {
            if (pattern.test(line)) {
              // Check for potential tab order issues
              if (line.includes('tabIndex="-1"') || line.includes('tabindex="-1"')) {
                const { code, context } = await this.getCodeContext(file, index + 1);
                await this.addAccessibilityIssue({
                  type: 'tab_order_issue',
                  file: path.relative(process.cwd(), file),
                  line: index + 1,
                  severity: 'medium',
                  message: 'Negative tabIndex detected - verify tab order is logical',
                  code,
                  context,
                  recommendation: 'Ensure tab order follows logical document flow',
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
    process.stdout.write(`\r[Tab Order] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for landmarks and skip links
   */
  async checkLandmarksAndSkipLinks() {
    console.log(chalk.blue('♿ Checking landmarks and skip links...'));
    
    const landmarkPatterns = [
      /<main[^>]*>/gi,
      /<nav[^>]*>/gi,
      /<header[^>]*>/gi,
      /<footer[^>]*>/gi,
      /<aside[^>]*>/gi,
      /<section[^>]*>/gi,
      /<article[^>]*>/gi,
    ];

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    console.log(chalk.gray(`  📁 Scanning ${files.length} files for landmarks and skip links`));
    
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Landmarks] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          for (const pattern of landmarkPatterns) {
            if (pattern.test(line)) {
              // Check for proper landmark usage
              const { code, context } = await this.getCodeContext(file, index + 1);
              await this.addAccessibilityIssue({
                type: 'landmark_usage',
                file: path.relative(process.cwd(), file),
                line: index + 1,
                severity: 'low',
                message: 'Landmark element detected - ensure proper semantic structure',
                code,
                context,
                recommendation: 'Use landmarks to create logical document structure',
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
    process.stdout.write(`\r[Landmarks] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Check for semantic HTML and proper ARIA usage
   */
  async checkSemanticHTMLAndARIA() {
    console.log(chalk.blue('♿ Checking semantic HTML and ARIA usage...'));
    
    const semanticPatterns = [
      /<main[^>]*>/gi,
      /<nav[^>]*>/gi,
      /<header[^>]*>/gi,
      /<footer[^>]*>/gi,
      /<aside[^>]*>/gi,
      /<section[^>]*>/gi,
      /<article[^>]*>/gi,
      /<figure[^>]*>/gi,
      /<figcaption[^>]*>/gi,
      /<time[^>]*>/gi,
      /<mark[^>]*>/gi,
      /<details[^>]*>/gi,
      /<summary[^>]*>/gi,
    ];

    const ariaPatterns = [
      /aria-[a-zA-Z-]+/gi,
      /role\s*=/gi,
    ];

    // Use both JS and HTML file patterns for accessibility scanning
    const jsFiles = await globby(getConfigPattern('jsFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'), {
      ignore: ['**/dist/**', '**/build/**', '**/out/**', '**/node_modules/**', '**/*.min.js', 'report/**'],
    });
    
    const files = [...jsFiles, ...htmlFiles];
    console.log(chalk.gray(`  📁 Scanning ${files.length} files for semantic HTML and ARIA issues`));
    
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Semantic HTML & ARIA] Progress: ${processed}/${files.length} files checked`);
      try {
        const content = await fsp.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          
          // Check for semantic HTML usage
          for (const pattern of semanticPatterns) {
            if (pattern.test(line)) {
              // This is good - semantic HTML is being used
              // We could add positive feedback here if needed
            }
          }
          
          // Check for ARIA usage
          for (const pattern of ariaPatterns) {
            const matches = line.match(pattern);
            if (matches) {
              for (const match of matches) {
                // Check for common ARIA mistakes
                if (match.includes('aria-label=""') || match.includes('aria-label=\'\'')) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'empty_aria_label',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Empty ARIA label detected',
                    code,
                    context,
                    recommendation: 'Provide meaningful ARIA labels or remove empty ones',
                    source: 'custom',
                    wcag: '4.1.2'
                  });
                }
                
                // Check for invalid ARIA attributes
                if (match.includes('aria-invalid="true"') && !match.includes('aria-describedby=')) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'missing_aria_error_description',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'medium',
                    message: 'Invalid form field missing error description',
                    code,
                    context,
                    recommendation: 'Add aria-describedby to link to error message',
                    source: 'custom',
                    wcag: '3.3.1'
                  });
                }
                
                // Check for redundant ARIA roles
                if ((match.includes('role="button"') && line.includes('<button')) ||
                    (match.includes('role="link"') && line.includes('<a')) ||
                    (match.includes('role="heading"') && /<h[1-6]/.test(line))) {
                  const { code, context } = await this.getCodeContext(file, index + 1);
                  await this.addAccessibilityIssue({
                    type: 'redundant_aria_role',
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    severity: 'low',
                    message: 'Redundant ARIA role on semantic element',
                    code,
                    context,
                    recommendation: 'Remove redundant ARIA role - semantic element already provides the role',
                    source: 'custom',
                    wcag: '4.1.2'
                  });
                }
              }
            }
          }
          
          // Check for non-semantic elements that should be semantic
          if (line.includes('<div') && (line.includes('onClick=') || line.includes('onclick='))) {
            const { code, context } = await this.getCodeContext(file, index + 1);
            await this.addAccessibilityIssue({
              type: 'non_semantic_interactive',
              file: path.relative(process.cwd(), file),
              line: index + 1,
              severity: 'medium',
              message: 'Non-semantic div used for interactive element',
              code,
              context,
              recommendation: 'Use semantic button element instead of div with click handler',
              source: 'custom',
              wcag: '4.1.2'
            });
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
      }));
    }
    process.stdout.write(`\r[Semantic HTML & ARIA] Progress: ${files.length}/${files.length} files checked\n`);
  }

  /**
   * Run all accessibility checks
   * @param {string[]} urls - Optional array of URLs to test live accessibility
   * @param {Object} options - Options for testing
   * @param {boolean} options.codeScan - Whether to run code scanning (default: true)
   * @param {boolean} options.liveUrlTest - Whether to run live URL testing (default: false)
   * @param {boolean} options.useAxeCore - Whether to use axe-core for live testing (default: true)
   * @param {boolean} options.useLighthouse - Whether to use Lighthouse for live testing (default: false)
   */
  async runAccessibilityAudit(urls = [], options = {}) {
    const {
      codeScan = true,
      liveUrlTest = false,
      useAxeCore = true,
      useLighthouse = false
    } = options;

    console.log(chalk.blue('♿ Starting Accessibility Audit...'));
    
    // Run code scanning if enabled
    if (codeScan) {
      console.log(chalk.blue('\n📁 Running Code Scanning...'));
      await this.checkImageAccessibility();
      await this.checkHeadingStructure();
      await this.checkFormAccessibility();
      await this.checkColorContrast();
      await this.checkKeyboardNavigation();
      await this.checkARIAUsage();
      await this.checkTabOrderAndFocus();
      await this.checkLandmarksAndSkipLinks();
      await this.checkSemanticHTMLAndARIA();
    }
    
    // Run live URL testing if enabled
    if (liveUrlTest && urls && urls.length > 0) {
      console.log(chalk.blue('\n🌐 Running Live URL Testing...'));
      
      try {
        await this.initBrowser();
        console.log(chalk.green('✅ Browser initialized successfully'));
        
        for (const url of urls) {
          await this.testLiveUrlAccessibility(url);
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ Error during live URL testing: ${error.message}`));
        console.error(chalk.gray('Stack trace:'), error.stack);
      } finally {
        await this.closeBrowser();
      }
    }
    
    // Close the issue stream if it was successfully created
    if (this.issueStream) {
      this.issueStream.end();
    }

    // Use in-memory issues array (which was populated during scanning)
    // Remove duplicates based on a unique key
    const seen = new Set();
    const uniqueIssues = [];
    for (const issue of this.accessibilityIssues) {
      if (!issue.source) issue.source = 'custom';
      const key = `${issue.url || issue.file || ''}:${issue.line || ''}:${issue.type}:${issue.message}`;
      if (!seen.has(key)) {
        uniqueIssues.push(issue);
        seen.add(key);
      }
    }
    this.accessibilityIssues = uniqueIssues;

    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.accessibilityIssues.length,
      highSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.accessibilityIssues.filter(issue => issue.severity === 'low').length,
      issues: this.accessibilityIssues,
      summary: {
        codeScanIssues: this.accessibilityIssues.filter(issue => issue.source === 'custom').length,
        liveUrlIssues: this.accessibilityIssues.filter(issue => issue.source !== 'custom').length,
        axeCoreIssues: this.accessibilityIssues.filter(issue => issue.source === 'axe-core').length,
        lighthouseIssues: this.accessibilityIssues.filter(issue => issue.source === 'lighthouse').length
      }
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
    console.log(chalk.blue('='.repeat(50)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));
    
    if (liveUrlTest && urls && urls.length > 0) {
      console.log(chalk.blue('\n🌐 LIVE URL TESTING SUMMARY'));
      console.log(chalk.blue('-'.repeat(30)));
      console.log(chalk.white(`URLs Tested: ${urls.length}`));
      console.log(chalk.white(`Code Scan Issues: ${results.summary.codeScanIssues}`));
      console.log(chalk.white(`Live URL Issues: ${results.summary.liveUrlIssues}`));
      if (useAxeCore) {
        console.log(chalk.white(`Axe-Core Issues: ${results.summary.axeCoreIssues}`));
      }
      if (useLighthouse) {
        console.log(chalk.white(`Lighthouse Issues: ${results.summary.lighthouseIssues}`));
      }
    }
  }
}