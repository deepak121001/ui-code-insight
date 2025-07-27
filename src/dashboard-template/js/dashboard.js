import { fetchData, showDashboardMessage } from './helper.js';
import { loadAccessibilityReport, showAccessibilitySection, changeAccessibilityPage } from './accessibility-dom.js';

// Load configuration for exclude rules
let configExcludeRules = {};
let configLoaded = false;

async function loadConfigExcludeRules() {
  if (configLoaded) return configExcludeRules;
  try {
    const response = await fetch('ui-code-insight.config.json');
    if (response.ok) {
      const config = await response.json();
      configExcludeRules = (config && config.excludeRules) ? config.excludeRules : {};
    } else {
      configExcludeRules = {};
    }
  } catch {
    configExcludeRules = {};
  }
  configLoaded = true;
  return configExcludeRules;
}

// Common issues that are often disabled by project architects
const COMMON_ESLINT_ISSUES_TO_EXCLUDE = [
  // Most commonly disabled formatting rules
  'no-trailing-spaces',
  'eol-last',
  'comma-dangle',
  'quotes',
  'semi',
  'indent',
  'no-multiple-empty-lines',
  'object-curly-spacing',
  'array-bracket-spacing',
  'comma-spacing',
  'key-spacing',
  'space-before-blocks',
  'space-before-function-paren',
  'space-in-parens',
  'space-infix-ops',
  'spaced-comment',
  'arrow-spacing',
  'max-len',
  'linebreak-style',
  'no-mixed-spaces-and-tabs',
  'no-tabs',
  'no-multi-spaces',
  
  // Commonly disabled style preferences
  'no-console',
  'no-debugger',
  'no-alert',
  'no-warning-comments',
  'prefer-const',
  'no-var',
  'prefer-arrow-callback',
  'prefer-destructuring',
  'prefer-template',
  'sort-imports',
  'sort-keys',
  'sort-vars',
  
  // Naming convention rules commonly disabled
  'id-match',
  'camelcase',
  'new-cap',
  'no-underscore-dangle',
  'prefer-named-capture-group',
  'prefer-regex-literals',
  'prefer-numeric-literals',
  'prefer-object-spread',
  'prefer-promise-reject-errors',
  'prefer-reflect',
  'prefer-rest-params',
  'prefer-spread',
  'require-await',
  'require-unicode-regexp',
  'require-yield',
  'strict',
  'symbol-description',
  'use-isnan',
  'valid-jsdoc',
  'valid-typeof',
  'yoda',
  
  // React specific commonly disabled
  'react/jsx-filename-extension',
  'react/prop-types',
  'react/react-in-jsx-scope',
  'react/jsx-props-no-spreading',
  'react/jsx-one-expression-per-line',
  'react/jsx-curly-brace-presence',
  'react/jsx-boolean-value',
  'react/jsx-closing-bracket-location',
  'react/jsx-closing-tag-location',
  'react/jsx-curly-spacing',
  'react/jsx-equals-spacing',
  'react/jsx-first-prop-new-line',
  'react/jsx-indent',
  'react/jsx-indent-props',
  'react/jsx-max-props-per-line',
  'react/jsx-no-bind',
  'react/jsx-no-literals',
  'react/jsx-no-target-blank',
  'react/jsx-pascal-case',
  'react/jsx-sort-props',
  'react/jsx-tag-spacing',
  'react/jsx-wrap-multilines',
  
  // Import/export commonly disabled
  'import/prefer-default-export',
  'import/no-default-export',
  'import/order',
  'import/no-unresolved',
  'import/extensions',
  'import/no-extraneous-dependencies',
  'import/no-cycle',
  'import/no-duplicates',
  'import/no-useless-path-segments',
  'import/no-relative-parent-imports',
  
  // TypeScript commonly disabled
  '@typescript-eslint/explicit-function-return-type',
  '@typescript-eslint/explicit-module-boundary-types',
  '@typescript-eslint/no-explicit-any',
  '@typescript-eslint/no-unused-vars',
  '@typescript-eslint/no-non-null-assertion',
  '@typescript-eslint/ban-ts-comment',
  '@typescript-eslint/no-empty-function',
  '@typescript-eslint/no-empty-interface',
  '@typescript-eslint/no-inferrable-types',
  '@typescript-eslint/prefer-interface',
  '@typescript-eslint/interface-name-prefix',
  '@typescript-eslint/member-delimiter-style',
  '@typescript-eslint/type-annotation-spacing',
  '@typescript-eslint/no-use-before-define',
  '@typescript-eslint/no-var-requires',
  '@typescript-eslint/prefer-namespace-keyword',
  '@typescript-eslint/no-namespace',
  '@typescript-eslint/no-require-imports',
  '@typescript-eslint/no-this-alias',
  '@typescript-eslint/no-triple-slash-reference',
  '@typescript-eslint/naming-convention',
  '@typescript-eslint/prefer-function-type',
  '@typescript-eslint/prefer-optional-chain',
  '@typescript-eslint/prefer-nullish-coalescing',
  '@typescript-eslint/prefer-readonly',
  '@typescript-eslint/prefer-string-starts-ends-with',
  '@typescript-eslint/prefer-includes',
  '@typescript-eslint/prefer-regexp-exec',
  '@typescript-eslint/prefer-readonly-parameter-types',
  '@typescript-eslint/no-floating-promises',
  '@typescript-eslint/no-misused-promises',
  '@typescript-eslint/await-thenable',
  '@typescript-eslint/no-for-in-array',
  '@typescript-eslint/no-unsafe-assignment',
  '@typescript-eslint/no-unsafe-call',
  '@typescript-eslint/no-unsafe-member-access',
  '@typescript-eslint/no-unsafe-return',
  '@typescript-eslint/restrict-plus-operands',
  '@typescript-eslint/restrict-template-expressions',
  '@typescript-eslint/unbound-method',
  '@typescript-eslint/no-base-to-string',
  '@typescript-eslint/no-dynamic-delete',
  '@typescript-eslint/no-implied-eval',
  '@typescript-eslint/no-throw-literal',
  '@typescript-eslint/prefer-promise-reject-errors',
  '@typescript-eslint/require-await',
  '@typescript-eslint/return-await',
  '@typescript-eslint/no-return-await',
  '@typescript-eslint/no-unnecessary-type-assertion',
  '@typescript-eslint/no-unsafe-argument',
  '@typescript-eslint/no-unsafe-enum-comparison',
  '@typescript-eslint/no-unsafe-unary-negation',
  '@typescript-eslint/prefer-as-const',
  '@typescript-eslint/prefer-literal-enum-member',
  '@typescript-eslint/prefer-ts-expect-error',
  '@typescript-eslint/restrict-enum-comparisons',
  '@typescript-eslint/strict-boolean-expressions',
  '@typescript-eslint/switch-exhaustiveness-check',
  '@typescript-eslint/no-unnecessary-condition',
  '@typescript-eslint/no-unnecessary-type-constraint',
  '@typescript-eslint/prefer-optional-chain',
  '@typescript-eslint/prefer-nullish-coalescing',
  '@typescript-eslint/no-unnecessary-qualifier',
  '@typescript-eslint/no-unnecessary-type-arguments'
];

