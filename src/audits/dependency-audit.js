import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { writeFile } from 'fs/promises';

const BATCH_SIZE = 5;

/**
 * Dependency audit module for detecting dependency issues
 */
export class DependencyAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.dependencyIssues = [];
    this.issuesFile = path.join(this.folderPath, 'dependency-issues.jsonl');
    // Remove file if it exists from previous runs
    if (fs.existsSync(this.issuesFile)) fs.unlinkSync(this.issuesFile);
    this.issueStream = fs.createWriteStream(this.issuesFile, { flags: 'a' });
  }

  async addDependencyIssue(issue) {
    this.issueStream.write(JSON.stringify(issue) + '\n');
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
      
      const keys = Object.keys(outdatedData);
      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        batch.forEach((packageName, idx) => {
          process.stdout.write(`\r[Outdated Dependencies] Progress: ${i + idx + 1}/${keys.length} checked`);
        const packageInfo = outdatedData[packageName];
        this.addDependencyIssue({
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
      }
      process.stdout.write(`\r[Outdated Dependencies] Progress: ${keys.length}/${keys.length} checked\n`);
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
                this.addDependencyIssue({
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
      for (let i = 0; i < packageNames.length; i += BATCH_SIZE) {
        const batch = packageNames.slice(i, i + BATCH_SIZE);
        batch.forEach((name, idx) => {
          process.stdout.write(`\r[Duplicate Dependencies] Progress: ${i + idx + 1}/${packageNames.length} checked`);
          if (packageNames.indexOf(name) !== i + idx) {
          this.addDependencyIssue({
            type: 'duplicate_dependency',
              package: name,
            severity: 'medium',
              message: `Duplicate dependency found: ${name}`,
            recommendation: 'Remove duplicate entry from package.json'
          });
          }
        });
      }
      process.stdout.write(`\r[Duplicate Dependencies] Progress: ${packageNames.length}/${packageNames.length} checked\n`);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check for duplicate dependencies'));
    }
  }

  /**
   * Check for unused dependencies
   */
  async checkUnusedDependencies() {
    console.log(chalk.blue('📦 Checking for unused dependencies...'));
    const { spawnSync } = await import('child_process');
    let depcheckPath;
    try {
      // Use createRequire for ESM compatibility
      let require;
      try {
        const { createRequire } = await import('module');
        require = createRequire(import.meta.url);
        depcheckPath = require.resolve('depcheck');
      } catch (resolveErr) {
        depcheckPath = null;
      }
      if (!depcheckPath) {
        console.warn(chalk.yellow('depcheck is not installed. Please run: npm install depcheck --save-dev'));
        this.addDependencyIssue({
          type: 'depcheck_missing',
          severity: 'medium',
          message: 'depcheck is not installed. Unused dependency check skipped.',
          recommendation: 'Run npm install depcheck --save-dev'
        });
        return;
      }
      // Run depcheck
      const depcheckResult = spawnSync('npx', ['depcheck', '--json'], { encoding: 'utf8' });
      if (depcheckResult.error) {
        throw depcheckResult.error;
      }
      // Accept nonzero exit code if output is present (depcheck returns 1 if unused found)
      let depcheckData;
      const output = depcheckResult.stdout ? depcheckResult.stdout.trim() : '';
      if (!output && depcheckResult.stderr) {
        console.warn(chalk.yellow('depcheck stderr output:'));
        console.warn(depcheckResult.stderr);
      }
      try {
        depcheckData = JSON.parse(output);
      } catch (parseErr) {
        console.warn(chalk.yellow('Warning: Could not parse depcheck output as JSON.'));
        if (output) {
          console.warn(chalk.gray('depcheck output was:'));
          console.warn(output);
        }
        this.addDependencyIssue({
          type: 'depcheck_parse_error',
          severity: 'medium',
          message: 'depcheck output could not be parsed as JSON.',
          recommendation: 'Try running depcheck manually to debug.'
        });
        return;
      }
      if (depcheckData.dependencies && depcheckData.dependencies.length > 0) {
        for (let i = 0; i < depcheckData.dependencies.length; i += BATCH_SIZE) {
          const batch = depcheckData.dependencies.slice(i, i + BATCH_SIZE);
          batch.forEach((dep, idx) => {
            process.stdout.write(`\r[Unused Dependencies] Progress: ${i + idx + 1}/${depcheckData.dependencies.length} checked`);
          this.addDependencyIssue({
            type: 'unused_dependency',
            package: dep,
            file: dep || undefined, // Only set file to dep if no file info is present
            severity: 'low',
            message: `Unused dependency: ${dep}`,
            recommendation: `Remove ${dep} from package.json if not needed`
          });
        });
        }
        process.stdout.write(`\r[Unused Dependencies] Progress: ${depcheckData.dependencies.length}/${depcheckData.dependencies.length} checked\n`);
      }
      if (depcheckData.devDependencies && depcheckData.devDependencies.length > 0) {
        for (let i = 0; i < depcheckData.devDependencies.length; i += BATCH_SIZE) {
          const batch = depcheckData.devDependencies.slice(i, i + BATCH_SIZE);
          batch.forEach((dep, idx) => {
            process.stdout.write(`\r[Unused Dev Dependencies] Progress: ${i + idx + 1}/${depcheckData.devDependencies.length} checked`);
          this.addDependencyIssue({
            type: 'unused_dev_dependency',
            package: dep,
            file: dep || undefined, // Only set file to dep if no file info is present
            severity: 'low',
            message: `Unused dev dependency: ${dep}`,
            recommendation: `Remove ${dep} from devDependencies if not needed`
          });
        });
        }
        process.stdout.write(`\r[Unused Dev Dependencies] Progress: ${depcheckData.devDependencies.length}/${depcheckData.devDependencies.length} checked\n`);
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not check for unused dependencies.'));
      if (error && error.message) {
        console.warn(chalk.yellow(error.message));
      }
      this.addDependencyIssue({
        type: 'depcheck_error',
        severity: 'medium',
        message: 'Error occurred while running depcheck.',
        recommendation: 'Try running depcheck manually to debug.'
      });
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
        this.addDependencyIssue({
          type: 'missing_node_modules',
          severity: 'high',
          message: 'node_modules directory not found',
          recommendation: 'Run npm install to install dependencies'
        });
        return;
      }
      
      // Check for missing packages in node_modules
      const depKeys = Object.keys(allDeps);
      for (let i = 0; i < depKeys.length; i += BATCH_SIZE) {
        const batch = depKeys.slice(i, i + BATCH_SIZE);
        batch.forEach((packageName, idx) => {
          process.stdout.write(`\r[Missing Packages] Progress: ${i + idx + 1}/${depKeys.length} checked`);
        const packagePath = path.join('node_modules', packageName);
        if (!fs.existsSync(packagePath)) {
          this.addDependencyIssue({
            type: 'missing_package',
            package: packageName,
            severity: 'high',
            message: `Package ${packageName} is missing from node_modules`,
            recommendation: `Run npm install to install ${packageName}`
          });
        }
      });
      }
      process.stdout.write(`\r[Missing Packages] Progress: ${depKeys.length}/${depKeys.length} checked\n`);
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
        const peerKeys = Object.keys(packageJson.peerDependencies);
        for (let i = 0; i < peerKeys.length; i += BATCH_SIZE) {
          const batch = peerKeys.slice(i, i + BATCH_SIZE);
          batch.forEach((peerDep, idx) => {
            process.stdout.write(`\r[Peer Dependencies] Progress: ${i + idx + 1}/${peerKeys.length} checked`);
          const requiredVersion = packageJson.peerDependencies[peerDep];
          const packagePath = path.join('node_modules', peerDep);
          if (!fs.existsSync(packagePath)) {
            this.addDependencyIssue({
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
        process.stdout.write(`\r[Peer Dependencies] Progress: ${peerKeys.length}/${peerKeys.length} checked\n`);
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
      
      for (let i = 0; i < largePackages.length; i += BATCH_SIZE) {
        const batch = largePackages.slice(i, i + BATCH_SIZE);
        batch.forEach((pkg, idx) => {
          process.stdout.write(`\r[Large Dependencies] Progress: ${i + idx + 1}/${largePackages.length} checked`);
        if (allDeps[pkg]) {
          this.addDependencyIssue({
            type: 'large_dependency',
            package: pkg,
            severity: 'low',
            message: `Large dependency detected: ${pkg}`,
            recommendation: 'Consider using lighter alternatives or tree-shaking'
          });
        }
      });
      }
      process.stdout.write(`\r[Large Dependencies] Progress: ${largePackages.length}/${largePackages.length} checked\n`);
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
        this.addDependencyIssue({
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
        
        const licenseKeys = Object.keys(licenseData);
        for (let i = 0; i < licenseKeys.length; i += BATCH_SIZE) {
          const batch = licenseKeys.slice(i, i + BATCH_SIZE);
          batch.forEach((packageName, idx) => {
            process.stdout.write(`\r[License Compliance] Progress: ${i + idx + 1}/${licenseKeys.length} checked`);
          const packageInfo = licenseData[packageName];
          if (packageInfo.licenses) {
            problematicLicenses.forEach(license => {
              if (packageInfo.licenses.includes(license)) {
                this.addDependencyIssue({
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
        }
        process.stdout.write(`\r[License Compliance] Progress: ${licenseKeys.length}/${licenseKeys.length} checked\n`);
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
    
    this.issueStream.end();
    // Load issues from file
    if (fs.existsSync(this.issuesFile)) {
      const lines = fs.readFileSync(this.issuesFile, 'utf8').split('\n').filter(Boolean);
      const seen = new Set();
      const uniqueIssues = [];
      for (const line of lines) {
        try {
          const issue = JSON.parse(line);
          if (!issue.source) issue.source = 'custom';
          const key = `${issue.file || ''}:${issue.line || ''}:${issue.type}:${issue.message}`;
          if (!seen.has(key)) {
            uniqueIssues.push(issue);
            seen.add(key);
          }
        } catch {}
      }
      this.dependencyIssues = uniqueIssues;
    }

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