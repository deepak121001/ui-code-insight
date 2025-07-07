(function () {
  'use strict';

  /**
   * Fetches report data from a JSON file. Returns an empty array/object if not found.
   * @async
   * @param {string} reportType - The type of report to fetch (e.g., 'eslint', 'stylelint', 'npm', 'component-usage').
   * @returns {Promise<Object|Array>} The parsed JSON data or an empty array/object if not found.
   */
  const fetchData = async (reportType) => {
    try {
      const response = await fetch(`./${reportType}-report.json`);
      if (!response.ok) {
        showDashboardMessage(`No ${reportType} report found. Please generate the report first.`);
        // Return empty array for known array reports, empty object otherwise
        if (reportType === 'stylelint' || reportType === 'component-usage') return [];
        return {};
      }
      return await response.json();
    } catch (e) {
      showDashboardMessage(`Error fetching ${reportType} report.`);
      if (reportType === 'stylelint' || reportType === 'component-usage') return [];
      return {};
    }
  };

  /**
   * Hides the main dashboard content area.
   */
  const hideChartCards = () => {
    const dashboardContent = document.getElementById("dashboardContent");
    if (dashboardContent) dashboardContent.style.display = "none";
  };

  /**
   * Renders a table of package data.
   * @param {Array} data - Array of package objects.
   * @param {HTMLElement} table - The table element to render into.
   */
  const renderTable = (data, table) => {
    if (!table) return;
    const rows = data
      .map(
        (item) => `
              <tr class="border-b border-gray-200 hover:bg-gray-100 ${
                item.deprecated === "Deprecated" ? "bg-red-100" : ""
              }">
                    <td class="py-3 px-6 text-left whitespace-nowrap">
                     ${item.name}
                    </td>
                    <td class="py-3 px-6 text-left">${item.version}</td>
                    <td class="py-3 px-6 text-left">${item.license}</td>
                    <td class="py-3 px-6 text-left">
                    <p class="tab-des"> ${item.description}</p>
                      
                    </td>
                  <td class="py-3 px-6 text-left">
                    ${item.deprecated}
                      
                    </td>
                    <td class="py-3 px-6 text-left"> ${item.unpackedSize}</td>
                  </tr>
  `
      )
      .join(" ");
    table.innerHTML = rows;
  };

  /**
   * Creates an accordion item for a file's lint results.
   * @param {string} filePath
   * @param {number} errorCount
   * @param {number} warningCount
   * @param {Array} messages
   * @returns {HTMLElement} The accordion item element.
   */
  const createAccordionItem = (
    filePath,
    errorCount,
    warningCount,
    messages
  ) => {
    hideChartCards();
    const accordionItem = document.createElement("div");
    accordionItem.classList.add("border-b", "border-gray-200");

    const accordionButton = document.createElement("button");
    accordionButton.classList.add(
      "py-2",
      "px-4",
      "w-full",
      "text-left",
      "font-bold",
      "flex",
      "items-center",
      "border-l-4",
      "justify-between"
    );

    // Determine background color based on error and warning counts
    if (errorCount > 0) {
      accordionButton.classList.add("border-red-300");
    } else if (warningCount > 0) {
      accordionButton.classList.add("border-yellow-300");
    } else {
      accordionButton.classList.add("border-green-300");
    }

    accordionButton.setAttribute("type", "button");
    accordionButton.innerHTML = `
  File: ${filePath}
  <div>
   <span class="bg-red-100 text-red-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">Errors: ${errorCount}</span>
    <span class="bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">Warning: ${warningCount}</span>
   </div>
  `;

    const accordionContent = document.createElement("div");
    accordionContent.classList.add("hidden", "mt-2"); // Initially hidden

    const contentText = `
  <div class="px-4 py-2">
        <p>Error Count: ${errorCount}</p>
        <p>Warning Count: ${warningCount}</p>
        <p>Messages:</p>
        <ul class="list-disc list-inside">
            ${messages
              .map(
                (
                  message
                ) => `<li class="hover:bg-gray-200 cursor-pointer bg-white shadow flex p-5 pl-1.5 items-center mb-5 rounded-lg mt-1.5">
                  <svg class="w-6 h-6 ${
                    message.severity >= 2 || message.severity === "error"
                      ? "text-red-600"
                      : "text-yellow-300"
                  }" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <!-- Add your custom SVG path here -->
    <path d="M5 11h14v2H5z" fill="currentColor"></path>
  </svg>
                  <span class="font-bold">
                    Line ${message.line}, Column ${message.column}:</span> ${
                  message.message
                }
                  </li>`
              )
              .join("")}
        </ul>
        </div>
    `;

    accordionContent.innerHTML = contentText;

    accordionButton.addEventListener("click", () => {
      accordionContent.classList.toggle("hidden");
    });

    accordionItem.appendChild(accordionButton);
    accordionItem.appendChild(accordionContent);

    return accordionItem;
  };

  /**
   * Renders an accordion of lint results.
   * @param {Array} data - Array of file lint result objects.
   */
  const renderAccordion = (data) => {
    const accordionContent = document.getElementById("accordionContent");
    const accordionContainer = document.getElementById("accordion");

    if (accordionContent) {
      accordionContent.classList.remove("hidden");
    }
    if (!accordionContainer) return;
    accordionContainer.innerHTML = "";
    data.forEach((item) => {
      const accordionItem = createAccordionItem(
        item.filePath,
        item.errorCount,
        item.warningCount,
        item.messages
      );
      accordionContainer.appendChild(accordionItem);
    });
  };

  /**
   * Updates progress gauge elements based on their data-value attribute.
   */
  const updateProgress = () => {
    const wrappers = document.querySelectorAll(".lh-gauge__svg-wrapper");

    wrappers.forEach((wrapper) => {
      const value = parseFloat(wrapper.dataset.value);

      const arc = wrapper.querySelector(".lh-gauge-arc");
      const progressValue = wrapper.querySelector(".lh-progress-value");

      const circumference = 2 * Math.PI * parseFloat(arc.getAttribute("r"));
      const dashOffset = circumference - (value / 100) * circumference;

      arc.style.strokeDasharray = `${circumference} ${circumference}`;
      arc.style.strokeDashoffset = dashOffset;

      let statusColor;

      if (value >= 0 && value < 50) {
        statusColor = "#E71D36"; // Error color
      } else if (value >= 50 && value < 90) {
        statusColor = "#FF9F1C"; // Warning color
      } else if (value >= 90 && value <= 100) {
        statusColor = "#2EC4B6"; // Success color
      }

      arc.style.stroke = statusColor;
      progressValue.textContent = value;
    });
  };

  /**
   * Initializes global dashboard event listeners.
   */
  const globalInit$1 = () => {
    const dashboardMainLink = document.getElementById("mainPage");
    if (dashboardMainLink) {
      dashboardMainLink.addEventListener("click", () => {
        location.reload();
      });
    }
  };

  /**
   * Show a friendly message in the dashboard.
   * @param {string} message
   */
  const showDashboardMessage = (message) => {
    const msgDiv = document.getElementById('dashboardMessage');
    if (msgDiv) {
      msgDiv.textContent = message;
      msgDiv.classList.remove('hidden');
    }
  };

  var helper = /*#__PURE__*/Object.freeze({
    __proto__: null,
    fetchData: fetchData,
    hideChartCards: hideChartCards,
    renderTable: renderTable,
    createAccordionItem: createAccordionItem,
    renderAccordion: renderAccordion,
    updateProgress: updateProgress,
    globalInit: globalInit$1,
    showDashboardMessage: showDashboardMessage
  });

  const chartInit = () => {
    const getChartOptions = (error = 0, pass = 0, warning = 0) => {
      return {
        series: [error, pass, warning],
        colors: ["#FF0000", "#16BDCA", "#FFA500"],
        chart: {
          height: "380px",
          width: "100%",
          type: "radialBar",
          sparkline: {
            enabled: true,
          },
        },
        plotOptions: {
          radialBar: {
            track: {
              background: "#E5E7EB",
            },
            dataLabels: {
              show: false,
            },
            hollow: {
              margin: 0,
              size: "32%",
            },
          },
        },
        grid: {
          show: false,
          strokeDashArray: 4,
          padding: {
            left: 2,
            right: 2,
            top: -23,
            bottom: -20,
          },
        },
        labels: ["Errors", "Pass", "warnings"],
        legend: {
          show: true,
          position: "bottom",
          fontFamily: "Inter, sans-serif",
        },
        tooltip: {
          enabled: true,
          x: {
            show: false,
          },
        },
        yaxis: {
          show: false,
          labels: {
            formatter: function (value) {
              return value + "%";
            },
          },
        },
      };
    };

    const updateChartWithData = async (filename, element) => {
      const data = await fetchData(filename);
      const arr = Array.isArray(data) ? data : [];
      // Calculate total error and warning counts
      const totalErrors = arr.reduce(
        (acc, item) => (item.errorCount ? acc + item.errorCount : acc + 0),
        0
      );
      const totalWarnings = arr.reduce(
        (acc, item) => (item.warningCount ? acc + item.warningCount : acc + 0),
        0
      );

      const totalItems = arr.length;

      const fileWithErrors = arr.reduce((acc, item) => {
        if (item.errorCount) {
          acc += 1;
        }
        return acc;
      }, 0);
      const percentageWithErrors = totalItems > 0 ? Math.floor(
        (fileWithErrors / totalItems) * 100
      ) : 0;

      const fileWithOnlyWarnings = arr.reduce((acc, item) => {
        if (item.errorCount === 0 && item.warningCount) {
          acc += 1;
        }
        return acc;
      }, 0);

      const percentageOnlyWarnings = totalItems > 0 ? Math.floor(
        (fileWithOnlyWarnings / totalItems) * 100
      ) : 0;

      const passFile = arr.reduce((acc, item) => {
        if (!item.errorCount && !item.warningCount) {
          acc += 1;
        }
        return acc;
      }, 0);
      const percentagePassFile = totalItems > 0 ? Math.floor((passFile / totalItems) * 100) : 0;

      const chartContainer = document.getElementById(element);
      const mainParent = chartContainer?.parentNode?.parentNode?.parentNode;
      if (mainParent) {
        mainParent.querySelector(".totalFileCount").textContent = totalItems;
        mainParent.querySelector(".error").textContent = totalErrors;
        mainParent.querySelector(".warning").textContent = totalWarnings;

        mainParent.querySelector(".fileError").textContent = fileWithErrors;
        mainParent.querySelector(".fileSuccess").textContent = passFile;
        mainParent.querySelector(".fileWarning").textContent =
          fileWithOnlyWarnings;
      }

      if (chartContainer && typeof ApexCharts !== "undefined") {
        mainParent?.querySelector(".loader").classList.add("hidden");
        mainParent?.querySelector(".content").classList.remove("hidden");
        const chart = new ApexCharts(
          chartContainer,
          getChartOptions(
            percentageWithErrors,
            percentagePassFile,
            percentageOnlyWarnings
          )
        );
        chart.render();
      }
    };

    updateChartWithData("eslint", "js-pie-chart");
    updateChartWithData("stylelint", "scss-pie-chart");
  };

  const eslintDom = () => {
    document
      .getElementById("jsAuditReport")
      .addEventListener("click", function (event) {
        event.preventDefault();
        hideChartCards();
        const npmReport = document.getElementById("npmReport");
        if (npmReport) npmReport.style.display = "none";
        fetchData("eslint")
          .then((data) => renderAccordion(data))
          .catch((error) => console.error("Error fetching data:", error));
      });
  };

  const globalInit = () => {
    const dashboardMainLink = document.getElementById("mainPage");
    dashboardMainLink.addEventListener("click", (event) => {
      event.preventDefault();
      location.reload();
    });

    // Dynamically show/hide menu items based on available reports
    const menuChecks = [
      { id: 'jsAuditReport', file: 'eslint-report.json' },
      { id: 'scssAuditReport', file: 'stylelint-report.json' },
      { id: 'npmPackagesReport', file: 'npm-report.json' },
      // Comprehensive Audits
      { id: 'securityAuditReport', file: 'security-audit-report.json' },
      { id: 'performanceAuditReport', file: 'performance-audit-report.json' },
      { id: 'accessibilityAuditReport', file: 'accessibility-audit-report.json' },
      { id: 'testingAuditReport', file: 'testing-audit-report.json' },
      { id: 'dependencyAuditReport', file: 'dependency-audit-report.json' },
      { id: 'comprehensiveAuditReport', file: 'comprehensive-audit-report.json' },
    ];
    menuChecks.forEach(({ id, file }) => {
      fetch(`./${file}`, { method: 'HEAD' })
        .then((res) => {
          if (!res.ok) {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
          }
        })
        .catch(() => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        });
    });
  };

  /* eslint-disable no-undef */

  const packageReportInit = () => {
    const npmReportTable = document.getElementById("packagesInfo");
    const npmdevReportTable = document.getElementById("devpackagesInfo");

    document
      .getElementById("npmPackagesReport")
      .addEventListener("click", async (event) => {
        event.preventDefault();
        hideChartCards();
        const accordionContent = document.getElementById("accordionContent");
        if (accordionContent) accordionContent.classList.add("hidden");
        const npmReportSection = document.getElementById("npmReport");
        if (npmReportSection) {
          npmReportSection.classList.remove("hidden");
          npmReportSection.style.display = "block";
        }
        const data = await fetchData("npm");
        console.log(data);
        if (data.dependencies.length) {
          renderTable(data.dependencies, npmReportTable);
        }
        if (data.dependencies.length) {
          renderTable(data.devDependencies, npmdevReportTable);
        }
      });
  };

  const stylelintDom = () => {
    document
      .getElementById("scssAuditReport")
      .addEventListener("click", function (event) {
        event.preventDefault();
        hideChartCards();
        const npmReport = document.getElementById("npmReport");
        if (npmReport) npmReport.style.display = "none";
        fetchData("stylelint")
          .then((data) => renderAccordion(data))
          .catch((error) => console.error("Error fetching data:", error));
      });
  };

  const REPORTS = [
    { id: 'jsAuditReport', section: 'eslintSection', type: 'eslint', search: 'eslintSearch', pagination: 'eslintPagination', table: 'eslintTableWrap' },
    { id: 'scssAuditReport', section: 'stylelintSection', type: 'stylelint', search: 'stylelintSearch', pagination: 'stylelintPagination', table: 'stylelintTableWrap' },
    { id: 'npmPackagesReport', section: 'npmSection', type: 'npm', search: 'npmSearch', pagination: 'npmPagination', table: 'npmTableWrap' },
    // Comprehensive Audits
    { id: 'securityAuditReport', section: 'securitySection', type: 'security-audit', search: 'securitySearch', pagination: 'securityPagination', table: 'securityTableWrap' },
    { id: 'performanceAuditReport', section: 'performanceSection', type: 'performance-audit', search: 'performanceSearch', pagination: 'performancePagination', table: 'performanceTableWrap' },
    { id: 'accessibilityAuditReport', section: 'accessibilitySection', type: 'accessibility-audit', search: 'accessibilitySearch', pagination: 'accessibilityPagination', table: 'accessibilityTableWrap' },
    { id: 'testingAuditReport', section: 'testingSection', type: 'testing-audit', search: 'testingSearch', pagination: 'testingPagination', table: 'testingTableWrap' },
    { id: 'dependencyAuditReport', section: 'dependencySection', type: 'dependency-audit', search: 'dependencySearch', pagination: 'dependencyPagination', table: 'dependencyTableWrap' },
    { id: 'comprehensiveAuditReport', section: 'comprehensiveSection', type: 'comprehensive-audit', search: null, pagination: null, table: 'comprehensiveTableWrap' },
  ];

  // Utility to show/hide sections
  function showSection(id) {
    ['overviewSection', ...REPORTS.map(r => r.section)].forEach(sec => {
      const el = document.getElementById(sec);
      if (el) el.classList.add('hidden');
    });
    const showEl = document.getElementById(id);
    if (showEl) showEl.classList.remove('hidden');
  }

  function setActiveSidebar(id) {
    document.querySelectorAll('#sidebarMenu a').forEach(a => a.classList.remove('bg-blue-100', 'font-bold'));
    const el = document.getElementById(id);
    if (el) el.classList.add('bg-blue-100', 'font-bold');
  }

  // Render project meta info
  function renderProjectMeta(meta) {
    const metaDiv = document.getElementById('projectMeta');
    if (metaDiv && meta) {
      metaDiv.textContent = `Project Type: ${meta.projectType || 'N/A'} | Reports: ${(meta.reports || []).join(', ')}`;
    }
  }

  // Render comprehensive audit overview
  function renderComprehensiveOverview(comprehensiveData) {
    if (!comprehensiveData || !comprehensiveData.categories) return;

    const categories = comprehensiveData.categories;
    
    // Update individual audit totals
    const securityTotal = document.getElementById('securityTotal');
    const performanceTotal = document.getElementById('performanceTotal');
    const accessibilityTotal = document.getElementById('accessibilityTotal');
    const testingTotal = document.getElementById('testingTotal');
    const dependencyTotal = document.getElementById('dependencyTotal');

    if (securityTotal && categories.security) {
      securityTotal.textContent = categories.security.totalIssues || 0;
    }
    if (performanceTotal && categories.performance) {
      performanceTotal.textContent = categories.performance.totalIssues || 0;
    }
    if (accessibilityTotal && categories.accessibility) {
      accessibilityTotal.textContent = categories.accessibility.totalIssues || 0;
    }
    if (testingTotal && categories.testing) {
      testingTotal.textContent = categories.testing.totalIssues || 0;
    }
    if (dependencyTotal && categories.dependency) {
      dependencyTotal.textContent = categories.dependency.totalIssues || 0;
    }
  }

  // Render overview charts
  function renderOverviewCharts(eslintData, stylelintData, npmData, comprehensiveData) {
    // ESLint Pie
    const eslintTotalEl = document.getElementById('overviewEslintTotal');
    if (eslintData && Array.isArray(eslintData.results) && document.querySelector('#overviewEslintChart')) {
      const totalFiles = eslintData.results.length;
      const errorFiles = Array.isArray(eslintData.results) ? eslintData.results.filter(f => f.errorCount > 0).length : 0;
      const warningFiles = Array.isArray(eslintData.results) ? eslintData.results.filter(f => f.errorCount === 0 && f.warningCount > 0).length : 0;
      const passFiles = Array.isArray(eslintData.results) ? eslintData.results.filter(f => f.errorCount === 0 && f.warningCount === 0).length : 0;
      const options = {
        chart: { type: 'pie', height: 250 },
        labels: ['Files with Errors', 'Files with Warnings', 'Files Passed'],
        series: [errorFiles, warningFiles, passFiles],
        colors: ['#f87171', '#fbbf24', '#34d399'],
      };
      new ApexCharts(document.querySelector('#overviewEslintChart'), options).render();
      if (eslintTotalEl) eslintTotalEl.textContent = `Total JS files: ${totalFiles}`;
    } else if (eslintTotalEl) {
      eslintTotalEl.textContent = '';
    }
    // Stylelint Pie
    const stylelintTotalEl = document.getElementById('overviewStylelintTotal');
    if (Array.isArray(stylelintData) && document.querySelector('#overviewStylelintChart')) {
      const totalFiles = stylelintData.length;
      const errorFiles = stylelintData.filter(f => f.errorCount > 0).length;
      const warningFiles = stylelintData.filter(f => f.errorCount === 0 && f.warningCount > 0).length;
      const passFiles = stylelintData.filter(f => f.errorCount === 0 && f.warningCount === 0).length;
      const options = {
        chart: { type: 'pie', height: 250 },
        labels: ['Files with Errors', 'Files with Warnings', 'Files Passed'],
        series: [errorFiles, warningFiles, passFiles],
        colors: ['#f87171', '#fbbf24', '#34d399'],
      };
      new ApexCharts(document.querySelector('#overviewStylelintChart'), options).render();
      if (stylelintTotalEl) stylelintTotalEl.textContent = `Total CSS files: ${totalFiles}`;
    } else if (stylelintTotalEl) {
      stylelintTotalEl.textContent = '';
    }
    // NPM Packages Overview Card (Stylelint-style)
    const npmTotalPackagesEl = document.getElementById('npmTotalPackages');
    const npmPackagesChartEl = document.getElementById('npmPackagesChart');

    if (npmData && (Array.isArray(npmData.dependencies) || Array.isArray(npmData.devDependencies))) {
      const deps = Array.isArray(npmData.dependencies) ? npmData.dependencies : [];
      const devDeps = Array.isArray(npmData.devDependencies) ? npmData.devDependencies : [];
      const all = deps.concat(devDeps);
      const total = all.length;
      const outdated = all.filter(pkg => pkg.deprecated && pkg.deprecated !== 'Not deprecated').length;
      if (npmTotalPackagesEl) npmTotalPackagesEl.textContent = `Total packages: ${total}`;
      // Pie chart: Up-to-date vs Outdated
      if (npmPackagesChartEl) {
        npmPackagesChartEl.innerHTML = '';
        const upToDate = total - outdated;
        const options = {
          chart: { type: 'pie', height: 250 },
          labels: ['Up-to-date', 'Outdated'],
          series: [upToDate, outdated],
          colors: ['#34d399', '#fbbf24'],
          legend: { show: true },
          dataLabels: { enabled: true, formatter: val => `${val.toFixed(1)}%` },
        };
        new ApexCharts(npmPackagesChartEl, options).render();
      }
    } else {
      if (npmTotalPackagesEl) npmTotalPackagesEl.textContent = '';
      if (npmPackagesChartEl) npmPackagesChartEl.innerHTML = '';
    }

    // Render comprehensive overview
    renderComprehensiveOverview(comprehensiveData);
  }

  // Utility to check if a report file exists (by trying to fetch it with HEAD)
  async function reportExists(type) {
    try {
      const res = await fetch(`./${type}-report.json`, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Hide sidebar tab and section if report is missing
  function hideReportTabAndSection(report) {
    const tab = document.getElementById(report.id);
    const section = document.getElementById(report.section);
    if (tab) tab.style.display = 'none';
    if (section) section.classList.add('hidden');
  }

  // Render audit table for comprehensive audits
  window.renderAuditTable = function(data, tableId, paginationId, pageSize = 10, auditType = null) {
    const wrap = document.getElementById(tableId);
    if (!wrap) return;

    // Store data globally for pagination
    if (auditType) {
      window.auditData[auditType] = data;
      if (!window.auditPages[auditType]) {
        window.auditPages[auditType] = 1;
      }
    }

    wrap.innerHTML = '';
    if (!data || !Array.isArray(data.issues) || data.issues.length === 0) {
      wrap.innerHTML = '<div class="text-gray-500 p-4">No issues found.</div>';
      if (paginationId) document.getElementById(paginationId).innerHTML = '';
      return;
    }

    // Paginate the data
    const currentPage = auditType ? window.auditPages[auditType] : 1;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = data.issues.slice(start, end);

    // Create table with horizontal scroll
    let html = '<div class="overflow-x-auto"><table class="min-w-full bg-white rounded-lg overflow-hidden"><thead><tr>' +
      '<th class="py-2 px-4 text-left">Type</th>' +
      '<th class="py-2 px-4 text-left">File</th>' +
      '<th class="py-2 px-4 text-left">Line</th>' +
      '<th class="py-2 px-4 text-left">Severity</th>' +
      '<th class="py-2 px-4 text-left">Message</th>' +
      '<th class="py-2 px-4 text-left">Code</th>' +
      '</tr></thead><tbody>';

    // Map type to label and color (move outside loop)
    const vulnLabels = {
      hardcoded_secret: { label: 'Hardcoded Secret', color: 'bg-pink-100 text-pink-800 border-pink-200' },
      unsafe_eval: { label: 'Unsafe Eval', color: 'bg-red-100 text-red-800 border-red-200' },
      xss_vulnerability: { label: 'XSS', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      sql_injection: { label: 'SQL Injection', color: 'bg-purple-100 text-purple-800 border-purple-200' },
      dependency_vulnerability: { label: 'Dependency Vulnerability', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      no_vulnerabilities: { label: 'No Vulnerabilities', color: 'bg-green-100 text-green-800 border-green-200' },
      color_contrast: { label: 'Color Contrast', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      missing_form_label: { label: 'Missing Form Label', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
      // Add more as needed
    };

    pageData.forEach(issue => {
      const severityColor = issue.severity === 'high' ? 'text-red-600' : 
                           issue.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600';
      const vuln = vulnLabels[issue.type] || { label: issue.type, color: 'bg-gray-100 text-gray-800 border-gray-200' };

      // Format the code snippet and vulnerability label
      let codeDisplay = 'N/A';
      if (issue.code) {
        const isMultiline = issue.code.includes('\n') || issue.code.length > 80;
        codeDisplay = `<span class="inline-block mb-1 px-2 py-0.5 rounded border text-xs font-semibold ${vuln.color}">${vuln.label}</span><br>`;
        if (isMultiline) {
          codeDisplay += `<pre class="bg-red-50 px-2 py-1 rounded text-xs font-mono text-red-700 border border-red-200 break-all overflow-x-auto max-w-md block">${issue.code}</pre>`;
        } else {
          codeDisplay += `<code class="bg-red-50 px-2 py-1 rounded text-sm font-mono text-red-700 border border-red-200 break-all overflow-x-auto max-w-md block">${issue.code}</code>`;
        }
        // Add context if available
        if (issue.context) {
          codeDisplay += `<details class="mt-2"><summary class="text-xs text-blue-600 cursor-pointer">Show context</summary><pre class="mt-1 text-xs bg-gray-50 p-2 rounded border overflow-x-auto break-all max-w-md">${issue.context}</pre></details>`;
        }
      }
      
      html += `<tr class="border-b border-gray-200 hover:bg-gray-100">` +
        `<td class="py-2 px-4 max-w-xs break-all">${vuln.label}</td>` +
        `<td class="py-2 px-4 max-w-xs break-all">${issue.file || 'N/A'}</td>` +
        `<td class="py-2 px-4">${issue.line || 'N/A'}</td>` +
        `<td class="py-2 px-4"><span class="font-semibold ${severityColor}">${issue.severity || 'N/A'}</span></td>` +
        `<td class="py-2 px-4 max-w-md break-words">${issue.message || 'N/A'}</td>` +
        `<td class="py-2 px-4 max-w-md">${codeDisplay}</td>` +
        '</tr>';
    });

    html += '</tbody></table></div>';
    wrap.innerHTML = html;

    // Render pagination if needed
    if (paginationId && auditType) {
      renderPagination(data.issues.length, pageSize, paginationId, auditType);
    }
  };

  // Render pagination controls
  // Global pagination state for comprehensive audits
  window.auditPages = {};
  window.auditData = {};

  function renderPagination(totalItems, pageSize, paginationId, auditType) {
    const pagDiv = document.getElementById(paginationId);
    if (!pagDiv) return;

    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) {
      pagDiv.innerHTML = '';
      return;
    }

    let html = '<div class="flex items-center space-x-2">';
    html += '<span class="text-sm text-gray-500">Page:</span>';
    
    for (let i = 1; i <= totalPages; i++) {
      const isActive = window.auditPages[auditType] === i;
      html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${isActive ? 'bg-blue-100' : ''}" onclick="window.auditPages['${auditType}'] = ${i}; window.renderAuditTable(window.auditData['${auditType}'], '${auditType}TableWrap', '${paginationId}', ${pageSize}, '${auditType}');">${i}</button>`;
    }
    
    html += '</div>';
    pagDiv.innerHTML = html;
  }

  // Main dashboard logic
  window.addEventListener('DOMContentLoaded', async () => {
    // Check which reports exist and hide missing ones
    const reportExistence = {};
    for (const report of REPORTS) {
      reportExistence[report.type] = await reportExists(report.type);
      if (!reportExistence[report.type]) {
        hideReportTabAndSection(report);
      }
    }

    // Fetch data for overview charts only for available reports
    const eslintData = reportExistence['eslint'] ? await fetchData('eslint') : null;
    const stylelintData = reportExistence['stylelint'] ? await fetchData('stylelint') : null;
    const npmData = reportExistence['npm'] ? await fetchData('npm') : null;
    const comprehensiveData = reportExistence['comprehensive-audit'] ? await fetchData('comprehensive-audit') : null;

    // Project meta
    let meta = null;
    if (eslintData && typeof eslintData === 'object' && ('projectType' in eslintData || 'reports' in eslintData)) {
      meta = eslintData;
    }
    renderProjectMeta(meta);

    // Render overview charts
    renderOverviewCharts(eslintData, stylelintData, npmData, comprehensiveData);

    // Sidebar navigation
    document.getElementById('mainPage').addEventListener('click', e => {
      e.preventDefault();
      setActiveSidebar('mainPage');
      showSection('overviewSection');
    });

    // Only add listeners and render for available reports
    if (reportExistence['eslint']) {
      // ESLint Table State
      let eslintFiltered = [];
      window.eslintPage = 1;
      const ESLINT_PAGE_SIZE = 10;
      let eslintSearchTerm = '';

      // Render ESLint Table (Accordion)
      window.renderEslintTable = function() {
        const wrap = document.getElementById('eslintTableWrap');
        if (!wrap) return;
        wrap.innerHTML = '';
        if (!eslintData || !Array.isArray(eslintData.results) || eslintFiltered.length === 0) {
          wrap.innerHTML = '<div class="text-gray-500 p-4">No ESLint results found.</div>';
          document.getElementById('eslintPagination').innerHTML = '';
          return;
        }
        // Paginate
        const start = (window.eslintPage - 1) * ESLINT_PAGE_SIZE;
        const end = start + ESLINT_PAGE_SIZE;
        const pageData = eslintFiltered.slice(start, end);
        // Accordion container
        const accordion = document.createElement('div');
        accordion.id = 'eslintAccordion';
        pageData.forEach(item => {
          const acc = window.createAccordionItem
            ? window.createAccordionItem(item.filePath, item.errorCount, item.warningCount, item.messages)
            : undefined;
          if (acc) accordion.appendChild(acc);
        });
        wrap.appendChild(accordion);
        renderEslintPagination();
      };

      // Render Pagination Controls
      window.renderEslintPagination = function() {
        const pagDiv = document.getElementById('eslintPagination');
        if (!pagDiv) return;
        if (!eslintFiltered || eslintFiltered.length <= ESLINT_PAGE_SIZE) {
          pagDiv.innerHTML = '';
          return;
        }
        const totalPages = Math.ceil(eslintFiltered.length / ESLINT_PAGE_SIZE);
        let html = '<div class="flex items-center space-x-2">';
        html += '<span class="text-sm text-gray-500">Page:</span>';
        for (let i = 1; i <= totalPages; i++) {
          html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${i === window.eslintPage ? 'bg-blue-100' : ''}" onclick="window.eslintPage = ${i}; window.renderEslintTable();">${i}</button>`;
        }
        html += '</div>';
        pagDiv.innerHTML = html;
      };

      // Search logic
      function filterEslintData() {
        if (!eslintData || !Array.isArray(eslintData.results)) {
          eslintFiltered = [];
          return;
        }
        if (!eslintSearchTerm) {
          eslintFiltered = eslintData.results;
        } else {
          const term = eslintSearchTerm.toLowerCase();
          eslintFiltered = eslintData.results.filter(item => item.filePath && item.filePath.toLowerCase().includes(term));
        }
        window.eslintPage = 1;
      }

      // Expose createAccordionItem globally if not already
      if (!window.createAccordionItem) {
        Promise.resolve().then(function () { return helper; }).then(mod => { window.createAccordionItem = mod.createAccordionItem; });
      }

      // Event: ESLint tab click
      document.getElementById('jsAuditReport').addEventListener('click', e => {
        e.preventDefault();
        setActiveSidebar('jsAuditReport');
        showSection('eslintSection');
        filterEslintData();
        renderEslintTable();
      });

      // Event: Search
      const searchInput = document.getElementById('eslintSearch');
      if (searchInput) {
        searchInput.addEventListener('input', e => {
          eslintSearchTerm = e.target.value;
          filterEslintData();
          renderEslintTable();
        });
      }
    }

    if (reportExistence['stylelint']) {
      // Stylelint Table State
      let stylelintFiltered = [];
      window.stylelintPage = 1;
      const STYLELINT_PAGE_SIZE = 10;
      let stylelintSearchTerm = '';

      window.renderStylelintTable = function() {
        const wrap = document.getElementById('stylelintTableWrap');
        if (!wrap) return;
        wrap.innerHTML = '';
        if (!Array.isArray(stylelintData) || stylelintFiltered.length === 0) {
          wrap.innerHTML = '<div class="text-gray-500 p-4">No Stylelint results found.</div>';
          document.getElementById('stylelintPagination').innerHTML = '';
          return;
        }
        // Paginate
        const start = (window.stylelintPage - 1) * STYLELINT_PAGE_SIZE;
        const end = start + STYLELINT_PAGE_SIZE;
        const pageData = stylelintFiltered.slice(start, end);
        // Accordion container
        const accordion = document.createElement('div');
        accordion.id = 'stylelintAccordion';
        pageData.forEach(item => {
          const acc = window.createAccordionItem
            ? window.createAccordionItem(item.filePath, item.errorCount, item.warningCount, item.messages)
            : undefined;
          if (acc) accordion.appendChild(acc);
        });
        wrap.appendChild(accordion);
        renderStylelintPagination();
      };

      window.renderStylelintPagination = function() {
        const pagDiv = document.getElementById('stylelintPagination');
        if (!pagDiv) return;
        if (!stylelintFiltered || stylelintFiltered.length <= STYLELINT_PAGE_SIZE) {
          pagDiv.innerHTML = '';
          return;
        }
        const totalPages = Math.ceil(stylelintFiltered.length / STYLELINT_PAGE_SIZE);
        let html = '<div class="flex items-center space-x-2">';
        html += '<span class="text-sm text-gray-500">Page:</span>';
        for (let i = 1; i <= totalPages; i++) {
          html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${i === window.stylelintPage ? 'bg-blue-100' : ''}" onclick="window.stylelintPage = ${i}; window.renderStylelintTable();">${i}</button>`;
        }
        html += '</div>';
        pagDiv.innerHTML = html;
      };

      function filterStylelintData() {
        if (!Array.isArray(stylelintData)) {
          stylelintFiltered = [];
          return;
        }
        if (!stylelintSearchTerm) {
          stylelintFiltered = stylelintData;
        } else {
          const term = stylelintSearchTerm.toLowerCase();
          stylelintFiltered = stylelintData.filter(item => item.filePath && item.filePath.toLowerCase().includes(term));
        }
        window.stylelintPage = 1;
      }

      // Expose createAccordionItem globally if not already
      if (!window.createAccordionItem) {
        Promise.resolve().then(function () { return helper; }).then(mod => { window.createAccordionItem = mod.createAccordionItem; });
      }

      document.getElementById('scssAuditReport').addEventListener('click', e => {
        e.preventDefault();
        setActiveSidebar('scssAuditReport');
        showSection('stylelintSection');
        filterStylelintData();
        renderStylelintTable();
      });

      const searchInput = document.getElementById('stylelintSearch');
      if (searchInput) {
        searchInput.addEventListener('input', e => {
          stylelintSearchTerm = e.target.value;
          filterStylelintData();
          renderStylelintTable();
        });
      }
    }

    if (reportExistence['npm']) {
      // NPM Table State
      let npmFiltered = [];
      window.npmPage = 1;
      const NPM_PAGE_SIZE = 10;
      let npmSearchTerm = '';
      let npmType = 'dependencies'; // or 'devDependencies'

      window.renderNpmTable = function() {
        const wrap = document.getElementById('npmTableWrap');
        if (!wrap) return;
        wrap.innerHTML = '';
        // Add toggle for dependencies/devDependencies
        let toggleHtml = '<div class="mb-4 flex space-x-2">';
        toggleHtml += `<button id="npmDepBtn" class="px-3 py-1 rounded ${npmType === 'dependencies' ? 'bg-blue-500 text-white' : 'bg-gray-200'}">Dependencies</button>`;
        toggleHtml += `<button id="npmDevDepBtn" class="px-3 py-1 rounded ${npmType === 'devDependencies' ? 'bg-blue-500 text-white' : 'bg-gray-200'}">Dev Dependencies</button>`;
        toggleHtml += '</div>';
        wrap.innerHTML = toggleHtml;
        const dataArr = Array.isArray(npmData[npmType]) ? npmFiltered : [];
        if (dataArr.length === 0) {
          wrap.innerHTML += '<div class="text-gray-500 p-4">No NPM packages found.</div>';
          document.getElementById('npmPagination').innerHTML = '';
          return;
        }
        // Paginate
        const start = (window.npmPage - 1) * NPM_PAGE_SIZE;
        const end = start + NPM_PAGE_SIZE;
        const pageData = dataArr.slice(start, end);
        // Table with horizontal scroll
        let html = '<div class="overflow-x-auto"><table class="min-w-full bg-white rounded-lg overflow-hidden"><thead><tr>' +
          '<th class="py-2 px-4 text-left">Name</th>' +
          '<th class="py-2 px-4 text-left">Version</th>' +
          '<th class="py-2 px-4 text-left">License</th>' +
          '<th class="py-2 px-4 text-left">Description</th>' +
          '<th class="py-2 px-4 text-left">Deprecated</th>' +
          '<th class="py-2 px-4 text-left">Unpacked Size</th>' +
          '</tr></thead><tbody>';
        pageData.forEach(item => {
          html += `<tr class="border-b border-gray-200 hover:bg-gray-100 ${item.deprecated === 'Deprecated' ? 'bg-red-100' : ''}">` +
            `<td class="py-2 px-4 whitespace-nowrap">${item.name}</td>` +
            `<td class="py-2 px-4">${item.version}</td>` +
            `<td class="py-2 px-4">${item.license}</td>` +
            `<td class="py-2 px-4">${item.description}</td>` +
            `<td class="py-2 px-4">${item.deprecated}</td>` +
            `<td class="py-2 px-4">${item.unpackedSize}</td>` +
            '</tr>';
        });
        html += '</tbody></table></div>';
        wrap.innerHTML += html;
        renderNpmPagination();
        // Toggle events
        document.getElementById('npmDepBtn').onclick = () => {
          if (npmType !== 'dependencies') {
            npmType = 'dependencies';
            filterNpmData();
            renderNpmTable();
          }
        };
        document.getElementById('npmDevDepBtn').onclick = () => {
          if (npmType !== 'devDependencies') {
            npmType = 'devDependencies';
            filterNpmData();
            renderNpmTable();
          }
        };
      };

      window.renderNpmPagination = function() {
        const pagDiv = document.getElementById('npmPagination');
        if (!pagDiv) return;
        const dataArr = Array.isArray(npmData[npmType]) ? npmFiltered : [];
        if (dataArr.length <= NPM_PAGE_SIZE) {
          pagDiv.innerHTML = '';
          return;
        }
        const totalPages = Math.ceil(dataArr.length / NPM_PAGE_SIZE);
        let html = '<div class="flex items-center space-x-2">';
        html += '<span class="text-sm text-gray-500">Page:</span>';
        for (let i = 1; i <= totalPages; i++) {
          html += `<button class="px-2 py-1 text-sm border rounded hover:bg-blue-50 ${i === window.npmPage ? 'bg-blue-100' : ''}" onclick="window.npmPage = ${i}; window.renderNpmTable();">${i}</button>`;
        }
        html += '</div>';
        pagDiv.innerHTML = html;
      };

      function filterNpmData() {
        if (!npmData || !Array.isArray(npmData[npmType])) {
          npmFiltered = [];
          return;
        }
        if (!npmSearchTerm) {
          npmFiltered = npmData[npmType];
        } else {
          const term = npmSearchTerm.toLowerCase();
          npmFiltered = npmData[npmType].filter(item => item.name && item.name.toLowerCase().includes(term));
        }
        window.npmPage = 1;
      }

      document.getElementById('npmPackagesReport').addEventListener('click', e => {
        e.preventDefault();
        setActiveSidebar('npmPackagesReport');
        showSection('npmSection');
        filterNpmData();
        renderNpmTable();
      });

      const searchInput = document.getElementById('npmSearch');
      if (searchInput) {
        searchInput.addEventListener('input', e => {
          npmSearchTerm = e.target.value;
          filterNpmData();
          renderNpmTable();
        });
      }
    }

    // Add comprehensive audit event listeners
    const auditTypes = ['security', 'performance', 'accessibility', 'testing', 'dependency'];
    
    auditTypes.forEach(type => {
      if (reportExistence[`${type}-audit`]) {
        const reportId = `${type}AuditReport`;
        const sectionId = `${type}Section`;
        
        document.getElementById(reportId).addEventListener('click', async (e) => {
          e.preventDefault();
          setActiveSidebar(reportId);
          showSection(sectionId);
          
          try {
            const data = await fetchData(`${type}-audit`);
            renderAuditTable(data, `${type}TableWrap`, `${type}Pagination`, 10, type);
          } catch (error) {
            console.error(`Error loading ${type} audit:`, error);
            document.getElementById(`${type}TableWrap`).innerHTML = '<div class="text-red-500 p-4">Error loading audit data.</div>';
          }
        });

        // Add search functionality
        const searchInput = document.getElementById(`${type}Search`);
        if (searchInput) {
          searchInput.addEventListener('input', async (e) => {
            try {
              const data = await fetchData(`${type}-audit`);
              const searchTerm = e.target.value.toLowerCase();
              
              if (searchTerm) {
                const filteredData = {
                  ...data,
                  issues: data.issues.filter(issue => 
                    issue.message?.toLowerCase().includes(searchTerm) ||
                    issue.file?.toLowerCase().includes(searchTerm) ||
                    issue.type?.toLowerCase().includes(searchTerm)
                  )
                };
                renderAuditTable(filteredData, `${type}TableWrap`, `${type}Pagination`, 10, type);
              } else {
                renderAuditTable(data, `${type}TableWrap`, `${type}Pagination`, 10, type);
              }
            } catch (error) {
              console.error(`Error filtering ${type} audit:`, error);
            }
          });
        }
      }
    });

    // Comprehensive audit report
    if (reportExistence['comprehensive-audit']) {
      document.getElementById('comprehensiveAuditReport').addEventListener('click', async (e) => {
        e.preventDefault();
        setActiveSidebar('comprehensiveAuditReport');
        showSection('comprehensiveSection');
        
        try {
          const data = await fetchData('comprehensive-audit');
          const wrap = document.getElementById('comprehensiveTableWrap');
          
          if (!data || !data.categories) {
            wrap.innerHTML = '<div class="text-gray-500 p-4">No comprehensive audit data found.</div>';
            return;
          }

          let html = '<div class="space-y-6">';
          
          // Summary section
          if (data.summary) {
            html += '<div class="bg-white rounded-lg shadow p-6">';
            html += '<h3 class="text-lg font-semibold mb-4">📊 Audit Summary</h3>';
            html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4">';
            html += `<div class="text-center"><div class="text-2xl font-bold text-red-600">${data.summary.highSeverity || 0}</div><div class="text-sm text-gray-500">High Severity</div></div>`;
            html += `<div class="text-center"><div class="text-2xl font-bold text-yellow-600">${data.summary.mediumSeverity || 0}</div><div class="text-sm text-gray-500">Medium Severity</div></div>`;
            html += `<div class="text-center"><div class="text-2xl font-bold text-blue-600">${data.summary.lowSeverity || 0}</div><div class="text-sm text-gray-500">Low Severity</div></div>`;
            html += `<div class="text-center"><div class="text-2xl font-bold text-green-600">${data.summary.totalIssues || 0}</div><div class="text-sm text-gray-500">Total Issues</div></div>`;
            html += '</div></div>';
          }

          // Categories breakdown
          html += '<div class="bg-white rounded-lg shadow p-6">';
          html += '<h3 class="text-lg font-semibold mb-4">📋 Category Breakdown</h3>';
          
          Object.entries(data.categories).forEach(([category, categoryData]) => {
            if (categoryData && categoryData.totalIssues !== undefined) {
              const icon = category === 'security' ? '🔒' : 
                          category === 'performance' ? '⚡' : 
                          category === 'accessibility' ? '♿' : 
                          category === 'testing' ? '🧪' : 
                          category === 'dependency' ? '📦' : '📋';
              
              html += `<div class="border-b border-gray-200 py-3 last:border-b-0">`;
              html += `<div class="flex items-center justify-between">`;
              html += `<div class="flex items-center space-x-2">`;
              html += `<span class="text-lg">${icon}</span>`;
              html += `<span class="font-medium capitalize">${category}</span>`;
              html += `</div>`;
              html += `<div class="text-right">`;
              html += `<div class="text-lg font-bold">${categoryData.totalIssues}</div>`;
              html += `<div class="text-sm text-gray-500">issues</div>`;
              html += `</div>`;
              html += `</div>`;
              html += `</div>`;
            }
          });
          
          html += '</div></div>';
          wrap.innerHTML = html;
        } catch (error) {
          console.error('Error loading comprehensive audit:', error);
          document.getElementById('comprehensiveTableWrap').innerHTML = '<div class="text-red-500 p-4">Error loading comprehensive audit data.</div>';
        }
      });
    }

    // Show overview by default
    setActiveSidebar('mainPage');
    showSection('overviewSection');
  });

  /* eslint-disable no-undef */

  document.addEventListener("DOMContentLoaded", () => {
    chartInit();
    eslintDom();
    stylelintDom();
    globalInit();
    packageReportInit();
    // componentUsageDom();
  });

})();
