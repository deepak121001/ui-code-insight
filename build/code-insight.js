import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { execSync } from 'child_process';
import fsp, { mkdir, writeFile, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { ESLint } from 'eslint';
import { globby } from 'globby';
import stylelint from 'stylelint';
import fetch from 'node-fetch';
import pLimit from 'p-limit';

const copyFile = (sourcePath, targetPath) => {
  fs.copyFileSync(sourcePath, targetPath);
};

const copyStaticFiles = async (folderPath) => {
  const dist = "../build";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  await mkdir(folderPath, { recursive: true });
  const sourcePath = path.join(__dirname, dist, "index.html");
  const targetPath = path.join(folderPath, "index.html");
  copyFile(sourcePath, targetPath);
  const mainJsSourcePath = path.join(__dirname, dist, "bundle.js");
  const mainJsTargetPath = path.join(folderPath, "bundle.js");
  copyFile(mainJsSourcePath, mainJsTargetPath);
  const mainCssSourcePath = path.join(__dirname, dist, "bundle.css");
  const mainCssTargetPath = path.join(folderPath, "bundle.css");
  copyFile(mainCssSourcePath, mainCssTargetPath);
};

// Centralized globby file patterns for all audits

const defaultJsFilePathPattern = [
  '**/*.{js,ts,jsx,tsx}',
  '!**/node_modules/**',
  '!**/.storybook/**',
  '!**/storybook/**',
  '!**/report/**',
  '!build/**',
  '!dist/**',
  '!coverage/**',
  '!.git/**',
  '!bin/**',
  '!**/__dropins__/**',
  '!**/cypress/**',
  '!**/*.min.js',
];

const defaultHtmlFilePathPattern = [
  '**/*.{html,js,ts,jsx,tsx}',
  '!**/node_modules/**',
  '!**/.storybook/**',
  '!**/storybook/**',
  '!**/report/**',
  '!build/**',
  '!dist/**',
  '!coverage/**',
  '!.git/**',
  '!bin/**',
  '!**/__dropins__/**',
  '!**/cypress/**',
];

const defaultScssFilePathPattern = [
  '**/*.{scss,less,css}',
  '!**/node_modules/**',
  '!**/.storybook/**',
  '!**/storybook/**',
  '!**/report/**',
  '!build/**',
  '!dist/**',
  '!coverage/**',
  '!.git/**',
  '!bin/**',
  '!**/__dropins__/**',
  '!**/cypress/**',
];

const assetGlobs = [
  'public/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'assets/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'static/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'src/assets/**/*.{png,jpg,jpeg,bmp,tiff,gif}'
];

// Add more as needed for CSS, JSON, etc.

let cachedConfig = null;
let warnedAboutDefaultConfig = false;

function loadConfig() {
  if (cachedConfig) return cachedConfig;
  
  // Get the directory where this config-loader.js file is located
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Priority order for config file locations:
  // 1. Project root (where audit is run)
  // 2. Package directory (where tool is installed)
  // 3. Default empty config
  
  const possibleConfigPaths = [
    // Project root (current working directory)
    path.resolve(process.cwd(), 'ui-code-insight.config.json'),
    // Package directory (where this tool is installed)
    path.resolve(__dirname, '..', '..', 'ui-code-insight.config.json'),
    // Alternative package paths
    path.resolve(__dirname, '..', 'ui-code-insight.config.json'),
    path.resolve(__dirname, 'ui-code-insight.config.json')
  ];
  
  let configFound = false;
  
  for (const configPath of possibleConfigPaths) {
    if (fs.existsSync(configPath)) {
      try {
        cachedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`[ui-code-insight] ✅ Config loaded from: ${configPath}`);
        configFound = true;
        break;
      } catch (error) {
        console.warn(`[ui-code-insight] ⚠️  Error reading config from ${configPath}:`, error.message);
        continue;
      }
    }
  }
  
  if (!configFound) {
    cachedConfig = {};
    if (!warnedAboutDefaultConfig) {
      console.log('[ui-code-insight] ℹ️  No ui-code-insight.config.json found. Using default file patterns and settings.');
      console.log('[ui-code-insight] ℹ️  Searched locations:');
      possibleConfigPaths.forEach((configPath, index) => {
        console.log(`[ui-code-insight]    ${index + 1}. ${configPath}`);
      });
      warnedAboutDefaultConfig = true;
    }
  }
  
  return cachedConfig;
}

function getConfigPattern(key) {
  const config = loadConfig();
  if (key === 'jsFilePathPattern') return config.jsFilePathPattern || defaultJsFilePathPattern;
  if (key === 'htmlFilePathPattern') return config.htmlFilePathPattern || defaultHtmlFilePathPattern;
  if (key === 'scssFilePathPattern') return config.scssFilePathPattern || defaultScssFilePathPattern;
  return [];
}

function getExcludeRules(auditType) {
  const config = loadConfig();
  const excludeConfig = config.excludeRules || {};
  const auditConfig = excludeConfig[auditType] || {};
  
  return {
    enabled: auditConfig.enabled !== false, // Default to true
    overrideDefault: auditConfig.overrideDefault === true,
    additionalRules: auditConfig.additionalRules || []
  };
}

function getMergedExcludeRules(auditType, defaultRules) {
  const excludeConfig = getExcludeRules(auditType);
  
  if (!excludeConfig.enabled) {
    return [];
  }
  
  if (excludeConfig.overrideDefault) {
    return excludeConfig.additionalRules;
  }
  
  // Merge default rules with additional rules
  return [...defaultRules, ...excludeConfig.additionalRules];
}

// Default ESLint rules to exclude (commonly disabled by project architects)
const DEFAULT_ESLINT_EXCLUDE_RULES = [
  // Formatting and style rules
  'indent', 'quotes', 'semi', 'comma-dangle', 'no-trailing-spaces', 'eol-last',
  'no-multiple-empty-lines', 'space-before-function-paren', 'space-before-blocks',
  'keyword-spacing', 'space-infix-ops', 'object-curly-spacing', 'array-bracket-spacing',
  'comma-spacing', 'key-spacing', 'brace-style', 'camelcase', 'new-cap',
  'no-underscore-dangle', 'no-unused-vars', 'no-console', 'no-debugger',
  'prefer-const', 'no-var', 'arrow-spacing', 'no-spaced-func', 'func-call-spacing',
  'no-multi-spaces', 'no-trailing-spaces', 'no-mixed-spaces-and-tabs',
  'no-tabs', 'no-mixed-operators', 'operator-linebreak', 'nonblock-statement-body-position',
  'no-else-return', 'no-nested-ternary', 'no-unneeded-ternary', 'object-shorthand',
  'prefer-template', 'template-curly-spacing', 'prefer-arrow-callback', 'arrow-body-style',
  'no-duplicate-imports', 'import/order', 'import/no-unresolved', 'import/extensions',
  'import/no-extraneous-dependencies', 'import/prefer-default-export',
  'react/jsx-indent', 'react/jsx-indent-props', 'react/jsx-closing-bracket-location',
  'react/jsx-closing-tag-location', 'react/jsx-curly-spacing', 'react/jsx-equals-spacing',
  'react/jsx-first-prop-new-line', 'react/jsx-max-props-per-line', 'react/jsx-one-expression-per-line',
  'react/jsx-props-no-multi-spaces', 'react/jsx-tag-spacing', 'react/jsx-wrap-multilines',
  'react/self-closing-comp', 'react/jsx-boolean-value', 'react/jsx-curly-brace-presence',
  'react/jsx-no-bind', 'react/jsx-no-literals', 'react/jsx-pascal-case',
  'react/jsx-sort-default-props', 'react/jsx-sort-props', 'react/no-array-index-key',
  'react/no-danger', 'react/no-deprecated', 'react/no-did-mount-set-state',
  'react/no-did-update-set-state', 'react/no-direct-mutation-state',
  'react/no-find-dom-node', 'react/no-is-mounted', 'react/no-multi-comp',
  'react/no-render-return-value', 'react/no-set-state', 'react/no-string-refs',
  'react/no-unescaped-entities', 'react/no-unknown-property', 'react/no-unsafe',
  'react/no-unused-prop-types', 'react/no-unused-state', 'react/prefer-es6-class',
  'react/prefer-stateless-function', 'react/prop-types', 'react/react-in-jsx-scope',
  'react/require-default-props', 'react/require-optimization', 'react/require-render-return',
  'react/sort-comp', 'react/sort-prop-types', 'react/style-prop-object',
  'react/void-dom-elements-no-children', 'react/jsx-key', 'react/jsx-no-duplicate-props',
  'react/jsx-no-undef', 'react/jsx-uses-react', 'react/jsx-uses-vars',
  'react/no-array-index-key', 'react/no-danger', 'react/no-deprecated',
  'react/no-did-mount-set-state', 'react/no-did-update-set-state',
  'react/no-direct-mutation-state', 'react/no-find-dom-node', 'react/no-is-mounted',
  'react/no-multi-comp', 'react/no-render-return-value', 'react/no-set-state',
  'react/no-string-refs', 'react/no-unescaped-entities', 'react/no-unknown-property',
  'react/no-unsafe', 'react/no-unused-prop-types', 'react/no-unused-state',
  'react/prefer-es6-class', 'react/prefer-stateless-function', 'react/prop-types',
  'react/react-in-jsx-scope', 'react/require-default-props', 'react/require-optimization',
  'react/require-render-return', 'react/sort-comp', 'react/sort-prop-types',
  'react/style-prop-object', 'react/void-dom-elements-no-children'
];

// Constants for configuration files
const CONFIG_FOLDER$3 = "config";
const ESLINTRC_JSON$2 = ".eslintrc.json";
const ESLINTRC_JS$1 = ".eslintrc.js";
const ESLINTRC_YML$1 = ".eslintrc.yml";
const ESLINTRC$1 = ".eslintrc";
const ESLINTRC_REACT$1 = "eslintrc.react.json";
const ESLINTRC_NODE$1 = "eslintrc.node.json";
const ESLINTRC_VANILLA$1 = "eslintrc.vanilla.json";
const ESLINTRC_TS$1 = "eslintrc.typescript.json";
const ESLINTRC_TSREACT$1 = "eslintrc.tsreact.json";

/**
 * Function to determine ESLint configuration file path
 * @param {boolean} recommendedLintRules
 * @param {string} projectType
 * @returns {string} lintConfigFile
 */
const getLintConfigFile$3 = (recommendedLintRules, projectType = '') => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let configFileName = ESLINTRC_JSON$2;

  if (projectType.toLowerCase() === 'react') {
    configFileName = ESLINTRC_REACT$1;
  } else if (projectType.toLowerCase() === 'node') {
    configFileName = ESLINTRC_NODE$1;
  } else if (projectType.toLowerCase() === 'vanilla') {
    configFileName = ESLINTRC_VANILLA$1;
  } else if (projectType.toLowerCase() === 'typescript') {
    configFileName = ESLINTRC_TS$1;
  } else if (projectType.toLowerCase() === 'typescript + react' || projectType.toLowerCase() === 'tsreact') {
    configFileName = ESLINTRC_TSREACT$1;
  }

  const configFilePath = path.join(__dirname, CONFIG_FOLDER$3, configFileName);
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // fallback to default logic
  const recommendedLintRulesConfigFile = path.join(
    __dirname,
    CONFIG_FOLDER$3,
    ESLINTRC_JSON$2
  );
  const moduleDir = path.join(process.cwd(), "node_modules", "ui-code-insight");
  const eslintLintFilePathFromModule = path.join(moduleDir, ESLINTRC_JSON$2);

  if (recommendedLintRules) {
    return recommendedLintRulesConfigFile;
  }

  const configFiles = [
    ESLINTRC$1,
    ESLINTRC_JS$1,
    ESLINTRC_YML$1,
    ESLINTRC_JSON$2,
    eslintLintFilePathFromModule,
  ];

  return configFiles.find((file) => fs.existsSync(file));
};

