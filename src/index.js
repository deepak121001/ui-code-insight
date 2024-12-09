import { promises as fs } from "fs";
import audit from "./main.js";

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
export const codeInsightInit = async () => {
  try {
    let data;
    // Check if configPath is available
    if (configPath) {
      data = await fs.readFile(configPath, "utf8");
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
