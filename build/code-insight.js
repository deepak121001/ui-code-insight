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
const getLintConfigFile$1 = (recommendedLintRules, projectType = '') => {
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

  const configFilePath = path.join(__dirname, CONFIG_FOLDER$1, configFileName);
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }

  // fallback to default logic
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
 * @param {string} projectType
 * @param {Array<string>} reports
 */
const lintAllFiles$1 = async (files, folderPath, eslint, projectType, reports) => {
  console.log(
    chalk.green(
      `Total files count is ${files.length} This linting task will take some time.`
    )
  );
  const lintPromises = files.map((filePath) => lintFile$1(filePath, eslint));

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
const generateESLintReport = async (
  folderPath,
  jsFilePathPattern,
  recommendedLintRules,
  projectType = '',
  reports = []
) => {
  const lintConfigFile = getLintConfigFile$1(recommendedLintRules, projectType);
  if (!lintConfigFile) {
    throw new Error(".eslintrc file is missing");
  }

  console.log(chalk.blue(`Using ESLint config: ${lintConfigFile}`));

  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfigFile: lintConfigFile,
  });

  const files = await globby([...jsFilePathPattern, '!**/node_modules/**']);
  console.log(chalk.blue(`📁 ESLint scanning ${files.length} files with pattern: ${jsFilePathPattern.join(', ')}`));
  console.log(chalk.gray(`Files being processed:`));
  files.slice(0, 10).forEach(file => console.log(chalk.gray(`  - ${file}`)));
  if (files.length > 10) {
    console.log(chalk.gray(`  ... and ${files.length - 10} more files`));
  }
  await lintAllFiles$1(files, folderPath, eslint, projectType, reports);
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
 * @param {string[]} jsFilePathPattern
 * @param {boolean} recommendedLintRules
 * @returns {Promise<void>}
 */
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

/**
 * Generates a Stylelint report.
 * @async
 * @param {string[]} scssFilePathPattern
 * @param {boolean} recommendedLintRules
 * @returns {Promise<void>}
 */
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

/**
 * Generates an npm package report.
 * @returns {void}
 */
const generateNpmPackageReportWrapper = () => {
  try {
    console.log(chalk.blue("Generating npm packages report..."));
    generateNpmPackageReport();
  } catch (err) {
    handleReportError("Error generating npm packages report", err);
  }
};

/**
 * Generates all reports as configured.
 * @async
 * @param {boolean} npmReport
 * @param {string[]} jsFilePathPattern
 * @param {string[]} scssFilePathPattern
 * @param {boolean} recommendedLintRules
 * @param {boolean} bundleAnalyzer
 * @param {string} webpackConfigFile
 * @param {string} webpackBundleFolder
 * @returns {Promise<void>}
 */
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
    await bundleAnalyzerReport(webpackConfigFile, webpackBundleFolder);
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

// Centralized globby file patterns for all audits

const jsTsGlobs = [
  '**/*.{js,ts,jsx,tsx}',
  '!**/node_modules/**',
  '!**/.storybook/**',
  '!**/storybook/**',
  '!**/report/**',
  '!build/**',
  '!dist/**',
  '!coverage/**',
  '!.git/**',
  '!bin/**'
];

const htmlGlobs = [
  '**/*.{html,js,ts,jsx,tsx}',
  '!**/node_modules/**',
  '!**/.storybook/**',
  '!**/storybook/**',
  '!**/report/**',
  '!build/**',
  '!dist/**',
  '!coverage/**',
  '!.git/**',
  '!bin/**'
];

const assetGlobs = [
  'public/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'assets/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'static/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'src/assets/**/*.{png,jpg,jpeg,bmp,tiff,gif}'
];

// Add more as needed for CSS, JSON, etc.

/**
 * Security audit module for detecting common security vulnerabilities
 */
class SecurityAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.securityIssues = [];
  }

/**
 * Check for hardcoded secrets
 */