/**
 * Function to lint a single file
 * @param {string} filePath
 * @param {ESLint} eslint
 * @returns {Promise<Object|null>} lint result
 */
const lintFile$1 = async (filePath, eslint) => {
  try {
    // Read file content
    const data = await readFile(filePath, "utf8");

    // Lint the file
    const messages = await eslint.lintText(data, {
      filePath,
    });

    // if (messages[0].errorCount) {
    //   logError(filePath);
    // } else if (messages[0].warningCount) {
    //   logWarning(filePath);
    // } else {
    //   logSuccess(filePath);
    // }

    return {
      filePath,
      errorCount: messages[0].errorCount,
      warningCount: messages[0].warningCount,
      messages: messages[0].messages,
    };
  } catch (err) {
    console.error(chalk.red(`Error reading file ${filePath}: ${err}`));
    return null;
  }
};

const BATCH_SIZE$2 = 5;

/**
 * Function to lint all files
 * @param {Array<string>} files
 * @param {string} folderPath
 * @param {ESLint} eslint
 * @param {string} projectType
 * @param {Array<string>} reports
 */
const lintAllFiles$1 = async (files, folderPath, eslint, projectType, reports) => {
  console.log(
    chalk.green(
      `Total files count is ${files.length} This linting task will take some time.`
    )
  );

  // Get merged exclude rules from config
  const excludeRules = getMergedExcludeRules('eslint', DEFAULT_ESLINT_EXCLUDE_RULES);

  let results = [];
  let processed = 0;
  for (let i = 0; i < files.length; i += BATCH_SIZE$2) {
    const batch = files.slice(i, i + BATCH_SIZE$2);
    const batchResults = await Promise.all(batch.map(async (filePath) => {
      processed++;
      process.stdout.write(`\r[ESLint] Progress: ${processed}/${files.length} files checked`);
      return await lintFile$1(filePath, eslint);
    }));
    results.push(...batchResults);
  }
  process.stdout.write(`\r[ESLint] Progress: ${files.length}/${files.length} files checked\n`);

  const jsonReport = {
    projectType,
    reports,
    excludeRules: {
      enabled: excludeRules.length > 0,
      rules: excludeRules,
      count: excludeRules.length
    },
    results: results.map((result) => ({
      filePath: result?.filePath,
      errorCount: result?.errorCount,
      warningCount: result?.warningCount,
      messages: result?.messages
        .filter(message => !excludeRules.includes(message.ruleId))
        .map((message) => ({
          ruleId: message.ruleId,
          severity: message.severity,
          line: message.line,
          column: message.column,
          endLine: message.endLine,
          endColumn: message.endColumn,
          message: message.message,
          fix: message.fix,
          suggestions: message.suggestions,
          fatal: message.fatal,
        })),
    })),
  };

  await writeFile(
    path.join(folderPath, "eslint-report.json"),
    JSON.stringify(jsonReport, null, 2)
  );
};

/**
 * Function for linting all matched files
 * @param {String} folderPath
 * @param {String} jsFilePathPattern
 * @param {Boolean} recommendedLintRules
 * @param {String} projectType
 * @param {Array<string>} reports
 */
const generateESLintReport = async (
  folderPath,
  recommendedLintRules,
  projectType = '',
  reports = []
) => {
  const lintConfigFile = getLintConfigFile$3(recommendedLintRules, projectType);
  if (!lintConfigFile) {
    throw new Error(".eslintrc file is missing");
  }

  console.log(chalk.blue(`Using ESLint config: ${lintConfigFile}`));

  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfigFile: lintConfigFile,
  });

  const files = await globby(getConfigPattern('jsFilePathPattern'));
  console.log(chalk.blue(`📁 ESLint scanning ${files.length} files with pattern: ${getConfigPattern('jsFilePathPattern').join(', ')}`));
  // console.log(chalk.gray(`Files being processed:`));
  // files.slice(0, 10).forEach(file => console.log(chalk.gray(`  - ${file}`)));
  // if (files.length > 10) {
  //   console.log(chalk.gray(`  ... and ${files.length - 10} more files`));
  // }
  await lintAllFiles$1(files, folderPath, eslint, projectType, reports);

  try {
    const auditOutput = execSync('npm audit --json', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    try {
      // Only try to parse if output looks like JSON
      if (auditOutput.trim().startsWith('{')) {
        const audit = JSON.parse(auditOutput);
        // ... process audit ...
      } else {
        console.warn(chalk.yellow('npm audit did not return JSON output.'));
        console.warn(auditOutput);
      }
    } catch (parseErr) {
      console.warn(chalk.yellow('⚠️ Could not parse audit JSON. Output was:'));
      console.warn(auditOutput);
    }
  } catch (error) {
    // ... existing error handling ...
  }
};

const { lint } = stylelint;

// Default Stylelint rules to exclude (commonly disabled by project architects)
const DEFAULT_STYLELINT_EXCLUDE_RULES = [
  // Formatting and style rules
  'indentation', 'string-quotes', 'color-hex-case', 'color-hex-length',
  'color-named', 'color-no-invalid-hex', 'font-family-name-quotes',
  'font-weight-notation', 'function-calc-no-unspaced-operator',
  'function-comma-newline-after', 'function-comma-newline-before',
  'function-comma-space-after', 'function-comma-space-before',
  'function-max-empty-lines', 'function-name-case', 'function-parentheses-newline-inside',
  'function-parentheses-space-inside', 'function-url-quotes', 'function-whitespace-after',
  'number-leading-zero', 'number-max-precision', 'number-no-trailing-zeros',
  'string-no-newline', 'unit-case', 'unit-no-unknown', 'value-keyword-case',
  'value-list-comma-newline-after', 'value-list-comma-newline-before',
  'value-list-comma-space-after', 'value-list-comma-space-before',
  'value-list-max-empty-lines', 'value-no-vendor-prefix', 'property-case',
  'property-no-vendor-prefix', 'declaration-bang-space-after',
  'declaration-bang-space-before', 'declaration-colon-newline-after',
  'declaration-colon-space-after', 'declaration-colon-space-before',
  'declaration-block-no-duplicate-properties', 'declaration-block-no-redundant-longhand-properties',
  'declaration-block-no-shorthand-property-overrides', 'declaration-block-semicolon-newline-after',
  'declaration-block-semicolon-newline-before', 'declaration-block-semicolon-space-after',
  'declaration-block-semicolon-space-before', 'declaration-block-trailing-semicolon',
  'block-closing-brace-empty-line-before', 'block-closing-brace-newline-after',
  'block-closing-brace-newline-before', 'block-closing-brace-space-after',
  'block-closing-brace-space-before', 'block-no-empty', 'block-opening-brace-newline-after',
  'block-opening-brace-newline-before', 'block-opening-brace-space-after',
  'block-opening-brace-space-before', 'selector-attribute-brackets-space-inside',
  'selector-attribute-operator-space-after', 'selector-attribute-operator-space-before',
  'selector-attribute-quotes', 'selector-combinator-space-after',
  'selector-combinator-space-before', 'selector-descendant-combinator-no-non-space',
  'selector-max-compound-selectors', 'selector-max-specificity', 'selector-no-qualifying-type',
  'selector-pseudo-class-case', 'selector-pseudo-class-no-unknown',
  'selector-pseudo-class-parentheses-space-inside', 'selector-pseudo-element-case',
  'selector-pseudo-element-colon-notation', 'selector-pseudo-element-no-unknown',
  'selector-type-case', 'selector-type-no-unknown', 'selector-max-empty-lines',
  'rule-empty-line-before', 'at-rule-empty-line-before', 'at-rule-name-case',
  'at-rule-name-newline-after', 'at-rule-name-space-after', 'at-rule-no-unknown',
  'at-rule-semicolon-newline-after', 'at-rule-semicolon-space-before',
  'comment-empty-line-before', 'comment-no-empty', 'comment-whitespace-inside',
  'comment-word-blacklist', 'max-empty-lines', 'max-line-length', 'max-nesting-depth',
  'no-browser-hacks', 'no-descending-specificity', 'no-duplicate-selectors',
  'no-empty-source', 'no-eol-whitespace', 'no-extra-semicolons', 'no-invalid-double-slash-comments',
  'no-missing-end-of-source-newline', 'no-unknown-animations', 'alpha-value-notation',
  'color-function-notation', 'hue-degree-notation', 'import-notation',
  'keyframe-selector-notation', 'media-feature-name-value-allowed-list',
  'media-feature-range-notation', 'selector-not-notation', 'shorthand-property-no-redundant-values',
  
  // Naming convention rules commonly disabled
  'selector-class-pattern',
  'selector-id-pattern',
  'selector-nested-pattern',
  'custom-property-pattern',
  'keyframes-name-pattern',
  'class-name-pattern',
  'id-pattern',
  
  // SCSS specific rules commonly disabled
  'scss/selector-no-redundant-nesting-selector',
  'scss/at-rule-no-unknown',
  'scss/at-import-partial-extension',
  'scss/at-import-no-partial-leading-underscore',
  'scss/at-import-partial-extension-blacklist',
  'scss/at-import-partial-extension-whitelist',
  'scss/at-rule-conditional-no-parentheses',
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
  'scss/selector-nest-combinators',
  'scss/selector-no-union-class-name'
];

// Constants for configuration files
const CONFIG_FOLDER$2 = "config";
const STYLELINTRC_JSON = ".stylelintrc.json";
const STYLELINTRC_JS = ".stylelintrc.js";
const STYLELINTRC_YML = ".stylelintrc.yml";
const STYLELINTRC_CONFIG = "stylelint.config.js";

/**
 * Function to determine Stylelint configuration file path
 * @param {boolean} recommendedLintRules
 * @returns {string} lintStyleConfigFile
 */
const getLintConfigFile$2 = (recommendedLintRules) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const recommendedLintRulesConfigFile = path.join(
    __dirname,
    CONFIG_FOLDER$2,
    STYLELINTRC_JSON
  );
  const moduleDir = path.join(process.cwd(), "node_modules", "ui-code-insight");
  const styleLintFilePathFromModule = path.join(moduleDir, STYLELINTRC_JSON);

  const configFiles = [
    STYLELINTRC_CONFIG,
    STYLELINTRC_JS,
    STYLELINTRC_YML,
    STYLELINTRC_JSON,
    styleLintFilePathFromModule,
  ];

  return recommendedLintRules
    ? recommendedLintRulesConfigFile
    : configFiles.find((file) => fs.existsSync(file));
};

/**
 * Function to handle errors during file reading
 * @param {string} filePath
 * @param {Error} error
 * @returns {null}
 */
