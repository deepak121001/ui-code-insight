import fs from "fs";
import { globby } from "globby";
import path from "path";
import { readFile } from "fs/promises";
import chalk from "chalk";
import stylelint from "stylelint";
import { fileURLToPath } from "url";

const { lint } = stylelint;

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
    if (output[0].errored) {
      logError(filePath);
    } else {
      logSuccess(filePath);
    }

    return {
      filePath,
      errorCount: output[0].warnings.length,
      warningCount: 0,
      messages: output[0].warnings.map((message) => ({
        line: message.line,
        column: message.column,
        severity: message.severity,
        rule: message.rule,
        message: message.text,
      })),
    };
  } catch (err) {
    return handleFileReadError(filePath, err);
  }
};

/**
 * Function to lint all files
 * @param {Array<string>} files
 * @param {string} folderPath
 * @param {string} lintStyleConfigFile
 */
const lintAllFiles = async (files, folderPath, lintStyleConfigFile) => {
  console.log(
    chalk.green(
      `Total files count is ${files.length} This linting task will take some time.`
    )
  );

  const lintPromises = files.map((filePath) =>
    lintFile(filePath, lintStyleConfigFile)
  );

  try {
    const lintResults = await Promise.all(lintPromises);

    await fs.promises.writeFile(
      path.join(folderPath, "stylelint-report.json"),
      JSON.stringify(lintResults, null, 2)
    );
  } catch (error) {
    console.error(chalk.red(`Error during Stylelinting:', ${error}`));
  }
};

/**
 * Function for linting all matched files
 * @param {String} folderPath
 * @param {String} scssFilePathPattern
 * @param {Boolean} recommendedLintRules
 */
export const generateStyleLintReport = async (
  folderPath,
  scssFilePathPattern,
  recommendedLintRules
) => {
  const lintStyleConfigFile = getLintConfigFile(recommendedLintRules);
  if (!lintStyleConfigFile) {
    throw new Error(".stylelintrc.json file is missing");
  }

  // Create a glob pattern to match all SCSS files
  const files = await globby([...scssFilePathPattern]);

  await lintAllFiles(files, folderPath, lintStyleConfigFile);
};
