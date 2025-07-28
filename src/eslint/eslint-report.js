import { ESLint } from "eslint";
import path from "path";
import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { globby } from "globby";
import fs from "fs";
import chalk from "chalk";
import { getConfigPattern, getMergedExcludeRules } from '../config-loader.js';
import { execSync } from 'child_process';
import { createRequire } from 'module';

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
  'react/style-prop-object', 'react/void-dom-elements-no-children', 'import/no-cycle', 
  'max-len', 'no-param-reassign'
];

// Helper to get all rules enabled by a config
function getRulesForConfig(configName) {
  const require = createRequire(import.meta.url);
  let rules = {};
  try {
    if (configName === 'airbnb') {
      // Airbnb base config aggregates these files
      const airbnbRuleFiles = [
        'eslint-config-airbnb-base/rules/best-practices',
        'eslint-config-airbnb-base/rules/errors',
        'eslint-config-airbnb-base/rules/node',
        'eslint-config-airbnb-base/rules/style',
        'eslint-config-airbnb-base/rules/variables',
        'eslint-config-airbnb-base/rules/imports',
        'eslint-config-airbnb-base/rules/strict',
        'eslint-config-airbnb-base/rules/es6',
      ];
      airbnbRuleFiles.forEach(file => {
        try {
          const mod = require(file);
          if (mod && mod.rules) {
            rules = { ...rules, ...mod.rules };
          }
        } catch (e) {}
      });
    } else if (configName === 'eslint:recommended') {
      // Try to load recommended config if available
      try {
        const recommended = require('eslint/conf/eslint-recommended');
        if (recommended && recommended.rules) {
          rules = { ...rules, ...recommended.rules };
        }
      } catch (e) {}
    }
    // Add more configs as needed
  } catch (e) {}
  return Object.keys(rules);
}

// Helper to get config extends from config file
function getConfigExtends(configPath) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (Array.isArray(config.extends)) return config.extends;
    if (typeof config.extends === 'string') return [config.extends];
  } catch (e) {}
  return [];
}

// Constants for configuration files
const CONFIG_FOLDER = "config";
const ESLINTRC_JSON = ".eslintrc.json";
const ESLINTRC_JS = ".eslintrc.js";
const ESLINTRC_YML = ".eslintrc.yml";
const ESLINTRC = ".eslintrc";
const ESLINTRC_REACT = "eslintrc.react.json";
const ESLINTRC_NODE = "eslintrc.node.json";
const ESLINTRC_VANILLA = "eslintrc.vanilla.json";
const ESLINTRC_TS = "eslintrc.typescript.json";
const ESLINTRC_TSREACT = "eslintrc.tsreact.json";

/**
 * Function to determine ESLint configuration file path
 * @param {boolean} recommendedLintRules
 * @param {string} projectType
 * @returns {string} lintConfigFile
 */
const getLintConfigFile = (recommendedLintRules, projectType = '') => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let configFileName = 'eslintrc.simple.json'; // Default to simple config

  if (projectType.toLowerCase() === 'react') {
    configFileName = ESLINTRC_REACT;
  } else if (projectType.toLowerCase() === 'node') {
    configFileName = ESLINTRC_NODE;
  } else if (projectType.toLowerCase() === 'vanilla') {
    configFileName = ESLINTRC_VANILLA;
  } else if (projectType.toLowerCase() === 'typescript') {
    configFileName = ESLINTRC_TS;
  } else if (projectType.toLowerCase() === 'typescript + react' || projectType.toLowerCase() === 'tsreact') {
    configFileName = ESLINTRC_TSREACT;
  }

  const configFilePath = path.join(__dirname, CONFIG_FOLDER, configFileName);
  
  // Check if the target config exists, otherwise fallback to simple config
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // Fallback to simple config to avoid module resolution issues
  const simpleConfigPath = path.join(__dirname, CONFIG_FOLDER, 'eslintrc.simple.json');
  if (fs.existsSync(simpleConfigPath)) {
    console.log(chalk.yellow(`⚠️  Using simplified ESLint config to avoid module resolution issues`));
    return simpleConfigPath;
  }

  // Final fallback to default logic
  const recommendedLintRulesConfigFile = path.join(
    __dirname,
    CONFIG_FOLDER,
    ESLINTRC_JSON
  );
  const moduleDir = path.join(process.cwd(), "node_modules", "ui-code-insight");
  const eslintLintFilePathFromModule = path.join(moduleDir, ESLINTRC_JSON);

  if (recommendedLintRules) {
    return recommendedLintRulesConfigFile;
  }

  const configFiles = [
    ESLINTRC,
    ESLINTRC_JS,
    ESLINTRC_YML,
    ESLINTRC_JSON,
    eslintLintFilePathFromModule,
  ];

  return configFiles.find((file) => fs.existsSync(file));
};