const COMMON_STYLELINT_ISSUES_TO_EXCLUDE = [
  // Most commonly disabled formatting rules
  'indentation',
  'string-quotes',
  'color-hex-case',
  'color-hex-length',
  'color-named',
  'font-family-name-quotes',
  'font-weight-notation',
  'number-leading-zero',
  'number-no-trailing-zeros',
  'unit-case',
  'value-keyword-case',
  
  // Spacing and layout commonly disabled
  'function-comma-space-after',
  'function-comma-space-before',
  'function-parentheses-space-inside',
  'value-list-comma-space-after',
  'value-list-comma-space-before',
  'declaration-colon-space-after',
  'declaration-colon-space-before',
  'declaration-block-semicolon-space-after',
  'declaration-block-semicolon-space-before',
  'block-closing-brace-space-before',
  'block-opening-brace-space-after',
  'block-opening-brace-space-before',
  'selector-attribute-operator-space-after',
  'selector-attribute-operator-space-before',
  'selector-combinator-space-after',
  'selector-combinator-space-before',
  'selector-list-comma-space-after',
  'selector-list-comma-space-before',
  
  // Newlines and line breaks commonly disabled
  'function-comma-newline-after',
  'function-comma-newline-before',
  'function-parentheses-newline-inside',
  'value-list-comma-newline-after',
  'value-list-comma-newline-before',
  'declaration-block-semicolon-newline-after',
  'declaration-block-semicolon-newline-before',
  'declaration-colon-newline-after',
  'block-closing-brace-newline-after',
  'block-closing-brace-newline-before',
  'block-opening-brace-newline-after',
  'block-opening-brace-newline-before',
  'selector-list-comma-newline-after',
  'selector-list-comma-newline-before',
  
  // Selector rules commonly disabled
  'selector-max-class',
  'selector-max-compound-selectors',
  'selector-max-id',
  'selector-no-qualifying-type',
  'selector-pseudo-class-case',
  'selector-type-case',
  
  // Naming convention rules commonly disabled
  'selector-class-pattern',
  'selector-id-pattern',
  'selector-nested-pattern',
  'custom-property-pattern',
  'keyframes-name-pattern',
  'function-name-case',
  'at-rule-name-case',
  'media-feature-name-case',
  'property-case',
  'unit-case',
  'value-keyword-case',
  'class-name-pattern',
  'id-pattern',
  'scss/selector-no-redundant-nesting-selector',
  'scss/at-rule-no-unknown',
  'scss/at-import-partial-extension',
  'scss/at-import-no-partial-leading-underscore',
  'scss/at-import-partial-extension-blacklist',
  'scss/at-import-partial-extension-whitelist',
  'scss/at-rule-conditional-no-parentheses',
  'scss/at-rule-no-unknown',
  'scss/at-rule-no-vendor-prefix',
  'scss/comment-no-empty',
  'scss/comment-no-loud',
  'scss/declaration-nested-properties',
  'scss/declaration-nested-properties-no-divided-groups',
  'scss/dollar-variable-colon-newline-after',
  'scss/dollar-variable-colon-space-after',
  'scss/dollar-variable-colon-space-before',
  'scss/dollar-variable-default',
  'scss/dollar-variable-empty-line-after',
  'scss/dollar-variable-empty-line-before',
  'scss/dollar-variable-first-in-block',
  'scss/dollar-variable-no-missing-interpolation',
  'scss/dollar-variable-pattern',
  'scss/double-slash-comment-whitespace-inside',
  'scss/function-color-relative',
  'scss/function-no-unknown',
  'scss/function-quote-no-quoted-strings-inside',
  'scss/function-unquote-no-unquoted-strings-inside',
  'scss/map-keys-quotes',
  'scss/media-feature-value-dollar-variable',
  'scss/no-duplicate-dollar-variables',
  'scss/no-duplicate-mixins',
  'scss/no-global-function-names',
  'scss/operator-no-newline-after',
  'scss/operator-no-newline-before',
  'scss/operator-no-unspaced',
  'scss/partial-no-import',
  'scss/percent-placeholder-pattern',
  'scss/selector-no-redundant-nesting-selector',
  'scss/selector-nest-combinators',
  'scss/selector-no-union-class-name',
  'scss/selector-nest-combinators',
  'scss/selector-no-redundant-nesting-selector',
  
  // Declaration rules commonly disabled
  'declaration-block-no-duplicate-properties',
  'declaration-block-no-redundant-longhand-properties',
  'declaration-block-no-shorthand-property-overrides',
  'declaration-block-trailing-semicolon',
  'declaration-empty-line-before',
  
  // Block rules commonly disabled
  'block-no-empty',
  'block-no-single-line',
  
  // Function rules commonly disabled
  'function-calc-no-unspaced-operator',
  'function-max-empty-lines',
  'function-name-case',
  'function-url-quotes',
  'function-whitespace-after',
  
  // Value rules commonly disabled
  'value-list-max-empty-lines',
  'value-no-vendor-prefix',
  
  // Custom property rules commonly disabled
  'custom-property-empty-line-before',
  
  // Bang rules commonly disabled
  'declaration-bang-space-after',
  'declaration-bang-space-before',
  
  // Selector attribute rules commonly disabled
  'selector-attribute-brackets-space-inside',
  'selector-attribute-quotes',
  'selector-attribute-operator-allowed-list',
  'selector-attribute-operator-blacklist',
  'selector-attribute-operator-whitelist',
  
  // Selector combinator rules commonly disabled
  'selector-combinator-allowed-list',
  'selector-combinator-blacklist',
  'selector-combinator-whitelist',
  'selector-descendant-combinator-no-non-space',
  
  // Selector list rules commonly disabled
  'selector-list-comma-newline-after',
  'selector-list-comma-newline-before',
  'selector-list-comma-space-after',
  'selector-list-comma-space-before',
  
  // Selector max rules commonly disabled
  'selector-max-attribute',
  'selector-max-combinators',
  'selector-max-empty-lines',
  'selector-max-pseudo-class',
  'selector-max-specificity',
  'selector-max-type',
  'selector-max-universal',
  
  // Selector nested rules commonly disabled
  'selector-nested-pattern',
  'selector-no-vendor-prefix',
  
  // Selector pseudo rules commonly disabled
  'selector-pseudo-class-allowed-list',
  'selector-pseudo-class-blacklist',
  'selector-pseudo-class-whitelist',
  'selector-pseudo-class-no-unknown',
  'selector-pseudo-class-parentheses-space-inside',
  'selector-pseudo-element-allowed-list',
  'selector-pseudo-element-blacklist',
  'selector-pseudo-element-case',
  'selector-pseudo-element-colon-notation',
  'selector-pseudo-element-no-unknown',
  'selector-pseudo-element-whitelist',
  'selector-type-no-unknown',
  
  // Declaration property rules commonly disabled
  'declaration-property-unit-allowed-list',
  'declaration-property-value-allowed-list',
  'declaration-property-value-disallowed-list',
  'declaration-property-value-no-vendor-prefix',
  'declaration-property-value-whitelist',
  'declaration-property-value-blacklist',
  
  // Declaration block rules commonly disabled
  'declaration-block-single-line-max-declarations',
  
  // Unit rules commonly disabled
  'unit-allowed-list',
  'unit-blacklist',
  'unit-no-unknown',
  'unit-whitelist',
  
  // Time rules commonly disabled
  'time-min-milliseconds',
  
  // Number rules commonly disabled
  'number-max-precision',
  
  // String rules commonly disabled
  'string-no-newline',
  
  // Color rules commonly disabled
  'color-no-hex',
  'color-no-invalid-hex'
];

const REPORTS = [
  { id: 'jsAuditReport', section: 'eslintSection', type: 'eslint', search: 'eslintSearch', pagination: 'eslintPagination', table: 'eslintTableWrap' },
  { id: 'scssAuditReport', section: 'stylelintSection', type: 'stylelint', search: 'stylelintSearch', pagination: 'stylelintPagination', table: 'stylelintTableWrap' },
  { id: 'npmPackagesReport', section: 'npmSection', type: 'npm', search: 'npmSearch', pagination: 'npmPagination', table: 'npmTableWrap' },
  // Comprehensive Audits
  { id: 'securityAuditReport', section: 'securitySection', type: 'security-audit', search: 'securitySearch', pagination: 'securityPagination', table: 'securityTableWrap' },
  { id: 'performanceAuditReport', section: 'performanceSection', type: 'performance-audit', search: 'performanceSearch', pagination: 'performancePagination', table: 'performanceTableWrap' },
  { id: 'accessibilityAuditReport', section: 'accessibilitySection', type: 'accessibility-audit', search: 'accessibilitySearch', pagination: 'accessibilityPagination', table: 'accessibilityTableWrap' },
  { id: 'testingAuditReport', section: 'testingSection', type: 'testing-audit', search: 'testingSearch', pagination: 'testingPagination', table: 'testingTableWrap' },
  { id: 'dependencyAuditReport', section: 'dependencySection', type: 'dependency-audit', search: 'dependencySearch', pagination: 'dependencyPagination', table: 'dependencyTableWrap' },
  { id: 'comprehensiveAuditReport', section: 'comprehensiveSection', type: 'comprehensive-audit', search: null, pagination: null, table: 'comprehensiveTableWrap' },
];

// Global function for accessibility pagination
window.changeAccessibilityPage = changeAccessibilityPage;

// Utility to show/hide sections
function showSection(id) {
  ['overviewSection', ...REPORTS.map(r => r.section), 'excludedRulesSection'].forEach(sec => {
    const el = document.getElementById(sec);
    if (el) el.classList.add('hidden');
  });
  const showEl = document.getElementById(id);
  if (showEl) showEl.classList.remove('hidden');
}

function setActiveSidebar(id) {
  document.querySelectorAll('#sidebarMenu a').forEach(a => a.classList.remove('bg-blue-100', 'font-bold'));
  const el = document.getElementById(id);
  if (el) el.classList.add('bg-blue-100', 'font-bold');
}

// Render project meta info
function renderProjectMeta(meta) {
  const metaDiv = document.getElementById('projectMeta');
  if (metaDiv && meta) {
    metaDiv.textContent = `Project Type: ${meta.projectType || 'N/A'} | Reports: ${(meta.reports || []).join(', ')}`;
  }
}

// Helper function to get lighthouse total issues
async function getLighthouseTotal() {
  try {
    const response = await fetch('./lightHouseCombine-report.json');
    if (response.ok) {
      const data = await response.json();
      let totalIssues = 0;
      
      data.forEach(item => {
        // Count desktop issues
        if (item.desktop && item.desktop.issues) {
          totalIssues += item.desktop.issues.length;
        }
        // Count mobile issues
        if (item.mobile && item.mobile.issues) {
          totalIssues += item.mobile.issues.length;
        }
      });
      
      return totalIssues;
    }
  } catch (error) {
    console.error('Error loading lighthouse data for overview:', error);
  }
  return 0;
}

// Refresh Lighthouse overview
async function refreshLighthouseOverview() {
  const lighthouseTotal = document.getElementById('lighthouseTotal');
  if (lighthouseTotal) {
    try {
      const total = await getLighthouseTotal();
      lighthouseTotal.textContent = total;
    } catch (error) {
      console.error('Error refreshing lighthouse overview:', error);
      lighthouseTotal.textContent = '0';
    }
  }
}

