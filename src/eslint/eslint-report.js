import { ESLint } from "eslint";
import path from "path";
import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { globby } from "globby";
import fs from "fs";
import chalk from "chalk";

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
  let configFileName = ESLINTRC_JSON;

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
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // fallback to default logic
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

    if (messages[0].errorCount) {
      logError(filePath);
    } else if (messages[0].warningCount) {
      logWarning(filePath);
    } else {
      logSuccess(filePath);
    }

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
  const lintPromises = files.map((filePath) => lintFile(filePath, eslint));

  try {
    const lintResults = await Promise.all(lintPromises);
    const jsonReport = {
      projectType,
      reports,
      results: lintResults.map((result) => ({
        filePath: result?.filePath,
        errorCount: result?.errorCount,
        warningCount: result?.warningCount,
        messages: result?.messages.map((message) => ({
          ruleId: message.ruleId,
          severity: message.severity,
          line: message.line,
          column: message.column,
          message: message.message,
        })),
      })),
    };

    await writeFile(
      path.join(folderPath, "eslint-report.json"),
      JSON.stringify(jsonReport, null, 2)
    );
  } catch (error) {
    console.error(chalk.red(`Error during JS linting:', ${error}`));
  }
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
  jsFilePathPattern,
  recommendedLintRules,
  projectType = '',
  reports = []
) => {
  const lintConfigFile = getLintConfigFile(recommendedLintRules, projectType);
  if (!lintConfigFile) {
    throw new Error(".eslintrc file is missing");
  }

  console.log(chalk.blue(`Using ESLint config: ${lintConfigFile}`));

  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfigFile: lintConfigFile,
  });

  const files = await globby([...jsFilePathPattern]);
  await lintAllFiles(files, folderPath, eslint, projectType, reports);
};
