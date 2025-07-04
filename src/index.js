import { promises as fs } from "fs";
import audit from "./main.js";

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

export const codeInsightInit = async (options = {}) => {
  try {
    let data;
    // Check if configPath is available
    if (configPath) {
      data = await fs.readFile(configPath, "utf8");
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

    if (reports.includes('all') || reports.includes('eslint')) {
      await audit.generateESLintReport(jsFilePathPattern, recommendedLintRules, projectType, reports);
    }
    if (reports.includes('all') || reports.includes('stylelint')) {
      await audit.generateStyleLintReport(scssFilePathPattern, recommendedLintRules, projectType, reports);
    }
    if (reports.includes('all') || reports.includes('package')) {
      await audit.generateNpmPackageReport(projectType, reports);
    }
    // You can add more report types here as needed
  } catch (error) {
    console.error("Error reading the file:", error);
  }
};
