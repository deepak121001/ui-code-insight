import chalk from "chalk";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { fileURLToPath } from "url";
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Lighthouse Audit Module
 * Tests live websites for performance, accessibility, best practices, and SEO
 */
export class LighthouseAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.lighthouseResults = [];
  }

  /**
   * Combine Lighthouse data from multiple URLs into a single report
   */
  async combineLightHouseData(urls) {
    const folderPath = path.resolve(process.cwd(), "report");
    const lightHouseResult = [];
    
    for (const url of urls) {
      const outputName = url.replace(/^https?:\/\//, "").replace(/\//g, "");
      const desktopReportPath = path.join(folderPath, `${outputName}.desktop.report.json`);
      const mobileReportPath = path.join(folderPath, `${outputName}.mobile.report.json`);
      
      const urlResult = {
        url: url,
        desktop: null,
        mobile: null,
        timestamp: new Date().toISOString()
      };
      
      // Process desktop report
      try {
        if (fsSync.existsSync(desktopReportPath)) {
          const desktopData = await fs.readFile(desktopReportPath, "utf8");
          const desktopReport = JSON.parse(desktopData);
          urlResult.desktop = {
            fileName: `${outputName}.desktop.report.html`,
            performance: desktopReport.categories?.performance?.score * 100,
            accessibility: desktopReport.categories?.accessibility?.score * 100,
            bestPractices: desktopReport.categories?.["best-practices"]?.score * 100,
            seo: desktopReport.categories?.seo?.score * 100,
            issues: this.extractLighthouseIssues(desktopReport)
          };
        } else {
          console.log(chalk.yellow(`  ⚠️  No desktop report found for ${url}`));
          urlResult.desktop = {
            fileName: `${outputName}.desktop.report.html`,
            performance: null,
            accessibility: null,
            bestPractices: null,
            seo: null,
            issues: [],
            error: 'Desktop report file not found'
          };
        }
      } catch (error) {
        console.error(chalk.red(`Error processing desktop report for ${url}:`, error.message));
        urlResult.desktop = {
          fileName: `${outputName}.desktop.report.html`,
          performance: null,
          accessibility: null,
          bestPractices: null,
          seo: null,
          issues: [],
          error: error.message
        };
      }
      
      // Process mobile report
      try {
        if (fsSync.existsSync(mobileReportPath)) {
          const mobileData = await fs.readFile(mobileReportPath, "utf8");
          const mobileReport = JSON.parse(mobileData);
          urlResult.mobile = {
            fileName: `${outputName}.mobile.report.html`,
            performance: mobileReport.categories?.performance?.score * 100,
            accessibility: mobileReport.categories?.accessibility?.score * 100,
            bestPractices: mobileReport.categories?.["best-practices"]?.score * 100,
            seo: mobileReport.categories?.seo?.score * 100,
            issues: this.extractLighthouseIssues(mobileReport)
          };
        } else {
          console.log(chalk.yellow(`  ⚠️  No mobile report found for ${url}`));
          urlResult.mobile = {
            fileName: `${outputName}.mobile.report.html`,
            performance: null,
            accessibility: null,
            bestPractices: null,
            seo: null,
            issues: [],
            error: 'Mobile report file not found'
          };
        }
      } catch (error) {
        console.error(chalk.red(`Error processing mobile report for ${url}:`, error.message));
        urlResult.mobile = {
          fileName: `${outputName}.mobile.report.html`,
          performance: null,
          accessibility: null,
          bestPractices: null,
          seo: null,
          issues: [],
          error: error.message
        };
      }
      
      lightHouseResult.push(urlResult);
    }
    
    await fs.writeFile(
      `${folderPath}/lightHouseCombine-report.json`,
      JSON.stringify(lightHouseResult, null, 2)
    );
    
    return lightHouseResult;
  }

  /**
   * Extract issues from Lighthouse report
   */
  extractLighthouseIssues(report) {
    const issues = [];
    
    // Process each category
    Object.entries(report.categories || {}).forEach(([categoryName, category]) => {
      if (category.auditRefs) {
        category.auditRefs.forEach(auditRef => {
          const audit = report.audits[auditRef.id];
          if (audit && audit.score !== null && audit.score < 1) {
            issues.push({
              type: `${categoryName}_${auditRef.id}`,
              severity: audit.score < 0.5 ? 'high' : audit.score < 0.8 ? 'medium' : 'low',
              message: audit.title,
              description: audit.description,
              category: categoryName,
              score: audit.score,
              recommendation: audit.details?.type === 'opportunity' ? audit.details?.summary : null
            });
          }
        });
      }
    });
    
    return issues;
  }

  /**
   * Generate Lighthouse reports using programmatic API
   */
  async generateLightHouseReport(urls) {
    if (!urls || urls.length === 0) {
      console.log(chalk.yellow('No URLs provided for Lighthouse audit.'));
      return [];
    }

    const folderPath = path.resolve(process.cwd(), "report");
    await fs.mkdir(folderPath, { recursive: true });

    console.log(chalk.blue(`🚀 Running Lighthouse audit on ${urls.length} URL(s) for desktop and mobile...`));

    // Launch browser for Lighthouse
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const generateReport = async (url, deviceType = 'desktop') => {
      const maxRetries = 2;
      let attempt = 0;
      
      while (attempt <= maxRetries) {
        try {
          const outputName = url.replace(/^https?:\/\//, "").replace(/\//g, "");
          const deviceSuffix = deviceType === 'mobile' ? '.mobile' : '.desktop';
          const htmlOutputPath = path.join(folderPath, `${outputName}${deviceSuffix}.report.html`);
          const jsonOutputPath = path.join(folderPath, `${outputName}${deviceSuffix}.report.json`);
          
          // Check if reports already exist
          const reportsExist = fsSync.existsSync(jsonOutputPath) && fsSync.existsSync(htmlOutputPath);
          const actionText = reportsExist ? 'Updating existing' : 'Creating new';
          
          if (attempt > 0) {
            console.log(chalk.yellow(`  🔄 Retry attempt ${attempt} for ${deviceType} report: ${url}`));
          } else {
            console.log(chalk.blue(`  📊 Testing: ${url} (${deviceType})`));
            console.log(chalk.blue(`  📝 ${actionText} reports for: ${outputName}${deviceSuffix}`));
          }
          
          // Lighthouse configuration - optimized to match PageSpeed Insights
          const options = {
            port: (new URL(browser.wsEndpoint())).port,
            output: ['json', 'html'],
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
            formFactor: deviceType,
            throttling: deviceType === 'mobile' ? {
              // Mobile throttling settings
              cpuSlowdownMultiplier: 4,
              networkRttMs: 150,
              networkThroughputKbps: 1638.4,
              requestLatencyMs: 0
            } : {
              // Desktop throttling settings
              cpuSlowdownMultiplier: 1,
              networkRttMs: 40,
              networkThroughputKbps: 10240,
              requestLatencyMs: 0
            },
            maxWaitForLoad: 60000, // Increased timeout
            maxWaitForFcp: 30000,  // Add FCP timeout
            maxWaitForLcp: 45000,  // Add LCP timeout
            screenEmulation: deviceType === 'mobile' ? {
              mobile: true,
              width: 375,
              height: 667,
              deviceScaleFactor: 2,
              disabled: false
            } : {
              mobile: false,
              width: 1350,
              height: 940,
              deviceScaleFactor: 1,
              disabled: false
            },
            // Additional settings to match PageSpeed Insights
            disableStorageReset: false,
            disableDeviceEmulation: false,
            emulatedUserAgent: deviceType === 'mobile' 
              ? 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36'
              : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            // Add stability improvements
            skipAudits: ['uses-http2'], // Skip some problematic audits
            onlyAudits: [], // Run all audits
            // Add performance improvements
            disableBackgroundThrottling: true,
            disableCpuThrottling: false,
            // Add navigation timeout
            navigationTimeout: 60000
          };

          // Run Lighthouse
          const runnerResult = await lighthouse(url, options);
          const report = runnerResult.lhr;
          
          // Save JSON report (overwrite if exists)
          await fs.writeFile(jsonOutputPath, JSON.stringify(report, null, 2));
          
          // Save HTML report (overwrite if exists)
          await fs.writeFile(htmlOutputPath, runnerResult.report);
          
          console.log(chalk.blue(`  📄 Reports saved: ${outputName}${deviceSuffix}.report.json & ${outputName}${deviceSuffix}.report.html`));
          
          const successText = reportsExist ? 'Updated' : 'Generated';
          console.log(chalk.green(`  ✅ ${successText} ${deviceType} report for: ${url}`));
          
          return {
            url: url,
            deviceType: deviceType,
            performance: report.categories?.performance?.score * 100,
            accessibility: report.categories?.accessibility?.score * 100,
            bestPractices: report.categories?.["best-practices"]?.score * 100,
            seo: report.categories?.seo?.score * 100,
            issues: this.extractLighthouseIssues(report)
          };
        } catch (err) {
          attempt++;
          
          // Check if it's a performance mark error and we haven't exceeded retries
          if (err.message.includes('performance mark') && attempt <= maxRetries) {
            console.log(chalk.yellow(`  ⚠️  Performance mark error on attempt ${attempt}, retrying in 3 seconds...`));
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          
          // If we've exhausted retries or it's a different error, log and return error
          console.error(chalk.red(`  ❌ Error generating ${deviceType} report for ${url} (attempt ${attempt}): ${err.message}`));
          return {
            url: url,
            deviceType: deviceType,
            error: err.message,
            performance: null,
            accessibility: null,
            bestPractices: null,
            seo: null,
            issues: [],
            timestamp: new Date().toISOString()
          };
        }
      }
    };

    try {
      // Generate reports for both desktop and mobile
      const allResults = [];
      
      // Run desktop first
      console.log(chalk.blue('  🖥️  Running desktop reports...'));
      for (const url of urls) {
        const desktopResult = await generateReport(url, 'desktop');
        allResults.push(desktopResult);
      }
      
      // Add a small delay before running mobile reports
      console.log(chalk.blue('  ⏳ Waiting 2 seconds before running mobile reports...'));
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Run mobile reports
      console.log(chalk.blue('  📱 Running mobile reports...'));
      for (const url of urls) {
        const mobileResult = await generateReport(url, 'mobile');
        allResults.push(mobileResult);
      }
      
      console.log(chalk.blue('📋 Combining Lighthouse results...'));
      const combinedResults = await this.combineLightHouseData(urls);
      
      return combinedResults;
    } finally {
      await browser.close();
    }
  }

  /**
   * Run Lighthouse audit and return structured results
   */
  async runLighthouseAudit(urls) {
    console.log(chalk.blue('🚀 Starting Lighthouse Audit...'));
    
    if (!urls || urls.length === 0) {
      console.log(chalk.yellow('No URLs provided. Skipping Lighthouse audit.'));
      return {
        totalIssues: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [],
        scores: {},
        urls: []
      };
    }

    try {
      const results = await this.generateLightHouseReport(urls);
      
      // Calculate summary statistics for both desktop and mobile
      let totalIssues = 0;
      let highSeverity = 0;
      let mediumSeverity = 0;
      let lowSeverity = 0;
      const allIssues = [];
      const scores = {};

      results.forEach(result => {
        // Process desktop results
        if (result.desktop && result.desktop.issues) {
          result.desktop.issues.forEach(issue => {
            totalIssues++;
            allIssues.push({ ...issue, deviceType: 'desktop', url: result.url });
            if (issue.severity === 'high') highSeverity++;
            else if (issue.severity === 'medium') mediumSeverity++;
            else lowSeverity++;
          });
        }

        // Process mobile results
        if (result.mobile && result.mobile.issues) {
          result.mobile.issues.forEach(issue => {
            totalIssues++;
            allIssues.push({ ...issue, deviceType: 'mobile', url: result.url });
            if (issue.severity === 'high') highSeverity++;
            else if (issue.severity === 'medium') mediumSeverity++;
            else lowSeverity++;
          });
        }

        // Store scores for both device types
        if (result.url) {
          scores[result.url] = {
            desktop: result.desktop ? {
              performance: result.desktop.performance,
              accessibility: result.desktop.accessibility,
              bestPractices: result.desktop.bestPractices,
              seo: result.desktop.seo
            } : null,
            mobile: result.mobile ? {
              performance: result.mobile.performance,
              accessibility: result.mobile.accessibility,
              bestPractices: result.mobile.bestPractices,
              seo: result.mobile.seo
            } : null
          };
        }
      });

      // Display summary
      this.displayLighthouseSummary(results, scores);

      return {
        totalIssues,
        highSeverity,
        mediumSeverity,
        lowSeverity,
        issues: allIssues,
        scores,
        urls: urls,
        timestamp: new Date().toISOString(),
        results
      };

    } catch (error) {
      console.error(chalk.red('Error running Lighthouse audit:', error.message));
      return {
        totalIssues: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        issues: [],
        scores: {},
        urls: urls,
        error: error.message
      };
    }
  }

  /**
   * Display Lighthouse audit summary
   */
  displayLighthouseSummary(results, scores) {
    console.log(chalk.blue('\n📊 Lighthouse Audit Summary:'));
    console.log(chalk.blue('='.repeat(50)));
    
    results.forEach(result => {
      console.log(chalk.cyan(`\n🌐 ${result.url}:`));
      
      // Display desktop results
      if (result.desktop) {
        if (result.desktop.error) {
          console.log(chalk.red(`  💻 Desktop: ${result.desktop.error}`));
        } else {
          console.log(chalk.blue('  💻 Desktop:'));
          console.log(`    Performance: ${this.getScoreDisplay(result.desktop.performance)}`);
          console.log(`    Accessibility: ${this.getScoreDisplay(result.desktop.accessibility)}`);
          console.log(`    Best Practices: ${this.getScoreDisplay(result.desktop.bestPractices)}`);
          console.log(`    SEO: ${this.getScoreDisplay(result.desktop.seo)}`);
          
          if (result.desktop.issues && result.desktop.issues.length > 0) {
            console.log(chalk.yellow(`    Issues found: ${result.desktop.issues.length}`));
          } else {
            console.log(chalk.green('    ✅ No issues found'));
          }
        }
      } else {
        console.log(chalk.gray('  💻 Desktop: No data available'));
      }
      
      // Display mobile results
      if (result.mobile) {
        if (result.mobile.error) {
          console.log(chalk.red(`  📱 Mobile: ${result.mobile.error}`));
        } else {
          console.log(chalk.blue('  📱 Mobile:'));
          console.log(`    Performance: ${this.getScoreDisplay(result.mobile.performance)}`);
          console.log(`    Accessibility: ${this.getScoreDisplay(result.mobile.accessibility)}`);
          console.log(`    Best Practices: ${this.getScoreDisplay(result.mobile.bestPractices)}`);
          console.log(`    SEO: ${this.getScoreDisplay(result.mobile.seo)}`);
          
          if (result.mobile.issues && result.mobile.issues.length > 0) {
            console.log(chalk.yellow(`    Issues found: ${result.mobile.issues.length}`));
          } else {
            console.log(chalk.green('    ✅ No issues found'));
          }
        }
      } else {
        console.log(chalk.gray('  📱 Mobile: No data available'));
      }
    });
  }

  /**
   * Get formatted score display
   */
  getScoreDisplay(score) {
    if (score === null || score === undefined) return chalk.gray('N/A');
    if (score >= 90) return chalk.green(`${score.toFixed(0)}%`);
    if (score >= 50) return chalk.yellow(`${score.toFixed(0)}%`);
    return chalk.red(`${score.toFixed(0)}%`);
  }
}

export default LighthouseAudit; 