// Render comprehensive audit overview
function renderComprehensiveOverview(comprehensiveData, individualAuditData = {}) {
  // If comprehensiveData is missing or doesn't have categories, use individual audit data
  const categories = (comprehensiveData && comprehensiveData.categories) || {};

  // Update individual audit totals
  const securityTotal = document.getElementById('securityTotal');
  const performanceTotal = document.getElementById('performanceTotal');
  const accessibilityTotal = document.getElementById('accessibilityTotal');
  const testingTotal = document.getElementById('testingTotal');
  const dependencyTotal = document.getElementById('dependencyTotal');

  function getTotalIssues(category, individualKey) {
    if (categories[category] && categories[category].totalIssues !== undefined) {
      return categories[category].totalIssues;
    }
    if (individualAuditData[individualKey] && individualAuditData[individualKey].totalIssues !== undefined) {
      return individualAuditData[individualKey].totalIssues;
    }
    return 0;
  }

  if (securityTotal) securityTotal.textContent = getTotalIssues('security', 'security-audit');
  if (performanceTotal) performanceTotal.textContent = getTotalIssues('performance', 'performance-audit');
  if (accessibilityTotal) accessibilityTotal.textContent = getTotalIssues('accessibility', 'accessibility-audit');
  if (testingTotal) testingTotal.textContent = getTotalIssues('testing', 'testing-audit');
  if (dependencyTotal) dependencyTotal.textContent = getTotalIssues('dependency', 'dependency-audit');

  // Update accessibility overview with detailed breakdown if available
  if (accessibilityTotal && individualAuditData['accessibility-audit']) {
    const accessibilityData = individualAuditData['accessibility-audit'];
    if (accessibilityData.summary) {
      // Update the overview with detailed breakdown
      const overviewContainer = document.getElementById('accessibilityOverview');
      if (overviewContainer) {
        overviewContainer.innerHTML = `
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-600">${accessibilityData.totalIssues || 0}</div>
            <div class="text-sm text-gray-500">Total Issues</div>
            <div class="text-xs text-gray-400 mt-1">
              Code: ${accessibilityData.summary.codeScanIssues || 0} | 
              Live: ${accessibilityData.summary.liveUrlIssues || 0}
            </div>
          </div>
        `;
      }
    }
  }
}

// Render overview charts
function renderOverviewCharts(eslintData, stylelintData, npmData, comprehensiveData, individualAuditData = {}) {
  // ESLint Pie
  const eslintTotalEl = document.getElementById('overviewEslintTotal');
  const eslintCountsEl = document.getElementById('overviewEslintCounts');
  if (eslintData && Array.isArray(eslintData.results) && document.querySelector('#overviewEslintChart')) {
    const totalFiles = eslintData.results.length;
    const errorFiles = Array.isArray(eslintData.results) ? eslintData.results.filter(f => f.errorCount > 0).length : 0;
    const warningFiles = Array.isArray(eslintData.results) ? eslintData.results.filter(f => f.errorCount === 0 && f.warningCount > 0).length : 0;
    const passFiles = Array.isArray(eslintData.results) ? eslintData.results.filter(f => f.errorCount === 0 && f.warningCount === 0).length : 0;
    
    // Calculate total errors and warnings
    const totalErrors = eslintData.results.reduce((sum, file) => sum + file.errorCount, 0);
    const totalWarnings = eslintData.results.reduce((sum, file) => sum + file.warningCount, 0);
    
    const options = {
      chart: { type: 'pie', height: 250 },
      labels: ['Files with Errors', 'Files with Warnings', 'Files Passed'],
      series: [errorFiles, warningFiles, passFiles],
      colors: ['#f87171', '#fbbf24', '#34d399'],
    };
    new ApexCharts(document.querySelector('#overviewEslintChart'), options).render();
    if (eslintTotalEl) eslintTotalEl.textContent = `Total JS files: ${totalFiles}`;
    if (eslintCountsEl) eslintCountsEl.innerHTML = `<span class="text-red-500">${totalErrors} errors</span> • <span class="text-yellow-500">${totalWarnings} warnings</span>`;
  } else if (eslintTotalEl) {
    eslintTotalEl.textContent = '';
    if (eslintCountsEl) eslintCountsEl.textContent = '';
  }
  // Stylelint Pie
  const stylelintTotalEl = document.getElementById('overviewStylelintTotal');
  const stylelintCountsEl = document.getElementById('overviewStylelintCounts');
  if (stylelintData && Array.isArray(stylelintData.results) && document.querySelector('#overviewStylelintChart')) {
    const totalFiles = stylelintData.results.length;
    const errorFiles = stylelintData.results.filter(f => f.errorCount > 0).length;
    const warningFiles = stylelintData.results.filter(f => f.errorCount === 0 && f.warningCount > 0).length;
    const passFiles = stylelintData.results.filter(f => f.errorCount === 0 && f.warningCount === 0).length;
    
    // Calculate total errors and warnings
    const totalErrors = stylelintData.results.reduce((sum, file) => sum + file.errorCount, 0);
    const totalWarnings = stylelintData.results.reduce((sum, file) => sum + file.warningCount, 0);
    
    const options = {
      chart: { type: 'pie', height: 250 },
      labels: ['Files with Errors', 'Files with Warnings', 'Files Passed'],
      series: [errorFiles, warningFiles, passFiles],
      colors: ['#f87171', '#fbbf24', '#34d399'],
    };
    new ApexCharts(document.querySelector('#overviewStylelintChart'), options).render();
    if (stylelintTotalEl) stylelintTotalEl.textContent = `Total CSS files: ${totalFiles}`;
    if (stylelintCountsEl) stylelintCountsEl.innerHTML = `<span class="text-red-500">${totalErrors} errors</span> • <span class="text-yellow-500">${totalWarnings} warnings</span>`;
  } else if (stylelintTotalEl) {
    stylelintTotalEl.textContent = '';
    if (stylelintCountsEl) stylelintCountsEl.textContent = '';
  }
  // NPM Packages Overview Card (Stylelint-style)
  const npmTotalPackagesEl = document.getElementById('npmTotalPackages');
  const npmPackagesChartEl = document.getElementById('npmPackagesChart');

  if (npmData && (Array.isArray(npmData.dependencies) || Array.isArray(npmData.devDependencies))) {
    const deps = Array.isArray(npmData.dependencies) ? npmData.dependencies : [];
    const devDeps = Array.isArray(npmData.devDependencies) ? npmData.devDependencies : [];
    const all = deps.concat(devDeps);
    const total = all.length;
    const outdated = all.filter(pkg => pkg.deprecated && pkg.deprecated !== 'Not deprecated').length;
    if (npmTotalPackagesEl) npmTotalPackagesEl.textContent = `Total packages: ${total}`;
    // Pie chart: Up-to-date vs Outdated
    if (npmPackagesChartEl) {
      npmPackagesChartEl.innerHTML = '';
      const upToDate = total - outdated;
      const options = {
        chart: { type: 'pie', height: 250 },
        labels: ['Up-to-date', 'Outdated'],
        series: [upToDate, outdated],
        colors: ['#34d399', '#fbbf24'],
        legend: { show: true },
        dataLabels: { enabled: true, formatter: val => `${val.toFixed(1)}%` },
      };
      new ApexCharts(npmPackagesChartEl, options).render();
    }
  } else {
    if (npmTotalPackagesEl) npmTotalPackagesEl.textContent = '';
    if (npmPackagesChartEl) npmPackagesChartEl.innerHTML = '';
  }

  // Render comprehensive overview
  renderComprehensiveOverview(comprehensiveData, individualAuditData);
}

function renderPieChart(containerId, error, warning, pass) {
  const options = {
    chart: { type: 'pie', height: 250 },
    labels: ['Files with Errors', 'Files with Warnings', 'Files Passed'],
    series: [error, warning, pass],
    colors: ['#f87171', '#fbbf24', '#34d399'],
  };
  new ApexCharts(document.querySelector(containerId), options).render();
}

function renderBarChart(containerId, dep, devDep) {
  const options = {
    chart: { type: 'bar', height: 250 },
    series: [{ name: 'Count', data: [dep, devDep] }],
    xaxis: { categories: ['Dependencies', 'Dev Dependencies'] },
    colors: ['#2563eb', '#a78bfa'],
  };
  new ApexCharts(document.querySelector(containerId), options).render();
}

