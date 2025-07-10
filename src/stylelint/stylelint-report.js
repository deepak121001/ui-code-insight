import fs from "fs";
import { globby } from "globby";
import path from "path";
import { readFile } from "fs/promises";
import chalk from "chalk";
import stylelint from "stylelint";
import { fileURLToPath } from "url";
import { getConfigPattern, getMergedExcludeRules } from '../config-loader.js';

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
const CONFIG_FOLDER = "config";
const STYLELINTRC_JSON = ".stylelintrc.json";
const STYLELINTRC_JS = ".stylelintrc.js";
const STYLELINTRC_YML = ".stylelintrc.yml";
const STYLELINTRC_CONFIG = "stylelint.config.js";

/**
 * Function to determine Stylelint configuration file path
 * @param {boolean} recommendedLintRules
 * @returns {string} lintStyleConfigFile
 */
const getLintConfigFile = (recommendedLintRules) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const recommendedLintRulesConfigFile = path.join(
    __dirname,
    CONFIG_FOLDER,
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
 * Output red-colored text to console
 * @param {string} text
 */
const logError = (text) => console.log(chalk.red(text));

/**
 * Output green-colored text to console
 * @param {string} text
 */
const logSuccess = (text) => console.log(chalk.green(text));

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

const BATCH_SIZE = 5;

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
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
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
export const generateStyleLintReport = async (
  folderPath,
  recommendedLintRules,
  projectType = '',
  reports = []
) => {
  const lintStyleConfigFile = getLintConfigFile(recommendedLintRules);
  if (!lintStyleConfigFile) {
    throw new Error(".stylelintrc.json file is missing");
  }

  // Use config-driven pattern for SCSS/CSS/LESS files
  const files = await globby(getConfigPattern('scssFilePathPattern'));

  await lintAllFiles(files, folderPath, lintStyleConfigFile, projectType, reports);
};