/**
 * Output red-colored text to console
 * @param {string} text
 */
const logError = (text) => console.log(chalk.red(text));

/**
 * Output yellow-colored text to console
 * @param {string} text
 */
const logWarning = (text) => console.log(chalk.yellow(text));

/**
 * Output green-colored text to console
 * @param {string} text
 */
const logSuccess = (text) => console.log(chalk.green(text));

/**
 * Function to lint a single file
 * @param {string} filePath
 * @param {ESLint} eslint
 * @returns {Promise<Object|null>} lint result
 */
const lintFile = async (filePath, eslint) => {
  try {
    // Read file content
    const data = await readFile(filePath, "utf8");

    // Lint the file
    const messages = await eslint.lintText(data, {
      filePath,
    });

    // Check if messages array exists and has content
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.warn(chalk.yellow(`⚠️  No lint results for ${filePath}`));
      return {
        filePath,
        errorCount: 0,
        warningCount: 0,
        messages: [],
      };
    }

    const firstMessage = messages[0];
    
    // Check if the message object has the expected properties
    if (!firstMessage || typeof firstMessage !== 'object') {
      console.warn(chalk.yellow(`⚠️  Invalid lint result for ${filePath}`));
      return {
        filePath,
        errorCount: 0,
        warningCount: 0,
        messages: [],
      };
    }

    return {
      filePath,
      errorCount: firstMessage.errorCount || 0,
      warningCount: firstMessage.warningCount || 0,
      messages: firstMessage.messages || [],
    };
  } catch (err) {
    console.error(chalk.red(`❌ Error processing file ${filePath}: ${err.message}`));
    return {
      filePath,
      errorCount: 0,
      warningCount: 0,
      messages: [],
      error: err.message
    };
  }
};

const BATCH_SIZE = 5;

/**
 * Function to lint all files
 * @param {Array<string>} files
 * @param {string} folderPath
 * @param {ESLint} eslint
 * @param {string} projectType
 * @param {Array<string>} reports
 */
