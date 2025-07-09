/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/extensions */
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { execSync } from "child_process";
import { copyStaticFiles } from "./utils.js";
import { generateESLintReport } from "./eslint/eslint-report.js";
import { generateStyleLintReport } from "./stylelint/stylelint-report.js";
import { generateNpmPackageReport } from "./packages-report/packagesReport.js";
import { generateComponentUsageReport } from "./component-usage/component-usage-report.js";

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
 * Generates a bundle analyzer report using webpack and webpack-bundle-analyzer.
 * @async
 * @param {string} webpackConfigFile - Path to the webpack config file.
 * @param {string} webpackBundleFolder - Path to the webpack bundle folder.
 * @returns {Promise<void>}
 */
const bundleAnalyzerReport = async (webpackConfigFile, webpackBundleFolder) => {
  try {
    console.log(
      chalk.blue(
        `Generating Bundle Analyser Report with webpackConfigFile:${webpackConfigFile} & webpackBundleFolder:${webpackBundleFolder}!`
      )
    );
    execSync("npm i webpack-bundle-analyzer");
    execSync(
      `npx webpack --config ${webpackConfigFile} --profile --json > report/stats.json`
    );
    execSync(
      `npx webpack-bundle-analyzer report/stats.json ${webpackBundleFolder} --default-sizes stat --mode static --report report/bundle-report.html --no-open`
    );
    console.log(chalk.green("Bundle Analyser Run!"));
  } catch (err) {
    handleReportError("Error generating Bundle Analyzer report", err);
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

export default {
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