async checkForSecrets() {
  console.log(chalk.blue('🔒 Checking for hardcoded secrets...'));

  const secretPatterns = [
    /password\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /api[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /secret\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /token\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /auth[_-]?token\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /authorization\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /bearer\s+['"`][^'"`\s]+['"`]/gi,
    /access[_-]?token\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /refresh[_-]?token\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /private[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /aws_access_key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /aws_secret_key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /client[_-]?id\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /client[_-]?secret\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /firebase\s*api[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /connection\s*string\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /-----BEGIN\s+(RSA|DSA|EC|PGP|OPENSSH|PRIVATE)\s+PRIVATE\s+KEY-----[\s\S]+?-----END\s+(?:RSA|DSA|EC|PGP|OPENSSH|PRIVATE)\s+PRIVATE\s+KEY-----/g,
    /\b[a-zA-Z0-9_-]*?(api|access|secret|auth|token|key)[a-zA-Z0-9_-]*?\s*[:=]\s*['"`][\w\-]{16,}['"`]/gi,
    /\b(PASSWORD|SECRET|TOKEN|KEY|ACCESS_KEY|PRIVATE_KEY)\s*=\s*[^'"`\n\r]+/gi
  ];

  const files = await globby(jsTsGlobs);

  console.log(chalk.gray(`📁 Scanning ${files.length} files for secrets...`));

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('//')) return;

        secretPatterns.forEach(pattern => {
          if (pattern.test(trimmedLine)) {
            // Get context lines (2 lines before and after)
            const contextStart = Math.max(0, index - 2);
            const contextEnd = Math.min(lines.length - 1, index + 2);
            const contextLines = lines.slice(contextStart, contextEnd + 1);
            const contextCode = contextLines.map((line, i) => {
              const lineNum = contextStart + i + 1;
              const marker = lineNum === index + 1 ? '>>> ' : '    ';
              return `${marker}${lineNum}: ${line}`;
            }).join('\n');

            this.securityIssues.push({
              type: 'hardcoded_secret',
              file,
              line: index + 1,
              severity: 'high',
              message: 'Potential hardcoded secret detected',
              code: trimmedLine,
              context: contextCode
            });
          }
        });
      });
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Warning: Could not read file ${file}`));
    }
  }
}


/**
 * Check for unsafe eval usage
 */
async checkUnsafeEval() {
  console.log(chalk.blue('🔒 Checking for unsafe eval usage...'));

  const files = await globby(jsTsGlobs);
  console.log(chalk.gray(`📁 Scanning ${files.length} JS/TS files for unsafe eval...`));

  const unsafePatterns = [
    /\beval\s*\(/,                      // eval(...)
    /\bnew\s+Function\s*\(/,           // new Function(...)
    /\bFunction\s*\(/,                 // Function(...)
    /\bsetTimeout\s*\(\s*['"`]/,       // setTimeout("...")
    /\bsetInterval\s*\(\s*['"`]/       // setInterval("...")
  ];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const pattern of unsafePatterns) {
          if (pattern.test(line)) {
            // Get context lines (2 lines before and after)
            const contextStart = Math.max(0, index - 2);
            const contextEnd = Math.min(lines.length - 1, index + 2);
            const contextLines = lines.slice(contextStart, contextEnd + 1);
            const contextCode = contextLines.map((line, i) => {
              const lineNum = contextStart + i + 1;
              const marker = lineNum === index + 1 ? '>>> ' : '    ';
              return `${marker}${lineNum}: ${line}`;
            }).join('\n');

            this.securityIssues.push({
              type: 'unsafe_eval',
              file,
              line: index + 1,
              severity: 'high',
              message: 'Unsafe eval or dynamic code execution detected',
              code: line.trim(),
              context: contextCode
            });
            break; // Only report once per line
          }
        }
      });
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
    }
  }
}


/**
 * Check for potential XSS vulnerabilities
 */
