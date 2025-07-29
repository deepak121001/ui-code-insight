import fs from "fs";
import { globby } from "globby";
import path from "path";
import { readFile } from "fs/promises";
import chalk from "chalk";
import stylelint from "stylelint";
import { fileURLToPath } from "url";
import { getConfigPattern, getMergedExcludeRules } from '../config-loader.js';

const { lint } = stylelint;

// Default Stylelint rules to exclude (minimal list - only user-requested exclusions)
const DEFAULT_STYLELINT_EXCLUDE_RULES = [
  // User-requested exclusions only
  'scss/double-slash-comment-empty-line-before',
  'scss/load-partial-extension',
  'declaration-empty-line-before',
  'color-function-notation',
  'selector-max-universal'
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
  // Fix path resolution for build directory
  const baseDir = __dirname.includes('build') ? path.join(__dirname, 'config') : path.join(__dirname, CONFIG_FOLDER);
  const recommendedLintRulesConfigFile = path.join(
    baseDir,
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
  console.error(chalk.red(`[Stylelint] Error reading file ${filePath}: ${error.message}`));
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
    
    // Debug logging for files with errors but no messages
    // if (output[0] && output[0].warnings && output[0].warnings.length > 0) {
    //   console.log(`[Stylelint Debug] ${filePath}: ${output[0].warnings.length} warnings found`);
    //   output[0].warnings.forEach((warning, index) => {
    //     console.log(`[Stylelint Debug]   Warning ${index + 1}: ${warning.rule} - ${warning.text}`);
    //   });
    // } else if (output[0] && output[0].errored) {
    //   console.log(`[Stylelint Debug] ${filePath}: File has errors but no warnings array`);
    //   console.log(`[Stylelint Debug] Output structure:`, JSON.stringify(output[0], null, 2));
    // }

    // Safeguard against malformed output
    const warnings = output[0] && output[0].warnings ? output[0].warnings : [];
    
    // Determine friendly config source
    let configSourceValue = path.basename(lintStyleConfigFile);
    try {
      const configContent = JSON.parse(fs.readFileSync(lintStyleConfigFile, 'utf8'));
      if (Array.isArray(configContent.extends) && configContent.extends.length > 0) {
        configSourceValue = configContent.extends[0];
      } else if (typeof configContent.extends === 'string') {
        configSourceValue = configContent.extends;
      }
    } catch (e) {}

    return {
      filePath,
      errorCount: warnings.length,
      warningCount: 0,
      messages: warnings.map((message) => ({
        line: message.line,
        column: message.column,
        endLine: message.endLine,
        endColumn: message.endColumn,
        severity: message.severity,
        rule: message.rule,
        message: message.text,
        fix: message.fix,
        suggestions: message.suggestions,
        ruleSource: message.rule
          ? (message.rule.startsWith('scss/') ? 'SCSS Plugin'
            : message.rule.startsWith('order/') ? 'Order Plugin'
            : 'Stylelint core')
          : '',
        configSource: [configSourceValue],
      })),
    };
  } catch (err) {
    // Log specific error types for better debugging
    if (err.code === 'ENOENT') {
      console.error(chalk.red(`[Stylelint] File not found: ${filePath}`));
    } else if (err.code === 'EACCES') {
      console.error(chalk.red(`[Stylelint] Permission denied: ${filePath}`));
    } else if (err.code === 'EISDIR') {
      console.error(chalk.red(`[Stylelint] Path is directory, not file: ${filePath}`));
    } else {
      console.error(chalk.red(`[Stylelint] Unexpected error reading ${filePath}: ${err.message}`));
    }
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

  // Filter out null results (files that couldn't be read) and filter messages based on exclude rules
  const filteredResults = results
    .filter(result => result !== null) // Remove null results from file read errors
    .map(result => {
      // Filter out messages for rules that are in the exclude list
      const filteredMessages = result.messages.filter(message => {
        // Don't filter out "Unknown rule" errors as they indicate configuration issues
        if (message.message && message.message.includes('Unknown rule')) {
          return true;
        }
        return !excludeRules.includes(message.rule);
      });
      
      // Count errors and warnings separately
      const actualErrors = filteredMessages.filter(msg => msg.severity === 'error').length;
      const actualWarnings = filteredMessages.filter(msg => msg.severity === 'warning').length;
      
      // Log if there's a mismatch between error count and message count
      if (result.errorCount > 0 && actualErrors === 0 && actualWarnings === 0) {
        console.log(`[Stylelint Warning] ${result.filePath}: Error count (${result.errorCount}) doesn't match message count (${filteredMessages.length})`);
      }
      
      return {
        ...result,
        errorCount: actualErrors,
        warningCount: actualWarnings,
        messages: filteredMessages
      };
    });

  // BEM naming convention check
  let bemFound = false;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (/\.[a-z]+__[a-z]+(--[a-z]+)?/.test(content)) {
      bemFound = true;
      break;
    }
  }
  const bemNaming = {
    type: 'bem-naming',
    passed: bemFound,
    message: bemFound ? 'BEM naming convention detected.' : 'No BEM naming convention detected.'
  };

  const jsonReport = {
    projectType,
    reports,
    excludeRules: {
      enabled: excludeRules.length > 0,
      rules: excludeRules,
      count: excludeRules.length
    },
    results: filteredResults,
    bemNaming // <-- add BEM naming result
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

  // Validate files before processing
  const validFiles = files.filter(filePath => {
    try {
      // Check if file exists and is readable
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        console.log(`[Stylelint] Skipping non-file: ${filePath}`);
        return false;
      }
      
      // Check if file has valid CSS/SCSS extension
      const ext = path.extname(filePath).toLowerCase();
      const validExtensions = ['.css', '.scss', '.sass', '.less'];
      if (!validExtensions.includes(ext)) {
        console.log(`[Stylelint] Skipping non-CSS file: ${filePath}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.log(`[Stylelint] Skipping inaccessible file: ${filePath} (${error.message})`);
      return false;
    }
  });

  console.log(`[Stylelint] Found ${files.length} files, ${validFiles.length} are valid for processing`);

  await lintAllFiles(validFiles, folderPath, lintStyleConfigFile, projectType, reports);
};