// Utility to check if a report file exists (by trying to fetch it with HEAD)
async function reportExists(type) {
  try {
    const res = await fetch(`./${type}-report.json`, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

// Hide sidebar tab and section if report is missing
function hideReportTabAndSection(report) {
  const tab = document.getElementById(report.id);
  const section = document.getElementById(report.section);
  if (tab) tab.style.display = 'none';
  if (section) section.classList.add('hidden');
}

// Defensive table rendering helpers
function safeSetInnerHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// Render audit table for comprehensive audits
window.renderAuditTable = function(data, tableId, paginationId, pageSize = 10, auditType = null, sortBySeverity = '') {
  const wrap = document.getElementById(tableId);
  if (!wrap) return;

  // Store data globally for pagination
  if (auditType) {
    window.auditData[auditType] = data;
    if (!window.auditPages[auditType]) {
      window.auditPages[auditType] = 1;
    }
  }

  wrap.innerHTML = '';
  if (!data || !Array.isArray(data.issues) || data.issues.length === 0) {
    wrap.innerHTML = '<div class="text-gray-500 p-4">No issues found.</div>';
    if (paginationId) document.getElementById(paginationId).innerHTML = '';
    return;
  }

  let issues = data.issues;
  if (sortBySeverity) {
    const severityOrder = { high: 1, medium: 2, low: 3 };
    issues = [...issues].sort((a, b) => {
      const aVal = severityOrder[a.severity] || 4;
      const bVal = severityOrder[b.severity] || 4;
      return aVal - bVal;
    });
    if (sortBySeverity !== 'high') {
      // If not high, reverse for medium/low
      issues = issues.filter(i => i.severity === sortBySeverity).concat(issues.filter(i => i.severity !== sortBySeverity));
    }
  }
  // Paginate the data
  const currentPage = auditType ? window.auditPages[auditType] : 1;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = issues.slice(start, end);

  // Create table with horizontal scroll
  let html = '<div class="overflow-x-auto"><table class="min-w-full bg-white rounded-lg overflow-hidden"><thead><tr>' +
    '<th class="py-2 px-4 text-left">Type</th>' +
    '<th class="py-2 px-4 text-left">File</th>' +
    '<th class="py-2 px-4 text-left">Line</th>' +
    '<th class="py-2 px-4 text-left">Severity</th>' +
    '<th class="py-2 px-4 text-left">Message</th>' +
    '<th class="py-2 px-4 text-left">Code</th>' +
    '</tr></thead><tbody>';

  // Map type to label and color (move outside loop)
  const vulnLabels = {
    hardcoded_secret: { label: 'Hardcoded Secret', color: 'bg-pink-100 text-pink-800 border-pink-200' },
    unsafe_eval: { label: 'Unsafe Eval', color: 'bg-red-100 text-red-800 border-red-200' },
    xss_vulnerability: { label: 'XSS', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    sql_injection: { label: 'SQL Injection', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    dependency_vulnerability: { label: 'Dependency Vulnerability', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    no_vulnerabilities: { label: 'No Vulnerabilities', color: 'bg-green-100 text-green-800 border-green-200' },
    color_contrast: { label: 'Color Contrast', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    missing_form_label: { label: 'Missing Form Label', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    missing_alt: { label: 'Missing Alt Attribute', color: 'bg-pink-100 text-pink-800 border-pink-200' },
    skipped_heading: { label: 'Skipped Heading Level', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    keyboard_navigation: { label: 'Keyboard Navigation', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    empty_aria: { label: 'Empty ARIA Attribute', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    tab_order_focus: { label: 'Tab Order/Focus', color: 'bg-green-100 text-green-800 border-green-200' },
    focus_management: { label: 'Focus Management', color: 'bg-red-100 text-red-800 border-red-200' },
    // Add more as needed
  };

  pageData.forEach(issue => {
    const severityColor = issue.severity === 'high' ? 'text-red-600' : 
                         issue.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600';
    const vuln = vulnLabels[issue.type] || { label: issue.type, color: 'bg-gray-100 text-gray-800 border-gray-200' };

    // Format the code snippet and vulnerability label
    let codeDisplay = 'N/A';
    if (issue.code) {
      const isMultiline = issue.code.includes('\n') || issue.code.length > 80;
      const codeHtml = issue.code.replace(/\n/g, '<br>');
      codeDisplay = `<span class="inline-block mb-1 px-2 py-0.5 rounded border text-xs font-semibold ${vuln.color}">${vuln.label}</span><br>`;
      if (isMultiline) {
        codeDisplay += `<pre class="bg-red-50 px-2 py-1 rounded text-xs font-mono text-red-700 border border-red-200 break-all overflow-x-auto max-w-md block">${codeHtml}</pre>`;
      } else {
        codeDisplay += `<code class="bg-red-50 px-2 py-1 rounded text-sm font-mono text-red-700 border border-red-200 break-all overflow-x-auto max-w-md block">${codeHtml}</code>`;
      }
      // Add context if available
      if (issue.context) {
        const contextHtml = issue.context.replace(/\n/g, '<br>');
        codeDisplay += `<details class="mt-2"><summary class="text-xs text-blue-600 cursor-pointer">Show context</summary><pre class="mt-1 text-xs bg-gray-50 p-2 rounded border overflow-x-auto break-all max-w-md">${contextHtml}</pre></details>`;
      }
    }
    // Truncate long file names but show full path on hover
    let fileCell = issue.file || 'N/A';
    if (fileCell.length > 40) {
      fileCell = `<span title="${issue.file}">${fileCell.slice(0, 18)}...${fileCell.slice(-18)}</span>`;
    }
    html += `<tr class="border-b border-gray-200 hover:bg-gray-100">` +
      `<td class="py-2 px-4 max-w-xs break-all">${vuln.label}</td>` +
      `<td class="py-2 px-4 max-w-xs break-all">${fileCell}</td>` +
      `<td class="py-2 px-4">${issue.line || 'N/A'}</td>` +
      `<td class="py-2 px-4"><span class="font-semibold ${severityColor}">${issue.severity || 'N/A'}</span></td>` +
      `<td class="py-2 px-4 max-w-md break-words">${issue.message || 'N/A'}</td>` +
      `<td class="py-2 px-4 max-w-md">${codeDisplay}</td>` +
      '</tr>';
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;

  // Render pagination if needed
  if (paginationId && auditType) {
    renderPagination(issues.length, pageSize, paginationId, auditType, sortBySeverity);
  }
}

// Render pagination controls
// Global pagination state for comprehensive audits
window.auditPages = {};
window.auditData = {};

function renderPagination(totalItems, pageSize, paginationId, auditType, sortBySeverity = '') {
  const pagDiv = document.getElementById(paginationId);
  if (!pagDiv) return;

  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) {
    pagDiv.innerHTML = '';
    return;
  }

  // Add page size and sort selector and total results
  let html = '<div class="flex items-center space-x-2">';
  html += `<span class="text-sm text-gray-500">Page:</span>`;
  html += `<span class="text-sm text-gray-500">| Show </span>`;
  html += `<select id="${paginationId}-pageSize" class="border rounded px-1 py-0.5 text-sm">
    <option value="10"${pageSize==10?' selected':''}>10</option>
    <option value="25"${pageSize==25?' selected':''}>25</option>
    <option value="50"${pageSize==50?' selected':''}>50</option>
    <option value="100"${pageSize==100?' selected':''}>100</option>
  </select>`;
  html += `<span class="text-sm text-gray-500">per page | </span>`;
  html += `<span class="text-sm text-gray-500">Sort by </span>`;
  html += `<select id="${paginationId}-sortSeverity" class="border rounded px-1 py-0.5 text-sm">
    <option value="">None</option>
    <option value="high"${sortBySeverity==='high'?' selected':''}>High</option>
    <option value="medium"${sortBySeverity==='medium'?' selected':''}>Medium</option>
    <option value="low"${sortBySeverity==='low'?' selected':''}>Low</option>
  </select>`;
  html += `<span class="text-sm text-gray-500">| <b>${totalItems}</b> results</span>`;

  const currentPage = window.auditPages[auditType] || 1;
  const maxPagesToShow = 7;
  // Prev arrow
  html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === 1 ? 'disabled' : ''} onclick="if(window.auditPages['${auditType}']>1){window.auditPages['${auditType}']--; window.renderAuditTable(window.auditData['${auditType}'], '${auditType}TableWrap', '${paginationId}', ${pageSize}, '${auditType}', '${sortBySeverity}');}">&lt;</button>`;

  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === i ? 'bg-blue-100' : ''}" onclick="window.auditPages['${auditType}'] = ${i}; window.renderAuditTable(window.auditData['${auditType}'], '${auditType}TableWrap', '${paginationId}', ${pageSize}, '${auditType}', '${sortBySeverity}');">${i}</button>`;
    }
  } else {
    html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === 1 ? 'bg-blue-100' : ''}" onclick="window.auditPages['${auditType}'] = 1; window.renderAuditTable(window.auditData['${auditType}'], '${auditType}TableWrap', '${paginationId}', ${pageSize}, '${auditType}', '${sortBySeverity}');">1</button>`;
    if (currentPage > 4) html += '<span class="px-1">...</span>';
    for (let i = Math.max(2, currentPage - 2); i < currentPage; i++) {
      html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50" onclick="window.auditPages['${auditType}'] = ${i}; window.renderAuditTable(window.auditData['${auditType}'], '${auditType}TableWrap', '${paginationId}', ${pageSize}, '${auditType}', '${sortBySeverity}');">${i}</button>`;
    }
    if (currentPage !== 1 && currentPage !== totalPages) {
      html += `<button class="px-2 py-1 text-sm border rounded bg-blue-100" disabled>${currentPage}</button>`;
    }
    for (let i = currentPage + 1; i <= Math.min(totalPages - 1, currentPage + 2); i++) {
      html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50" onclick="window.auditPages['${auditType}'] = ${i}; window.renderAuditTable(window.auditData['${auditType}'], '${auditType}TableWrap', '${paginationId}', ${pageSize}, '${auditType}', '${sortBySeverity}');">${i}</button>`;
    }
    if (currentPage < totalPages - 3) html += '<span class="px-1">...</span>';
    html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === totalPages ? 'bg-blue-100' : ''}" onclick="window.auditPages['${auditType}'] = ${totalPages}; window.renderAuditTable(window.auditData['${auditType}'], '${auditType}TableWrap', '${paginationId}', ${pageSize}, '${auditType}', '${sortBySeverity}');">${totalPages}</button>`;
  }

  // Next arrow
  html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === totalPages ? 'disabled' : ''} onclick="if(window.auditPages['${auditType}']<${totalPages}){window.auditPages['${auditType}']++; window.renderAuditTable(window.auditData['${auditType}'], '${auditType}TableWrap', '${paginationId}', ${pageSize}, '${auditType}', '${sortBySeverity}');}">&gt;</button>`;

  html += '</div>';
  pagDiv.innerHTML = html;

  // Add event listener for page size change
  const pageSizeSelect = document.getElementById(`${paginationId}-pageSize`);
  if (pageSizeSelect) {
    pageSizeSelect.value = pageSize;
    pageSizeSelect.addEventListener('change', function() {
      const newSize = parseInt(this.value, 10);
      window.renderAuditTable(window.auditData[auditType], `${auditType}TableWrap`, paginationId, newSize, auditType, sortBySeverity);
    });
  }
  // Add event listener for sort by severity
  const sortSelect = document.getElementById(`${paginationId}-sortSeverity`);
  if (sortSelect) {
    sortSelect.value = sortBySeverity;
    sortSelect.addEventListener('change', function() {
      window.renderAuditTable(window.auditData[auditType], `${auditType}TableWrap`, paginationId, pageSize, auditType, this.value);
    });
  }
}

// Main dashboard logic
window.addEventListener('DOMContentLoaded', async () => {
  // Check which reports exist and hide missing ones
  const reportExistence = {};
  for (const report of REPORTS) {
    reportExistence[report.type] = await reportExists(report.type);
    if (!reportExistence[report.type]) {
      hideReportTabAndSection(report);
    }
  }

  // Check for Lighthouse report
  const lighthouseExists = await reportExists('lightHouseCombine');
  if (!lighthouseExists) {
    hideReportTabAndSection({ id: 'lighthouseAuditReport', section: 'lighthouseSection' });
  }

  // Fetch data for overview charts only for available reports
  const eslintData = reportExistence['eslint'] ? await fetchData('eslint') : null;
  const stylelintData = reportExistence['stylelint'] ? await fetchData('stylelint') : null;
  const npmData = reportExistence['npm'] ? await fetchData('npm') : null;
  const comprehensiveData = reportExistence['comprehensive-audit'] ? await fetchData('comprehensive-audit') : null;

  // Fetch individual audit data for fallback
  const securityData = reportExistence['security-audit'] ? await fetchData('security-audit') : null;
  const performanceData = reportExistence['performance-audit'] ? await fetchData('performance-audit') : null;
  const accessibilityData = reportExistence['accessibility-audit'] ? await fetchData('accessibility-audit') : null;
  const testingData = reportExistence['testing-audit'] ? await fetchData('testing-audit') : null;
  const dependencyData = reportExistence['dependency-audit'] ? await fetchData('dependency-audit') : null;

  // Project meta
  let meta = null;
  if (eslintData && typeof eslintData === 'object' && ('projectType' in eslintData || 'reports' in eslintData)) {
    meta = eslintData;
  }
  renderProjectMeta(meta);

  // Render overview charts
  renderOverviewCharts(
    eslintData,
    stylelintData,
    npmData,
    comprehensiveData,
    {
      'security-audit': securityData,
      'performance-audit': performanceData,
      'accessibility-audit': accessibilityData,
      'testing-audit': testingData,
      'dependency-audit': dependencyData
    }
  );

  // Update Lighthouse overview if report exists
  if (lighthouseExists) {
    await refreshLighthouseOverview();
  }

  // Sidebar navigation
  document.getElementById('mainPage').addEventListener('click', e => {
    e.preventDefault();
    setActiveSidebar('mainPage');
    showSection('overviewSection');
  });

  // Only add listeners and render for available reports
  if (reportExistence['eslint']) {
    // ESLint Table State
    let eslintFiltered = [];
    window.eslintPage = 1;
    // Set default page sizes
    window.eslintPageSize = 10;
    let eslintSearchTerm = '';

    // Search logic
    function filterEslintData() {
      if (!eslintData || !Array.isArray(eslintData.results)) {
        eslintFiltered = [];
        return;
      }
      const term = (eslintSearchTerm || '').toLowerCase();
      
      eslintFiltered = eslintData.results.filter(item => {
        if (!item || !item.filePath || item.filePath.trim() === '') {
          return false;
        }
        
        // Apply search filter
        if (term !== '' && !item.filePath.toLowerCase().includes(term)) {
          return false;
        }
        
        return true;
      });
      
      window.eslintPage = 1;
    }

    // Render ESLint Table (Accordion)
    window.renderEslintTable = function(sortBySeverity = window.eslintSortBySeverity || '') {
      const wrap = document.getElementById('eslintTableWrap');
      if (!wrap) return;
      wrap.innerHTML = '';
      if (!eslintData || !Array.isArray(eslintData.results) || eslintFiltered.length === 0) {
        wrap.innerHTML = '<div class="text-gray-500 p-4">No ESLint results found.</div>';
        document.getElementById('eslintPagination').innerHTML = '';
        return;
      }
      // Sort
      let sorted = [...eslintFiltered];
      if (sortBySeverity) {
        const severityOrder = { high: 1, medium: 2, low: 3 };
        sorted.sort((a, b) => {
          const aVal = severityOrder[a.severity] || 4;
          const bVal = severityOrder[b.severity] || 4;
          return aVal - bVal;
        });
        if (sortBySeverity !== 'high') {
          sorted = sorted.filter(i => i.severity === sortBySeverity).concat(sorted.filter(i => i.severity !== sortBySeverity));
        }
      }
      // Paginate
      const start = (window.eslintPage - 1) * window.eslintPageSize;
      const end = start + window.eslintPageSize;
      const pageData = sorted.slice(start, end);
      // Accordion container
      const accordion = document.createElement('div');
      accordion.id = 'eslintAccordion';
      pageData.forEach(item => {
        const acc = window.createAccordionItem
          ? window.createAccordionItem(item.filePath, item.errorCount, item.warningCount, item.messages)
          : undefined;
        if (acc) accordion.appendChild(acc);
      });
      wrap.appendChild(accordion);
      renderEslintPagination(sortBySeverity);
    }

    // Render Pagination Controls
    window.renderEslintPagination = function(sortBySeverity = window.eslintSortBySeverity || '') {
      const pagDiv = document.getElementById('eslintPagination');
      if (!pagDiv) return;
      if (!eslintFiltered || eslintFiltered.length <= window.eslintPageSize) {
        pagDiv.innerHTML = '';
        return;
      }
      const totalPages = Math.ceil(eslintFiltered.length / window.eslintPageSize);
      const currentPage = window.eslintPage || 1;
      const maxPagesToShow = 7;
      let html = '<div class="flex items-center space-x-2">';
      html += '<span class="text-sm text-gray-500">Page:</span>';
      html += `<span class="text-sm text-gray-500">| Show </span>`;
      html += `<select id="eslintPagination-pageSize" class="border rounded px-1 py-0.5 text-sm">
        <option value="10"${window.eslintPageSize==10?' selected':''}>10</option>
        <option value="25"${window.eslintPageSize==25?' selected':''}>25</option>
        <option value="50"${window.eslintPageSize==50?' selected':''}>50</option>
        <option value="100"${window.eslintPageSize==100?' selected':''}>100</option>
      </select>`;
      html += `<span class="text-sm text-gray-500">per page | <b>${eslintFiltered.length}</b> results</span>`;
      html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === 1 ? 'disabled' : ''} onclick="if(window.eslintPage>1){window.eslintPage--; window.renderEslintTable();}">&lt;</button>`;
      if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) {
          html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === i ? 'bg-blue-100' : ''}" onclick="window.eslintPage = ${i}; window.renderEslintTable();">${i}</button>`;
        }
      } else {
        html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === 1 ? 'bg-blue-100' : ''}" onclick="window.eslintPage = 1; window.renderEslintTable();">1</button>`;
        if (currentPage > 4) html += '<span class="px-1">...</span>';
        for (let i = Math.max(2, currentPage - 2); i < currentPage; i++) {
          html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50" onclick="window.eslintPage = ${i}; window.renderEslintTable();">${i}</button>`;
        }
        if (currentPage !== 1 && currentPage !== totalPages) {
          html += `<button class="px-2 py-1 text-sm border rounded bg-blue-100" disabled>${currentPage}</button>`;
        }
        for (let i = currentPage + 1; i <= Math.min(totalPages - 1, currentPage + 2); i++) {
          html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50" onclick="window.eslintPage = ${i}; window.renderEslintTable();">${i}</button>`;
        }
        if (currentPage < totalPages - 3) html += '<span class="px-1">...</span>';
        html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === totalPages ? 'bg-blue-100' : ''}" onclick="window.eslintPage = ${totalPages}; window.renderEslintTable();">${totalPages}</button>`;
      }
      html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === totalPages ? 'disabled' : ''} onclick="if(window.eslintPage<${totalPages}){window.eslintPage++; window.renderEslintTable();}">&gt;</button>`;
      html += '</div>';
      pagDiv.innerHTML = html;

      // Add event listener for page size change
      const pageSizeSelect = document.getElementById('eslintPagination-pageSize');
      if (pageSizeSelect) {
        pageSizeSelect.value = window.eslintPageSize;
        pageSizeSelect.addEventListener('change', function() {
          window.eslintPageSize = parseInt(this.value, 10);
          window.eslintPage = 1;
          window.renderEslintTable();
        });
      }
    }

    // Expose createAccordionItem globally if not already
    if (!window.createAccordionItem) {
      import('./helper.js').then(mod => { window.createAccordionItem = mod.createAccordionItem; });
    }

    // Event: ESLint tab click
    document.getElementById('jsAuditReport').addEventListener('click', e => {
      e.preventDefault();
      setActiveSidebar('jsAuditReport');
      showSection('eslintSection');
      filterEslintData();
      window.eslintSortBySeverity = window.eslintSortBySeverity || '';
      renderEslintTable(window.eslintSortBySeverity);
    });

    // Event: Search
    const searchInput = document.getElementById('eslintSearch');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        eslintSearchTerm = e.target.value;
        filterEslintData();
        renderEslintTable();
      });
    }

    // Event: Sort by severity
    const sortSelect = document.getElementById('eslintSortBy');
    if (sortSelect) {
      sortSelect.addEventListener('change', function() {
        window.eslintPage = 1;
        window.eslintSortBySeverity = this.value;
        renderEslintTable(this.value);
      });
    }

    // Update exclude count display
    const excludeCount = document.getElementById('eslintExcludeCount');
    if (excludeCount && window.eslintExcludeCommonIssues !== false) {
      excludeCount.textContent = `(${COMMON_ESLINT_ISSUES_TO_EXCLUDE.length} rules excluded)`;
    }
  }

  if (reportExistence['stylelint']) {
    // Stylelint Table State
    let stylelintData = null;
    let stylelintFiltered = [];
    window.stylelintPage = 1;
    window.stylelintPageSize = 10;
    let stylelintSearchTerm = '';

    async function loadStylelintReport() {
      try {
        const response = await fetch('stylelint-report.json');
        if (response.ok) {
          stylelintData = await response.json();
          filterStylelintData();
          renderStylelintTable();
        }
      } catch (e) {
        stylelintData = null;
        stylelintFiltered = [];
        renderStylelintTable();
      }
    }

    function filterStylelintData() {
      if (!stylelintData || !Array.isArray(stylelintData.results)) {
        stylelintFiltered = [];
        return;
      }
      const term = stylelintSearchTerm || '';
      stylelintFiltered = stylelintData.results.filter(item => {
        if (!item || !item.filePath) return false;
        if (term !== '' && !item.filePath.toLowerCase().includes(term.toLowerCase())) return false;
        return true;
      });
      window.stylelintPage = 1;
    }

    window.renderStylelintTable = function(sortBySeverity = window.stylelintSortBySeverity || '') {
      const wrap = document.getElementById('stylelintTableWrap');
      if (!wrap) return;
      wrap.innerHTML = '';
      if (!stylelintData || !Array.isArray(stylelintData.results) || stylelintFiltered.length === 0) {
        wrap.innerHTML = '<div class="text-gray-500 p-4">No Stylelint results found.</div>';
        document.getElementById('stylelintPagination').innerHTML = '';
        return;
      }
      // Sort
      let sorted = [...stylelintFiltered];
      if (sortBySeverity) {
        const severityOrder = { high: 1, medium: 2, low: 3 };
        sorted.sort((a, b) => {
          const aVal = severityOrder[a.severity] || 4;
          const bVal = severityOrder[b.severity] || 4;
          return aVal - bVal;
        });
        if (sortBySeverity !== 'high') {
          sorted = sorted.filter(i => i.severity === sortBySeverity).concat(sorted.filter(i => i.severity !== sortBySeverity));
        }
      }
      // Paginate
      const start = (window.stylelintPage - 1) * window.stylelintPageSize;
      const end = start + window.stylelintPageSize;
      const pageData = sorted.slice(start, end);
      // Accordion container
      const accordion = document.createElement('div');
      accordion.id = 'stylelintAccordion';
      pageData.forEach(item => {
        const acc = window.createAccordionItem
          ? window.createAccordionItem(item.filePath, item.errorCount, item.warningCount, item.messages)
          : undefined;
        if (acc) accordion.appendChild(acc);
      });
      wrap.appendChild(accordion);
      renderStylelintPagination(sortBySeverity);
    }

    window.renderStylelintPagination = function(sortBySeverity = window.stylelintSortBySeverity || '') {
      const pagDiv = document.getElementById('stylelintPagination');
      if (!pagDiv) return;
      if (!stylelintFiltered || stylelintFiltered.length <= window.stylelintPageSize) {
        pagDiv.innerHTML = '';
        return;
      }
      const totalPages = Math.ceil(stylelintFiltered.length / window.stylelintPageSize);
      const currentPage = window.stylelintPage || 1;
      const maxPagesToShow = 7;
      let html = '<div class="flex items-center space-x-2">';
      html += '<span class="text-sm text-gray-500">Page:</span>';
      html += `<span class="text-sm text-gray-500">| Show </span>`;
      html += `<select id="stylelintPagination-pageSize" class="border rounded px-1 py-0.5 text-sm">
        <option value="10"${window.stylelintPageSize==10?' selected':''}>10</option>
        <option value="25"${window.stylelintPageSize==25?' selected':''}>25</option>
        <option value="50"${window.stylelintPageSize==50?' selected':''}>50</option>
        <option value="100"${window.stylelintPageSize==100?' selected':''}>100</option>
      </select>`;
      html += `<span class="text-sm text-gray-500">per page | <b>${stylelintFiltered.length}</b> results</span>`;
      html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === 1 ? 'disabled' : ''} onclick="if(window.stylelintPage>1){window.stylelintPage--; window.renderStylelintTable();}">&lt;</button>`;
      if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) {
          html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === i ? 'bg-blue-100' : ''}" onclick="window.stylelintPage = ${i}; window.renderStylelintTable();">${i}</button>`;
        }
      } else {
        html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === 1 ? 'bg-blue-100' : ''}" onclick="window.stylelintPage = 1; window.renderStylelintTable();">1</button>`;
        if (currentPage > 4) html += '<span class="px-1">...</span>';
        for (let i = Math.max(2, currentPage - 2); i < currentPage; i++) {
          html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50" onclick="window.stylelintPage = ${i}; window.renderStylelintTable();">${i}</button>`;
        }
        if (currentPage !== 1 && currentPage !== totalPages) {
          html += `<button class="px-2 py-1 text-sm border rounded bg-blue-100" disabled>${currentPage}</button>`;
        }
        for (let i = currentPage + 1; i <= Math.min(totalPages - 1, currentPage + 2); i++) {
          html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50" onclick="window.stylelintPage = ${i}; window.renderStylelintTable();">${i}</button>`;
        }
        if (currentPage < totalPages - 3) html += '<span class="px-1">...</span>';
        html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === totalPages ? 'bg-blue-100' : ''}" onclick="window.stylelintPage = ${totalPages}; window.renderStylelintTable();">${totalPages}</button>`;
      }
      html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === totalPages ? 'disabled' : ''} onclick="if(window.stylelintPage<${totalPages}){window.stylelintPage++; window.renderStylelintTable();}">&gt;</button>`;
      html += '</div>';
      pagDiv.innerHTML = html;

      // Add event listener for page size change
      const pageSizeSelect = document.getElementById('stylelintPagination-pageSize');
      if (pageSizeSelect) {
        pageSizeSelect.value = window.stylelintPageSize;
        pageSizeSelect.addEventListener('change', function() {
          window.stylelintPageSize = parseInt(this.value, 10);
          window.stylelintPage = 1;
          window.renderStylelintTable();
        });
      }
    }

    // Expose createAccordionItem globally if not already
    if (!window.createAccordionItem) {
      import('./helper.js').then(mod => { window.createAccordionItem = mod.createAccordionItem; });
    }

    document.getElementById('scssAuditReport').addEventListener('click', async e => {
      e.preventDefault();
      setActiveSidebar('scssAuditReport');
      showSection('stylelintSection');
      await loadStylelintReport();
      window.stylelintSortBySeverity = window.stylelintSortBySeverity || '';
      renderStylelintTable(window.stylelintSortBySeverity);
    });

          const searchInput = document.getElementById('stylelintSearch');
      if (searchInput) {
        searchInput.addEventListener('input', e => {
          stylelintSearchTerm = e.target.value;
          filterStylelintData();
          renderStylelintTable();
        });
      }

      // Event: Sort by severity
      const sortSelect = document.getElementById('stylelintSortBy');
      if (sortSelect) {
        sortSelect.addEventListener('change', function() {
          window.stylelintPage = 1;
          window.stylelintSortBySeverity = this.value;
          renderStylelintTable(this.value);
        });
      }

      // Update exclude count display
      const excludeCount = document.getElementById('stylelintExcludeCount');
      if (excludeCount && window.stylelintExcludeCommonIssues !== false) {
        excludeCount.textContent = `(${COMMON_STYLELINT_ISSUES_TO_EXCLUDE.length} rules excluded)`;
      }
  }

  if (reportExistence['npm']) {
    // NPM Table State
    let npmFiltered = [];
    window.npmPage = 1;
    // Set default page sizes
    window.npmPageSize = 10;
    let npmSearchTerm = '';
    let npmType = 'dependencies'; // or 'devDependencies'

    window.renderNpmTable = function() {
      const wrap = document.getElementById('npmTableWrap');
      if (!wrap) return;
      wrap.innerHTML = '';
      // Add toggle for dependencies/devDependencies
      let toggleHtml = '<div class="mb-4 flex space-x-2">';
      toggleHtml += `<button id="npmDepBtn" class="px-3 py-1 rounded ${npmType === 'dependencies' ? 'bg-blue-500 text-white' : 'bg-gray-200'}">Dependencies</button>`;
      toggleHtml += `<button id="npmDevDepBtn" class="px-3 py-1 rounded ${npmType === 'devDependencies' ? 'bg-blue-500 text-white' : 'bg-gray-200'}">Dev Dependencies</button>`;
      toggleHtml += '</div>';
      wrap.innerHTML = toggleHtml;
      const dataArr = Array.isArray(npmData[npmType]) ? npmFiltered : [];
      if (dataArr.length === 0) {
        wrap.innerHTML += '<div class="text-gray-500 p-4">No NPM packages found.</div>';
        document.getElementById('npmPagination').innerHTML = '';
        return;
      }
      // Paginate
      const start = (window.npmPage - 1) * window.npmPageSize;
      const end = start + window.npmPageSize;
      const pageData = dataArr.slice(start, end);
      // Table with horizontal scroll
      let html = '<div class="overflow-x-auto"><table class="min-w-full bg-white rounded-lg overflow-hidden"><thead><tr>' +
        '<th class="py-2 px-4 text-left">Name</th>' +
        '<th class="py-2 px-4 text-left">Version</th>' +
        '<th class="py-2 px-4 text-left">License</th>' +
        '<th class="py-2 px-4 text-left">Description</th>' +
        '<th class="py-2 px-4 text-left">Deprecated</th>' +
        '<th class="py-2 px-4 text-left">Unpacked Size</th>' +
        '</tr></thead><tbody>';
      pageData.forEach(item => {
        html += `<tr class="border-b border-gray-200 hover:bg-gray-100 ${item.deprecated === 'Deprecated' ? 'bg-red-100' : ''}">` +
          `<td class="py-2 px-4 whitespace-nowrap">${item.name}</td>` +
          `<td class="py-2 px-4">${item.version}</td>` +
          `<td class="py-2 px-4">${item.license}</td>` +
          `<td class="py-2 px-4">${item.description}</td>` +
          `<td class="py-2 px-4">${item.deprecated}</td>` +
          `<td class="py-2 px-4">${item.unpackedSize}</td>` +
          '</tr>';
      });
      html += '</tbody></table></div>';
      wrap.innerHTML += html;
      renderNpmPagination();
      // Toggle events
      document.getElementById('npmDepBtn').onclick = () => {
        if (npmType !== 'dependencies') {
          npmType = 'dependencies';
          filterNpmData();
          renderNpmTable();
        }
      };
      document.getElementById('npmDevDepBtn').onclick = () => {
        if (npmType !== 'devDependencies') {
          npmType = 'devDependencies';
          filterNpmData();
          renderNpmTable();
        }
      };
    }

    window.renderNpmPagination = function() {
      const pagDiv = document.getElementById('npmPagination');
      if (!pagDiv) return;
      const dataArr = Array.isArray(npmData[npmType]) ? npmFiltered : [];
      if (dataArr.length <= window.npmPageSize) {
        pagDiv.innerHTML = '';
        return;
      }
      const totalPages = Math.ceil(dataArr.length / window.npmPageSize);
      let html = '<div class="flex items-center space-x-2">';
      html += '<span class="text-sm text-gray-500">Page:</span>';
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${i === window.npmPage ? 'bg-blue-100' : ''}" onclick="window.npmPage = ${i}; window.renderNpmTable();">${i}</button>`;
      }
      html += '</div>';
      pagDiv.innerHTML = html;
    }

    function filterNpmData() {
      if (!npmData || !Array.isArray(npmData[npmType])) {
        npmFiltered = [];
        return;
      }
      if (!npmSearchTerm) {
        npmFiltered = npmData[npmType];
      } else {
        const term = npmSearchTerm.toLowerCase();
        npmFiltered = npmData[npmType].filter(item => item.name && item.name.toLowerCase().includes(term));
      }
      window.npmPage = 1;
    }

    document.getElementById('npmPackagesReport').addEventListener('click', e => {
      e.preventDefault();
      setActiveSidebar('npmPackagesReport');
      showSection('npmSection');
      filterNpmData();
      renderNpmTable();
    });

    const searchInput = document.getElementById('npmSearch');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        npmSearchTerm = e.target.value;
        filterNpmData();
        renderNpmTable();
      });
    }
  }

  // Add comprehensive audit event listeners
  const auditTypes = ['security', 'performance', 'testing', 'dependency'];
  
  auditTypes.forEach(type => {
    if (reportExistence[`${type}-audit`]) {
      const reportId = `${type}AuditReport`;
      const sectionId = `${type}Section`;
      
      document.getElementById(reportId).addEventListener('click', async (e) => {
        e.preventDefault();
        setActiveSidebar(reportId);
        showSection(sectionId);
        
        try {
          const data = await fetchData(`${type}-audit`);
          renderAuditTable(data, `${type}TableWrap`, `${type}Pagination`, 10, type);
        } catch (error) {
          console.error(`Error loading ${type} audit:`, error);
          document.getElementById(`${type}TableWrap`).innerHTML = '<div class="text-red-500 p-4">Error loading audit data.</div>';
        }
      });

      // Add search functionality
      const searchInput = document.getElementById(`${type}Search`);
      if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
          try {
            const data = await fetchData(`${type}-audit`);
            const searchTerm = e.target.value.toLowerCase();
            
            if (searchTerm) {
              const filteredData = {
                ...data,
                issues: data.issues.filter(issue => 
                  issue.message?.toLowerCase().includes(searchTerm) ||
                  issue.file?.toLowerCase().includes(searchTerm) ||
                  issue.type?.toLowerCase().includes(searchTerm)
                )
              };
              renderAuditTable(filteredData, `${type}TableWrap`, `${type}Pagination`, 10, type);
            } else {
              renderAuditTable(data, `${type}TableWrap`, `${type}Pagination`, 10, type);
            }
          } catch (error) {
            console.error(`Error filtering ${type} audit:`, error);
          }
        });
      }
    }
  });

  // Special handling for accessibility audit
  if (reportExistence['accessibility-audit']) {
    document.getElementById('accessibilityAuditReport').addEventListener('click', async (e) => {
      e.preventDefault();
      showAccessibilitySection();
    });
  }

  // Comprehensive audit report
  if (reportExistence['comprehensive-audit']) {
    document.getElementById('comprehensiveAuditReport').addEventListener('click', async (e) => {
      e.preventDefault();
      setActiveSidebar('comprehensiveAuditReport');
      showSection('comprehensiveSection');
      
      try {
        const data = await fetchData('comprehensive-audit');
        const wrap = document.getElementById('comprehensiveTableWrap');
        
        if (!data || !data.categories) {
          wrap.innerHTML = '<div class="text-gray-500 p-4">No comprehensive audit data found.</div>';
          return;
        }

        let html = '<div class="space-y-6">';
        
        // Summary section
        if (data.summary) {
          html += '<div class="bg-white rounded-lg shadow p-6">';
          html += '<h3 class="text-lg font-semibold mb-4">📊 Audit Summary</h3>';
          html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4">';
          html += `<div class="text-center"><div class="text-2xl font-bold text-red-600">${data.summary.highSeverity || 0}</div><div class="text-sm text-gray-500">High Severity</div></div>`;
          html += `<div class="text-center"><div class="text-2xl font-bold text-yellow-600">${data.summary.mediumSeverity || 0}</div><div class="text-sm text-gray-500">Medium Severity</div></div>`;
          html += `<div class="text-center"><div class="text-2xl font-bold text-blue-600">${data.summary.lowSeverity || 0}</div><div class="text-sm text-gray-500">Low Severity</div></div>`;
          html += `<div class="text-center"><div class="text-2xl font-bold text-green-600">${data.summary.totalIssues || 0}</div><div class="text-sm text-gray-500">Total Issues</div></div>`;
          html += '</div></div>';
        }

        // Categories breakdown
        html += '<div class="bg-white rounded-lg shadow p-6">';
        html += '<h3 class="text-lg font-semibold mb-4">📋 Category Breakdown</h3>';
        
        Object.entries(data.categories).forEach(([category, categoryData]) => {
          if (categoryData && categoryData.totalIssues !== undefined) {
            const icon = category === 'security' ? '🔒' : 
                        category === 'performance' ? '⚡' : 
                        category === 'accessibility' ? '♿' : 
                        category === 'testing' ? '🧪' : 
                        category === 'dependency' ? '📦' : '📋';
            
            html += `<div class="border-b border-gray-200 py-3 last:border-b-0">`;
            html += `<div class="flex items-center justify-between">`;
            html += `<div class="flex items-center space-x-2">`;
            html += `<span class="text-lg">${icon}</span>`;
            html += `<span class="font-medium capitalize">${category}</span>`;
            html += `</div>`;
            html += `<span class="text-lg font-bold">${categoryData.totalIssues}</span>`;
            html += `</div>`;
            html += `<div class="text-sm text-gray-500">` +
              `High: <span class='text-red-600 font-bold'>${categoryData.highSeverity || 0}</span> | ` +
              `Medium: <span class='text-yellow-600 font-bold'>${categoryData.mediumSeverity || 0}</span> | ` +
              `Low: <span class='text-blue-600 font-bold'>${categoryData.lowSeverity || 0}</span>` +
              `</div>`;
            html += `</div>`;
          }
        });
        
        html += '</div></div>';
        wrap.innerHTML = html;
      } catch (error) {
        console.error('Error loading comprehensive audit:', error);
        document.getElementById('comprehensiveTableWrap').innerHTML = '<div class="text-red-500 p-4">Error loading comprehensive audit data.</div>';
      }
    });
  }

  // Excluded Rules Info Section
  if (reportExistence['eslint'] || reportExistence['stylelint']) {
    document.getElementById('excludedRulesInfo').addEventListener('click', (e) => {
      e.preventDefault();
      setActiveSidebar('excludedRulesInfo');
      showSection('excludedRulesSection');
      renderExcludedRulesInfo();
    });
  }

  // Show overview by default
  setActiveSidebar('mainPage');
  showSection('overviewSection');
});