const handleFileReadError = (filePath, error) => {
  console.error(chalk.red(`Error reading file ${filePath}: ${error}`));
  return null;
};

/**
 * Function to lint a single file
 * @param {string} filePath
 * @param {string} lintStyleConfigFile
 * @returns {Promise<Object|null>} lint result
 */
const lintFile = async (filePath, lintStyleConfigFile) => {
  try {
    // Read file content
    const data = await readFile(filePath, "utf8");
    // Lint the file
    const item = await lint({
      code: data,
      configFile: lintStyleConfigFile,
    });

    const output = JSON.parse(item.output);
    // if (output[0].errored) {
    //   logError(filePath);
    // } else {
    //   logSuccess(filePath);
    // }

    return {
      filePath,
      errorCount: output[0].warnings.length,
      warningCount: 0,
      messages: output[0].warnings.map((message) => ({
        line: message.line,
        column: message.column,
        endLine: message.endLine,
        endColumn: message.endColumn,
        severity: message.severity,
        rule: message.rule,
        message: message.text,
        fix: message.fix,
        suggestions: message.suggestions,
      })),
    };
  } catch (err) {
    return handleFileReadError(filePath, err);
  }
};

const BATCH_SIZE$1 = 5;

/**
 * Function to lint all files
 * @param {Array<string>} files
 * @param {string} folderPath
 * @param {string} lintStyleConfigFile
 */
const lintAllFiles = async (files, folderPath, lintStyleConfigFile, projectType, reports) => {
  console.log(
    chalk.green(
      `Total files count is ${files.length} This linting task will take some time.`
    )
  );

  // Get merged exclude rules from config
  const excludeRules = getMergedExcludeRules('stylelint', DEFAULT_STYLELINT_EXCLUDE_RULES);

  let results = [];
  let processed = 0;
  for (let i = 0; i < files.length; i += BATCH_SIZE$1) {
    const batch = files.slice(i, i + BATCH_SIZE$1);
    const batchResults = await Promise.all(batch.map(async (filePath) => {
      processed++;
      process.stdout.write(`\r[Stylelint] Progress: ${processed}/${files.length} files checked`);
      return await lintFile(filePath, lintStyleConfigFile);
    }));
    results.push(...batchResults);
  }
  process.stdout.write(`\r[Stylelint] Progress: ${files.length}/${files.length} files checked\n`);

  const jsonReport = {
    projectType,
    reports,
    excludeRules: {
      enabled: excludeRules.length > 0,
      rules: excludeRules,
      count: excludeRules.length
    },
    results: results.map(result => ({
      ...result,
      messages: result.messages.filter(message => !excludeRules.includes(message.rule))
    }))
  };

  await fs.promises.writeFile(
    path.join(folderPath, "stylelint-report.json"),
    JSON.stringify(jsonReport, null, 2)
  );
};

/**
 * Function for linting all matched files
 * @param {String} folderPath
 * @param {Boolean} recommendedLintRules
 * @param {String} projectType
 * @param {Array<string>} reports
 */
const generateStyleLintReport = async (
  folderPath,
  recommendedLintRules,
  projectType = '',
  reports = []
) => {
  const lintStyleConfigFile = getLintConfigFile$2(recommendedLintRules);
  if (!lintStyleConfigFile) {
    throw new Error(".stylelintrc.json file is missing");
  }

  // Use config-driven pattern for SCSS/CSS/LESS files
  const files = await globby(getConfigPattern('scssFilePathPattern'));

  await lintAllFiles(files, folderPath, lintStyleConfigFile, projectType, reports);
};

const kbToMb = (kilobytes) => kilobytes / 1024;

const generateNpmPackageReport = async () => {
  const folderPath = path.resolve(process.cwd(), "report");
  try {
    const data = await readFile("package.json", "utf8");
    const packageJson = JSON.parse(data);
    const dependencies = packageJson?.dependencies || {};
    const devDependencies = packageJson?.devDependencies || {};
    let npmPackagesData = {
      dependencies: [],
      devDependencies: [],
    };

    const processPackage = async (packageName, isDevDependency = false) => {
      // console.log(chalk.green(`Validating ${packageName}`));
      try {
        const response = await fetch(
          `https://registry.npmjs.org/${packageName}`
        );

        const packageInfo = await response.json();
        const {
          name,
          version,
          dist: { tarball, unpackedSize },
          license,
          bugs,
          description,
          deprecated,
        } = packageInfo?.versions[packageInfo["dist-tags"]?.latest];

        const packageData = {
          name,
          version,
          license,
          download: tarball,
          description,
          unpackedSize: unpackedSize
            ? `${kbToMb(unpackedSize).toFixed(2)} MB`
            : "Not available", // Convert to MB
          deprecated: deprecated ? "Deprecated" : "Not deprecated",
        };

        if (isDevDependency) {
          npmPackagesData.devDependencies.push(packageData);
        } else {
          npmPackagesData.dependencies.push(packageData);
        }
      } catch (err) {
        console.log(
          chalk.red(`Something went wrong with ${packageName} package`)
        );
      }
    };

    const depNames = Object.keys(dependencies);
    let processed = 0;
    for (const packageName of depNames) {
      processed++;
      process.stdout.write(`\r[NPM Packages] Progress: ${processed}/${depNames.length} dependencies checked`);
      await processPackage(packageName);
    }
    process.stdout.write(`\r[NPM Packages] Progress: ${depNames.length}/${depNames.length} dependencies checked\n`);

    // Process devDependencies
    const devDepNames = Object.keys(devDependencies);
    let devProcessed = 0;
    for (const packageName of devDepNames) {
      devProcessed++;
      process.stdout.write(`\r[NPM Dev Packages] Progress: ${devProcessed}/${devDepNames.length} devDependencies checked`);
      await processPackage(packageName, true);
    }
    process.stdout.write(`\r[NPM Dev Packages] Progress: ${devDepNames.length}/${devDepNames.length} devDependencies checked\n`);

    await writeFile(
      `${folderPath}/npm-report.json`,
      JSON.stringify(npmPackagesData, null, 2)
    );
  } catch (error) {
    console.error("Error:", error);
  }
};

// Function to make the API request
async function makeAPIRequest(
  accessToken,
  aemBasePath,
  aemContentPath,
  aemAppsPath,
  slingResourceTypeBase
) {
  const componentListQuery = new URLSearchParams();
  componentListQuery.append("p.limit", "-1");
  componentListQuery.append("path", aemAppsPath);
  componentListQuery.append("type", "cq:Component");

  // API endpoint URL
  const componentQueryURL = `${aemBasePath}/bin/querybuilder.json?${componentListQuery.toString()}`;

  // Create the headers object
  const headers = {
    Cookie: `login-token=${accessToken}`, // Set the access token as a cookie
  };

  // Make the API request
  const response = await fetch(componentQueryURL, { headers });

  // Parse the response
  const data = await response.json();

  let result = [];
  for (const component of data.hits) {
    const componentPropertiesQuery = new URLSearchParams();
    componentPropertiesQuery.append("p.limit", "5");
    componentPropertiesQuery.append("path", aemContentPath);
    componentPropertiesQuery.append("property", "sling:resourceType");
    componentPropertiesQuery.append(
      "property.value",
      `${slingResourceTypeBase}${component.name}`
    );
    componentPropertiesQuery.append("type", "nt:unstructured");

    // API endpoint URL
    const componentPropertiesURL = `${aemBasePath}/bin/querybuilder.json?${componentPropertiesQuery.toString()}`;
    const resp = await fetch(componentPropertiesURL, { headers });
    const json = await resp.json();
    result.push(Object.assign({}, component, { usageCount: await json.total }));
  }

  return result;
}

const generateComponentUsageReport = async (
  reportFolderPath,
  accessToken,
  aemBasePath,
  aemContentPath,
  aemAppsPath,
  slingResourceTypeBase
) => {
  const data = await makeAPIRequest(
    accessToken,
    aemBasePath,
    aemContentPath,
    aemAppsPath,
    slingResourceTypeBase
  );

  await writeFile(
    path.join(reportFolderPath, "component-usage-report.json"),
    JSON.stringify(data, null, 2)
  );

  return data;
};

/* eslint-disable no-console */

const folderName = "report";
const folderPath = path.resolve(process.cwd(), folderName);

const handleReportError = (message, error) => {
  console.error(chalk.red(`${message}: ${error}`));
};

/**
 * Copies static files to the report folder.
 * @async
 * @returns {Promise<void>}
 */
const createReportFolder = async () => {
  try {
    console.log(chalk.blue("Copying static files..."));
    await copyStaticFiles(folderPath);
    console.log(chalk.green("Static files copied successfully!"));
  } catch (err) {
    handleReportError("Error in copy Static Files", err);
  }
};

/**
 * Generates a component usage report.
 * @async
 * @param {string} authToken
 * @param {string} aemBasePath
 * @param {string} aemContentPath
 * @param {string} aemAppsPath
 * @param {string} slingResourceTypeBase
 * @returns {Promise<void>}
 */
const generateComponentUsageReportWrapper = async (
  authToken,
  aemBasePath,
  aemContentPath,
  aemAppsPath,
  slingResourceTypeBase
) => {
  try {
    if (authToken) {
      console.log(chalk.blue("Generating Component Usage report..."));
      await generateComponentUsageReport(
        folderPath,
        authToken,
        aemBasePath,
        aemContentPath,
        aemAppsPath,
        slingResourceTypeBase
      );
      console.log(
        chalk.green("Component Usage report generated successfully!")
      );
    } else {
      console.log(chalk.bold.yellow("AEM Auth Token is missing!"));
    }
  } catch (err) {
    handleReportError("Error generating Component Usage report", err);
  }
};

/**
 * Generates an ESLint report.
 * @async
 * @param {boolean} recommendedLintRules
 * @param {string} projectType
 * @param {Array<string>} reports
 * @returns {Promise<void>}
 */
const generateESLintReportWrapper = async (
  recommendedLintRules,
  projectType = '',
  reports = []
) => {
  try {
    console.log(chalk.blue("Generating ESLint report..."));
    await generateESLintReport(
      folderPath,
      recommendedLintRules,
      projectType,
      reports
    );
    console.log(chalk.green("ESLint report generated successfully!"));
  } catch (err) {
    handleReportError("Error generating ESLint report", err);
  }
};

/**
 * Generates a Stylelint report.
 * @async
 * @param {boolean} recommendedLintRules
 * @param {string} projectType
 * @param {Array<string>} reports
 * @returns {Promise<void>}
 */
const generateStyleLintReportWrapper = async (
  recommendedLintRules,
  projectType = '',
  reports = []
) => {
  try {
    console.log(chalk.blue("Generating Stylelint report..."));
    await generateStyleLintReport(
      folderPath,
      recommendedLintRules,
      projectType,
      reports
    );
    console.log(chalk.green("Stylelint report generated successfully!"));
  } catch (err) {
    handleReportError("Error generating Stylelint report", err);
  }
};

/**
 * Generates an npm package report.
 * @param {string} projectType
 * @param {Array<string>} reports
 * @returns {void}
 */
const generateNpmPackageReportWrapper = (projectType, reports) => {
  try {
    console.log(chalk.blue("Generating npm packages report..."));
    generateNpmPackageReport();
  } catch (err) {
    handleReportError("Error generating npm packages report", err);
  }
};

