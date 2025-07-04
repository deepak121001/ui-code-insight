import { fetchData, showDashboardMessage } from './helper.js';

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

function renderPieChart(containerId, error, warning, pass) {
  const options = {
    chart: { type: 'pie', height: 250 },
    labels: ['Files with Errors', 'Files with Warnings', 'Files Passed'],
    series: [error, warning, pass],
    colors: ['#f87171', '#fbbf24', '#34d399'],
  };
  new ApexCharts(document.querySelector(containerId), options).render();
}

function renderBarChart(containerId, dep, devDep) {
  const options = {
    chart: { type: 'bar', height: 250 },
    series: [{ name: 'Count', data: [dep, devDep] }],
    xaxis: { categories: ['Dependencies', 'Dev Dependencies'] },
    colors: ['#2563eb', '#a78bfa'],
  };
  new ApexCharts(document.querySelector(containerId), options).render();
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

// Defensive table rendering helpers
function safeSetInnerHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
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
      import('./helper.js').then(mod => { window.createAccordionItem = mod.createAccordionItem; });
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
      import('./helper.js').then(mod => { window.createAccordionItem = mod.createAccordionItem; });
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