// Function to render excluded rules information
async function renderExcludedRulesInfo() {
  // Load config first
  await loadConfigExcludeRules();
  
  // Merge default and custom rules for display
  const getDisplayRules = (auditType, defaultRules) => {
    const auditConfig = configExcludeRules[auditType] || {};
    let merged = [];
    if (auditConfig.enabled === false) return [];
    if (auditConfig.overrideDefault === true) {
      merged = auditConfig.additionalRules || [];
    } else {
      const additional = auditConfig.additionalRules || [];
      merged = [...defaultRules, ...additional];
    }
    return merged;
  };

  const currentEslintRules = getDisplayRules('eslint', COMMON_ESLINT_ISSUES_TO_EXCLUDE);
  const currentStylelintRules = getDisplayRules('stylelint', COMMON_STYLELINT_ISSUES_TO_EXCLUDE);

  // Update counts
  document.getElementById('eslintExcludedCount').textContent = currentEslintRules.length;
  document.getElementById('stylelintExcludedCount').textContent = currentStylelintRules.length;

  // Render ESLint excluded rules
  renderExcludedRulesList('eslintExcludedRulesList', currentEslintRules, 'eslint');
  // Render Stylelint excluded rules
  renderExcludedRulesList('stylelintExcludedRulesList', currentStylelintRules, 'stylelint');

  // Add search functionality
  setupRulesSearch('eslintRulesSearch', 'eslintExcludedRulesList', currentEslintRules, 'eslint');
  setupRulesSearch('stylelintRulesSearch', 'stylelintExcludedRulesList', currentStylelintRules, 'stylelint');

  // Show config status
  updateConfigStatus();
}

