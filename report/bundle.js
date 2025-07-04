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
    // Add component usage here if needed
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

  // Render overview charts
  function renderOverviewCharts(eslintData, stylelintData, npmData) {
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
    // NPM Total (no chart)
    const npmTotalEl = document.getElementById('overviewNpmTotal');
    if (npmData && (Array.isArray(npmData.dependencies) || Array.isArray(npmData.devDependencies))) {
      const depCount = Array.isArray(npmData.dependencies) ? npmData.dependencies.length : 0;
      const devDepCount = Array.isArray(npmData.devDependencies) ? npmData.devDependencies.length : 0;
      if (npmTotalEl) npmTotalEl.textContent = `Total packages: ${depCount + devDepCount}`;
    } else if (npmTotalEl) {
      npmTotalEl.textContent = '';
    }
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

    // Project meta
    let meta = null;
    if (eslintData && typeof eslintData === 'object' && ('projectType' in eslintData || 'reports' in eslintData)) {
      meta = eslintData;
    }
    renderProjectMeta(meta);

    // Render overview charts
    renderOverviewCharts(eslintData, stylelintData, npmData);

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
      let eslintPage = 1;
      const ESLINT_PAGE_SIZE = 10;
      let eslintSearchTerm = '';

      // Render ESLint Table (Accordion)
      function renderEslintTable() {
        const wrap = document.getElementById('eslintTableWrap');
        if (!wrap) return;
        wrap.innerHTML = '';
        if (!eslintData || !Array.isArray(eslintData.results) || eslintFiltered.length === 0) {
          wrap.innerHTML = '<div class="text-gray-500 p-4">No ESLint results found.</div>';
          document.getElementById('eslintPagination').innerHTML = '';
          return;
        }
        // Paginate
        const start = (eslintPage - 1) * ESLINT_PAGE_SIZE;
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
      }

      // Render Pagination Controls
      function renderEslintPagination() {
        const pagDiv = document.getElementById('eslintPagination');
        if (!pagDiv) return;
        if (!eslintFiltered || eslintFiltered.length <= ESLINT_PAGE_SIZE) {
          pagDiv.innerHTML = '';
          return;
        }
        const totalPages = Math.ceil(eslintFiltered.length / ESLINT_PAGE_SIZE);
        let html = '<div class="flex space-x-1">';
        html += `<button class="px-2 py-1 rounded ${eslintPage === 1 ? 'bg-gray-200' : 'bg-blue-100'}" ${eslintPage === 1 ? 'disabled' : ''} id="eslintPrev">Prev</button>`;
        for (let i = 1; i <= totalPages; i++) {
          html += `<button class="px-2 py-1 rounded ${eslintPage === i ? 'bg-blue-500 text-white' : 'bg-blue-100'}" data-page="${i}">${i}</button>`;
        }
        html += `<button class="px-2 py-1 rounded ${eslintPage === totalPages ? 'bg-gray-200' : 'bg-blue-100'}" ${eslintPage === totalPages ? 'disabled' : ''} id="eslintNext">Next</button>`;
        html += '</div>';
        pagDiv.innerHTML = html;
        // Pagination events
        document.getElementById('eslintPrev')?.addEventListener('click', () => { if (eslintPage > 1) { eslintPage--; renderEslintTable(); } });
        document.getElementById('eslintNext')?.addEventListener('click', () => { if (eslintPage < totalPages) { eslintPage++; renderEslintTable(); } });
        pagDiv.querySelectorAll('button[data-page]').forEach(btn => {
          btn.addEventListener('click', e => {
            eslintPage = parseInt(e.target.getAttribute('data-page'));
            renderEslintTable();
          });
        });
      }

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
        eslintPage = 1;
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
      let stylelintPage = 1;
      const STYLELINT_PAGE_SIZE = 10;
      let stylelintSearchTerm = '';

      function renderStylelintTable() {
        const wrap = document.getElementById('stylelintTableWrap');
        if (!wrap) return;
        wrap.innerHTML = '';
        if (!Array.isArray(stylelintData) || stylelintFiltered.length === 0) {
          wrap.innerHTML = '<div class="text-gray-500 p-4">No Stylelint results found.</div>';
          document.getElementById('stylelintPagination').innerHTML = '';
          return;
        }
        // Paginate
        const start = (stylelintPage - 1) * STYLELINT_PAGE_SIZE;
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
      }

      function renderStylelintPagination() {
        const pagDiv = document.getElementById('stylelintPagination');
        if (!pagDiv) return;
        if (!stylelintFiltered || stylelintFiltered.length <= STYLELINT_PAGE_SIZE) {
          pagDiv.innerHTML = '';
          return;
        }
        const totalPages = Math.ceil(stylelintFiltered.length / STYLELINT_PAGE_SIZE);
        let html = '<div class="flex space-x-1">';
        html += `<button class="px-2 py-1 rounded ${stylelintPage === 1 ? 'bg-gray-200' : 'bg-blue-100'}" ${stylelintPage === 1 ? 'disabled' : ''} id="stylelintPrev">Prev</button>`;
        for (let i = 1; i <= totalPages; i++) {
          html += `<button class="px-2 py-1 rounded ${stylelintPage === i ? 'bg-blue-500 text-white' : 'bg-blue-100'}" data-page="${i}">${i}</button>`;
        }
        html += `<button class="px-2 py-1 rounded ${stylelintPage === totalPages ? 'bg-gray-200' : 'bg-blue-100'}" ${stylelintPage === totalPages ? 'disabled' : ''} id="stylelintNext">Next</button>`;
        html += '</div>';
        pagDiv.innerHTML = html;
        document.getElementById('stylelintPrev')?.addEventListener('click', () => { if (stylelintPage > 1) { stylelintPage--; renderStylelintTable(); } });
        document.getElementById('stylelintNext')?.addEventListener('click', () => { if (stylelintPage < totalPages) { stylelintPage++; renderStylelintTable(); } });
        pagDiv.querySelectorAll('button[data-page]').forEach(btn => {
          btn.addEventListener('click', e => {
            stylelintPage = parseInt(e.target.getAttribute('data-page'));
            renderStylelintTable();
          });
        });
      }

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
        stylelintPage = 1;
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
      let npmPage = 1;
      const NPM_PAGE_SIZE = 10;
      let npmSearchTerm = '';
      let npmType = 'dependencies'; // or 'devDependencies'

      function renderNpmTable() {
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
        const start = (npmPage - 1) * NPM_PAGE_SIZE;
        const end = start + NPM_PAGE_SIZE;
        const pageData = dataArr.slice(start, end);
        // Table
        let html = '<table class="min-w-full bg-white rounded-lg overflow-hidden"><thead><tr>' +
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
        html += '</tbody></table>';
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
      }

      function renderNpmPagination() {
        const pagDiv = document.getElementById('npmPagination');
        if (!pagDiv) return;
        const dataArr = Array.isArray(npmData[npmType]) ? npmFiltered : [];
        if (dataArr.length <= NPM_PAGE_SIZE) {
          pagDiv.innerHTML = '';
          return;
        }
        const totalPages = Math.ceil(dataArr.length / NPM_PAGE_SIZE);
        let html = '<div class="flex space-x-1">';
        html += `<button class="px-2 py-1 rounded ${npmPage === 1 ? 'bg-gray-200' : 'bg-blue-100'}" ${npmPage === 1 ? 'disabled' : ''} id="npmPrev">Prev</button>`;
        for (let i = 1; i <= totalPages; i++) {
          html += `<button class="px-2 py-1 rounded ${npmPage === i ? 'bg-blue-500 text-white' : 'bg-blue-100'}" data-page="${i}">${i}</button>`;
        }
        html += `<button class="px-2 py-1 rounded ${npmPage === totalPages ? 'bg-gray-200' : 'bg-blue-100'}" ${npmPage === totalPages ? 'disabled' : ''} id="npmNext">Next</button>`;
        html += '</div>';
        pagDiv.innerHTML = html;
        document.getElementById('npmPrev')?.addEventListener('click', () => { if (npmPage > 1) { npmPage--; renderNpmTable(); } });
        document.getElementById('npmNext')?.addEventListener('click', () => { if (npmPage < totalPages) { npmPage++; renderNpmTable(); } });
        pagDiv.querySelectorAll('button[data-page]').forEach(btn => {
          btn.addEventListener('click', e => {
            npmPage = parseInt(e.target.getAttribute('data-page'));
            renderNpmTable();
          });
        });
      }

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
        npmPage = 1;
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
