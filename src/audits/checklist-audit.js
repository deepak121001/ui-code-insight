import fs from 'fs';
import path from 'path';
import { globby } from 'globby';
import { getConfigPattern } from '../config-loader.js';
import stylelint from 'stylelint';
import { ESLint } from 'eslint';

export class ChecklistAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.results = [];
  }

  async runChecklistAudit() {
    await this.checkCssResponsive();
    await this.checkCssPrint();
    await this.checkJsMinification();
    await this.checkJsNonBlocking();
    await this.checkCssUniqueIds();
    await this.checkCssReset();
    await this.checkCssInline();
    await this.checkCssVendorPrefixes();
    await this.checkCssSyntax();
    await this.checkCssValidation();
    await this.checkCssNaming();
    await this.checkCssGlobalStyles();
    await this.checkCssPropertyOrder();
    await this.checkCssColorVariables();
    await this.checkCssRemoveComments();
    await this.checkJsESLint();
    await this.checkJsNaming();
    await this.checkJsNamespace();
    await this.checkJsJqueryUsage();
    // Add more checks as needed
    await this.generateReport();
    return this.results;
  }

  async checkCssResponsive() {
    // Check for media queries in CSS files
    const files = await globby(getConfigPattern('scssFilePathPattern'));
    let found = false;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (/@media\s+([^{]+){/.test(content)) {
        found = true;
        break;
      }
    }
    this.results.push({
      type: 'css-responsive',
      passed: found,
      message: found ? 'Responsive media queries found.' : 'No responsive media queries detected.'
    });
  }

  async checkCssPrint() {
    // Check for print stylesheet or @media print
    const files = await globby(getConfigPattern('scssFilePathPattern'));
    let found = false;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (/@media\s+print/.test(content)) {
        found = true;
        break;
      }
    }
    this.results.push({
      type: 'css-print',
      passed: found,
      message: found ? 'Print stylesheet or @media print found.' : 'No print stylesheet or @media print detected.'
    });
  }

  async checkJsMinification() {
    // Check for minified JS files in build output
    const files = await globby(['dist/**/*.min.js', 'build/**/*.min.js']);
    const passed = files.length > 0;
    this.results.push({
      type: 'js-minification',
      passed,
      message: passed ? 'Minified JS files found in build output.' : 'No minified JS files found in build output.'
    });
  }

  async checkJsNonBlocking() {
    // Check for async/defer on <script> tags in HTML files
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'));
    let found = false;
    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (/<script[^>]+(async|defer)[^>]*>/.test(content)) {
        found = true;
        break;
      }
    }
    this.results.push({
      type: 'js-non-blocking',
      passed: found,
      message: found ? 'Non-blocking (async/defer) script tags found.' : 'No async/defer script tags detected.'
    });
  }

  async checkCssUniqueIds() {
    // Check for duplicate IDs in HTML files
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'));
    const idMap = new Map();
    let hasDuplicates = false;
    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const ids = [...content.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
      for (const id of ids) {
        if (idMap.has(id)) {
          hasDuplicates = true;
          break;
        }
        idMap.set(id, true);
      }
      if (hasDuplicates) break;
    }
    this.results.push({
      type: 'css-unique-ids',
      passed: !hasDuplicates,
      message: !hasDuplicates ? 'No duplicate IDs found.' : 'Duplicate IDs detected in HTML.'
    });
  }

  async checkCssReset() {
    // Check for reset/normalize/reboot CSS
    const files = await globby(getConfigPattern('scssFilePathPattern'));
    let found = false;
    for (const file of files) {
      if (/reset|normalize|reboot/i.test(file)) {
        found = true;
        break;
      }
      const content = fs.readFileSync(file, 'utf8');
      if (/normalize|reset|reboot/i.test(content)) {
        found = true;
        break;
      }
    }
    this.results.push({
      type: 'css-reset',
      passed: found,
      message: found ? 'Reset/normalize/reboot CSS found.' : 'No reset/normalize/reboot CSS detected.'
    });
  }

  async checkCssInline() {
    // Check for inline CSS in HTML files
    const htmlFiles = await globby(getConfigPattern('htmlFilePathPattern'));
    let found = false;
    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (/<style[\s>]/.test(content) || /style=["'][^"']+["']/.test(content)) {
        found = true;
        break;
      }
    }
    this.results.push({
      type: 'css-inline',
      passed: !found,
      message: !found ? 'No inline CSS detected.' : 'Inline CSS detected in HTML.'
    });
  }

  async checkCssVendorPrefixes() {
    // Check for vendor prefixes in CSS files
    const files = await globby(getConfigPattern('scssFilePathPattern'));
    let found = false;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (/-(webkit|moz|ms|o)-/.test(content)) {
        found = true;
        break;
      }
    }
    this.results.push({
      type: 'css-vendor-prefixes',
      passed: found,
      message: found ? 'Vendor prefixes found in CSS.' : 'No vendor prefixes detected.'
    });
  }

  async checkCssSyntax() {
    // Check for CSS syntax errors using stylelint
    const files = await globby(getConfigPattern('scssFilePathPattern'));
    let hasErrors = false;
    for (const file of files) {
      const result = await stylelint.lint({ files: file });
      if (result.errored) {
        hasErrors = true;
        break;
      }
    }
    this.results.push({
      type: 'css-syntax',
      passed: !hasErrors,
      message: !hasErrors ? 'No CSS syntax errors found.' : 'CSS syntax errors detected.'
    });
  }

  async checkCssValidation() {
    // Validate CSS using stylelint
    const files = await globby(getConfigPattern('scssFilePathPattern'));
    let hasErrors = false;
    for (const file of files) {
      const result = await stylelint.lint({ files: file });
      if (result.results.some(r => r.warnings.length > 0)) {
        hasErrors = true;
        break;
      }
    }
    this.results.push({
      type: 'css-validation',
      passed: !hasErrors,
      message: !hasErrors ? 'CSS validated successfully.' : 'CSS validation warnings/errors found.'
    });
  }

  async checkCssNaming() {
    // Check for BEM naming convention in CSS classes
    const files = await globby(getConfigPattern('scssFilePathPattern'));
    let bemFound = false;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (/\.[a-z]+__[a-z]+(--[a-z]+)?/.test(content)) {
        bemFound = true;
        break;
      }
    }
    this.results.push({
      type: 'css-naming',
      passed: bemFound,
      message: bemFound ? 'BEM naming convention detected.' : 'No BEM naming convention detected.'
    });
  }

  async checkCssGlobalStyles() {
    // Check for global styles (html, body, *)
    const files = await globby(getConfigPattern('scssFilePathPattern'));
    let found = false;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (/^(html|body|\*)\s*\{/.test(content) || /html\s*\{|body\s*\{|\*\s*\{/.test(content)) {
        found = true;
        break;
      }
    }
    this.results.push({
      type: 'css-global-styles',
      passed: found,
      message: found ? 'Global styles detected.' : 'No global styles detected.'
    });
  }

  async checkCssPropertyOrder() {
    // Check for property order (simple check: multiple properties in a block)
    const files = await globby(getConfigPattern('scssFilePathPattern'));
    let consistent = true;
    let lastOrder = null;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const blocks = content.match(/\{[^}]+\}/g) || [];
      for (const block of blocks) {
        const props = [...block.matchAll(/([a-zA-Z-]+)\s*:/g)].map(m => m[1]);
        const order = props.join(',');
        if (lastOrder && order !== lastOrder) {
          consistent = false;
          break;
        }
        lastOrder = order;
      }
      if (!consistent) break;
    }
    this.results.push({
      type: 'css-property-order',
      passed: consistent,
      message: consistent ? 'Consistent CSS property order.' : 'Inconsistent CSS property order.'
    });
  }

  async checkCssColorVariables() {
    // Check for CSS custom properties or preprocessor variables
    const files = await globby(getConfigPattern('scssFilePathPattern'));
    let found = false;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (/--[a-zA-Z0-9-]+\s*:/.test(content) || /\$[a-zA-Z0-9_-]+\s*:/.test(content)) {
        found = true;
        break;
      }
    }
    this.results.push({
      type: 'css-color-variables',
      passed: found,
      message: found ? 'CSS color variables detected.' : 'No CSS color variables detected.'
    });
  }

  async checkCssRemoveComments() {
    // Check for commented-out code in CSS
    const files = await globby(getConfigPattern('scssFilePathPattern'));
    let found = false;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (/\/\*/.test(content)) {
        found = true;
        break;
      }
    }
    this.results.push({
      type: 'css-remove-comments',
      passed: !found,
      message: !found ? 'No commented-out code in CSS.' : 'Commented-out code detected in CSS.'
    });
  }

  async checkJsESLint() {
    // Run ESLint and report errors
    const eslint = new ESLint({});
    const files = await globby(getConfigPattern('jsFilePathPattern'));
    const results = await eslint.lintFiles(files);
    const hasErrors = results.some(r => r.errorCount > 0);
    this.results.push({
      type: 'js-eslint',
      passed: !hasErrors,
      message: !hasErrors ? 'No ESLint errors found.' : 'ESLint errors detected.'
    });
  }

  async checkJsNaming() {
    // Check for consistent JS naming conventions (camelCase, PascalCase)
    const files = await globby(getConfigPattern('jsFilePathPattern'));
    let consistent = true;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      // Simple check: variable/function/class names
      if (/var\s+[a-z][a-zA-Z0-9]*\s*=|function\s+[a-z][a-zA-Z0-9]*\s*\(|class\s+[A-Z][a-zA-Z0-9]*\s*/.test(content)) {
        continue;
      } else {
        consistent = false;
        break;
      }
    }
    this.results.push({
      type: 'js-naming',
      passed: consistent,
      message: consistent ? 'Consistent JS naming conventions.' : 'Inconsistent JS naming conventions.'
    });
  }

  async checkJsNamespace() {
    // Check for global namespace pollution (window/global assignments)
    const files = await globby(getConfigPattern('jsFilePathPattern'));
    let polluted = false;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (/window\.[a-zA-Z0-9_]+\s*=|global\.[a-zA-Z0-9_]+\s*=/.test(content)) {
        polluted = true;
        break;
      }
    }
    this.results.push({
      type: 'js-namespace',
      passed: !polluted,
      message: !polluted ? 'No global namespace pollution detected.' : 'Global namespace pollution detected.'
    });
  }

  async checkJsJqueryUsage() {
    // Check for jQuery usage ($ or jQuery)
    const files = await globby(getConfigPattern('jsFilePathPattern'));
    let found = false;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (/\$\(|jQuery\(/.test(content)) {
        found = true;
        break;
      }
    }
    this.results.push({
      type: 'js-jquery-usage',
      passed: !found,
      message: !found ? 'No jQuery usage detected.' : 'jQuery usage detected.'
    });
  }

  async generateReport() {
    const reportPath = path.join(this.folderPath, 'checklist-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
  }
} 