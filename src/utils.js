import fs from "fs";
import path from "path";
import { mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import chalk from "chalk";

const copyFile = (sourcePath, targetPath) => {
  fs.copyFileSync(sourcePath, targetPath);
};

export const copyStaticFiles = async (folderPath) => {
  const dist = "../build";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  await mkdir(folderPath, { recursive: true });
  
  // Copy dashboard files
  const sourcePath = path.join(__dirname, dist, "index.html");
  const targetPath = path.join(folderPath, "index.html");
  copyFile(sourcePath, targetPath);
  
  const mainJsSourcePath = path.join(__dirname, dist, "bundle.js");
  const mainJsTargetPath = path.join(folderPath, "bundle.js");
  copyFile(mainJsSourcePath, mainJsTargetPath);
  
  const mainCssSourcePath = path.join(__dirname, dist, "bundle.css");
  const mainCssTargetPath = path.join(folderPath, "bundle.css");
  copyFile(mainCssSourcePath, mainCssTargetPath);
  
  // Copy config file if it exists
  const configSourcePath = path.join(process.cwd(), "ui-code-insight.config.json");
  const configTargetPath = path.join(folderPath, "ui-code-insight.config.json");
  
  if (fs.existsSync(configSourcePath)) {
    try {
      copyFile(configSourcePath, configTargetPath);
      console.log(chalk.green("✅ Config file copied to report folder"));
    } catch (error) {
      console.warn(chalk.yellow("⚠️  Could not copy config file:", error.message));
    }
  } else {
    console.log(chalk.blue("ℹ️  No config file found to copy"));
  }
};