// Function to render excluded rules list
function renderExcludedRulesList(containerId, rules, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Get custom rules from config
  const auditConfig = configExcludeRules[type] || {};
  const additionalRules = auditConfig.additionalRules || [];
  const overrideDefault = auditConfig.overrideDefault === true;

  const categories = categorizeRules(rules, type);
  let html = '';

  Object.entries(categories).forEach(([category, categoryRules]) => {
    html += `<div class="mb-4">`;
    html += `<h4 class="text-sm font-semibold text-gray-700 mb-2 capitalize">${category}</h4>`;
    html += `<div class="space-y-1">`;
    
    categoryRules.forEach(rule => {
      const ruleInfo = getRuleInfo(rule, type);
      const isCustom = overrideDefault ? true : additionalRules.includes(rule);
      html += `<div class="flex items-center justify-between p-2 bg-gray-50 rounded text-xs hover:bg-gray-100">`;
      html += `<div class="flex-1">`;
      html += `<div class="font-medium text-gray-800 flex items-center space-x-2">`;
      html += `<span>${rule}</span>`;
      html += `<span class="px-1.5 py-0.5 ${isCustom ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'} text-xs rounded">${isCustom ? 'Custom' : 'Default'}</span>`;
      html += `</div>`;
      if (ruleInfo.description) {
        html += `<div class="text-gray-600 mt-1">${ruleInfo.description}</div>`;
      }
      html += `</div>`;
      if (ruleInfo.category) {
        html += `<span class="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">${ruleInfo.category}</span>`;
      }
      html += `</div>`;
    });
    
    html += `</div></div>`;
  });

  container.innerHTML = html;
}

