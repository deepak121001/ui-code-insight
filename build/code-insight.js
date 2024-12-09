import fs, { promises } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { ESLint } from 'eslint';
import { globby } from 'globby';
import stylelint from 'stylelint';
import fetch from 'node-fetch';

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

// Constants for configuration files
const CONFIG_FOLDER$1 = "config";
const ESLINTRC_JSON = ".eslintrc.json";
const ESLINTRC_JS = ".eslintrc.js";
const ESLINTRC_YML = ".eslintrc.yml";
const ESLINTRC = ".eslintrc";

/**
 * Function to determine ESLint configuration file path
 * @param {boolean} recommendedLintRules
 * @returns {string} lintConfigFile
 */
const getLintConfigFile$1 = (recommendedLintRules) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const recommendedLintRulesConfigFile = path.join(
    __dirname,
    CONFIG_FOLDER$1,
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
const logError$1 = (text) => console.log(chalk.red(text));

/**
 * Output yellow-colored text to console
 * @param {string} text
 */
const logWarning = (text) => console.log(chalk.yellow(text));

/**
 * Output green-colored text to console
 * @param {string} text
 */
const logSuccess$1 = (text) => console.log(chalk.green(text));

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

    if (messages[0].errorCount) {
      logError$1(filePath);
    } else if (messages[0].warningCount) {
      logWarning(filePath);
    } else {
      logSuccess$1(filePath);
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
const lintAllFiles$1 = async (files, folderPath, eslint) => {
  console.log(
    chalk.green(
      `Total files count is ${files.length} This linting task will take some time.`
    )
  );
  const lintPromises = files.map((filePath) => lintFile$1(filePath, eslint));

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
const generateESLintReport = async (
  folderPath,
  jsFilePathPattern,
  recommendedLintRules
) => {
  const lintConfigFile = getLintConfigFile$1(recommendedLintRules);
  if (!lintConfigFile) {
    throw new Error(".eslintrc file is missing");
  }

  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfigFile: lintConfigFile,
  });

  const files = await globby([...jsFilePathPattern]);
  await lintAllFiles$1(files, folderPath, eslint);
};

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
const generateStyleLintReport = async (
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
      console.log(chalk.green(`Validating ${packageName}`));
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

    // Process regular dependencies
    for (const packageName in dependencies) {
      await processPackage(packageName);
    }

    // Process devDependencies
    for (const packageName in devDependencies) {
      await processPackage(packageName, true);
    }

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

var audit = {
  generateAllReport,
  createReportFolder,
  generateESLintReport: generateESLintReportWrapper,
  generateStyleLintReport: generateStyleLintReportWrapper,
  generateComponentUsageReport: generateComponentUsageReportWrapper,
  generateNpmPackageReport: generateNpmPackageReportWrapper,
};

const args = process.argv.slice(3);
const configPath = process.argv[2];
const defaultConfig = {
  jsFilePathPattern: [
    "./src/**/*.js",
    "./src/**/*.ts",
    "./src/**/*.jsx",
    "./src/**/*.tsx",
    "!./src/**/*.stories.js",
  ],
  scssFilePathPattern: ["./src/**/*.scss", "!./node_modules/**"],
  npmReport: false,
  recommendedLintRules: true,
  bundleAnalyzer: false,
  webpackConfigFile: "./webpack.prod.js",
  webpackBundleFolder: "dist",
};
const codeInsightInit = async () => {
  try {
    let data;
    // Check if configPath is available
    if (configPath) {
      data = await promises.readFile(configPath, "utf8");
    } else {
      console.log("Config file not available hence using default config");
      data = defaultConfig;
    }
    const {
      npmReport,
      jsFilePathPattern,
      scssFilePathPattern,
      aemBasePath,
      aemContentPath,
      aemAppsPath,
      slingResourceTypeBase,
      recommendedLintRules,
      bundleAnalyzer,
      webpackConfigFile,
      webpackBundleFolder
    } = configPath ? JSON.parse(data) : data;
    await audit.createReportFolder();

    if (args.includes("--js")) {
      audit.eslintReport(jsFilePathPattern);
    }

    const aemToken = args.find((item) => item.includes("--aem-token"));
    if (aemToken) {
      const token = aemToken.split("=")[1];
      audit.componentUsageReport(
        token,
        aemBasePath,
        aemContentPath,
        aemAppsPath,
        slingResourceTypeBase
      );
    }

    if (args.includes("--scss")) {
      audit.scssReport(scssFilePathPattern);
    }

    if (args.includes("--bundle-analyse")) {
      audit.bundleAnalyzerReport(
        webpackConfigFile,
        webpackBundleFolder
      );
    }

    if (args.includes("--npm")) {
      audit.npmPackageReport();
    }

    if (args.length === 0) {
      audit.generateAllReport(
        npmReport,
        jsFilePathPattern,
        scssFilePathPattern,
        recommendedLintRules,
        bundleAnalyzer,
        webpackConfigFile,
        webpackBundleFolder

      );
    }
  } catch (error) {
    console.error("Error reading the file:", error);
  }
};

export { codeInsightInit };
