import chalk from "chalk";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import fetch from "node-fetch";

const kbToMb = (kilobytes) => kilobytes / 1024;

export const generateNpmPackageReport = async () => {
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
      // console.log(chalk.green(`Validating ${packageName}`));
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

    const depNames = Object.keys(dependencies);
    let processed = 0;
    for (const packageName of depNames) {
      processed++;
      process.stdout.write(`\r[NPM Packages] Progress: ${processed}/${depNames.length} dependencies checked`);
      await processPackage(packageName);
    }
    process.stdout.write(`\r[NPM Packages] Progress: ${depNames.length}/${depNames.length} dependencies checked\n`);

    // Process devDependencies
    const devDepNames = Object.keys(devDependencies);
    let devProcessed = 0;
    for (const packageName of devDepNames) {
      devProcessed++;
      process.stdout.write(`\r[NPM Dev Packages] Progress: ${devProcessed}/${devDepNames.length} devDependencies checked`);
      await processPackage(packageName, true);
    }
    process.stdout.write(`\r[NPM Dev Packages] Progress: ${devDepNames.length}/${devDepNames.length} devDependencies checked\n`);

    await writeFile(
      `${folderPath}/npm-report.json`,
      JSON.stringify(npmPackagesData, null, 2)
    );
  } catch (error) {
    console.error("Error:", error);
  }
};