const lintAllFiles = async (files, folderPath, eslint, projectType, reports) => {
  console.log(
    chalk.green(
      `Total files count is ${files.length} This linting task will take some time.`
    )
  );

  // Get merged exclude rules from config
  const excludeRules = getMergedExcludeRules('eslint', DEFAULT_ESLINT_EXCLUDE_RULES);

  let results = [];
  let processed = 0;
  let errorCount = 0;
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    try {
      const batchResults = await Promise.all(batch.map(async (filePath) => {
        processed++;
        process.stdout.write(`\r[ESLint] Progress: ${processed}/${files.length} files checked`);
        
        try {
          return await lintFile(filePath, eslint);
        } catch (fileError) {
          errorCount++;
          console.error(chalk.red(`❌ Error processing file ${filePath}: ${fileError.message}`));
          return {
            filePath,
            errorCount: 0,
            warningCount: 0,
            messages: [],
            error: fileError.message
          };
        }
      }));
      
      // Filter out null results and add valid ones
      const validResults = batchResults.filter(result => result !== null && result !== undefined);
      results.push(...validResults);
      
    } catch (batchError) {
      console.error(chalk.red(`❌ Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError.message}`));
      errorCount += batch.length;
    }
  }
  
  if (errorCount > 0) {
    console.log(chalk.yellow(`⚠️  ${errorCount} files had processing errors`));
  }
  process.stdout.write(`\r[ESLint] Progress: ${files.length}/${files.length} files checked\n`);

  const lintConfigFile = getLintConfigFile(false, projectType); // Pass false for recommendedLintRules
  const configExtends = getConfigExtends(lintConfigFile);
  const configRuleMap = {};
  configExtends.forEach(cfg => {
    // Normalize config name
    let name = cfg;
    if (name.startsWith('plugin:')) name = name.split(':')[1].split('/')[0];
    if (name.startsWith('eslint-config-')) name = name.replace('eslint-config-', '');
    if (name === 'airbnb-base' || name === 'airbnb') name = 'airbnb';
    if (name === 'recommended') name = 'eslint:recommended';
    const rules = getRulesForConfig(name);
    rules.forEach(rule => {
      if (!configRuleMap[rule]) configRuleMap[rule] = [];
      configRuleMap[rule].push(cfg);
    });
  });

  const jsonReport = {
    projectType,
    reports,
    excludeRules: {
      enabled: excludeRules.length > 0,
      rules: excludeRules,
      count: excludeRules.length
    },
    results: results
      .filter(result => result !== null && result !== undefined) // Filter out null/undefined results
      .map((result) => {
        // Ensure result has the expected structure
        if (!result || typeof result !== 'object') {
          console.warn(chalk.yellow(`⚠️  Skipping invalid result for file: ${result?.filePath || 'unknown'}`));
          return null;
        }

        // Ensure messages array exists
        const messages = result.messages || [];
        if (!Array.isArray(messages)) {
          console.warn(chalk.yellow(`⚠️  Invalid messages array for file: ${result.filePath}`));
          return {
            filePath: result.filePath,
            errorCount: 0,
            warningCount: 0,
            messages: [],
          };
        }

        let filteredMessages = messages
          .filter(message => message && !excludeRules.includes(message.ruleId))
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
            ruleSource: message.ruleId
              ? (message.ruleId.startsWith('react/') ? 'React Plugin'
                : message.ruleId.startsWith('@typescript-eslint/') ? 'TypeScript ESLint Plugin'
                : message.ruleId.startsWith('import/') ? 'Import Plugin'
                : 'ESLint core')
              : '',
            configSource: message.ruleId && configRuleMap[message.ruleId] ? configRuleMap[message.ruleId] : [],
          }));

        // If errorCount > 0 but messages is empty, omit this file from the report
        if ((result.errorCount > 0) && (!filteredMessages || filteredMessages.length === 0)) {
          return null;
        }

        return {
          filePath: result.filePath,
          errorCount: filteredMessages.length,
          warningCount: 0,
          messages: filteredMessages,
        };
      })
      .filter(Boolean), // Remove null results
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
export const generateESLintReport = async (
  folderPath,
  recommendedLintRules,
  projectType = '',
  reports = []
) => {
  try {
    const lintConfigFile = getLintConfigFile(recommendedLintRules, projectType);
    if (!lintConfigFile) {
      throw new Error(".eslintrc file is missing");
    }

    console.log(chalk.blue(`Using ESLint config: ${lintConfigFile}`));

    let eslint;
    try {
      eslint = new ESLint({
        useEslintrc: false,
        overrideConfigFile: lintConfigFile,
        // Add error handling for module resolution
        errorOnUnmatchedPattern: false,
        allowInlineConfig: false,
      });
    } catch (error) {
      console.error(chalk.red(`❌ ESLint initialization error: ${error.message}`));
      console.log(chalk.yellow(`🔄 Trying with simplified configuration...`));
      
      // Try with simplified config
      const simpleConfigPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'config', 'eslintrc.simple.json');
      eslint = new ESLint({
        useEslintrc: false,
        overrideConfigFile: simpleConfigPath,
        errorOnUnmatchedPattern: false,
        allowInlineConfig: false,
      });
    }

    const files = await globby(getConfigPattern('jsFilePathPattern'));
    console.log(chalk.blue(`📁 ESLint scanning ${files.length} files with pattern: ${getConfigPattern('jsFilePathPattern').join(', ')}`));
    
    await lintAllFiles(files, folderPath, eslint, projectType, reports);
    
    console.log(chalk.green(`✅ ESLint report generated successfully`));
    
  } catch (error) {
    console.error(chalk.red(`❌ Error during ESLint report generation: ${error.message}`));
    
    // Create a minimal error report
    const errorReport = {
      projectType,
      reports,
      error: error.message,
      results: [],
      excludeRules: {
        enabled: false,
        rules: [],
        count: 0
      }
    };
    
    try {
      await writeFile(
        path.join(folderPath, "eslint-report.json"),
        JSON.stringify(errorReport, null, 2)
      );
      console.log(chalk.yellow(`⚠️  Created error report with minimal data`));
    } catch (writeError) {
      console.error(chalk.red(`❌ Failed to write error report: ${writeError.message}`));
    }
    
    throw error; // Re-throw to maintain error handling in calling code
  }

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
