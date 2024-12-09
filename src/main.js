/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/extensions */
import path from "path";
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

const createReportFolder = async () => {
  try {
    console.log(chalk.blue("Copying static files..."));
    await copyStaticFiles(folderPath);
    console.log(chalk.green("Static files copied successfully!"));
  } catch (err) {
    handleReportError("Error in copy Static Files", err);
  }
};

const bundleAnalyzerReport = async (webpackConfigFile, webpackBundleFolder) => {
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
};

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

const generateESLintReportWrapper = async (
  jsFilePathPattern,
  recommendedLintRules
) => {
  try {
    if (jsFilePathPattern) {
      console.log(chalk.blue("Generating ESLint report..."));
      await generateESLintReport(
        folderPath,
        jsFilePathPattern,
        recommendedLintRules
      );
      console.log(chalk.green("ESLint report generated successfully!"));
    } else {
      console.log(chalk.bold.yellow("jsFilePathPattern is missing!"));
    }
  } catch (err) {
    handleReportError("Error generating ESLint report", err);
  }
};

const generateStyleLintReportWrapper = async (
  scssFilePathPattern,
  recommendedLintRules
) => {
  try {
    if (scssFilePathPattern) {
      console.log(chalk.blue("Generating Stylelint report..."));
      await generateStyleLintReport(
        folderPath,
        scssFilePathPattern,
        recommendedLintRules
      );
      console.log(chalk.green("Stylelint report generated successfully!"));
    } else {
      console.log(chalk.bold.yellow("scssFilePathPattern is missing!"));
    }
  } catch (err) {
    handleReportError("Error generating Stylelint report", err);
  }
};

const generateNpmPackageReportWrapper = () => {
  try {
    console.log(chalk.blue("Generating npm packages report..."));
    generateNpmPackageReport();
  } catch (err) {
    handleReportError("Error generating npm packages report", err);
  }
};

const generateAllReport = async (
  npmReport,
  jsFilePathPattern,
  scssFilePathPattern,
  recommendedLintRules,
  bundleAnalyzer,
  webpackConfigFile,
  webpackBundleFolder
) => {
  await generateESLintReportWrapper(jsFilePathPattern, recommendedLintRules);
  await generateStyleLintReportWrapper(
    scssFilePathPattern,
    recommendedLintRules
  );
  if (npmReport) {
    generateNpmPackageReportWrapper();
  }
  if (bundleAnalyzer) {
    bundleAnalyzerReport(webpackConfigFile, webpackBundleFolder);
  }
  console.log(chalk.bold.green("Report generation completed!"));
};

export default {
  generateAllReport,
  createReportFolder,
  generateESLintReport: generateESLintReportWrapper,
  generateStyleLintReport: generateStyleLintReportWrapper,
  generateComponentUsageReport: generateComponentUsageReportWrapper,
  generateNpmPackageReport: generateNpmPackageReportWrapper,
};