// Function to categorize rules
function categorizeRules(rules, type) {
  const categories = {
    'formatting': [],
    'style preferences': [],
    'naming conventions': [],
    'react specific': [],
    'typescript specific': [],
    'import/export': [],
    'spacing and layout': [],
    'selectors': [],
    'declarations': [],
    'functions': [],
    'values': [],
    'other': []
  };

  rules.forEach(rule => {
    if (type === 'eslint') {
      if (rule.includes('react/')) {
        categories['react specific'].push(rule);
      } else if (rule.includes('@typescript-eslint/')) {
        categories['typescript specific'].push(rule);
      } else if (rule.includes('import/')) {
        categories['import/export'].push(rule);
      } else if (['quotes', 'semi', 'indent', 'comma-dangle', 'no-trailing-spaces', 'eol-last'].includes(rule)) {
        categories['formatting'].push(rule);
      } else if (['no-console', 'prefer-const', 'no-var', 'prefer-arrow-callback'].includes(rule)) {
        categories['style preferences'].push(rule);
      } else if (['camelcase', 'id-match', 'new-cap'].includes(rule)) {
        categories['naming conventions'].push(rule);
      } else {
        categories['other'].push(rule);
      }
    } else if (type === 'stylelint') {
      if (rule.includes('indentation') || rule.includes('quotes') || rule.includes('case')) {
        categories['formatting'].push(rule);
      } else if (rule.includes('space') || rule.includes('newline')) {
        categories['spacing and layout'].push(rule);
      } else if (rule.includes('selector')) {
        categories['selectors'].push(rule);
      } else if (rule.includes('declaration')) {
        categories['declarations'].push(rule);
      } else if (rule.includes('function')) {
        categories['functions'].push(rule);
      } else if (rule.includes('value')) {
        categories['values'].push(rule);
      } else {
        categories['other'].push(rule);
      }
    }
  });

  // Remove empty categories
  Object.keys(categories).forEach(key => {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  });

  return categories;
}