async checkXSSVulnerabilities() {
  console.log(chalk.blue('🔒 Checking for XSS vulnerabilities...'));

  const xssPatterns = [
    { pattern: /\binnerHTML\s*=/i, message: 'Use of innerHTML can lead to XSS', severity: 'high' },
    { pattern: /\bouterHTML\s*=/i, message: 'Use of outerHTML can lead to XSS', severity: 'high' },
    { pattern: /\bdocument\.write\s*\(/i, message: 'Use of document.write is dangerous and can lead to XSS', severity: 'high' },
    { pattern: /\.insertAdjacentHTML\s*\(/i, message: 'insertAdjacentHTML can be XSS-prone', severity: 'medium' },
    { pattern: /\b dangerouslySetInnerHTML\s*=/i, message: 'React dangerouslySetInnerHTML used', severity: 'medium' },
    { pattern: /\bnew\s+DOMParser\s*\(\)/i, message: 'DOMParser can be dangerous if input is not sanitized', severity: 'low' },
  ];

  const files = await globby(jsTsGlobs);

  console.log(chalk.gray(`📁 Scanning ${files.length} JS/TS files for XSS vulnerabilities...`));

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Skip commented or empty lines
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed === '') return;

        xssPatterns.forEach(({ pattern, message, severity }) => {
          if (pattern.test(trimmed)) {
            // Get context lines (2 lines before and after)
            const contextStart = Math.max(0, index - 2);
            const contextEnd = Math.min(lines.length - 1, index + 2);
            const contextLines = lines.slice(contextStart, contextEnd + 1);
            const contextCode = contextLines.map((line, i) => {
              const lineNum = contextStart + i + 1;
              const marker = lineNum === index + 1 ? '>>> ' : '    ';
              return `${marker}${lineNum}: ${line}`;
            }).join('\n');

            this.securityIssues.push({
              type: 'xss_vulnerability',
              file,
              line: index + 1,
              severity,
              message,
              code: trimmed,
              context: contextCode
            });
          }
        });
      });
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Warning: Could not read file ${file}`));
    }
  }
}


/**
 * Check for potential SQL injection patterns
 */
async checkSQLInjection() {
  console.log(chalk.blue('🔒 Checking for SQL injection patterns...'));

  const sqlPatterns = [
    {
      pattern: /\b(query|execute)\s*\(\s*[`'"][^`'"']*\$\{[^}]+\}[^`'"']*[`'"]\s*\)/gi,
      message: 'SQL query contains template string interpolation — possible injection risk',
      severity: 'high'
    },
    {
      pattern: /\bsql\s*[:=]\s*[`'"][^`'"']*\$\{[^}]+\}[^`'"']*[`'"]/gi,
      message: 'Interpolated SQL assignment — risk of SQL injection',
      severity: 'high'
    },
    {
      pattern: /\bSELECT\s+.*\s+FROM\s+/i,
      message: 'Direct SQL query detected, check for unsafe input handling',
      severity: 'medium'
    },
    {
      pattern: /\bINSERT\s+INTO\s+/i,
      message: 'Direct SQL INSERT detected — validate inputs',
      severity: 'medium'
    },
    {
      pattern: /\bUPDATE\s+\w+\s+SET\s+/i,
      message: 'Direct SQL UPDATE detected — check parameter usage',
      severity: 'medium'
    },
    {
      pattern: /\bDELETE\s+FROM\s+/i,
      message: 'Direct SQL DELETE detected — confirm query safety',
      severity: 'medium'
    }
  ];

  const files = await globby(jsTsGlobs);

  console.log(chalk.gray(`📁 Scanning ${files.length} JS/TS files for SQL injection patterns...`));

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('//')) return;

        for (const { pattern, message, severity } of sqlPatterns) {
          if (pattern.test(trimmed)) {
            // Get context lines (2 lines before and after)
            const contextStart = Math.max(0, index - 2);
            const contextEnd = Math.min(lines.length - 1, index + 2);
            const contextLines = lines.slice(contextStart, contextEnd + 1);
            const contextCode = contextLines.map((line, i) => {
              const lineNum = contextStart + i + 1;
              const marker = lineNum === index + 1 ? '>>> ' : '    ';
              return `${marker}${lineNum}: ${line}`;
            }).join('\n');

            this.securityIssues.push({
              type: 'sql_injection',
              file,
              line: index + 1,
              severity,
              message,
              code: trimmed,
              context: contextCode
            });
            break; // Only one issue per line
          }
        }
      });
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Warning: Could not read file ${file}`));
    }
  }
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

  /**
   * Check for logging of sensitive data
   */
  async checkSensitiveDataLogging() {
    console.log(chalk.blue('🔒 Checking for logging of sensitive data...'));
    const sensitiveKeywords = [
      'password', 'token', 'secret', 'key', 'auth', 'jwt', 'access', 'refresh'
    ];
    const logPatterns = [
      /console\.(log|error|warn|info)\s*\(([^)]*)\)/gi,
      /logger\.(log|error|warn|info)\s*\(([^)]*)\)/gi
    ];
    const files = await globby(jsTsGlobs);
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          logPatterns.forEach(pattern => {
            const match = pattern.exec(line);
            if (match) {
              const args = match[2] || '';
              if (sensitiveKeywords.some(word => args.toLowerCase().includes(word))) {
                this.securityIssues.push({
                  type: 'sensitive_data_logging',
                  file,
                  line: index + 1,
                  severity: 'high',
                  message: 'Sensitive data may be logged',
                  code: line.trim()
                });
              }
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Warn on insecure HTTP requests
   */
  async checkInsecureHttpRequests() {
    console.log(chalk.blue('🔒 Checking for insecure HTTP requests...'));
    const httpPattern = /\b(fetch|axios|XMLHttpRequest|open|src|href)\s*\(?.*['\"]http:\/\//i;
    const files = await globby(htmlGlobs);
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (httpPattern.test(line)) {
            this.securityIssues.push({
              type: 'insecure_http_request',
              file,
              line: index + 1,
              severity: 'medium',
              message: 'Insecure HTTP request detected (use HTTPS)',
              code: line.trim()
            });
          }
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Check for insecure cookie usage
   */
  async checkInsecureCookieUsage() {
    console.log(chalk.blue('🔒 Checking for insecure cookie usage...'));
    const cookiePattern = /document\.cookie\s*=|setCookie\s*\(/i;
    const files = await globby(htmlGlobs);
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (cookiePattern.test(line)) {
            // Check if Secure/HttpOnly flags are present (simple heuristic)
            if (!/secure/i.test(line) || !/httponly/i.test(line)) {
              this.securityIssues.push({
                type: 'insecure_cookie',
                file,
                line: index + 1,
                severity: 'medium',
                message: 'Cookie set without Secure/HttpOnly flags',
                code: line.trim()
              });
            }
          }
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Run all security checks
   */
  async runSecurityAudit() {
    console.log(chalk.blue('🔒 Starting Security Audit...'));
    
    await this.checkForSecrets();
    await this.checkUnsafeEval();
    await this.checkXSSVulnerabilities();
    await this.checkSQLInjection();
    await this.checkDependencyVulnerabilities();
    await this.checkSensitiveDataLogging();
    await this.checkInsecureHttpRequests();
    await this.checkInsecureCookieUsage();
    
    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.securityIssues.length,
      highSeverity: this.securityIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.securityIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.securityIssues.filter(issue => issue.severity === 'low').length,
      infoIssues: this.securityIssues.filter(issue => issue.severity === 'info').length,
      issues: this.securityIssues
    };

    // Generate JSON report
    try {
      const reportPath = path.join(this.folderPath, 'security-audit-report.json');
      await writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`✅ Security audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving security audit report:', error.message));
    }

    // Display summary
    console.log(chalk.blue('\n🔒 SECURITY AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(40)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));
    console.log(chalk.green(`Info/Positive: ${results.infoIssues}`));

    return results;
  }
}

