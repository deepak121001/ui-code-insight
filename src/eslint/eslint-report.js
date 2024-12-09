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

/**
 * Function to determine ESLint configuration file path
 * @param {boolean} recommendedLintRules
 * @returns {string} lintConfigFile
 */
const getLintConfigFile = (recommendedLintRules) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
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
 */
const lintAllFiles = async (files, folderPath, eslint) => {
  console.log(
    chalk.green(
      `Total files count is ${files.length} This linting task will take some time.`
    )
  );
  const lintPromises = files.map((filePath) => lintFile(filePath, eslint));

  try {
    const lintResults = await Promise.all(lintPromises);
    const jsonReport = lintResults.map((result) => ({
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
    }));

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
 */
export const generateESLintReport = async (
  folderPath,
  jsFilePathPattern,
  recommendedLintRules
) => {
  const lintConfigFile = getLintConfigFile(recommendedLintRules);
  if (!lintConfigFile) {
    throw new Error(".eslintrc file is missing");
  }

  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfigFile: lintConfigFile,
  });

  const files = await globby([...jsFilePathPattern]);
  await lintAllFiles(files, folderPath, eslint);
};