// Function to get rule information
function getRuleInfo(rule, type) {
  const ruleInfo = {
    description: '',
    category: ''
  };

  if (type === 'eslint') {
    // Add descriptions for common ESLint rules
    const descriptions = {
      'no-console': 'Disallows console statements',
      'prefer-const': 'Requires const for variables that are never reassigned',
      'no-var': 'Requires let or const instead of var',
      'quotes': 'Enforces consistent quote style',
      'semi': 'Requires or disallows semicolons',
      'indent': 'Enforces consistent indentation',
      'comma-dangle': 'Requires or disallows trailing commas',
      'react/prop-types': 'Disallows missing props validation in React components',
      'react/jsx-filename-extension': 'Restricts file extensions that may contain JSX',
      '@typescript-eslint/no-explicit-any': 'Disallows usage of the any type',
      '@typescript-eslint/no-unused-vars': 'Disallows unused variables',
      'import/order': 'Enforces a convention in module import order'
    };
    ruleInfo.description = descriptions[rule] || '';
  } else if (type === 'stylelint') {
    // Add descriptions for common Stylelint rules
    const descriptions = {
      'indentation': 'Specifies indentation',
      'string-quotes': 'Specifies quote style for strings',
      'color-hex-case': 'Specifies lowercase or uppercase for hex colors',
      'color-hex-length': 'Specifies short or long notation for hex colors',
      'selector-class-pattern': 'Specifies a pattern for class selectors',
      'declaration-block-trailing-semicolon': 'Requires or disallows a trailing semicolon within declaration blocks',
      'declaration-colon-space-after': 'Requires or disallows a space after the colon in declarations',
      'function-comma-space-after': 'Requires or disallows a space after function comma'
    };
    ruleInfo.description = descriptions[rule] || '';
  }

  return ruleInfo;
}

// Function to setup search functionality for rules
function setupRulesSearch(searchId, listId, rules, type) {
  const searchInput = document.getElementById(searchId);
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const container = document.getElementById(listId);
    
    if (!searchTerm) {
      renderExcludedRulesList(listId, rules, type);
      return;
    }

    const filteredRules = rules.filter(rule => 
      rule.toLowerCase().includes(searchTerm) ||
      getRuleInfo(rule, type).description.toLowerCase().includes(searchTerm)
    );

    renderExcludedRulesList(listId, filteredRules, type);
  });
}

// Function to get merged exclude rules from config
function getMergedExcludeRules(auditType, defaultRules) {
  const auditConfig = configExcludeRules[auditType] || {};
  
  if (auditConfig.enabled === false) {
    return [];
  }
  
  if (auditConfig.overrideDefault === true) {
    return auditConfig.additionalRules || [];
  }
  
  // Merge default rules with additional rules
  const additionalRules = auditConfig.additionalRules || [];
  return [...defaultRules, ...additionalRules];
}

// Function to get current exclude rules for display
function getCurrentExcludeRules(auditType, defaultRules) {
  return getMergedExcludeRules(auditType, defaultRules);
}

// Function to check if config has custom rules
function hasCustomRules(auditType) {
  const auditConfig = configExcludeRules[auditType] || {};
  return auditConfig.additionalRules && auditConfig.additionalRules.length > 0;
}

// Function to check if a rule is custom (not in default rules)
function isCustomRule(rule, type) {
  const defaultRules = type === 'eslint' ? COMMON_ESLINT_ISSUES_TO_EXCLUDE : COMMON_STYLELINT_ISSUES_TO_EXCLUDE;
  return !defaultRules.includes(rule);
}

// Function to update config status display
function updateConfigStatus() {
  const configStatusDiv = document.getElementById('configStatus');
  if (!configStatusDiv) return;
  
  let statusHtml = '<div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">';
  statusHtml += '<h4 class="text-sm font-semibold text-blue-800 mb-2">Configuration Status</h4>';
  
  const auditTypes = ['eslint', 'stylelint', 'security', 'performance', 'accessibility', 'testing', 'dependency'];
  
  auditTypes.forEach(type => {
    statusHtml += `<div class="flex items-center justify-between py-1">`;
    statusHtml += `<span class="text-sm capitalize">${type}:</span>`;
    statusHtml += `<div class="flex items-center space-x-2">`;
    statusHtml += `<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Default</span>`;
    statusHtml += `</div></div>`;
  });
  
  statusHtml += '<div class="mt-3 pt-3 border-t border-blue-200">';
  statusHtml += '<p class="text-xs text-blue-700">💡 Dashboard shows default exclude rules. Custom config is applied during CLI execution.</p>';
  statusHtml += '</div>';
  
  statusHtml += '</div>';
  configStatusDiv.innerHTML = statusHtml;
}