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
            performance: desktopReport.categories?.performance?.score * 100,
            accessibility: desktopReport.categories?.accessibility?.score * 100,
            bestPractices: desktopReport.categories?.["best-practices"]?.score * 100,
            seo: desktopReport.categories?.seo?.score * 100,
            issues: this.extractLighthouseIssues(desktopReport)
          };
        } else {
          console.log(chalk.yellow(`  ⚠️  No desktop report found for ${url}`));
          urlResult.desktop = {
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
            performance: mobileReport.categories?.performance?.score * 100,
            accessibility: mobileReport.categories?.accessibility?.score * 100,
            bestPractices: mobileReport.categories?.["best-practices"]?.score * 100,
            seo: mobileReport.categories?.seo?.score * 100,
            issues: this.extractLighthouseIssues(mobileReport)
          };
        } else {
          console.log(chalk.yellow(`  ⚠️  No mobile report found for ${url}`));
          urlResult.mobile = {
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
          const jsonOutputPath = path.join(folderPath, `${outputName}${deviceSuffix}.report.json`);
          
          // Check if reports already exist
          const reportsExist = fsSync.existsSync(jsonOutputPath);
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
            output: ['json'], // Only generate JSON, not HTML
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
          
          // Generate custom HTML report with PageSpeed Insights-like UI
          const customHtmlFileName = await this.generateCustomHtmlReport(url, deviceType, report);
          
          console.log(chalk.blue(`  📄 Reports saved: ${outputName}${deviceSuffix}.report.json & ${customHtmlFileName}`));
          
          const successText = reportsExist ? 'Updated' : 'Generated';
          console.log(chalk.green(`  ✅ ${successText} ${deviceType} report for: ${url}`));
          
          return {
            url: url,
            deviceType: deviceType,
            performance: report.categories?.performance?.score * 100,
            accessibility: report.categories?.accessibility?.score * 100,
            bestPractices: report.categories?.["best-practices"]?.score * 100,
            seo: report.categories?.seo?.score * 100,
            issues: this.extractLighthouseIssues(report),
            customHtmlFile: customHtmlFileName
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
   * Generate custom HTML report with PageSpeed Insights-like UI
   */
  async generateCustomHtmlReport(url, deviceType, reportData) {
    const outputName = url.replace(/^https?:\/\//, "").replace(/\//g, "");
    const deviceSuffix = deviceType === 'mobile' ? '.mobile' : '.desktop';
    const htmlOutputPath = path.join(path.resolve(process.cwd(), "report"), `${outputName}${deviceSuffix}.custom.html`);
    
    const htmlContent = this.createCustomHtmlReport(url, deviceType, reportData);
    await fs.writeFile(htmlOutputPath, htmlContent);
    
    return `${outputName}${deviceSuffix}.custom.html`;
  }

  /**
   * Create custom HTML report content
   */
  createCustomHtmlReport(url, deviceType, reportData) {
    const scores = {
      performance: reportData.categories?.performance?.score * 100 || 0,
      accessibility: reportData.categories?.accessibility?.score * 100 || 0,
      bestPractices: reportData.categories?.["best-practices"]?.score * 100 || 0,
      seo: reportData.categories?.seo?.score * 100 || 0
    };

    const issues = this.extractLighthouseIssues(reportData);
    const opportunities = this.extractOpportunities(reportData);
    const diagnostics = this.extractDiagnostics(reportData);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lighthouse Report - ${url} (${deviceType})</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'score-green': '#0f9d58',
                        'score-orange': '#f4b400',
                        'score-red': '#db4437'
                    }
                }
            }
        }
    </script>
    <style>
        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin: 0 auto;
        }
        .score-green { background: linear-gradient(135deg, #0f9d58, #0b8043); }
        .score-orange { background: linear-gradient(135deg, #f4b400, #f57c00); }
        .score-red { background: linear-gradient(135deg, #db4437, #c53929); }
        .metric-card {
            transition: transform 0.2s;
        }
        .metric-card:hover {
            transform: translateY(-2px);
        }
        .issue-severity-high { border-left: 4px solid #db4437; }
        .issue-severity-medium { border-left: 4px solid #f4b400; }
        .issue-severity-low { border-left: 4px solid #0f9d58; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <!-- Header -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">Lighthouse Report</h1>
                    <p class="text-gray-600">${url}</p>
                    <div class="flex items-center mt-2">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          deviceType === 'mobile' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }">
                            ${deviceType === 'mobile' ? '📱 Mobile' : '💻 Desktop'}
                        </span>
                        <span class="ml-3 text-sm text-gray-500">
                            Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                        </span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="score-circle ${this.getScoreClass(scores.performance)}">
                        ${Math.round(scores.performance)}
                    </div>
                    <p class="text-center mt-2 text-sm font-medium text-gray-700">Performance</p>
                </div>
            </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="metric-card bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Performance</h3>
                    <span class="text-2xl font-bold ${this.getScoreTextClass(scores.performance)}">
                        ${Math.round(scores.performance)}
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full ${this.getScoreClass(scores.performance)}" 
                         style="width: ${scores.performance}%"></div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Accessibility</h3>
                    <span class="text-2xl font-bold ${this.getScoreTextClass(scores.accessibility)}">
                        ${Math.round(scores.accessibility)}
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full ${this.getScoreClass(scores.accessibility)}" 
                         style="width: ${scores.accessibility}%"></div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Best Practices</h3>
                    <span class="text-2xl font-bold ${this.getScoreTextClass(scores.bestPractices)}">
                        ${Math.round(scores.bestPractices)}
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full ${this.getScoreClass(scores.bestPractices)}" 
                         style="width: ${scores.bestPractices}%"></div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">SEO</h3>
                    <span class="text-2xl font-bold ${this.getScoreTextClass(scores.seo)}">
                        ${Math.round(scores.seo)}
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full ${this.getScoreClass(scores.seo)}" 
                         style="width: ${scores.seo}%"></div>
                </div>
            </div>
        </div>

        <!-- Issues Section -->
        ${issues.length > 0 ? `
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Issues Found (${issues.length})</h2>
            <div class="space-y-4">
                ${issues.map(issue => `
                <div class="issue-severity-${issue.severity} bg-gray-50 rounded-lg p-4">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h4 class="text-lg font-semibold text-gray-900 mb-2">${issue.message}</h4>
                            <p class="text-gray-600 mb-3">${issue.description}</p>
                            <div class="flex items-center space-x-4 text-sm">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                                  issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }">
                                    ${issue.severity.toUpperCase()}
                                </span>
                                <span class="text-gray-500">Category: ${issue.category}</span>
                                <span class="text-gray-500">Score: ${Math.round(issue.score * 100)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : `
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div class="text-center py-8">
                <div class="text-6xl mb-4">🎉</div>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">No Issues Found!</h2>
                <p class="text-gray-600">Great job! Your page is performing well across all metrics.</p>
            </div>
        </div>
        `}

        <!-- Opportunities Section -->
        ${opportunities.length > 0 ? `
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Opportunities (${opportunities.length})</h2>
            <div class="space-y-4">
                ${opportunities.map(opp => `
                <div class="border border-gray-200 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-gray-900 mb-2">${opp.title}</h4>
                    <p class="text-gray-600 mb-3">${opp.description}</p>
                    ${opp.savings ? `
                    <div class="bg-blue-50 rounded-lg p-3">
                        <span class="text-sm font-medium text-blue-800">
                            Potential savings: ${opp.savings}
                        </span>
                    </div>
                    ` : ''}
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Diagnostics Section -->
        ${diagnostics.length > 0 ? `
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Diagnostics (${diagnostics.length})</h2>
            <div class="space-y-4">
                ${diagnostics.map(diag => `
                <div class="border border-gray-200 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-gray-900 mb-2">${diag.title}</h4>
                    <p class="text-gray-600">${diag.description}</p>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="text-center text-gray-500">
                <p>Report generated by UI Code Insight Lighthouse Audit</p>
                <p class="text-sm mt-2">
                    <a href="${url}" target="_blank" class="text-blue-600 hover:text-blue-800">
                        View Original Page
                    </a>
                </p>
            </div>
        </div>
    </div>

    <script>
        // Add some interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Animate score bars on load
            const progressBars = document.querySelectorAll('.h-2.rounded-full');
            progressBars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.transition = 'width 1s ease-in-out';
                    bar.style.width = width;
                }, 500);
            });

            // Add click handlers for expandable sections
            const issueCards = document.querySelectorAll('.issue-severity-high, .issue-severity-medium, .issue-severity-low');
            issueCards.forEach(card => {
                card.addEventListener('click', function() {
                    this.classList.toggle('ring-2');
                    this.classList.toggle('ring-blue-500');
                });
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * Extract opportunities from Lighthouse report
   */
  extractOpportunities(report) {
    const opportunities = [];
    
    Object.entries(report.audits || {}).forEach(([id, audit]) => {
      if (audit.details?.type === 'opportunity' && audit.score !== null && audit.score < 1) {
        opportunities.push({
          title: audit.title,
          description: audit.description,
          savings: audit.details?.summary || null,
          score: audit.score
        });
      }
    });
    
    return opportunities;
  }

  /**
   * Extract diagnostics from Lighthouse report
   */
  extractDiagnostics(report) {
    const diagnostics = [];
    
    Object.entries(report.audits || {}).forEach(([id, audit]) => {
      if (audit.details?.type === 'diagnostic' && audit.score !== null) {
        diagnostics.push({
          title: audit.title,
          description: audit.description,
          score: audit.score
        });
      }
    });
    
    return diagnostics;
  }

  /**
   * Get score class for styling
   */
  getScoreClass(score) {
    if (score >= 90) return 'score-green';
    if (score >= 50) return 'score-orange';
    return 'score-red';
  }

  /**
   * Get score text class for styling
   */
  getScoreTextClass(score) {
    if (score >= 90) return 'text-score-green';
    if (score >= 50) return 'text-score-orange';
    return 'text-score-red';
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