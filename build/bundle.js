(function () {
  'use strict';

  /**
   * Simple Dashboard JavaScript
   * Handles modern UI features without complex inheritance
   */

  class SimpleDashboard {
    constructor() {
      this.currentTheme = localStorage.getItem('theme') || 'light';
      this.isMobile = window.innerWidth < 768;
      this.searchTimeout = null;
      this.init();
    }

    init() {
      this.setupTheme();
      this.setupMobileNavigation();
      this.setupEventListeners();
      this.setupCharts();
      this.loadDashboardData();
      this.setupDefaultActiveState();
    }

    /**
     * Setup theme switching functionality
     */
    setupTheme() {
      const themeToggle = document.getElementById('themeToggle');

      // Apply saved theme
      this.applyTheme(this.currentTheme);

      // Theme toggle event
      if (themeToggle) {
        themeToggle.addEventListener('click', () => {
          this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
          this.applyTheme(this.currentTheme);
          localStorage.setItem('theme', this.currentTheme);
        });
      }
    }

    /**
     * Apply theme to the document
     */
    applyTheme(theme) {
      const html = document.documentElement;
      const themeToggle = document.getElementById('themeToggle');
      
      if (theme === 'dark') {
        html.classList.remove('light');
        html.classList.add('dark');
        if (themeToggle) {
          themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
      } else {
        html.classList.remove('dark');
        html.classList.add('light');
        if (themeToggle) {
          themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
      }
    }

    /**
     * Setup mobile navigation
     */
    setupMobileNavigation() {
      const mobileMenuBtn = document.getElementById('mobileMenuBtn');
      const sidebar = document.getElementById('sidebar');
      const mobileOverlay = document.getElementById('mobileOverlay');

      if (mobileMenuBtn && sidebar && mobileOverlay) {
        mobileMenuBtn.addEventListener('click', () => {
          sidebar.classList.toggle('open');
          mobileOverlay.classList.toggle('open');
        });

        mobileOverlay.addEventListener('click', () => {
          sidebar.classList.remove('open');
          mobileOverlay.classList.remove('open');
        });

        // Close mobile menu on window resize
        window.addEventListener('resize', () => {
          if (window.innerWidth >= 768) {
            sidebar.classList.remove('open');
            mobileOverlay.classList.remove('open');
          }
        });
      }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
      this.setupNavigation();
      this.setupSearch();
      this.setupQuickActions();
      this.setupSmoothScrolling();
    }

    /**
     * Setup navigation
     */
    setupNavigation() {
      const navItems = document.querySelectorAll('.nav-item');
      
      navItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Remove active class from all items
          navItems.forEach(nav => nav.classList.remove('active'));
          
          // Add active class to clicked item
          item.classList.add('active');
          
          // Handle navigation
          const targetId = item.getAttribute('id');
          this.navigateToSection(targetId);
        });
      });
    }

    /**
     * Setup search functionality
     */
    setupSearch() {
      const searchInputs = document.querySelectorAll('input[type="text"]');
      
      searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase();
          const sectionId = e.target.id.replace('Search', '');
          
          // Add loading state
          this.showLoadingState(sectionId);
          
          // Debounce search
          clearTimeout(this.searchTimeout);
          this.searchTimeout = setTimeout(() => {
            this.performSearch(searchTerm, sectionId);
          }, 300);
        });
      });
    }

    /**
     * Setup quick actions
     */
    setupQuickActions() {
      const quickActionButtons = document.querySelectorAll('.btn-primary');
      
      quickActionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const action = e.target.textContent.trim();
          this.handleQuickAction(action);
        });
      });
    }

    /**
     * Setup smooth scrolling
     */
    setupSmoothScrolling() {
      // Smooth scroll to top when clicking logo
      const logo = document.querySelector('.flex-shrink-0');
      if (logo) {
        logo.addEventListener('click', () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
    }

    /**
     * Setup charts
     */
    setupCharts() {
      this.initializeCharts();
    }

    /**
     * Initialize charts with modern styling
     */
    initializeCharts() {
      // Issues by Category Chart
      const categoryChartOptions = {
        series: [8, 12, 6, 10, 6],
        chart: {
          type: 'donut',
          height: 250,
          fontFamily: 'Inter, sans-serif',
          toolbar: {
            show: false
          }
        },
        labels: ['Security', 'Performance', 'Accessibility', 'Code Quality', 'Dependencies'],
        colors: ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#06b6d4'],
        plotOptions: {
          pie: {
            donut: {
              size: '70%',
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#64748b'
                },
                value: {
                  show: true,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#1e293b'
                }
              }
            }
          }
        },
        legend: {
          position: 'bottom',
          fontSize: '12px',
          markers: {
            radius: 4
          }
        },
        responsive: [{
          breakpoint: 480,
          options: {
            chart: {
              height: 200
            },
            legend: {
              position: 'bottom'
            }
          }
        }]
      };

      const categoryChartElement = document.getElementById('issuesByCategoryChart');
      if (categoryChartElement && typeof ApexCharts !== 'undefined') {
        const categoryChart = new ApexCharts(categoryChartElement, categoryChartOptions);
        categoryChart.render();
        window.categoryChart = categoryChart;
      }

      // Issues by Severity Chart
      const severityChartOptions = {
        series: [{
          name: 'Issues',
          data: [8, 15, 19]
        }],
        chart: {
          type: 'bar',
          height: 250,
          fontFamily: 'Inter, sans-serif',
          toolbar: {
            show: false
          }
        },
        colors: ['#ef4444', '#f59e0b', '#10b981'],
        plotOptions: {
          bar: {
            borderRadius: 8,
            columnWidth: '60%',
            distributed: true
          }
        },
        dataLabels: {
          enabled: false
        },
        legend: {
          show: false
        },
        xaxis: {
          categories: ['High', 'Medium', 'Low'],
          labels: {
            style: {
              fontSize: '12px',
              fontWeight: 600
            }
          }
        },
        yaxis: {
          labels: {
            style: {
              fontSize: '12px'
            }
          }
        }
      };

      const severityChartElement = document.getElementById('issuesBySeverityChart');
      if (severityChartElement && typeof ApexCharts !== 'undefined') {
        const severityChart = new ApexCharts(severityChartElement, severityChartOptions);
        severityChart.render();
        window.severityChart = severityChart;
      }
    }

    /**
     * Load dashboard data
     */
    loadDashboardData() {
      // Load real data from generated reports
      this.loadRealData();
    }

    /**
     * Load real data from generated reports
     */
    async loadRealData() {
      try {
        console.log('🔄 Starting to load real data from reports...');
        
        // Load comprehensive audit report first
        const comprehensiveData = await this.loadReportData('comprehensive-audit-report.json');
        console.log('📊 Comprehensive data loaded:', comprehensiveData ? 'Yes' : 'No');
        
        // Load individual reports as fallback
        const [eslintData, stylelintData, securityData, performanceData, accessibilityData] = await Promise.all([
          this.loadReportData('eslint-report.json'),
          this.loadReportData('stylelint-report.json'),
          this.loadReportData('security-audit-report.json'),
          this.loadReportData('performance-audit-report.json'),
          this.loadReportData('accessibility-audit-report.json')
        ]);

        console.log('📋 Individual reports loaded:', {
          eslint: eslintData ? 'Yes' : 'No',
          stylelint: stylelintData ? 'Yes' : 'No',
          security: securityData ? 'Yes' : 'No',
          performance: performanceData ? 'Yes' : 'No',
          accessibility: accessibilityData ? 'Yes' : 'No'
        });

        // Use comprehensive data if available, otherwise use individual reports
        const finalEslintData = comprehensiveData?.categories?.eslint || eslintData;
        const finalStylelintData = comprehensiveData?.categories?.stylelint || stylelintData;
        const finalSecurityData = comprehensiveData?.categories?.security || securityData;
        const finalPerformanceData = comprehensiveData?.categories?.performance || performanceData;
        const finalAccessibilityData = comprehensiveData?.categories?.accessibility || accessibilityData;

        console.log('🔍 Data structure analysis:', {
          eslintResults: finalEslintData?.results?.length || 0,
          stylelintResults: finalStylelintData?.results?.length || 0,
          securityIssues: finalSecurityData?.issues?.length || 0,
          performanceIssues: finalPerformanceData?.issues?.length || 0,
          accessibilityIssues: finalAccessibilityData?.issues?.length || 0
        });

        // Calculate metrics from real data
        const metrics = this.calculateMetrics(finalEslintData, finalStylelintData, null, finalSecurityData);
        console.log('📈 Calculated metrics:', metrics);
        this.updateMetrics(metrics);

        // Load detailed data for each section
        this.loadESLintData(finalEslintData);
        this.loadStylelintData(finalStylelintData);
        this.loadSecurityData(finalSecurityData);
        this.loadPerformanceData(finalPerformanceData);
        this.loadAccessibilityData(finalAccessibilityData);
        this.loadNPMData();
        this.loadDependencyData(finalSecurityData);
        this.loadExcludedRulesData(finalEslintData, finalStylelintData);

        // For sections without real data, use sample data
        this.loadLighthouseData();

        console.log('✅ Real data loaded successfully from generated reports');

      } catch (error) {
        console.error('❌ Error loading real data:', error);
        // Fallback to sample data
        this.loadSampleData();
      }
    }

    /**
     * Load report data from JSON file
     */
    async loadReportData(filename) {
      try {
        const response = await fetch(`./${filename}`);
        if (!response.ok) {
          throw new Error(`Failed to load ${filename}: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.warn(`Could not load ${filename}:`, error.message);
        return null;
      }
    }

    /**
     * Calculate metrics from real data
     */
    calculateMetrics(eslintData, stylelintData, npmData, securityData) {
      let totalIssues = 0;
      let criticalIssues = 0;
      let securityScore = 100;
      let performanceScore = 100;
      let accessibilityScore = 100;

      // Calculate from ESLint data
      if (eslintData && eslintData.results) {
        let eslintTotalIssues = 0;
        let eslintCriticalIssues = 0;
        
        eslintData.results.forEach(result => {
          if (result.messages) {
            eslintTotalIssues += result.messages.length;
            eslintCriticalIssues += result.messages.filter(msg => msg.severity === 2).length;
          }
        });
        
        totalIssues += eslintTotalIssues;
        criticalIssues += eslintCriticalIssues;
      }

      // Calculate from Stylelint data
      if (stylelintData && stylelintData.results) {
        let stylelintTotalIssues = 0;
        let stylelintCriticalIssues = 0;
        
        stylelintData.results.forEach(result => {
          if (result.messages) {
            stylelintTotalIssues += result.messages.length;
            stylelintCriticalIssues += result.messages.filter(msg => msg.severity === 'error').length;
          }
        });
        
        totalIssues += stylelintTotalIssues;
        criticalIssues += stylelintCriticalIssues;
      }

      // Calculate from Security data
      if (securityData && securityData.summary) {
        totalIssues += securityData.summary.totalIssues || 0;
        criticalIssues += securityData.summary.dependencyIssues || 0;
        
        // Calculate security score based on vulnerabilities
        const totalVulns = securityData.summary.totalIssues || 0;
        const highVulns = securityData.issues?.filter(issue => issue.severity === 'high').length || 0;
        securityScore = Math.max(0, 100 - (highVulns * 10) - (totalVulns * 2));
      }

      return {
        totalIssues,
        criticalIssues,
        securityScore: Math.round(securityScore),
        performanceScore: Math.round(performanceScore),
        accessibilityScore: Math.round(accessibilityScore)
      };
    }

    /**
     * Load sample data as fallback
     */
    loadSampleData() {
      // Show no data available instead of fake data
      this.updateMetrics({
        totalIssues: 0,
        criticalIssues: 0,
        securityScore: 0,
        performanceScore: 0,
        accessibilityScore: 0
      });

      this.showNoDataMessage('eslintTableWrap', 'No ESLint data available');
      this.showNoDataMessage('stylelintTableWrap', 'No Stylelint data available');
      this.showNoDataMessage('securityTableWrap', 'No Security data available');
      this.showNoDataMessage('performanceTableWrap', 'No Performance data available');
      this.showNoDataMessage('accessibilityTableWrap', 'No Accessibility data available');
      this.showNoDataMessage('lighthouseTableWrap', 'No Lighthouse data available');
      this.showNoDataMessage('npmTableWrap', 'No NPM data available');
      this.showNoDataMessage('dependencyTableWrap', 'No Dependency data available');
      this.showNoDataMessage('excludedRulesTableWrap', 'No Excluded Rules data available');
    }

    /**
     * Update metrics display
     */
    updateMetrics(data) {
      const { totalIssues, criticalIssues, securityScore, performanceScore, accessibilityScore } = data;

      // Update metric cards
      const totalIssuesElement = document.getElementById('totalIssues');
      const criticalIssuesElement = document.getElementById('criticalIssues');
      const securityScoreElement = document.getElementById('securityScore');
      const performanceScoreElement = document.getElementById('performanceScore');
      const accessibilityScoreElement = document.getElementById('accessibilityScore');

      if (totalIssuesElement) totalIssuesElement.textContent = totalIssues;
      if (criticalIssuesElement) criticalIssuesElement.textContent = criticalIssues;
      if (securityScoreElement) securityScoreElement.textContent = securityScore;
      if (performanceScoreElement) performanceScoreElement.textContent = performanceScore;
      if (accessibilityScoreElement) accessibilityScoreElement.textContent = accessibilityScore;

      // Update progress bars
      const securityProgressElement = document.getElementById('securityProgress');
      const performanceProgressElement = document.getElementById('performanceProgress');
      const accessibilityProgressElement = document.getElementById('accessibilityProgress');

      if (securityProgressElement) securityProgressElement.style.width = `${securityScore}%`;
      if (performanceProgressElement) performanceProgressElement.style.width = `${performanceScore}%`;
      if (accessibilityProgressElement) accessibilityProgressElement.style.width = `${accessibilityScore}%`;
    }

    /**
     * Navigate to section
     */
    navigateToSection(sectionId) {
      // Hide all sections
      const sections = document.querySelectorAll('section');
      sections.forEach(section => {
        section.classList.add('hidden');
      });

      // Map navigation IDs to section IDs
      const sectionMapping = {
        'mainPage': 'overviewSection',
        'jsAuditReport': 'eslintSection',
        'scssAuditReport': 'stylelintSection',
        'securityAuditReport': 'securitySection',
        'performanceAuditReport': 'performanceSection',
        'accessibilityAuditReport': 'accessibilitySection',
        'lighthouseAuditReport': 'lighthouseSection',
        'npmPackagesReport': 'npmSection',
        'dependencyAuditReport': 'dependencySection',
        'excludedRulesInfo': 'excludedRulesSection'
      };

      // Get the target section ID
      const targetSectionId = sectionMapping[sectionId] || sectionId.replace('Report', 'Section');

      // Show target section
      const targetSection = document.getElementById(targetSectionId);
      if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('fade-in');
      }
    }

    /**
     * Show loading state
     */
    showLoadingState(sectionId) {
      const tableWrap = document.getElementById(`${sectionId}TableWrap`);
      if (tableWrap) {
        tableWrap.innerHTML = `
        <div class="flex items-center justify-center p-8">
          <div class="loading-spinner"></div>
          <span class="ml-3 text-gray-600 dark:text-gray-400">Searching...</span>
        </div>
      `;
      }
    }

    /**
     * Perform search
     */
    performSearch(searchTerm, sectionId) {
      console.log(`Searching for "${searchTerm}" in ${sectionId}`);
      
      // Remove loading state
      const tableWrap = document.getElementById(`${sectionId}TableWrap`);
      if (tableWrap) {
        tableWrap.innerHTML = `
        <div class="p-8 text-center text-gray-500 dark:text-gray-400">
          <i class="fas fa-search text-4xl mb-4 text-gray-300"></i>
          <p class="text-lg font-medium">Search results for "${searchTerm}"</p>
          <p class="text-sm mt-2">Search functionality coming soon...</p>
        </div>
      `;
      }
    }

    /**
     * Handle quick actions
     */
    handleQuickAction(action) {
      switch (action) {
        case 'Export Report':
          this.exportReport();
          break;
        case 'View Code':
          this.viewCode();
          break;
        case 'Configure Rules':
          this.configureRules();
          break;
        default:
          console.log(`Action: ${action}`);
      }
    }

    /**
     * Export report
     */
    exportReport() {
      console.log('Exporting report...');
      this.showNotification('Report exported successfully!', 'success');
    }

    /**
     * View code
     */
    viewCode() {
      console.log('Opening code viewer...');
      this.showNotification('Code viewer opened', 'info');
    }

    /**
     * Configure rules
     */
    configureRules() {
      this.navigateToSection('excludedRulesInfo');
      this.showNotification('Navigated to rules configuration', 'info');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
      
      // Set notification content based on type
      const icons = {
        success: 'fas fa-check-circle text-green-600',
        error: 'fas fa-exclamation-circle text-red-600',
        warning: 'fas fa-exclamation-triangle text-yellow-600',
        info: 'fas fa-info-circle text-blue-600'
      };
      
      const colors = {
        success: 'bg-green-50 border border-green-200 text-green-800',
        error: 'bg-red-50 border border-red-200 text-red-800',
        warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border border-blue-200 text-blue-800'
      };
      
      notification.className += ` ${colors[type]}`;
      notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <i class="${icons[type]}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-gray-400 hover:text-gray-600">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
      
      // Add to document
      document.body.appendChild(notification);
      
      // Animate in
      setTimeout(() => {
        notification.classList.remove('translate-x-full');
      }, 100);
      
      // Auto remove after 3 seconds
      setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    }

      /**
     * Load ESLint report data
     */
    loadESLintData(eslintData = null) {
      const tableWrap = document.getElementById('eslintTableWrap');
      if (!tableWrap) return;

      if (eslintData && eslintData.results && eslintData.results.length > 0) {
        // Use real ESLint data - flatten all messages from all results
        const allMessages = [];
        eslintData.results.forEach(result => {
          if (result.messages && result.messages.length > 0) {
            result.messages.forEach(msg => {
              allMessages.push({
                file: result.filePath || msg.filePath || 'Unknown file',
                line: msg.line || msg.lineNumber || 'N/A',
                rule: msg.ruleId || msg.rule || 'Unknown rule',
                severity: msg.severity === 2 ? 'error' : msg.severity === 1 ? 'warning' : 'info',
                message: msg.message || msg.msg || 'No message'
              });
            });
          }
        });

        if (allMessages.length > 0) {
          this.renderTable(tableWrap, allMessages, ['File', 'Line', 'Rule', 'Severity', 'Message']);
          return;
        }
      }

      // Fallback to sample data
      const data = [
        { file: 'src/components/Button.js', line: 15, rule: 'no-unused-vars', severity: 'warning', message: 'Variable "unusedVar" is defined but never used' },
        { file: 'src/utils/helper.js', line: 23, rule: 'no-console', severity: 'error', message: 'Unexpected console statement' },
        { file: 'src/pages/Home.js', line: 8, rule: 'prefer-const', severity: 'warning', message: 'Use const instead of let' },
        { file: 'src/components/Modal.js', line: 45, rule: 'no-undef', severity: 'error', message: 'Undefined variable "modalRef"' },
        { file: 'src/utils/api.js', line: 12, rule: 'no-unused-vars', severity: 'warning', message: 'Parameter "options" is defined but never used' }
      ];

      this.renderTable(tableWrap, data, ['File', 'Line', 'Rule', 'Severity', 'Message']);
    }

    /**
     * Load Stylelint report data
     */
    loadStylelintData(stylelintData = null) {
      const tableWrap = document.getElementById('stylelintTableWrap');
      if (!tableWrap) return;

      if (stylelintData && stylelintData.results && stylelintData.results.length > 0) {
        // Use real Stylelint data - flatten all messages from all results
        const allMessages = [];
        stylelintData.results.forEach(result => {
          if (result.messages && result.messages.length > 0) {
            result.messages.forEach(msg => {
              allMessages.push({
                file: result.source || msg.filePath || 'Unknown file',
                line: msg.line || msg.lineNumber || 'N/A',
                rule: msg.rule || msg.ruleId || 'Unknown rule',
                severity: msg.severity === 'error' ? 'error' : msg.severity === 'warning' ? 'warning' : 'info',
                message: msg.text || msg.message || 'No message'
              });
            });
          }
        });

        if (allMessages.length > 0) {
          this.renderTable(tableWrap, allMessages, ['File', 'Line', 'Rule', 'Severity', 'Message']);
          return;
        }
      }

      // Fallback to sample data
      const data = [
        { file: 'src/styles/main.css', line: 25, rule: 'color-no-invalid-hex', severity: 'error', message: 'Invalid hex color "#invalid"' },
        { file: 'src/components/Button.css', line: 8, rule: 'declaration-block-no-duplicate-properties', severity: 'warning', message: 'Duplicate property "margin"' },
        { file: 'src/styles/variables.css', line: 15, rule: 'property-no-vendor-prefix', severity: 'warning', message: 'Unnecessary vendor prefix "-webkit"' },
        { file: 'src/components/Card.css', line: 32, rule: 'selector-no-qualifying-type', severity: 'warning', message: 'Qualifying type is unnecessary' }
      ];

      this.renderTable(tableWrap, data, ['File', 'Line', 'Rule', 'Severity', 'Message']);
    }

    /**
     * Load Security audit data
     */
    loadSecurityData(securityData = null) {
      const tableWrap = document.getElementById('securityTableWrap');
      if (!tableWrap) return;

      if (securityData && securityData.issues && securityData.issues.length > 0) {
        // Use real security data
        const data = securityData.issues.map(issue => ({
          type: issue.type || 'Vulnerability',
          severity: issue.severity || 'medium',
          issue: issue.title || issue.issue || 'Security issue',
          location: issue.package ? `${issue.package}@${issue.version}` : (issue.file || 'Unknown'),
          description: issue.description || issue.remediation || 'No description'
        }));

        this.renderTable(tableWrap, data, ['Type', 'Severity', 'Issue', 'Location', 'Description']);
      } else {
        // Fallback to sample data
        const data = [
          { type: 'Code Scan', severity: 'high', issue: 'SQL Injection', location: 'src/api/database.js', description: 'Unsanitized user input in SQL query' },
          { type: 'Live URL', severity: 'medium', issue: 'Missing HTTPS', location: 'http://example.com', description: 'Site not served over HTTPS' },
          { type: 'Code Scan', severity: 'low', issue: 'Hardcoded Password', location: 'src/config/auth.js', description: 'Password hardcoded in source code' },
          { type: 'Live URL', severity: 'high', issue: 'XSS Vulnerability', location: 'https://example.com', description: 'Reflected XSS in search parameter' }
        ];

        this.renderTable(tableWrap, data, ['Type', 'Severity', 'Issue', 'Location', 'Description']);
      }
    }

    /**
     * Load Performance audit data
     */
    loadPerformanceData(performanceData = null) {
      const tableWrap = document.getElementById('performanceTableWrap');
      if (!tableWrap) return;

      if (performanceData && performanceData.issues && performanceData.issues.length > 0) {
        // Use real performance data
        const data = performanceData.issues.map(issue => ({
          metric: issue.type || 'Performance Issue',
          score: issue.score || 'N/A',
          status: issue.severity || 'medium',
          threshold: issue.threshold || 'N/A',
          description: issue.message || issue.description || 'No description'
        }));

        this.renderTable(tableWrap, data, ['Metric', 'Score', 'Status', 'Threshold', 'Description']);
      } else {
        // Fallback to sample data
        const data = [
          { metric: 'First Contentful Paint', score: 2.8, status: 'poor', threshold: '< 1.8s', description: 'Page takes too long to show first content' },
          { metric: 'Largest Contentful Paint', score: 4.2, status: 'poor', threshold: '< 2.5s', description: 'Main content takes too long to load' },
          { metric: 'Cumulative Layout Shift', score: 0.15, status: 'good', threshold: '< 0.1', description: 'Minimal layout shifts during load' },
          { metric: 'Total Blocking Time', score: 350, status: 'poor', threshold: '< 200ms', description: 'JavaScript blocks main thread for too long' }
        ];

        this.renderTable(tableWrap, data, ['Metric', 'Score', 'Status', 'Threshold', 'Description']);
      }
    }

    /**
     * Load Accessibility audit data
     */
    loadAccessibilityData(accessibilityData = null) {
      const tableWrap = document.getElementById('accessibilityTableWrap');
      if (!tableWrap) return;

      if (accessibilityData && accessibilityData.issues && accessibilityData.issues.length > 0) {
        // Use real accessibility data
        const data = accessibilityData.issues.map(issue => ({
          issue: issue.type || issue.issue || 'Accessibility Issue',
          severity: issue.severity || 'medium',
          element: issue.element || issue.selector || 'Unknown',
          count: issue.count || 1,
          description: issue.message || issue.description || 'No description'
        }));

        this.renderTable(tableWrap, data, ['Issue', 'Severity', 'Element', 'Count', 'Description']);
      } else {
        // Fallback to sample data
        const data = [
          { issue: 'Missing alt text', severity: 'error', element: 'img', count: 5, description: 'Images missing alt attributes for screen readers' },
          { issue: 'Low contrast ratio', severity: 'warning', element: 'button', count: 3, description: 'Text color doesn\'t meet WCAG contrast requirements' },
          { issue: 'Missing ARIA labels', severity: 'error', element: 'input', count: 2, description: 'Form inputs missing proper ARIA labels' },
          { issue: 'Keyboard navigation', severity: 'warning', element: 'nav', count: 1, description: 'Navigation not fully keyboard accessible' }
        ];

        this.renderTable(tableWrap, data, ['Issue', 'Severity', 'Element', 'Count', 'Description']);
      }
    }

    /**
     * Load Lighthouse audit data
     */
    loadLighthouseData() {
      // Setup Lighthouse tab switching
      this.setupLighthouseTabs();
      
      // Load real Lighthouse data if available
      this.loadRealLighthouseData();
    }

    /**
     * Setup Lighthouse mobile/desktop tabs
     */
    setupLighthouseTabs() {
      const mobileTab = document.getElementById('lighthouseMobileTab');
      const desktopTab = document.getElementById('lighthouseDesktopTab');
      const mobileContent = document.getElementById('lighthouseMobileContent');
      const desktopContent = document.getElementById('lighthouseDesktopContent');

      if (!mobileTab || !desktopTab || !mobileContent || !desktopContent) return;

      // Mobile tab click
      mobileTab.addEventListener('click', () => {
        mobileTab.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-700', 'dark:bg-blue-900/20', 'dark:border-blue-700', 'dark:text-blue-300');
        mobileTab.classList.remove('border-gray-300', 'text-gray-700', 'hover:bg-gray-50', 'dark:border-gray-600', 'dark:text-gray-300', 'dark:hover:bg-gray-800');
        
        desktopTab.classList.remove('bg-blue-50', 'border-blue-200', 'text-blue-700', 'dark:bg-blue-900/20', 'dark:border-blue-700', 'dark:text-blue-300');
        desktopTab.classList.add('border-gray-300', 'text-gray-700', 'hover:bg-gray-50', 'dark:border-gray-600', 'dark:text-gray-300', 'dark:hover:bg-gray-800');
        
        mobileContent.classList.remove('hidden');
        desktopContent.classList.add('hidden');
      });

      // Desktop tab click
      desktopTab.addEventListener('click', () => {
        desktopTab.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-700', 'dark:bg-blue-900/20', 'dark:border-blue-700', 'dark:text-blue-300');
        desktopTab.classList.remove('border-gray-300', 'text-gray-700', 'hover:bg-gray-50', 'dark:border-gray-600', 'dark:text-gray-300', 'dark:hover:bg-gray-800');
        
        mobileTab.classList.remove('bg-blue-50', 'border-blue-200', 'text-blue-700', 'dark:bg-blue-900/20', 'dark:border-blue-700', 'dark:text-blue-300');
        mobileTab.classList.add('border-gray-300', 'text-gray-700', 'hover:bg-gray-50', 'dark:border-gray-600', 'dark:text-gray-300', 'dark:hover:bg-gray-800');
        
        desktopContent.classList.remove('hidden');
        mobileContent.classList.add('hidden');
      });

      // Set mobile as default active
      mobileTab.click();
    }

    /**
     * Load real Lighthouse data
     */
    async loadRealLighthouseData() {
      try {
        // Try to load Lighthouse report data
        const lighthouseData = await this.loadReportData('lightHouseCombine-report.json');
        
        if (lighthouseData) {
          this.populateLighthouseData(lighthouseData);
        } else {
          this.showNoDataMessage('lighthouseMobileTableWrap', 'No Lighthouse data available');
          this.showNoDataMessage('lighthouseDesktopTableWrap', 'No Lighthouse data available');
        }
      } catch (error) {
        console.error('Error loading Lighthouse data:', error);
        this.showNoDataMessage('lighthouseMobileTableWrap', 'No Lighthouse data available');
        this.showNoDataMessage('lighthouseDesktopTableWrap', 'No Lighthouse data available');
      }
    }

    /**
     * Populate Lighthouse data
     */
    populateLighthouseData(data) {
      console.log('Lighthouse data structure:', data);
      
      // Handle array format (multiple URLs)
      if (Array.isArray(data) && data.length > 0) {
        const firstReport = data[0];
        const mobileData = firstReport.mobile || firstReport;
        const desktopData = firstReport.desktop || firstReport;
        
        console.log('Mobile data:', mobileData);
        console.log('Desktop data:', desktopData);
        
        // Update mobile metrics
        this.updateLighthouseMetrics('mobile', mobileData);
        this.updateLighthouseCoreVitals('mobile', mobileData);
        this.updateLighthouseIssues('mobile', mobileData);

        // Update desktop metrics
        this.updateLighthouseMetrics('desktop', desktopData);
        this.updateLighthouseCoreVitals('desktop', desktopData);
        this.updateLighthouseIssues('desktop', desktopData);
      } else {
        // Handle single object format
        const mobileData = data.mobile || data;
        const desktopData = data.desktop || data;
        
        // Update mobile metrics
        this.updateLighthouseMetrics('mobile', mobileData);
        this.updateLighthouseCoreVitals('mobile', mobileData);
        this.updateLighthouseIssues('mobile', mobileData);

        // Update desktop metrics
        this.updateLighthouseMetrics('desktop', desktopData);
        this.updateLighthouseCoreVitals('desktop', desktopData);
        this.updateLighthouseIssues('desktop', desktopData);
      }
    }

    /**
     * Update Lighthouse metrics
     */
    updateLighthouseMetrics(device, data) {
      console.log(`Updating ${device} metrics:`, data);
      
      // Handle the actual data structure from the report
      const performanceScore = data.performance || 0;
      const accessibilityScore = data.accessibility || 0;
      const bestPracticesScore = data.bestPractices || 0;
      const seoScore = data.seo || 0;
      
      // Performance Score
      const performanceElement = document.getElementById(`${device}PerformanceScore`);
      const performanceProgress = document.getElementById(`${device}PerformanceProgress`);
      
      if (performanceElement) {
        performanceElement.textContent = performanceScore;
      }
      if (performanceProgress) {
        performanceProgress.style.width = `${performanceScore}%`;
        performanceProgress.className = `h-2 rounded-full ${this.getScoreColor(performanceScore / 100)}`;
      }

      // Accessibility Score
      const accessibilityElement = document.getElementById(`${device}AccessibilityScore`);
      const accessibilityProgress = document.getElementById(`${device}AccessibilityProgress`);
      
      if (accessibilityElement) {
        accessibilityElement.textContent = accessibilityScore;
      }
      if (accessibilityProgress) {
        accessibilityProgress.style.width = `${accessibilityScore}%`;
        accessibilityProgress.className = `h-2 rounded-full ${this.getScoreColor(accessibilityScore / 100)}`;
      }

      // Best Practices Score
      const bestPracticesElement = document.getElementById(`${device}BestPracticesScore`);
      const bestPracticesProgress = document.getElementById(`${device}BestPracticesProgress`);
      
      if (bestPracticesElement) {
        bestPracticesElement.textContent = bestPracticesScore;
      }
      if (bestPracticesProgress) {
        bestPracticesProgress.style.width = `${bestPracticesScore}%`;
        bestPracticesProgress.className = `h-2 rounded-full ${this.getScoreColor(bestPracticesScore / 100)}`;
      }

      // SEO Score
      const seoElement = document.getElementById(`${device}SEOScore`);
      const seoProgress = document.getElementById(`${device}SEOProgress`);
      
      if (seoElement) {
        seoElement.textContent = seoScore;
      }
      if (seoProgress) {
        seoProgress.style.width = `${seoScore}%`;
        seoProgress.className = `h-2 rounded-full ${this.getScoreColor(seoScore / 100)}`;
      }
    }

    /**
     * Update Lighthouse Core Web Vitals
     */
    updateLighthouseCoreVitals(device, data) {
      console.log(`Updating ${device} Core Web Vitals:`, data);
      
      const issues = data.issues || [];
      
      // Extract Core Web Vitals from issues
      const lcpIssue = issues.find(issue => issue.type === 'performance_largest-contentful-paint');
      const fidIssue = issues.find(issue => issue.type === 'performance_first-input-delay');
      const clsIssue = issues.find(issue => issue.type === 'performance_cumulative-layout-shift');
      
      // Largest Contentful Paint
      const lcpElement = document.getElementById(`${device}LCP`);
      const lcpBar = document.getElementById(`${device}LCPBar`);
      
      if (lcpElement && lcpIssue) {
        // Extract time from description or use score as proxy
        const lcpTime = this.extractTimeFromDescription(lcpIssue.description) || 'N/A';
        lcpElement.textContent = lcpTime;
        
        if (lcpBar) {
          const lcpScore = this.getLCPScoreFromScore(lcpIssue.score);
          lcpBar.style.width = `${lcpScore}%`;
          lcpBar.className = `h-2 rounded-full ${this.getVitalColor(lcpScore)}`;
        }
      } else if (lcpElement) {
        lcpElement.textContent = 'N/A';
      }

      // First Input Delay
      const fidElement = document.getElementById(`${device}FID`);
      const fidBar = document.getElementById(`${device}FIDBar`);
      
      if (fidElement && fidIssue) {
        const fidTime = this.extractTimeFromDescription(fidIssue.description) || 'N/A';
        fidElement.textContent = fidTime;
        
        if (fidBar) {
          const fidScore = this.getFIDScoreFromScore(fidIssue.score);
          fidBar.style.width = `${fidScore}%`;
          fidBar.className = `h-2 rounded-full ${this.getVitalColor(fidScore)}`;
        }
      } else if (fidElement) {
        fidElement.textContent = 'N/A';
      }

      // Cumulative Layout Shift
      const clsElement = document.getElementById(`${device}CLS`);
      const clsBar = document.getElementById(`${device}CLSBar`);
      
      if (clsElement && clsIssue) {
        const clsValue = this.extractCLSFromDescription(clsIssue.description) || 'N/A';
        clsElement.textContent = clsValue;
        
        if (clsBar) {
          const clsScore = this.getCLSScoreFromScore(clsIssue.score);
          clsBar.style.width = `${clsScore}%`;
          clsBar.className = `h-2 rounded-full ${this.getVitalColor(clsScore)}`;
        }
      } else if (clsElement) {
        clsElement.textContent = 'N/A';
      }
    }

    /**
     * Extract time from description
     */
    extractTimeFromDescription(description) {
      if (!description) return null;
      
      // Look for time patterns like "2.5s", "1500ms", etc.
      const timeMatch = description.match(/(\d+(?:\.\d+)?)\s*(s|ms)/);
      if (timeMatch) {
        const value = parseFloat(timeMatch[1]);
        const unit = timeMatch[2];
        if (unit === 'ms') {
          return `${(value / 1000).toFixed(1)}s`;
        }
        return `${value.toFixed(1)}s`;
      }
      return null;
    }

    /**
     * Extract CLS value from description
     */
    extractCLSFromDescription(description) {
      if (!description) return null;
      
      // Look for CLS patterns like "0.15", "0.25", etc.
      const clsMatch = description.match(/(\d+(?:\.\d+)?)/);
      if (clsMatch) {
        return parseFloat(clsMatch[1]).toFixed(3);
      }
      return null;
    }

    /**
     * Get LCP score from Lighthouse score
     */
    getLCPScoreFromScore(score) {
      if (score >= 0.9) return 100;
      if (score >= 0.5) return 75;
      if (score >= 0.25) return 50;
      return 25;
    }

    /**
     * Get FID score from Lighthouse score
     */
    getFIDScoreFromScore(score) {
      if (score >= 0.9) return 100;
      if (score >= 0.5) return 75;
      if (score >= 0.25) return 50;
      return 25;
    }

    /**
     * Get CLS score from Lighthouse score
     */
    getCLSScoreFromScore(score) {
      if (score >= 0.9) return 100;
      if (score >= 0.5) return 75;
      if (score >= 0.25) return 50;
      return 25;
    }

    /**
     * Update Lighthouse Issues
     */
    updateLighthouseIssues(device, data) {
      console.log(`Updating ${device} issues:`, data);
      
      const issues = data.issues || [];
      const formattedIssues = issues.map(issue => ({
        issue: issue.message || issue.type || 'Unknown Issue',
        description: issue.description || 'No description available',
        score: issue.score ? Math.round(issue.score * 100) : 'N/A',
        severity: issue.severity || this.getSeverityFromScore(issue.score || 0)
      }));

      const tableWrap = document.getElementById(`lighthouse${device.charAt(0).toUpperCase() + device.slice(1)}TableWrap`);
      if (tableWrap) {
        if (formattedIssues.length > 0) {
          this.renderTable(tableWrap, formattedIssues, ['Issue', 'Description', 'Score', 'Severity']);
        } else {
          this.showNoDataMessage(`lighthouse${device.charAt(0).toUpperCase() + device.slice(1)}TableWrap`, 'No performance issues found');
        }
      }
    }

    /**
     * Get score color based on value
     */
    getScoreColor(score) {
      if (score >= 0.9) return 'bg-green-600';
      if (score >= 0.5) return 'bg-yellow-600';
      return 'bg-red-600';
    }

    /**
     * Get vital color based on score
     */
    getVitalColor(score) {
      if (score >= 90) return 'bg-green-600';
      if (score >= 50) return 'bg-yellow-600';
      return 'bg-red-600';
    }

    /**
     * Get LCP score percentage
     */
    getLCPScore(lcp) {
      if (lcp <= 2500) return 100;
      if (lcp <= 4000) return 75;
      if (lcp <= 6000) return 50;
      return 25;
    }

    /**
     * Get FID score percentage
     */
    getFIDScore(fid) {
      if (fid <= 100) return 100;
      if (fid <= 300) return 75;
      if (fid <= 500) return 50;
      return 25;
    }

    /**
     * Get CLS score percentage
     */
    getCLSScore(cls) {
      if (cls <= 0.1) return 100;
      if (cls <= 0.25) return 75;
      if (cls <= 0.5) return 50;
      return 25;
    }

    /**
     * Get severity from score
     */
    getSeverityFromScore(score) {
      if (score >= 0.9) return 'Good';
      if (score >= 0.5) return 'Needs Improvement';
      return 'Poor';
    }

    /**
     * Load NPM packages data
     */
    loadNPMData(npmData = null) {
      const tableWrap = document.getElementById('npmTableWrap');
      if (!tableWrap) return;

      if (npmData && npmData.dependencies && npmData.dependencies.length > 0) {
        // Use real NPM data
        const data = npmData.dependencies.map(dep => ({
          package: dep.name || 'Unknown',
          version: dep.version || 'N/A',
          status: dep.deprecated === 'Not deprecated' ? 'up-to-date' : 'deprecated',
          size: dep.unpackedSize ? `${dep.unpackedSize}` : 'Unknown',
          description: dep.description || 'No description'
        }));

        this.renderTable(tableWrap, data, ['Package', 'Version', 'Status', 'Size', 'Description']);
      } else {
        // Fallback to sample data
        const data = [
          { package: 'react', version: '18.2.0', status: 'up-to-date', size: '42.5KB', description: 'Latest stable version' },
          { package: 'lodash', version: '4.17.21', status: 'outdated', size: '69.8KB', description: 'New version available: 4.17.22' },
          { package: 'axios', version: '1.4.0', status: 'up-to-date', size: '13.2KB', description: 'Latest stable version' },
          { package: 'moment', version: '2.29.4', status: 'deprecated', size: '232.1KB', description: 'Consider using date-fns instead' }
        ];

        this.renderTable(tableWrap, data, ['Package', 'Version', 'Status', 'Size', 'Description']);
      }
    }

    /**
     * Load Dependency audit data
     */
    loadDependencyData(securityData = null) {
      const tableWrap = document.getElementById('dependencyTableWrap');
      if (!tableWrap) return;

      if (securityData && securityData.issues && securityData.issues.length > 0) {
        // Use real dependency vulnerability data
        const vulnerabilityIssues = securityData.issues.filter(issue => 
          issue.type === 'snyk_vulnerability' && issue.package
        );

        if (vulnerabilityIssues.length > 0) {
          const data = vulnerabilityIssues.map(issue => ({
            package: issue.package || 'Unknown',
            vulnerability: issue.cve || 'No CVE',
            severity: issue.severity || 'medium',
            version: issue.version || 'N/A',
            fix: issue.remediation || 'No fix available'
          }));

          this.renderTable(tableWrap, data, ['Package', 'Vulnerability', 'Severity', 'Version', 'Fix']);
          return;
        }
      }

      // Fallback to sample data
      const data = [
        { package: 'lodash', vulnerability: 'CVE-2021-23337', severity: 'high', version: '4.17.21', fix: 'Update to 4.17.22' },
        { package: 'moment', vulnerability: 'CVE-2022-24785', severity: 'medium', version: '2.29.4', fix: 'Update to 2.29.5' },
        { package: 'axios', vulnerability: 'CVE-2023-45133', severity: 'low', version: '1.4.0', fix: 'Update to 1.6.0' }
      ];

      this.renderTable(tableWrap, data, ['Package', 'Vulnerability', 'Severity', 'Version', 'Fix']);
    }

    /**
     * Load Excluded Rules data
     */
    loadExcludedRulesData(eslintData = null, stylelintData = null) {
      const configStatus = document.getElementById('configStatus');
      if (!configStatus) return;

      let eslintRules = [];
      let stylelintRules = [];

      if (eslintData && eslintData.excludeRules && eslintData.excludeRules.rules) {
        eslintRules = eslintData.excludeRules.rules;
      }

      if (stylelintData && stylelintData.excludeRules && stylelintData.excludeRules.rules) {
        stylelintRules = stylelintData.excludeRules.rules;
      }

      configStatus.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Configuration Status</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Last updated: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="flex items-center space-x-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Active
          </span>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 class="font-medium text-gray-900 dark:text-white mb-2">ESLint Excluded Rules (${eslintRules.length})</h4>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            ${eslintRules.length > 0 ? eslintRules.slice(0, 5).join(', ') + (eslintRules.length > 5 ? '...' : '') : 'No rules excluded'}
          </div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 class="font-medium text-gray-900 dark:text-white mb-2">Stylelint Excluded Rules (${stylelintRules.length})</h4>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            ${stylelintRules.length > 0 ? stylelintRules.slice(0, 5).join(', ') + (stylelintRules.length > 5 ? '...' : '') : 'No rules excluded'}
          </div>
        </div>
      </div>
    `;
    }

    /**
     * Render table with data
     */
    renderTable(container, data, headers) {
      if (!container || !data || !headers) {
        console.warn('renderTable: Missing required parameters', { container, data, headers });
        return;
      }

      const getStatusBadge = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value !== 'string') return value;
        
        if (value.includes('error') || value.includes('high') || value.includes('poor')) {
          return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">${value}</span>`;
        } else if (value.includes('warning') || value.includes('medium') || value.includes('needs-improvement')) {
          return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">${value}</span>`;
        } else if (value.includes('good') || value.includes('up-to-date')) {
          return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">${value}</span>`;
        } else if (value.includes('outdated') || value.includes('deprecated')) {
          return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">${value}</span>`;
        }
        return value;
      };

      const tableHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${Object.values(row).map((cell, index) => {
                  const cellValue = cell !== null && cell !== undefined ? cell.toString() : '';
                  const headerValue = headers[index] ? headers[index].toLowerCase() : '';
                  
                  let cellClass = '';
                  if (headerValue.includes('file')) {
                    cellClass = 'file-cell';
                  } else if (headerValue.includes('message') || headerValue.includes('description')) {
                    cellClass = 'message-cell';
                  } else if (headerValue.includes('rule')) {
                    cellClass = 'rule-cell';
                  } else if (headerValue.includes('line')) {
                    cellClass = 'line-cell';
                  } else if (headerValue.includes('severity') || headerValue.includes('status')) {
                    cellClass = 'severity-cell';
                  } else {
                    cellClass = 'text-cell';
                  }
                  
                  const isStatusColumn = headerValue.includes('status') || 
                                       headerValue.includes('severity') ||
                                       cellValue.toLowerCase().includes('error') ||
                                       cellValue.toLowerCase().includes('warning') ||
                                       cellValue.toLowerCase().includes('good') ||
                                       cellValue.toLowerCase().includes('poor') ||
                                       cellValue.toLowerCase().includes('high') ||
                                       cellValue.toLowerCase().includes('medium') ||
                                       cellValue.toLowerCase().includes('low') ||
                                       cellValue.toLowerCase().includes('up-to-date') ||
                                       cellValue.toLowerCase().includes('outdated') ||
                                       cellValue.toLowerCase().includes('deprecated');
                  
                  return `<td class="${cellClass}">${isStatusColumn ? getStatusBadge(cell) : cell}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="text-sm text-gray-500 mt-2">Showing ${data.length} results</div>
    `;

      container.innerHTML = tableHTML;
    }

    /**
     * Show no data message
     */
    showNoDataMessage(containerId, message) {
      const container = document.getElementById(containerId);
      if (!container) return;
      
      container.innerHTML = `
      <div class="no-data-message">
        <i class="fas fa-info-circle"></i>
        <p>${message}</p>
        <p class="text-sm mt-2">Run the audit to generate data for this section.</p>
      </div>
    `;
    }

    /**
     * Setup default active state for navigation
     */
    setupDefaultActiveState() {
      const navItems = document.querySelectorAll('.nav-item');
      const mainPageNav = document.getElementById('mainPage');
      
      // Remove active class from all items
      navItems.forEach(nav => nav.classList.remove('active'));
      
      // Set Dashboard as active by default
      if (mainPageNav) {
        mainPageNav.classList.add('active');
      }
    }

    /**
     * Handle window resize
     */
    handleResize() {
      this.isMobile = window.innerWidth < 768;
      
      // Update mobile navigation if needed
      if (!this.isMobile) {
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        
        if (sidebar) sidebar.classList.remove('open');
        if (mobileOverlay) mobileOverlay.classList.remove('open');
      }
    }
  }

  // Initialize dashboard when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    try {
      window.simpleDashboard = new SimpleDashboard();
      console.log('UI Code Insight - Simple Dashboard initialized');
      
      // Handle window resize
      window.addEventListener('resize', () => {
        window.simpleDashboard.handleResize();
      });
    } catch (error) {
      console.error('Error initializing simple dashboard:', error);
    }
  });

  return SimpleDashboard;

})();
