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
    const lightHouseResult = await Promise.all(
      urls.map(async (url) => {
        try {
          const outputName = url.replace(/^https?:\/\//, "").replace(/\//g, "");
          const reportPath = path.join(folderPath, `${outputName}.report.json`);
          
          // Check if report file exists
          if (!fsSync.existsSync(reportPath)) {
            console.log(chalk.yellow(`  ⚠️  No existing report found for ${url}, skipping combination`));
            return {
              url: url,
              fileName: `${outputName}.report.html`,
              performance: null,
              accessibility: null,
              bestPractices: null,
              seo: null,
              timestamp: new Date().toISOString(),
              issues: [],
              error: 'Report file not found'
            };
          }
          
          const reportData = await fs.readFile(reportPath, "utf8");
          const report = JSON.parse(reportData);
          return {
            url: url,
            fileName: `${outputName}.report.html`,
            performance: report.categories?.performance?.score * 100,
            accessibility: report.categories?.accessibility?.score * 100,
            bestPractices: report.categories?.["best-practices"]?.score * 100,
            seo: report.categories?.seo?.score * 100,
            timestamp: new Date().toISOString(),
            issues: this.extractLighthouseIssues(report)
          };
        } catch (error) {
          console.error(chalk.red(`Error processing report for ${url}:`, error.message));
          const outputName = url.replace(/^https?:\/\//, "").replace(/\//g, "");
          return {
            url: url,
            fileName: `${outputName}.report.html`,
            performance: null,
            accessibility: null,
            bestPractices: null,
            seo: null,
            timestamp: new Date().toISOString(),
            issues: [],
            error: error.message
          };
        }
      })
    );
    
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

    console.log(chalk.blue(`🚀 Running Lighthouse audit on ${urls.length} URL(s)...`));

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

    const generateReport = async (url) => {
      try {
        const outputName = url.replace(/^https?:\/\//, "").replace(/\//g, "");
        const htmlOutputPath = path.join(folderPath, `${outputName}.report.html`);
        const jsonOutputPath = path.join(folderPath, `${outputName}.report.json`);
        
        // Check if reports already exist
        const reportsExist = fsSync.existsSync(jsonOutputPath) && fsSync.existsSync(htmlOutputPath);
        const actionText = reportsExist ? 'Updating existing' : 'Creating new';
        
        console.log(chalk.blue(`  📊 Testing: ${url}`));
        console.log(chalk.blue(`  📝 ${actionText} reports for: ${outputName}`));
        
        // Lighthouse configuration - optimized to match PageSpeed Insights
        const options = {
          port: (new URL(browser.wsEndpoint())).port,
          output: ['json', 'html'],
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          formFactor: 'desktop',
          throttling: {
            // Use more realistic throttling to match PageSpeed Insights
            cpuSlowdownMultiplier: 1,
            networkRttMs: 40,
            networkThroughputKbps: 10240,
            requestLatencyMs: 0
          },
          maxWaitForLoad: 45000,
          screenEmulation: {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false
          },
          // Additional settings to match PageSpeed Insights
          disableStorageReset: false,
          disableDeviceEmulation: false,
          emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        // Run Lighthouse
        const runnerResult = await lighthouse(url, options);
        const report = runnerResult.lhr;
        
        // Save JSON report (overwrite if exists)
        await fs.writeFile(jsonOutputPath, JSON.stringify(report, null, 2));
        
        // Save HTML report (overwrite if exists)
        await fs.writeFile(htmlOutputPath, runnerResult.report);
        
        console.log(chalk.blue(`  📄 Reports saved: ${outputName}.report.json & ${outputName}.report.html`));
        
        const successText = reportsExist ? 'Updated' : 'Generated';
        console.log(chalk.green(`  ✅ ${successText} report for: ${url}`));
        
        return {
          url: url,
          performance: report.categories?.performance?.score * 100,
          accessibility: report.categories?.accessibility?.score * 100,
          bestPractices: report.categories?.["best-practices"]?.score * 100,
          seo: report.categories?.seo?.score * 100,
          issues: this.extractLighthouseIssues(report)
        };
      } catch (err) {
        console.error(chalk.red(`  ❌ Error generating report for ${url}: ${err.message}`));
        return {
          url: url,
          error: err.message,
          performance: null,
          accessibility: null,
          bestPractices: null,
          seo: null,
          issues: [],
          timestamp: new Date().toISOString()
        };
      }
    };

    try {
      const reportPromises = urls.map(generateReport);
      const results = await Promise.all(reportPromises);
      
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
      
      // Calculate summary statistics
      let totalIssues = 0;
      let highSeverity = 0;
      let mediumSeverity = 0;
      let lowSeverity = 0;
      const allIssues = [];
      const scores = {};

      results.forEach(result => {
        if (result.issues) {
          result.issues.forEach(issue => {
            totalIssues++;
            allIssues.push(issue);
            if (issue.severity === 'high') highSeverity++;
            else if (issue.severity === 'medium') mediumSeverity++;
            else lowSeverity++;
          });
        }

        // Store scores
        if (result.url) {
          scores[result.url] = {
            performance: result.performance,
            accessibility: result.accessibility,
            bestPractices: result.bestPractices,
            seo: result.seo
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
      if (result.error) {
        console.log(chalk.red(`❌ ${result.url}: ${result.error}`));
        return;
      }
      
      console.log(chalk.cyan(`\n🌐 ${result.url}:`));
      console.log(`  Performance: ${this.getScoreDisplay(result.performance)}`);
      console.log(`  Accessibility: ${this.getScoreDisplay(result.accessibility)}`);
      console.log(`  Best Practices: ${this.getScoreDisplay(result.bestPractices)}`);
      console.log(`  SEO: ${this.getScoreDisplay(result.seo)}`);
      
      if (result.issues && result.issues.length > 0) {
        console.log(chalk.yellow(`  Issues found: ${result.issues.length}`));
      } else {
        console.log(chalk.green('  ✅ No issues found'));
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