// Utility to copy config file to report directory if it exists
function copyConfigToReportFolder() {
  const src = path.resolve(process.cwd(), 'ui-code-insight.config.json');
  const dest = path.resolve(folderPath, 'ui-code-insight.config.json');
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('[ui-code-insight] Copied config to report directory for dashboard.');
  }
}

var audit = {
  createReportFolder,
  generateESLintReport: generateESLintReportWrapper,
  generateStyleLintReport: generateStyleLintReportWrapper,
  generateComponentUsageReport: generateComponentUsageReportWrapper,
  generateNpmPackageReport: generateNpmPackageReportWrapper,
  copyConfigToReportFolder, // Export for manual use if needed
};

// If this is the main module, run the copy after all reports are generated
if (import.meta.url === `file://${process.argv[1]}`) {
  copyConfigToReportFolder();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FOLDER$1 = "config";
const ESLINTRC_JSON$1 = ".eslintrc.json";
const ESLINTRC_JS = ".eslintrc.js";
const ESLINTRC_YML = ".eslintrc.yml";
const ESLINTRC = ".eslintrc";
const ESLINTRC_REACT = "eslintrc.react.json";
const ESLINTRC_NODE = "eslintrc.node.json";
const ESLINTRC_VANILLA = "eslintrc.vanilla.json";
const ESLINTRC_TS = "eslintrc.typescript.json";
const ESLINTRC_TSREACT = "eslintrc.tsreact.json";

const getLintConfigFile$1 = (recommendedLintRules = false, projectType = '') => {
  let configFileName = ESLINTRC_JSON$1;

  if (projectType && typeof projectType === 'string') {
    const type = projectType.toLowerCase();
    if (type === 'react') configFileName = ESLINTRC_REACT;
    else if (type === 'node') configFileName = ESLINTRC_NODE;
    else if (type === 'vanilla') configFileName = ESLINTRC_VANILLA;
    else if (type === 'typescript') configFileName = ESLINTRC_TS;
    else if (type === 'typescript + react' || type === 'tsreact') configFileName = ESLINTRC_TSREACT;
  }

  const configFilePath = path.join(__dirname, CONFIG_FOLDER$1, configFileName);
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // fallback to default logic
  const recommendedLintRulesConfigFile = path.join(__dirname, CONFIG_FOLDER$1, ESLINTRC_JSON$1);
  const moduleDir = path.join(process.cwd(), "node_modules", "ui-code-insight");
  const eslintLintFilePathFromModule = path.join(moduleDir, ESLINTRC_JSON$1);

  if (recommendedLintRules) {
    return recommendedLintRulesConfigFile;
  }

  const configFiles = [
    ESLINTRC,
    ESLINTRC_JS,
    ESLINTRC_YML,
    ESLINTRC_JSON$1,
    eslintLintFilePathFromModule,
  ];

  return configFiles.find((file) => fs.existsSync(file));
};

// Helper to get code and context lines
async function getCodeContext$1(filePath, line, contextRadius = 2) {
  try {
    const content = await fsp.readFile(filePath, "utf8");
    const lines = content.split('\n');
    const idx = line - 1;
    const start = Math.max(0, idx - contextRadius);
    const end = Math.min(lines.length - 1, idx + contextRadius);
    const code = (lines[idx] || '').slice(0, 200) + ((lines[idx] || '').length > 200 ? '... (truncated)' : '');
    const context = lines.slice(start, end + 1)
      .map((l, i) => {
        const n = start + i + 1;
        let lineText = l.length > 200 ? l.slice(0, 200) + '... (truncated)' : l;
        const marker = n === line ? '>>>' : '   ';
        return `${marker} ${n}: ${lineText}`;
      }).join('\n');
    return { code, context };
  } catch {
    return { code: '', context: '' };
  }
}

class SecurityAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.securityIssues = [];
  }

  printContext(lines, index) {
    const contextStart = Math.max(0, index - 2);
    const contextEnd = Math.min(lines.length - 1, index + 2);
    return lines.slice(contextStart, contextEnd + 1)
      .map((line, i) => {
        const lineNum = contextStart + i + 1;
        const marker = lineNum === index + 1 ? chalk.red('>>>') : '   ';
        return `${marker} ${lineNum}: ${line}`;
      }).join('\n');
  }

  /**
   * Check for hardcoded secrets
   */
  async checkForSecrets() {
    console.log(chalk.blue('🔒 Checking for hardcoded secrets...'));
  
    const secretPatterns = [
      /\b(const|let|var)\s+\w*(password|api[_-]?key|secret|token|auth|access[_-]?token|refresh[_-]?token|private[_-]?key|client[_-]?id|client[_-]?secret|firebase[_-]?key|connection\s*string)\w*\s*=\s*['"][^'"`]+['"]/i,
      /['"]?(password|api[_-]?key|secret|token|auth|access[_-]?token|refresh[_-]?token|private[_-]?key|client[_-]?id|client[_-]?secret)['"]?\s*:\s*['"][^'"`]+['"]/i,
      /\b(PASSWORD|SECRET|TOKEN|KEY|ACCESS_KEY|PRIVATE_KEY)\s*=\s*[^'"`\n\r]+/i,
      /-----BEGIN\s+\w+PRIVATE KEY-----[\s\S]+?-----END\s+\w+PRIVATE KEY-----/g,
      /\b(const|let|var)\s+\w*(api|access|secret|auth|token|key)\w*\s*=\s*['"][\w\-]{16,}['"]/i,
    ];
  
    const CONCURRENCY = 10; // Limit number of files processed in parallel
    const BATCH_SIZE = 50; // Process files in batches
    try {
      const files = await globby(getConfigPattern('jsFilePathPattern'), {
        absolute: true,
      });
      console.log(chalk.gray(`📁 Scanning ${files.length} files for secrets...`));
      const limit = pLimit(CONCURRENCY);
      let processed = 0;
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(file => limit(async () => {
          try {
            const content = await fsp.readFile(file, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('//')) return;
              for (const pattern of secretPatterns) {
                if (
                  pattern.test(trimmed) &&
                  /=\s*['"][^'"`]+['"]/ .test(trimmed) &&
                  !/(===|!==|==|!=)/.test(trimmed) &&
                  !/\w+\s*\(/.test(trimmed) &&
                  !/`.*`/.test(trimmed)
                ) {
                  this.securityIssues.push({
                    type: 'hardcoded_secret',
                    file,
                    line: index + 1,
                    severity: 'high',
                    message: 'Potential hardcoded secret detected',
                    code: trimmed,
                    context: this.printContext(lines, index),
                  });
                  break;
                }
              }
            });
            // Release memory
            for (let j = 0; j < lines.length; j++) lines[j] = null;
          } catch (err) {
            console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
          }
          processed++;
          if (processed % 25 === 0 || processed === files.length) {
            process.stdout.write(`\rProgress: ${processed}/${files.length} files processed`);
          }
        })));
        // Optionally force garbage collection if available
        if (global.gc) global.gc();
      }
      // Final progress output
      process.stdout.write(`\rProgress: ${files.length}/${files.length} files processed\n`);
    } catch (err) {
      console.error(chalk.red(`❌ Failed to glob files: ${err.message}`));
    }
  }
  
  /**
   * Common function to scan files with given patterns
   */
  async patternScan(files, patterns, type) {
    const CONCURRENCY = 10;
    const BATCH_SIZE = 50;
    const limit = pLimit(CONCURRENCY);
    let processed = 0;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(file => limit(async () => {
        try {
          const content = await fs.readFile(file, 'utf8');
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) return;
            patterns.forEach(({ pattern, message, severity }) => {
              if (pattern.test(trimmed)) {
                this.securityIssues.push({
                  type,
                  file,
                  line: index + 1,
                  severity,
                  message,
                  code: trimmed,
                  context: this.printContext(lines, index)
                });
              }
            });
          });
          // Release memory
          for (let j = 0; j < lines.length; j++) lines[j] = null;
        } catch {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}`));
        }
        processed++;
        if (processed % 25 === 0 || processed === files.length) {
          process.stdout.write(`\rProgress: ${processed}/${files.length} files processed`);
        }
      })));
      if (global.gc) global.gc();
    }
    // Final progress output
    process.stdout.write(`\rProgress: ${files.length}/${files.length} files processed\n`);
  }

/**
   * Check for outdated dependencies with known vulnerabilities
   */
async checkDependencyVulnerabilities() {
  console.log(chalk.blue('🔒 Checking for dependency vulnerabilities...'));
  
  try {
    // Run npm audit to check for vulnerabilities
    const auditResult = execSync('npm audit --json', { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    const auditData = JSON.parse(auditResult);
    
    if (auditData.vulnerabilities && Object.keys(auditData.vulnerabilities).length > 0) {
      Object.keys(auditData.vulnerabilities).forEach(packageName => {
        const vuln = auditData.vulnerabilities[packageName];
        this.securityIssues.push({
          type: 'dependency_vulnerability',
          package: packageName,
          severity: vuln.severity || 'medium',
          message: `Vulnerability in ${packageName}: ${vuln.title || 'Unknown vulnerability'}`,
          recommendation: vuln.recommendation || 'Update package version'
        });
      });
    } else {
      // No vulnerabilities found - this is good!
      this.securityIssues.push({
        type: 'no_vulnerabilities',
        severity: 'info',
        message: 'No known vulnerabilities found in dependencies',
        positive: true
      });
    }
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities are found
    if (error.status === 1) {
      try {
        const output = error.stdout.toString();
        const auditData = JSON.parse(output);
        
        if (auditData.vulnerabilities) {
          Object.keys(auditData.vulnerabilities).forEach(packageName => {
            const vuln = auditData.vulnerabilities[packageName];
            this.securityIssues.push({
              type: 'dependency_vulnerability',
              package: packageName,
              severity: vuln.severity || 'medium',
              message: `Vulnerability in ${packageName}: ${vuln.title || 'Unknown vulnerability'}`,
              recommendation: vuln.recommendation || 'Update package version'
            });
          });
        }
      } catch (parseError) {
        console.warn(chalk.yellow('Warning: Could not parse npm audit results'));
      }
    } else {
      console.warn(chalk.yellow('Warning: Could not run npm audit - this may be due to network issues or npm configuration'));
    }
  }
}

  async checkESLintSecurityIssues() {
    console.log(chalk.blue('🔍 Checking for security issues with ESLint plugins...'));
    const issuesFile = path.join(this.folderPath, 'security-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(issuesFile)) fs.unlinkSync(issuesFile);
    const stream = fs.createWriteStream(issuesFile, { flags: 'a' });
    try {
      const eslintConfig = getLintConfigFile$1();
      if (!eslintConfig) {
        throw new Error(".eslintrc file is missing");
      }
      const eslint = new ESLint({
        useEslintrc: false,
        overrideConfigFile: eslintConfig,
      });
      const files = await globby(getConfigPattern('jsFilePathPattern'));
      let processed = 0;
      for (const file of files) {
        try {
          const results = await eslint.lintFiles([file]);
          for (const result of results) {
            for (const message of result.messages) {
              if (
                message.ruleId &&
                (
                  message.ruleId.startsWith('security/') ||
                  message.ruleId.startsWith('no-unsanitized/') ||
                  message.ruleId === 'no-unsanitized/method' ||
                  message.ruleId === 'no-unsanitized/property'
                )
              ) {
                const { code, context } = await getCodeContext$1(result.filePath, message.line);
                const issue = {
                  type: 'eslint_security',
                  file: result.filePath,
                  line: message.line,
                  severity: message.severity === 2 ? 'high' : 'medium',
                  message: message.message,
                  ruleId: message.ruleId,
                  code,
                  context,
                  source: 'eslint'
                };
                stream.write(JSON.stringify(issue) + '\n');
              }
            }
          }
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ ESLint failed on file ${file}: ${err.message}`));
        }
        processed++;
        if (processed % 10 === 0 || processed === files.length) {
          process.stdout.write(`\rESLint Progress: ${processed}/${files.length} files checked`);
        }
        if (global.gc) global.gc();
      }
      process.stdout.write(`\rESLint Progress: ${files.length}/${files.length} files checked\n`);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not run ESLint for security plugin checks'));
      if (error && error.message) {
        console.warn(chalk.yellow(error.message));
      }
    } finally {
      stream.end();
    }
    // After all files, read issues from file and add to this.securityIssues
    if (fs.existsSync(issuesFile)) {
      const lines = fs.readFileSync(issuesFile, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          this.securityIssues.push(JSON.parse(line));
        } catch {}
      }
    }
  }
  
  async runSecurityAudit() {
    console.log(chalk.cyan.bold('\n🔍 Running Full Security Audit...'));
    //await this.checkDependencyVulnerabilities();
    await this.checkForSecrets();
    await this.checkESLintSecurityIssues();

    // Deduplicate issues and mark source
    const uniqueIssues = [];
    const seen = new Set();
    for (const issue of this.securityIssues) {
      if (!issue.source) issue.source = 'custom';
      const key = `${issue.file || ''}:${issue.line || ''}:${issue.ruleId || issue.type}:${issue.message}`;
      if (!seen.has(key)) {
        uniqueIssues.push(issue);
        seen.add(key);
      }
    }
    this.securityIssues = uniqueIssues;

    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.securityIssues.length,
      highSeverity: this.securityIssues.filter(i => i.severity === 'high').length,
      mediumSeverity: this.securityIssues.filter(i => i.severity === 'medium').length,
      lowSeverity: this.securityIssues.filter(i => i.severity === 'low').length,
      issues: this.securityIssues
    };

    const reportPath = path.join(this.folderPath, 'security-audit-report.json');
    await fsp.writeFile(reportPath, JSON.stringify(results, null, 2));

    console.log(chalk.green(`\n✅ Report saved: ${reportPath}`));
    console.log(chalk.bold(`\n📋 Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`🔴 High: ${results.highSeverity}`));
    console.log(chalk.yellow(`🟠 Medium: ${results.mediumSeverity}`));
    console.log(chalk.blue(`🔵 Low: ${results.lowSeverity}`));

    return results;
  }
}

const CONFIG_FOLDER = "config";
const ESLINTRC_JSON = ".eslintrc.json";
const getLintConfigFile = (recommendedLintRules = false, projectType = '') => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let configFileName = ESLINTRC_JSON;
  const configFilePath = path.join(__dirname, CONFIG_FOLDER, configFileName);
  if (fs.existsSync(configFilePath)) return configFilePath;
  return null;
};

async function getCodeContext(filePath, line, contextRadius = 2) {
  try {
    const content = await fsp.readFile(filePath, "utf8");
    const lines = content.split('\n');
    const idx = line - 1;
    const start = Math.max(0, idx - contextRadius);
    const end = Math.min(lines.length - 1, idx + contextRadius);
    const code = (lines[idx] || '').slice(0, 200) + ((lines[idx] || '').length > 200 ? '... (truncated)' : '');
    const context = lines.slice(start, end + 1)
      .map((l, i) => {
        const n = start + i + 1;
        let lineText = l.length > 200 ? l.slice(0, 200) + '... (truncated)' : l;
        const marker = n === line ? '>>>' : '   ';
        return `${marker} ${n}: ${lineText}`;
      }).join('\n');
    return { code, context };
  } catch {
    return { code: '', context: '' };
  }
}

/**
 * Performance audit module for detecting performance issues
 */
class PerformanceAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.performanceIssues = [];
    this.issuesFile = path.join(this.folderPath, 'performance-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) fs.unlinkSync(this.issuesFile);
    this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
  }

  async addPerformanceIssue(issue) {
    this.issueStream.write(JSON.stringify(issue) + '\n');
  }

  /**
   * Check for large bundle sizes
   */
  async checkBundleSize() {
    console.log(chalk.blue('⚡ Checking bundle sizes...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};
      
      // Check if build script exists and run it to analyze bundle
      if (scripts.build) {
        try {
          execSync('npm run build', { stdio: 'pipe' });
          
          // Look for build output directories
          const buildDirs = ['dist', 'build', 'out'];
          for (const dir of buildDirs) {
            if (fs.existsSync(dir)) {
              const files = await globby([`${dir}/**/*.{js,css}`]);
              let totalSize = 0;
              
              for (const file of files) {
                const stats = fs.statSync(file);
                totalSize += stats.size;
              }
              
              const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
              
              if (totalSize > 1024 * 1024) { // 1MB threshold
                await this.addPerformanceIssue({
                  type: 'large_bundle',
                  severity: 'medium',
                  message: `Bundle size is ${sizeInMB}MB, consider code splitting`,
                  recommendation: 'Implement code splitting and lazy loading'
                });
              }
            }
          }
        } catch (error) {
          console.warn(chalk.yellow('Warning: Could not run build script'));
        }
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not read package.json'));
    }
  }

  /**
   * Check for inefficient loops and operations
   */
  async checkInefficientOperations() {
    console.log(chalk.blue('⚡ Checking for inefficient operations...'));
    const inefficientPatterns = [
      {
        pattern: /for\s*\(\s*let\s+\w+\s*=\s*0;\s*\w+\s*<\s*array\.length;\s*\w+\+\+\)/g,
        message: 'Consider using forEach or for...of instead of traditional for loop',
        severity: 'low'
      },
      {
        pattern: /\.map\(.*\)\.filter\(.*\)/g,
        message: 'Consider combining map and filter operations',
        severity: 'low'
      },
      {
        pattern: /\.filter\(.*\)\.map\(.*\)/g,
        message: 'Consider combining filter and map operations',
        severity: 'low'
      },
      {
        pattern: /JSON\.parse\(JSON\.stringify\(/g,
        message: 'Deep cloning with JSON.parse/stringify is inefficient',
        severity: 'medium'
      },
      {
        pattern: /\.innerHTML\s*=\s*['"`][^'"`]*['"`]/g,
        message: 'Consider using textContent for text-only content',
        severity: 'low'
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
            for (const { pattern, message, severity } of inefficientPatterns) {
              if (pattern.test(line)) {
                const { code, context } = await getCodeContext(file, index + 1);
                await this.addPerformanceIssue({
                  type: 'inefficient_operation',
                  file,
                  line: index + 1,
                  severity,
                  message,
                  code,
                  context,
                  source: 'custom'
                });
              }
            }
          }
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
        }
      }
    } catch (err) {
      console.error(chalk.red(`❌ Failed to glob files: ${err.message}`));
    }
  }

  /**
   * Check for memory leaks
   */
  async checkMemoryLeaks() {
    console.log(chalk.blue('⚡ Checking for potential memory leaks...'));
    const memoryLeakPatterns = [
      {
        pattern: /addEventListener\([^)]+\)(?!\s*removeEventListener)/g,
        message: 'Event listener added without removal - potential memory leak',
        severity: 'medium'
      },
      {
        pattern: /setInterval\([^)]+\)(?!\s*clearInterval)/g,
        message: 'setInterval used without clearInterval - potential memory leak',
        severity: 'high'
      },
      {
        pattern: /setTimeout\([^)]+\)(?!\s*clearTimeout)/g,
        message: 'setTimeout used without clearTimeout - potential memory leak',
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
            for (const { pattern, message, severity } of memoryLeakPatterns) {
              if (pattern.test(line)) {
                const { code, context } = await getCodeContext(file, index + 1);
                await this.addPerformanceIssue({
                  type: 'memory_leak',
                  file,
                  line: index + 1,
                  severity,
                  message,
                  code,
                  context,
                  source: 'custom'
                });
              }
            }
          }
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
        }
      }
    } catch (err) {
      console.error(chalk.red(`❌ Failed to glob files: ${err.message}`));
    }
  }

  /**
   * Check for large dependencies
   */
  async checkLargeDependencies() {
    console.log(chalk.blue('⚡ Checking for large dependencies...'));
    try {
      const data = await fsp.readFile("package.json", "utf8");
      const packageJson = JSON.parse(data);
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      const largePackages = [
        'lodash', 'moment', 'date-fns', 'ramda', 'immutable',
        'bootstrap', 'material-ui', 'antd', 'semantic-ui',
      ];
      largePackages.forEach(async pkg => {
        if (allDeps[pkg]) {
          await this.addPerformanceIssue({
            type: 'large_dependency',
            package: pkg,
            severity: 'low',
            message: `Large dependency detected: ${pkg}`,
            recommendation: 'Consider using lighter alternatives or tree-shaking',
          });
        }
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(chalk.yellow('No package.json found in this directory. Please run the audit from the root of a Node.js project.'));
      } else {
        console.warn(chalk.yellow('Warning: Could not read package.json'));
        console.warn(chalk.gray(error.message));
      }
    }
  }

  /**
   * Check for unused imports and dead code
   */
  async checkUnusedCode() {
    console.log(chalk.blue('⚡ Checking for unused code...'));
    try {
      const eslintConfig = getLintConfigFile();
      if (!eslintConfig) {
        throw new Error(".eslintrc file is missing");
      }
      const eslint = new ESLint({
        useEslintrc: false,
        overrideConfigFile: eslintConfig,
      });
      const files = await globby(getConfigPattern('jsFilePathPattern'));
      const results = await eslint.lintFiles(files);
      for (const file of results) {
        for (const message of file.messages) {
          if (
            message.ruleId === 'no-unused-vars' ||
            message.ruleId === '@typescript-eslint/no-unused-vars'
          ) {
            const { code, context } = await getCodeContext(file.filePath, message.line);
            await this.addPerformanceIssue({
              type: 'unused_code',
              file: file.filePath,
              line: message.line,
              severity: 'low',
              message: 'Unused variable or import detected',
              ruleId: message.ruleId,
              code,
              context,
              source: 'eslint'
            });
          }
        }
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not run ESLint for unused code check'));
      if (error && error.message) {
        console.warn(chalk.yellow(error.message));
      }
    }
  }

  /**
   * Detect synchronous/blocking code in async contexts
   */
  async checkBlockingCodeInAsync() {
    console.log(chalk.blue('⚡ Checking for blocking code in async contexts...'));
    try {
      const files = await globby(getConfigPattern('jsFilePathPattern'), { absolute: true });
      const blockingPatterns = [
        /while\s*\(true\)/i,
        /for\s*\(.*;.*;.*\)/i,
        /setTimeout\s*\(.*,[^)]{5,}\)/i, // setTimeout with long duration
        /setInterval\s*\(.*,[^)]{5,}\)/i
      ];
      for (const file of files) {
        try {
          const content = await fsp.readFile(file, 'utf8');
          const lines = content.split('\n');
          let inAsync = false;
          lines.forEach(async (line, index) => {
            if (/async\s+function|async\s*\(/.test(line)) inAsync = true;
            if (inAsync) {
              for (const pattern of blockingPatterns) {
                if (pattern.test(line)) {
                  const { code, context } = await getCodeContext(file, index + 1);
                  await this.addPerformanceIssue({
                    type: 'blocking_code_in_async',
                    file,
                    line: index + 1,
                    severity: 'medium',
                    message: 'Potential blocking code in async context',
                    code,
                    context,
                    source: "custom"
                  });
                }
              }
            }
            if (/}/.test(line)) inAsync = false;
          });
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ Could not read file ${file}: ${err.message}`));
        }
      }
    } catch (err) {
      console.error(chalk.red(`❌ Failed to glob files: ${err.message}`));
    }
  }

  /**
   * Warn about unoptimized images/assets
   */
  async checkUnoptimizedAssets() {
    console.log(chalk.blue('⚡ Checking for unoptimized images/assets...'));
    const assetDirs = ['public', 'assets', 'static', 'src/assets'];
    for (const dir of assetDirs) {
      if (fs.existsSync(dir)) {
        const files = await globby(assetGlobs);
        for (const file of files) {
          try {
            const stats = fs.statSync(file);
            if (stats.size > 500 * 1024) { // >500KB
              await this.addPerformanceIssue({
                type: 'unoptimized_asset',
                file,
                severity: 'medium',
                message: `Large image asset detected (${(stats.size/1024).toFixed(0)} KB)`,
                recommendation: 'Compress or optimize this image for web'
              });
            }
            if (['.bmp', '.tiff'].some(ext => file.endsWith(ext))) {
              await this.addPerformanceIssue({
                type: 'unoptimized_asset',
                file,
                severity: 'medium',
                message: 'Non-web-optimized image format detected',
                recommendation: 'Convert to PNG, JPEG, or WebP'
              });
            }
          } catch (error) {
            console.warn(chalk.yellow(`Warning: Could not stat file ${file}`));
          }
        }
      }
    }
  }

  /**
   * Check for promise/async issues with ESLint plugins
   */
  async checkESLintPromiseIssues() {
    console.log(chalk.blue('⚡ Checking for promise/async issues with ESLint plugins...'));
    console.log(chalk.gray('🔌 Using ESLint plugin: eslint-plugin-promise'));
    try {
      const eslintConfig = getLintConfigFile();
      if (!eslintConfig) {
        throw new Error(".eslintrc file is missing");
      }
      const eslint = new ESLint({
        useEslintrc: false,
        overrideConfigFile: eslintConfig,
      });
      const files = await globby(getConfigPattern('jsFilePathPattern'));
      let processed = 0;
      for (const file of files) {
        try {
          const results = await eslint.lintFiles([file]);
          for (const result of results) {
            for (const message of result.messages) {
              if (message.ruleId && message.ruleId.startsWith('promise/')) {
                const { code, context } = await getCodeContext(result.filePath, message.line);
                await this.addPerformanceIssue({
                  type: 'eslint_promise',
                  file: result.filePath,
                  line: message.line,
                  severity: message.severity === 2 ? 'high' : 'medium',
                  message: message.message,
                  ruleId: message.ruleId,
                  code,
                  context,
                  source: 'eslint'
                });
              }
            }
          }
        } catch (err) {
          console.warn(chalk.yellow(`⚠️ ESLint failed on file ${file}: ${err.message}`));
        }
        processed++;
        if (processed % 10 === 0 || processed === files.length) {
          process.stdout.write(`\rESLint Promise Progress: ${processed}/${files.length} files checked`);
        }
      }
      process.stdout.write(`\rESLint Promise Progress: ${files.length}/${files.length} files checked\n`);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not run ESLint for promise plugin checks'));
      if (error && error.message) {
        console.warn(chalk.yellow(error.message));
      }
    }
  }

  /**
   * Run all performance checks
   */
  async runPerformanceAudit() {
    console.log(chalk.blue('⚡ Starting Performance Audit...'));
    
    await this.checkBundleSize();
    await this.checkInefficientOperations();
    await this.checkMemoryLeaks();
    await this.checkLargeDependencies();
    await this.checkUnusedCode();
    await this.checkBlockingCodeInAsync();
    await this.checkUnoptimizedAssets();
    await this.checkESLintPromiseIssues();
    
    // Deduplicate issues and mark source
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
          const key = `${issue.file || ''}:${issue.line || ''}:${issue.ruleId || issue.type}:${issue.message}`;
          if (!seen.has(key)) {
            uniqueIssues.push(issue);
            seen.add(key);
          }
        } catch {}
      }
      this.performanceIssues = uniqueIssues;
    }

    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.performanceIssues.length,
      highSeverity: this.performanceIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.performanceIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.performanceIssues.filter(issue => issue.severity === 'low').length,
      issues: this.performanceIssues
    };

    // Generate JSON report
    try {
      const reportPath = path.join(this.folderPath, 'performance-audit-report.json');
      await writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`✅ Performance audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving performance audit report:', error.message));
    }

    // Display summary
    console.log(chalk.blue('\n⚡ PERFORMANCE AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(40)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));

    return results;
  }
}

/**
 * Accessibility audit module for detecting accessibility issues
 */
class AccessibilityAudit {
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

/**
 * Testing audit module for detecting testing practices and coverage
 */
class TestingAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.testingIssues = [];
    this.issuesFile = path.join(this.folderPath, 'testing-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) fs.unlinkSync(this.issuesFile);
    this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
  }

  async addTestingIssue(issue) {
    this.issueStream.write(JSON.stringify(issue) + '\n');
  }

  /**
   * Check for test files and testing framework usage
   */
  async checkTestFiles() {
    console.log(chalk.blue('🧪 Checking test files...'));
    
    const testFiles = await globby(getConfigPattern('jsFilePathPattern'));
    
    if (testFiles.length === 0) {
      await this.addTestingIssue({
        type: 'no_test_files',
        severity: 'high',
        message: 'No test files found',
        recommendation: 'Create test files with .test.js or .spec.js extensions'
      });
    } else {
      await this.addTestingIssue({
        type: 'test_files_found',
        severity: 'info',
        message: `Found ${testFiles.length} test files`,
        positive: true
      });
    }

    // Check for testing frameworks
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const testingFrameworks = [
        'jest', 'mocha', 'vitest', 'ava', 'tape', 'jasmine',
        '@testing-library/react', '@testing-library/jest-dom',
        'cypress', 'playwright', 'puppeteer'
      ];
      
      const foundFrameworks = testingFrameworks.filter(framework => allDeps[framework]);
      
      if (foundFrameworks.length === 0) {
        await this.addTestingIssue({
          type: 'no_testing_framework',
          severity: 'high',
          message: 'No testing framework detected',
          recommendation: 'Install a testing framework like Jest, Mocha, or Vitest'
        });
      } else {
        await this.addTestingIssue({
          type: 'testing_framework_found',
          severity: 'info',
          message: `Testing frameworks detected: ${foundFrameworks.join(', ')}`,
          positive: true
        });
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not read package.json'));
    }
  }

  /**
   * Check for test coverage
   */
  async checkTestCoverage() {
    console.log(chalk.blue('🧪 Checking test coverage...'));
    
    try {
      // Try to run test coverage if available
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};
      
      const coverageScripts = Object.keys(scripts).filter(script => 
        script.includes('test') && (script.includes('coverage') || script.includes('cov'))
      );
      
      if (coverageScripts.length > 0) {
        try {
          const coverageScript = coverageScripts[0];
          execSync(`npm run ${coverageScript}`, { stdio: 'pipe' });
          
          // Look for coverage reports
          const coverageDirs = ['coverage', '.nyc_output'];
          for (const dir of coverageDirs) {
            if (fs.existsSync(dir)) {
              await this.addTestingIssue({
                type: 'coverage_report_generated',
                severity: 'info',
                message: 'Test coverage report generated',
                positive: true
              });
              break;
            }
          }
        } catch (error) {
          await this.addTestingIssue({
            type: 'coverage_failed',
            severity: 'medium',
            message: 'Test coverage generation failed',
            recommendation: 'Check test configuration and ensure tests pass'
          });
        }
      } else {
        await this.addTestingIssue({
          type: 'no_coverage_script',
          severity: 'medium',
          message: 'No test coverage script found',
          recommendation: 'Add a coverage script to package.json (e.g., "test:coverage": "jest --coverage")'
        });
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check test coverage'));
    }
  }

  /**
   * Check for common testing patterns
   */
  async checkTestingPatterns() {
    console.log(chalk.blue('🧪 Checking testing patterns...'));
    
    const testFiles = await globby(getConfigPattern('jsFilePathPattern'));
    const BATCH_SIZE = 5;
    let processed = 0;
    for (let i = 0; i < testFiles.length; i += BATCH_SIZE) {
      const batch = testFiles.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Test Patterns] Progress: ${processed}/${testFiles.length} files checked`);
        try {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            getConfigPattern('testPatterns').forEach(({ pattern, name, positive }) => {
              if (pattern.test(line)) {
                if (positive) {
                  this.testingIssues.push({
                    type: 'testing_pattern_found',
                    file,
                    line: index + 1,
                    severity: 'info',
                    message: `Testing ${name} detected`,
                    code: line.trim(),
                    positive: true
                  });
                }
              }
            });
          });
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read test file ${file}`));
        }
      }));
    }
    process.stdout.write(`\r[Test Patterns] Progress: ${testFiles.length}/${testFiles.length} files checked\n`);
  }

  /**
   * Check for mocking and stubbing patterns
   */
  async checkMockingPatterns() {
    console.log(chalk.blue('🧪 Checking mocking patterns...'));
    
    const testFiles = await globby(getConfigPattern('jsFilePathPattern'));
    const BATCH_SIZE = 5;
    let processed = 0;
    for (let i = 0; i < testFiles.length; i += BATCH_SIZE) {
      const batch = testFiles.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file) => {
        processed++;
        process.stdout.write(`\r[Mocking Patterns] Progress: ${processed}/${testFiles.length} files checked`);
        try {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            getConfigPattern('mockPatterns').forEach(({ pattern, name, positive }) => {
              if (pattern.test(line)) {
                if (positive) {
                  this.testingIssues.push({
                    type: 'mocking_pattern_found',
                    file,
                    line: index + 1,
                    severity: 'info',
                    message: `${name} detected`,
                    code: line.trim(),
                    positive: true
                  });
                }
              }
            });
          });
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read test file ${file}`));
        }
      }));
    }
    process.stdout.write(`\r[Mocking Patterns] Progress: ${testFiles.length}/${testFiles.length} files checked\n`);
  }

  /**
   * Check for E2E testing setup
   */
  async checkE2ETesting() {
    console.log(chalk.blue('🧪 Checking E2E testing setup...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const e2eFrameworks = ['cypress', 'playwright', 'puppeteer', 'selenium-webdriver'];
      const foundE2EFrameworks = e2eFrameworks.filter(framework => allDeps[framework]);
      
      if (foundE2EFrameworks.length === 0) {
        this.testingIssues.push({
          type: 'no_e2e_framework',
          severity: 'medium',
          message: 'No E2E testing framework detected',
          recommendation: 'Consider adding Cypress, Playwright, or Puppeteer for E2E testing'
        });
      } else {
        this.testingIssues.push({
          type: 'e2e_framework_found',
          severity: 'info',
          message: `E2E testing framework detected: ${foundE2EFrameworks.join(', ')}`,
          positive: true
        });
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check E2E testing setup'));
    }
  }

  /**
   * Check for test configuration files
   */
  async checkTestConfiguration() {
    console.log(chalk.blue('🧪 Checking test configuration...'));
    
    const configFiles = [
      'jest.config.js', 'jest.config.ts', 'jest.config.json',
      'cypress.config.js', 'cypress.config.ts',
      'playwright.config.js', 'playwright.config.ts',
      'vitest.config.js', 'vitest.config.ts',
      '.mocharc.js', '.mocharc.json'
    ];
    
    const foundConfigs = configFiles.filter(file => fs.existsSync(file));
    
    if (foundConfigs.length === 0) {
      this.testingIssues.push({
        type: 'no_test_config',
        severity: 'medium',
        message: 'No test configuration file found',
        recommendation: 'Create a configuration file for your testing framework'
      });
    } else {
      this.testingIssues.push({
        type: 'test_config_found',
        severity: 'info',
        message: `Test configuration files found: ${foundConfigs.join(', ')}`,
        positive: true
      });
    }
  }

  /**
   * Run all testing checks
   */
  async runTestingAudit() {
    console.log(chalk.blue('🧪 Starting Testing Audit...'));

    // Check for common test folders or files before running the rest of the audit
    const testPatterns = [
      '**/__tests__/**',
      '**/test/**',
      '**/tests/**',
      '**/*.test.js',
      '**/*.spec.js',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.test.tsx',
      '**/*.spec.tsx',
    ];
    const foundTestFiles = (await globby(testPatterns, { ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/out/**'] })).length > 0;
    if (!foundTestFiles) {
      await this.addTestingIssue({
        type: 'no_test_files',
        severity: 'high',
        message: 'No test files or folders found. Test case not written.',
        recommendation: 'Create test files in __tests__, test, or tests folders, or use .test.js/.spec.js/.test.ts file naming.'
      });
      this.issueStream.end();
      // Write minimal report and return
      const results = {
        timestamp: new Date().toISOString(),
        totalIssues: 1,
        positivePractices: 0,
        highSeverity: 1,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [
          {
            type: 'no_test_files',
            severity: 'high',
            message: 'No test files or folders found. Test case not written.',
            recommendation: 'Create test files in __tests__, test, or tests folders, or use .test.js/.spec.js/.test.ts file naming.'
          }
        ]
      };
      try {
        const reportPath = path.join(this.folderPath, 'testing-audit-report.json');
        await writeFile(reportPath, JSON.stringify(results, null, 2));
        console.log(chalk.green(`✅ Testing audit report saved to: ${reportPath}`));
      } catch (error) {
        console.error(chalk.red('Error saving testing audit report:', error.message));
      }
      // Display summary
      console.log(chalk.blue('\n🧪 TESTING AUDIT SUMMARY'));
      console.log(chalk.blue('='.repeat(40)));
      console.log(chalk.white('Total Issues: 1'));
      console.log(chalk.green('Positive Practices: 0'));
      console.log(chalk.red('High Severity: 1'));
      console.log(chalk.yellow('Medium Severity: 0'));
      console.log(chalk.blue('Low Severity: 0'));
      return results;
    }
    
    await this.checkTestFiles();
    await this.checkTestCoverage();
    await this.checkTestingPatterns();
    await this.checkMockingPatterns();
    await this.checkE2ETesting();
    await this.checkTestConfiguration();
    
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
      this.testingIssues = uniqueIssues;
    }

    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.testingIssues.length,
      positivePractices: this.testingIssues.filter(issue => issue.positive).length,
      highSeverity: this.testingIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.testingIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.testingIssues.filter(issue => issue.severity === 'low').length,
      issues: this.testingIssues
    };

    // Generate JSON report
    try {
      const reportPath = path.join(this.folderPath, 'testing-audit-report.json');
      await writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`✅ Testing audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving testing audit report:', error.message));
    }

    // Display summary
    console.log(chalk.blue('\n🧪 TESTING AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(40)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.green(`Positive Practices: ${results.positivePractices}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));

    return results;
  }
}