/**
 * Performance audit module for detecting performance issues
 */
class PerformanceAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.performanceIssues = [];
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
                this.performanceIssues.push({
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

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          inefficientPatterns.forEach(({ pattern, message, severity }) => {
            if (pattern.test(line)) {
              this.performanceIssues.push({
                type: 'inefficient_operation',
                file,
                line: index + 1,
                severity,
                message,
                code: line.trim()
              });
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
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

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          memoryLeakPatterns.forEach(({ pattern, message, severity }) => {
            if (pattern.test(line)) {
              this.performanceIssues.push({
                type: 'memory_leak',
                file,
                line: index + 1,
                severity,
                message,
                code: line.trim()
              });
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Check for large dependencies
   */
  async checkLargeDependencies() {
    console.log(chalk.blue('⚡ Checking for large dependencies...'));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Common large packages to flag
      const largePackages = [
        'lodash', 'moment', 'date-fns', 'ramda', 'immutable',
        'bootstrap', 'material-ui', 'antd', 'semantic-ui'
      ];
      
      largePackages.forEach(pkg => {
        if (allDeps[pkg]) {
          this.performanceIssues.push({
            type: 'large_dependency',
            package: pkg,
            severity: 'low',
            message: `Large dependency detected: ${pkg}`,
            recommendation: 'Consider using lighter alternatives or tree-shaking'
          });
        }
      });
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not read package.json'));
    }
  }

  /**
   * Check for unused imports and dead code
   */
  async checkUnusedCode() {
    console.log(chalk.blue('⚡ Checking for unused code...'));
    
    try {
      // Use ESLint to check for unused variables and imports
      const eslintResult = execSync('npx eslint . --ext .js,.ts,.jsx,.tsx --format json', { 
        encoding: 'utf8', 
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      const eslintData = JSON.parse(eslintResult);
      
      eslintData.forEach(file => {
        file.messages.forEach(message => {
          if (message.ruleId === 'no-unused-vars' || message.ruleId === '@typescript-eslint/no-unused-vars') {
            this.performanceIssues.push({
              type: 'unused_code',
              file: file.filePath,
              line: message.line,
              severity: 'low',
              message: 'Unused variable or import detected',
              code: message.message
            });
          }
        });
      });
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not run ESLint for unused code check'));
    }
  }

  /**
   * Detect synchronous/blocking code in async contexts
   */
  async checkBlockingCodeInAsync() {
    console.log(chalk.blue('⚡ Checking for blocking code in async contexts...'));
    const files = await globby(jsTsGlobs);
    const blockingPatterns = [
      /while\s*\(true\)/i,
      /for\s*\(.*;.*;.*\)/i,
      /setTimeout\s*\(.*,[^)]{5,}\)/i, // setTimeout with long duration
      /setInterval\s*\(.*,[^)]{5,}\)/i
    ];
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        let inAsync = false;
        lines.forEach((line, index) => {
          if (/async\s+function|async\s*\(/.test(line)) inAsync = true;
          if (inAsync) {
            blockingPatterns.forEach(pattern => {
              if (pattern.test(line)) {
                this.performanceIssues.push({
                  type: 'blocking_code_in_async',
                  file,
                  line: index + 1,
                  severity: 'medium',
                  message: 'Potential blocking code in async context',
                  code: line.trim()
                });
              }
            });
          }
          if (/}/.test(line)) inAsync = false;
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
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
              this.performanceIssues.push({
                type: 'unoptimized_asset',
                file,
                severity: 'medium',
                message: `Large image asset detected (${(stats.size/1024).toFixed(0)} KB)`,
                recommendation: 'Compress or optimize this image for web'
              });
            }
            if (['.bmp', '.tiff'].some(ext => file.endsWith(ext))) {
              this.performanceIssues.push({
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
   * Run all performance checks
   */
  async runPerformanceAudit() {
    console.log(chalk.blue('⚡ Starting Performance Audit...'));
    
    //await this.checkBundleSize();
    await this.checkInefficientOperations();
    await this.checkMemoryLeaks();
    await this.checkLargeDependencies();
    await this.checkUnusedCode();
    await this.checkBlockingCodeInAsync();
    await this.checkUnoptimizedAssets();
    
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

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          imagePatterns.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
              matches.forEach(match => {
                if (!match.includes('alt=') || match.includes('alt=""')) {
                  this.accessibilityIssues.push({
                    type: 'missing_alt',
                    file,
                    line: index + 1,
                    severity: 'high',
                    message: 'Image missing alt attribute or has empty alt',
                    code: line.trim()
                  });
                }
              });
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
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

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          headingPatterns.forEach((pattern, level) => {
            if (pattern.test(line)) {
              // Check for skipped heading levels
              if (level > 0) {
                const prevHeadingPattern = new RegExp(`<h${level}[^>]*>`, 'gi');
                const hasPreviousHeading = content.substring(0, content.indexOf(line)).match(prevHeadingPattern);
                
                if (!hasPreviousHeading) {
                  this.accessibilityIssues.push({
                    type: 'skipped_heading',
                    file,
                    line: index + 1,
                    severity: 'medium',
                    message: `Heading level ${level + 1} used without previous level ${level}`,
                    code: line.trim()
                  });
                }
              }
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
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

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          formPatterns.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
              matches.forEach(match => {
                // Check if input has proper labeling
                const hasLabel = match.includes('aria-label=') || 
                               match.includes('aria-labelledby=') || 
                               match.includes('id=');
                
                if (!hasLabel && !match.includes('type="hidden"')) {
                  this.accessibilityIssues.push({
                    type: 'missing_form_label',
                    file,
                    line: index + 1,
                    severity: 'high',
                    message: 'Form control missing proper labeling',
                    code: line.trim()
                  });
                }
              });
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
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

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          colorPatterns.forEach(pattern => {
            if (pattern.test(line)) {
              // This is a basic check - in a real implementation, you'd want to
              // actually calculate contrast ratios
              this.accessibilityIssues.push({
                type: 'color_contrast',
                file,
                line: index + 1,
                severity: 'medium',
                message: 'Color usage detected - verify contrast ratios meet WCAG guidelines',
                code: line.trim(),
                recommendation: 'Use tools like axe-core or Lighthouse to check actual contrast ratios'
              });
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Check for keyboard navigation support
   */
  async checkKeyboardNavigation() {
    console.log(chalk.blue('♿ Checking keyboard navigation...'));
    
    const keyboardPatterns = [
      /onClick\s*=/gi,
      /onclick\s*=/gi,
      /addEventListener\s*\(\s*['"]click['"]/gi,
    ];

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          keyboardPatterns.forEach(pattern => {
            if (pattern.test(line)) {
              // Check if there's also keyboard event handling
              const hasKeyboardSupport = line.includes('onKeyDown') || 
                                       line.includes('onKeyUp') || 
                                       line.includes('onKeyPress') ||
                                       line.includes('addEventListener') && 
                                       (line.includes('keydown') || line.includes('keyup') || line.includes('keypress'));
              
              if (!hasKeyboardSupport) {
                this.accessibilityIssues.push({
                  type: 'keyboard_navigation',
                  file,
                  line: index + 1,
                  severity: 'medium',
                  message: 'Click handler without keyboard support',
                  code: line.trim(),
                  recommendation: 'Add keyboard event handlers or use semantic HTML elements'
                });
              }
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Check for ARIA attributes
   */
  async checkARIAUsage() {
    console.log(chalk.blue('♿ Checking ARIA usage...'));
    
    const ariaPatterns = [
      /aria-[a-zA-Z-]+/gi,
    ];

    const files = await globby(jsTsGlobs);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          ariaPatterns.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
              matches.forEach(match => {
                // Check for common ARIA mistakes
                if (match.includes('aria-label=""') || match.includes('aria-labelledby=""')) {
                  this.accessibilityIssues.push({
                    type: 'empty_aria',
                    file,
                    line: index + 1,
                    severity: 'medium',
                    message: 'Empty ARIA attribute detected',
                    code: line.trim()
                  });
                }
              });
            }
          });
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Check for tab order and focus management
   */
  async checkTabOrderAndFocus() {
    console.log(chalk.blue('♿ Checking tab order and focus management...'));
    const files = await globby(jsTsGlobs);
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          // Check for interactive elements without tabindex
          if ((/<(button|a|input|select|textarea|div|span)[^>]*>/i.test(line) || /onClick=|onKeyDown=|onFocus=/.test(line)) && !/tabindex=/i.test(line)) {
            this.accessibilityIssues.push({
              type: 'tab_order_focus',
              file,
              line: index + 1,
              severity: 'medium',
              message: 'Interactive element may be missing tabindex or focus management',
              code: line.trim()
            });
          }
          // Check for modals/dialogs without focus trap
          if (/<(dialog|Modal|modal)[^>]*>/i.test(line) && !/focusTrap|trapFocus|tabindex/i.test(line)) {
            this.accessibilityIssues.push({
              type: 'focus_management',
              file,
              line: index + 1,
              severity: 'medium',
              message: 'Modal/dialog may be missing focus trap or focus management',
              code: line.trim()
            });
          }
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
  }

  /**
   * Look for missing landmark roles and skip links
   */
  async checkLandmarksAndSkipLinks() {
    console.log(chalk.blue('♿ Checking for landmark roles and skip links...'));
    const files = await globby(jsTsGlobs);
    let foundLandmark = false;
    let foundSkipLink = false;
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (/<(main|nav|aside|header|footer)[^>]*>/i.test(content)) foundLandmark = true;
        if (/<a[^>]+href=["']#main-content["'][^>]*>.*skip to main content.*<\/a>/i.test(content)) foundSkipLink = true;
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
      }
    }
    if (!foundLandmark) {
      this.accessibilityIssues.push({
        type: 'missing_landmark',
        severity: 'medium',
        message: 'No landmark roles (<main>, <nav>, <aside>, <header>, <footer>) found in project',
        recommendation: 'Add semantic landmark elements for better accessibility'
      });
    }
    if (!foundSkipLink) {
      this.accessibilityIssues.push({
        type: 'missing_skip_link',
        severity: 'medium',
        message: 'No skip link found (e.g., <a href="#main-content">Skip to main content</a>)',
        recommendation: 'Add a skip link for keyboard users'
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
  }

  /**
   * Check for test files and testing framework usage
   */
  async checkTestFiles() {
    console.log(chalk.blue('🧪 Checking test files...'));
    
    const testFiles = await globby(jsTsGlobs.testFiles);
    
    if (testFiles.length === 0) {
      this.testingIssues.push({
        type: 'no_test_files',
        severity: 'high',
        message: 'No test files found',
        recommendation: 'Create test files with .test.js or .spec.js extensions'
      });
    } else {
      this.testingIssues.push({
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
        this.testingIssues.push({
          type: 'no_testing_framework',
          severity: 'high',
          message: 'No testing framework detected',
          recommendation: 'Install a testing framework like Jest, Mocha, or Vitest'
        });
      } else {
        this.testingIssues.push({
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
              this.testingIssues.push({
                type: 'coverage_report_generated',
                severity: 'info',
                message: 'Test coverage report generated',
                positive: true
              });
              break;
            }
          }
        } catch (error) {
          this.testingIssues.push({
            type: 'coverage_failed',
            severity: 'medium',
            message: 'Test coverage generation failed',
            recommendation: 'Check test configuration and ensure tests pass'
          });
        }
      } else {
        this.testingIssues.push({
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
    
    const testFiles = await globby(jsTsGlobs.testFiles);
    
    for (const file of testFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          jsTsGlobs.testPatterns.forEach(({ pattern, name, positive }) => {
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
    }
  }

  /**
   * Check for mocking and stubbing patterns
   */
  async checkMockingPatterns() {
    console.log(chalk.blue('🧪 Checking mocking patterns...'));
    
    const testFiles = await globby(jsTsGlobs.testFiles);
    
    for (const file of testFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          jsTsGlobs.mockPatterns.forEach(({ pattern, name, positive }) => {
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
    }
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
    
    await this.checkTestFiles();
    await this.checkTestCoverage();
    await this.checkTestingPatterns();
    await this.checkMockingPatterns();
    await this.checkE2ETesting();
    await this.checkTestConfiguration();
    
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
      
      Object.keys(outdatedData).forEach(packageName => {
        const packageInfo = outdatedData[packageName];
        this.dependencyIssues.push({
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
                this.dependencyIssues.push({
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
      const duplicates = packageNames.filter((name, index) => packageNames.indexOf(name) !== index);
      
      if (duplicates.length > 0) {
        duplicates.forEach(duplicate => {
          this.dependencyIssues.push({
            type: 'duplicate_dependency',
            package: duplicate,
            severity: 'medium',
            message: `Duplicate dependency found: ${duplicate}`,
            recommendation: 'Remove duplicate entry from package.json'
          });
        });
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check for duplicate dependencies'));
    }
  }

  /**
   * Check for unused dependencies
   */
  async checkUnusedDependencies() {
    console.log(chalk.blue('📦 Checking for unused dependencies...'));
    
    try {
      // Use depcheck to find unused dependencies
      const depcheckResult = execSync('npx depcheck --json', { 
        encoding: 'utf8', 
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      const depcheckData = JSON.parse(depcheckResult);
      
      if (depcheckData.dependencies && depcheckData.dependencies.length > 0) {
        depcheckData.dependencies.forEach(dep => {
          this.dependencyIssues.push({
            type: 'unused_dependency',
            package: dep,
            severity: 'low',
            message: `Unused dependency: ${dep}`,
            recommendation: `Remove ${dep} from package.json if not needed`
          });
        });
      }
      
      if (depcheckData.devDependencies && depcheckData.devDependencies.length > 0) {
        depcheckData.devDependencies.forEach(dep => {
          this.dependencyIssues.push({
            type: 'unused_dev_dependency',
            package: dep,
            severity: 'low',
            message: `Unused dev dependency: ${dep}`,
            recommendation: `Remove ${dep} from devDependencies if not needed`
          });
        });
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check for unused dependencies (depcheck not available)'));
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
        this.dependencyIssues.push({
          type: 'missing_node_modules',
          severity: 'high',
          message: 'node_modules directory not found',
          recommendation: 'Run npm install to install dependencies'
        });
        return;
      }
      
      // Check for missing packages in node_modules
      Object.keys(allDeps).forEach(packageName => {
        const packagePath = path.join('node_modules', packageName);
        if (!fs.existsSync(packagePath)) {
          this.dependencyIssues.push({
            type: 'missing_package',
            package: packageName,
            severity: 'high',
            message: `Package ${packageName} is missing from node_modules`,
            recommendation: `Run npm install to install ${packageName}`
          });
        }
      });
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
        Object.keys(packageJson.peerDependencies).forEach(peerDep => {
          const requiredVersion = packageJson.peerDependencies[peerDep];
          
          // Check if peer dependency is installed
          const packagePath = path.join('node_modules', peerDep);
          if (!fs.existsSync(packagePath)) {
            this.dependencyIssues.push({
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
      
      largePackages.forEach(pkg => {
        if (allDeps[pkg]) {
          this.dependencyIssues.push({
            type: 'large_dependency',
            package: pkg,
            severity: 'low',
            message: `Large dependency detected: ${pkg}`,
            recommendation: 'Consider using lighter alternatives or tree-shaking'
          });
        }
      });
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
        this.dependencyIssues.push({
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
        
        Object.keys(licenseData).forEach(packageName => {
          const packageInfo = licenseData[packageName];
          if (packageInfo.licenses) {
            problematicLicenses.forEach(license => {
              if (packageInfo.licenses.includes(license)) {
                this.dependencyIssues.push({
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

const configPath = process.argv[2];
const defaultConfig = {
  jsFilePathPattern: [
    "./src/**/*.js",
    "./src/**/*.ts",
    "./src/**/*.jsx",
    "./src/**/*.tsx",
    "!./src/**/*.stories.js",
  ],
  scssFilePathPattern: [
    "./src/**/*.scss",
    "./src/**/*.less",
    "./src/**/*.css",
    "!./node_modules/**",
  ],
  npmReport: false,
  recommendedLintRules: true,
  bundleAnalyzer: false,
  webpackConfigFile: "./webpack.prod.js",
  webpackBundleFolder: "dist",
};

const codeInsightInit = async (options = {}) => {
  try {
    let data;
    // Check if configPath is available
    if (configPath) {
      data = await promises.readFile(configPath, "utf8");
    } else {
      console.log("Config file not available hence using default config");
      data = defaultConfig;
    }
    let {
      npmReport,
      jsFilePathPattern,
      scssFilePathPattern,
      aemBasePath,
      aemContentPath,
      aemAppsPath,
      slingResourceTypeBase,
      recommendedLintRules = true,
      bundleAnalyzer,
      webpackConfigFile,
      webpackBundleFolder
    } = configPath ? JSON.parse(data) : data;
    await audit.createReportFolder();

    const { reports = [], projectType } = options;
    if (projectType) {
      console.log(`Project type selected: ${projectType}`);
      // Adjust recommendedLintRules based on projectType
      if (projectType === 'React') {
        recommendedLintRules = true;
      } else if (projectType === 'Node') {
        recommendedLintRules = false;
      }
    }

    // Traditional reports
    if (reports.includes('all') || reports.includes('eslint')) {
      await audit.generateESLintReport(jsFilePathPattern, recommendedLintRules, projectType, reports);
    }
    if (reports.includes('all') || reports.includes('stylelint')) {
      await audit.generateStyleLintReport(scssFilePathPattern, recommendedLintRules, projectType, reports);
    }
    if (reports.includes('all') || reports.includes('package')) {
      await audit.generateNpmPackageReport(projectType, reports);
    }

    // New comprehensive audits
    const auditCategories = ['security', 'performance', 'accessibility', 'testing', 'dependency'];
    
    // Convert kebab-case to camelCase if needed (no modern-practices anymore)
    const normalizedReports = reports;
    const hasAuditReports = auditCategories.some(category => normalizedReports.includes(category));
    
    if (reports.includes('comprehensive') || hasAuditReports) {
      const orchestrator = new AuditOrchestrator('./report');
      
      if (reports.includes('comprehensive')) {
        // Run all audit categories
        await orchestrator.runAllAudits();
      } else {
        // Run specific audit categories
        for (const category of auditCategories) {
          if (normalizedReports.includes(category)) {
            console.log(`\nRunning ${category} audit...`);
            await orchestrator.runSpecificAudit(category);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error reading the file:", error);
  }
};

export { codeInsightInit };