/**
 * Dependency audit module for detecting dependency issues
 */
class DependencyAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.dependencyIssues = [];
    this.issuesFile = path.join(this.folderPath, 'dependency-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) fs.unlinkSync(this.issuesFile);
    this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
  }

  async addDependencyIssue(issue) {
    this.issueStream.write(JSON.stringify(issue) + '\n');
  }

  /**
   * Check for outdated dependencies
   */
  async checkOutdatedDependencies() {
    console.log(chalk.blue('📦 Checking for outdated dependencies...'));
    
    try {
      const outdatedResult = execSync('npm outdated --json', { 
        encoding: 'utf8', 
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      const outdatedData = JSON.parse(outdatedResult);
      
      const BATCH_SIZE = 5;
      const keys = Object.keys(outdatedData);
      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        batch.forEach((packageName, idx) => {
          process.stdout.write(`\r[Outdated Dependencies] Progress: ${i + idx + 1}/${keys.length} checked`);
          const packageInfo = outdatedData[packageName];
          this.addDependencyIssue({
            type: 'outdated_dependency',
            package: packageName,
            current: packageInfo.current,
            wanted: packageInfo.wanted,
            latest: packageInfo.latest,
            severity: packageInfo.latest !== packageInfo.wanted ? 'medium' : 'low',
            message: `${packageName} is outdated (current: ${packageInfo.current}, latest: ${packageInfo.latest})`,
            recommendation: `Update ${packageName} to version ${packageInfo.latest}`
          });
        });
      }
      process.stdout.write(`\r[Outdated Dependencies] Progress: ${keys.length}/${keys.length} checked\n`);
    } catch (error) {
      // npm outdated returns non-zero exit code when there are outdated packages
      if (error.status === 1) {
        try {
          const output = error.stdout.toString();
          const lines = output.split('\n');
          
          // Parse the table output
          lines.forEach(line => {
            const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/);
            if (match) {
              const [, packageName, current, wanted, latest] = match;
              if (packageName !== 'Package' && current !== 'Current') {
                this.addDependencyIssue({
                  type: 'outdated_dependency',
                  package: packageName,
                  current,
                  wanted,
                  latest,
                  severity: latest !== wanted ? 'medium' : 'low',
                  message: `${packageName} is outdated (current: ${current}, latest: ${latest})`,
                  recommendation: `Update ${packageName} to version ${latest}`
                });
              }
            }
          });
        } catch (parseError) {
          console.warn(chalk.yellow('Warning: Could not parse outdated dependencies'));
        }
      } else {
        console.warn(chalk.yellow('Warning: Could not check for outdated dependencies'));
      }
    }
  }

  /**
   * Check for duplicate dependencies
   */
  async checkDuplicateDependencies() {
    console.log(chalk.blue('📦 Checking for duplicate dependencies...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const packageNames = Object.keys(allDeps);
      const BATCH_SIZE = 5;
      for (let i = 0; i < packageNames.length; i += BATCH_SIZE) {
        const batch = packageNames.slice(i, i + BATCH_SIZE);
        batch.forEach((name, idx) => {
          process.stdout.write(`\r[Duplicate Dependencies] Progress: ${i + idx + 1}/${packageNames.length} checked`);
          if (packageNames.indexOf(name) !== i + idx) {
            this.addDependencyIssue({
              type: 'duplicate_dependency',
              package: name,
              severity: 'medium',
              message: `Duplicate dependency found: ${name}`,
              recommendation: 'Remove duplicate entry from package.json'
            });
          }
        });
      }
      process.stdout.write(`\r[Duplicate Dependencies] Progress: ${packageNames.length}/${packageNames.length} checked\n`);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check for duplicate dependencies'));
    }
  }

  /**
   * Check for unused dependencies
   */
  async checkUnusedDependencies() {
    console.log(chalk.blue('📦 Checking for unused dependencies...'));
    const { spawnSync } = await import('child_process');
    let depcheckPath;
    try {
      // Use createRequire for ESM compatibility
      let require;
      try {
        const { createRequire } = await import('module');
        require = createRequire(import.meta.url);
        depcheckPath = require.resolve('depcheck');
      } catch (resolveErr) {
        depcheckPath = null;
      }
      if (!depcheckPath) {
        console.warn(chalk.yellow('depcheck is not installed. Please run: npm install depcheck --save-dev'));
        this.addDependencyIssue({
          type: 'depcheck_missing',
          severity: 'medium',
          message: 'depcheck is not installed. Unused dependency check skipped.',
          recommendation: 'Run npm install depcheck --save-dev'
        });
        return;
      }
      // Run depcheck
      const depcheckResult = spawnSync('npx', ['depcheck', '--json'], { encoding: 'utf8' });
      if (depcheckResult.error) {
        throw depcheckResult.error;
      }
      // Accept nonzero exit code if output is present (depcheck returns 1 if unused found)
      let depcheckData;
      const output = depcheckResult.stdout ? depcheckResult.stdout.trim() : '';
      if (!output && depcheckResult.stderr) {
        console.warn(chalk.yellow('depcheck stderr output:'));
        console.warn(depcheckResult.stderr);
      }
      try {
        depcheckData = JSON.parse(output);
      } catch (parseErr) {
        console.warn(chalk.yellow('Warning: Could not parse depcheck output as JSON.'));
        if (output) {
          console.warn(chalk.gray('depcheck output was:'));
          console.warn(output);
        }
        this.addDependencyIssue({
          type: 'depcheck_parse_error',
          severity: 'medium',
          message: 'depcheck output could not be parsed as JSON.',
          recommendation: 'Try running depcheck manually to debug.'
        });
        return;
      }
      const BATCH_SIZE = 5;
      if (depcheckData.dependencies && depcheckData.dependencies.length > 0) {
        for (let i = 0; i < depcheckData.dependencies.length; i += BATCH_SIZE) {
          const batch = depcheckData.dependencies.slice(i, i + BATCH_SIZE);
          batch.forEach((dep, idx) => {
            process.stdout.write(`\r[Unused Dependencies] Progress: ${i + idx + 1}/${depcheckData.dependencies.length} checked`);
            this.addDependencyIssue({
              type: 'unused_dependency',
              package: dep,
              file: dep || undefined, // Only set file to dep if no file info is present
              severity: 'low',
              message: `Unused dependency: ${dep}`,
              recommendation: `Remove ${dep} from package.json if not needed`
            });
          });
        }
        process.stdout.write(`\r[Unused Dependencies] Progress: ${depcheckData.dependencies.length}/${depcheckData.dependencies.length} checked\n`);
      }
      if (depcheckData.devDependencies && depcheckData.devDependencies.length > 0) {
        for (let i = 0; i < depcheckData.devDependencies.length; i += BATCH_SIZE) {
          const batch = depcheckData.devDependencies.slice(i, i + BATCH_SIZE);
          batch.forEach((dep, idx) => {
            process.stdout.write(`\r[Unused Dev Dependencies] Progress: ${i + idx + 1}/${depcheckData.devDependencies.length} checked`);
            this.addDependencyIssue({
              type: 'unused_dev_dependency',
              package: dep,
              file: dep || undefined, // Only set file to dep if no file info is present
              severity: 'low',
              message: `Unused dev dependency: ${dep}`,
              recommendation: `Remove ${dep} from devDependencies if not needed`
            });
          });
        }
        process.stdout.write(`\r[Unused Dev Dependencies] Progress: ${depcheckData.devDependencies.length}/${depcheckData.devDependencies.length} checked\n`);
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check for unused dependencies.'));
      if (error && error.message) {
        console.warn(chalk.yellow(error.message));
      }
      this.addDependencyIssue({
        type: 'depcheck_error',
        severity: 'medium',
        message: 'Error occurred while running depcheck.',
        recommendation: 'Try running depcheck manually to debug.'
      });
    }
  }

  /**
   * Check for missing dependencies
   */
  async checkMissingDependencies() {
    console.log(chalk.blue('📦 Checking for missing dependencies...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check if node_modules exists
      if (!fs.existsSync('node_modules')) {
        this.addDependencyIssue({
          type: 'missing_node_modules',
          severity: 'high',
          message: 'node_modules directory not found',
          recommendation: 'Run npm install to install dependencies'
        });
        return;
      }
      
      // Check for missing packages in node_modules
      const depKeys = Object.keys(allDeps);
      for (let i = 0; i < depKeys.length; i += BATCH_SIZE) {
        const batch = depKeys.slice(i, i + BATCH_SIZE);
        batch.forEach((packageName, idx) => {
          process.stdout.write(`\r[Missing Packages] Progress: ${i + idx + 1}/${depKeys.length} checked`);
          const packagePath = path.join('node_modules', packageName);
          if (!fs.existsSync(packagePath)) {
            this.addDependencyIssue({
              type: 'missing_package',
              package: packageName,
              severity: 'high',
              message: `Package ${packageName} is missing from node_modules`,
              recommendation: `Run npm install to install ${packageName}`
            });
          }
        });
      }
      process.stdout.write(`\r[Missing Packages] Progress: ${depKeys.length}/${depKeys.length} checked\n`);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check for missing dependencies'));
    }
  }

  /**
   * Check for peer dependency issues
   */
  async checkPeerDependencies() {
    console.log(chalk.blue('📦 Checking peer dependencies...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      if (packageJson.peerDependencies) {
        const peerKeys = Object.keys(packageJson.peerDependencies);
        for (let i = 0; i < peerKeys.length; i += BATCH_SIZE) {
          const batch = peerKeys.slice(i, i + BATCH_SIZE);
          batch.forEach((peerDep, idx) => {
            process.stdout.write(`\r[Peer Dependencies] Progress: ${i + idx + 1}/${peerKeys.length} checked`);
            const requiredVersion = packageJson.peerDependencies[peerDep];
            const packagePath = path.join('node_modules', peerDep);
            if (!fs.existsSync(packagePath)) {
              this.addDependencyIssue({
                type: 'missing_peer_dependency',
                package: peerDep,
                requiredVersion,
                severity: 'high',
                message: `Peer dependency ${peerDep}@${requiredVersion} is not installed`,
                recommendation: `Install ${peerDep}@${requiredVersion}`
              });
            }
          });
        }
        process.stdout.write(`\r[Peer Dependencies] Progress: ${peerKeys.length}/${peerKeys.length} checked\n`);
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check peer dependencies'));
    }
  }

  /**
   * Check for dependency size issues
   */
  async checkDependencySizes() {
    console.log(chalk.blue('📦 Checking dependency sizes...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Known large packages
      const largePackages = [
        'lodash', 'moment', 'date-fns', 'ramda', 'immutable',
        'bootstrap', 'material-ui', 'antd', 'semantic-ui',
        'jquery', 'angular', 'vue', 'react-dom'
      ];
      
      for (let i = 0; i < largePackages.length; i += BATCH_SIZE) {
        const batch = largePackages.slice(i, i + BATCH_SIZE);
        batch.forEach((pkg, idx) => {
          process.stdout.write(`\r[Large Dependencies] Progress: ${i + idx + 1}/${largePackages.length} checked`);
          if (allDeps[pkg]) {
            this.addDependencyIssue({
              type: 'large_dependency',
              package: pkg,
              severity: 'low',
              message: `Large dependency detected: ${pkg}`,
              recommendation: 'Consider using lighter alternatives or tree-shaking'
            });
          }
        });
      }
      process.stdout.write(`\r[Large Dependencies] Progress: ${largePackages.length}/${largePackages.length} checked\n`);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check dependency sizes'));
    }
  }

  /**
   * Check for license compliance
   */
  async checkLicenseCompliance() {
    console.log(chalk.blue('📦 Checking license compliance...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      if (!packageJson.license) {
        this.addDependencyIssue({
          type: 'missing_license',
          severity: 'medium',
          message: 'No license specified in package.json',
          recommendation: 'Add a license field to package.json'
        });
      }
      
      // Check for problematic licenses in dependencies
      try {
        const licenseResult = execSync('npx license-checker --json', { 
          encoding: 'utf8', 
          cwd: process.cwd(),
          stdio: 'pipe'
        });
        
        const licenseData = JSON.parse(licenseResult);
        
        const problematicLicenses = ['GPL', 'AGPL', 'LGPL'];
        
        const licenseKeys = Object.keys(licenseData);
        for (let i = 0; i < licenseKeys.length; i += BATCH_SIZE) {
          const batch = licenseKeys.slice(i, i + BATCH_SIZE);
          batch.forEach((packageName, idx) => {
            process.stdout.write(`\r[License Compliance] Progress: ${i + idx + 1}/${licenseKeys.length} checked`);
            const packageInfo = licenseData[packageName];
            if (packageInfo.licenses) {
              problematicLicenses.forEach(license => {
                if (packageInfo.licenses.includes(license)) {
                  this.addDependencyIssue({
                    type: 'problematic_license',
                    package: packageName,
                    license: packageInfo.licenses,
                    severity: 'medium',
                    message: `Package ${packageName} uses ${packageInfo.licenses} license`,
                    recommendation: 'Review license compatibility with your project'
                  });
                }
              });
            }
          });
        }
        process.stdout.write(`\r[License Compliance] Progress: ${licenseKeys.length}/${licenseKeys.length} checked\n`);
      } catch (licenseError) {
        console.warn(chalk.yellow('Warning: Could not check dependency licenses (license-checker not available)'));
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check license compliance'));
    }
  }

  /**
   * Run all dependency checks
   */
  async runDependencyAudit() {
    console.log(chalk.blue('📦 Starting Dependency Audit...'));
    
    await this.checkOutdatedDependencies();
    await this.checkDuplicateDependencies();
    await this.checkUnusedDependencies();
    await this.checkMissingDependencies();
    await this.checkPeerDependencies();
    await this.checkDependencySizes();
    await this.checkLicenseCompliance();
    
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
      this.dependencyIssues = uniqueIssues;
    }

    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.dependencyIssues.length,
      highSeverity: this.dependencyIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.dependencyIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.dependencyIssues.filter(issue => issue.severity === 'low').length,
      issues: this.dependencyIssues
    };

    // Generate JSON report
    try {
      const reportPath = path.join(this.folderPath, 'dependency-audit-report.json');
      await writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`✅ Dependency audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving dependency audit report:', error.message));
    }

    // Display summary
    console.log(chalk.blue('\n📦 DEPENDENCY AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(40)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));

    return results;
  }
}

/**
 * Main audit orchestrator that runs all audit categories
 */
class AuditOrchestrator {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.auditResults = {};
  }

  /**
   * Run all audits
   */
  async runAllAudits() {
    console.log(chalk.blue('🚀 Starting Comprehensive Code Audit...\n'));
    
    const startTime = Date.now();
    
    try {
      // Run all audit categories with error handling
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
        this.runTestingAudit().catch(error => {
          console.warn(chalk.yellow('⚠️  Testing audit failed:', error.message));
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
        testingResults,
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
          testing: testingResults,
          dependency: dependencyResults
        }
      };

      // Calculate summary
      Object.values(this.auditResults.categories).forEach(category => {
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
    return await securityAudit.runSecurityAudit();
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
   * Run accessibility audit
   */
  async runAccessibilityAudit() {
    console.log(chalk.blue('♿ Running Accessibility Audit...'));
    const accessibilityAudit = new AccessibilityAudit(this.folderPath);
    return await accessibilityAudit.runAccessibilityAudit();
  }

  /**
   * Run testing audit
   */
  async runTestingAudit() {
    console.log(chalk.blue('🧪 Running Testing Audit...'));
    const testingAudit = new TestingAudit(this.folderPath);
    return await testingAudit.runTestingAudit();
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
    console.log(chalk.blue('\n📊 Generating Audit Report...'));
    
    const reportPath = path.join(this.folderPath, 'comprehensive-audit-report.json');
    
    try {
      await writeFile(reportPath, JSON.stringify(this.auditResults, null, 2));
      console.log(chalk.green(`✅ Comprehensive audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving audit report:', error.message));
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
      testing: '🧪',
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
    if (categories.accessibility.highSeverity > 0) {
      console.log(chalk.blue('♿ Accessibility: Fix missing alt attributes and form labels'));
    }
    
    // Testing recommendations
    if (categories.testing.highSeverity > 0) {
      console.log(chalk.magenta('🧪 Testing: Add test files and testing framework'));
    }
    
    // Dependency recommendations
    if (categories.dependency.highSeverity > 0) {
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
      testing: () => this.runTestingAudit(),
      dependency: () => this.runDependencyAudit()
    };

    if (auditMethods[category]) {
      return await auditMethods[category]();
    } else {
      throw new Error(`Unknown audit category: ${category}`);
    }
  }
}

const codeInsightInit = async (options = {}) => {
  try {
    await audit.createReportFolder();

    const { reports = [], projectType } = options;
    
    if (projectType) {
      console.log(`Project type selected: ${projectType}`);
    }

    // Traditional reports
    if (reports.includes('all') || reports.includes('eslint')) {
      await audit.generateESLintReport(true, projectType, reports);
    }
    if (reports.includes('all') || reports.includes('stylelint')) {
      await audit.generateStyleLintReport(true, projectType, reports);
    }
    if (reports.includes('all') || reports.includes('package')) {
      await audit.generateNpmPackageReport(projectType, reports);
    }

    // Comprehensive audits
    const auditCategories = ['security', 'performance', 'accessibility', 'testing', 'dependency'];
    const hasAuditReports = auditCategories.some(category => reports.includes(category));
    
    if (reports.includes('comprehensive') || hasAuditReports) {
      const orchestrator = new AuditOrchestrator('./report');
      
      if (reports.includes('comprehensive')) {
        await orchestrator.runAllAudits();
      } else {
        for (const category of auditCategories) {
          if (reports.includes(category)) {
            console.log(`\nRunning ${category} audit...`);
            await orchestrator.runSpecificAudit(category);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in codeInsightInit:", error);
  }
  // Ensure config is copied to report folder after all reports
  audit.copyConfigToReportFolder();
};

export { codeInsightInit };
