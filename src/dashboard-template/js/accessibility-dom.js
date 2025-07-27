/**
 * Accessibility DOM manipulation and display functions
 */

// Global variables for accessibility data
let accessibilityData = [];
let filteredAccessibilityData = [];
let currentAccessibilityPage = 1;
const accessibilityPageSize = 20;

/**
 * Load and display accessibility audit data
 */
async function loadAccessibilityReport() {
  try {
    console.log('Loading accessibility report...');
    const response = await fetch('accessibility-audit-report.json');
    if (!response.ok) {
      throw new Error(`Accessibility report not found: ${response.status} ${response.statusText}`);
    }
    
    accessibilityData = await response.json();
    console.log('Accessibility data loaded:', accessibilityData);
    
    filteredAccessibilityData = [...(accessibilityData.issues || [])];
    console.log('Filtered accessibility data:', filteredAccessibilityData.length, 'issues');
    
    displayAccessibilityData();
    updateAccessibilityOverview();
    setupAccessibilitySearchAndFilter();
    
  } catch (error) {
    console.error('Error loading accessibility report:', error);
    showAccessibilityMessage(`Accessibility report not found or could not be loaded: ${error.message}`);
  }
}

/**
 * Display accessibility data in the table
 */
function displayAccessibilityData() {
  const container = document.getElementById('accessibilityTableWrap');
  if (!container) return;

  if (!accessibilityData || !accessibilityData.issues || accessibilityData.issues.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-lg shadow p-8 text-center">
        <div class="text-6xl mb-4">🎉</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No Accessibility Issues Found!</h3>
        <p class="text-gray-600">Great job! Your project is accessible across all tested areas.</p>
        ${accessibilityData && accessibilityData.summary ? `
          <div class="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 class="font-semibold text-gray-700 mb-2">Scan Summary</h4>
            <div class="text-sm text-gray-600">
              <p>Code Scan Issues: ${accessibilityData.summary.codeScanIssues || 0}</p>
              <p>Live URL Issues: ${accessibilityData.summary.liveUrlIssues || 0}</p>
              <p>Axe-Core Issues: ${accessibilityData.summary.axeCoreIssues || 0}</p>
              <p>Lighthouse Issues: ${accessibilityData.summary.lighthouseIssues || 0}</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    return;
  }

  // Calculate pagination
  const startIndex = (currentAccessibilityPage - 1) * accessibilityPageSize;
  const endIndex = startIndex + accessibilityPageSize;
  const pageData = filteredAccessibilityData.slice(startIndex, endIndex);

  // Group issues by source (code scan vs live URL)
  const codeScanIssues = pageData.filter(issue => issue.source === 'custom');
  const liveUrlIssues = pageData.filter(issue => issue.source !== 'custom');

  // Calculate file scanning information
  const uniqueFiles = new Set();
  codeScanIssues.forEach(issue => {
    if (issue.file) {
      uniqueFiles.add(issue.file);
    }
  });

  let html = `
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50 border-b">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">${codeScanIssues.length}</div>
          <div class="text-sm text-gray-600">Code Scan Issues</div>
          <div class="text-xs text-gray-500">${uniqueFiles.size} files scanned</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">${liveUrlIssues.length}</div>
          <div class="text-sm text-gray-600">Live URL Issues</div>
          <div class="text-xs text-gray-500">Dynamic testing</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">${pageData.length}</div>
          <div class="text-sm text-gray-600">Total Issues</div>
          <div class="text-xs text-gray-500">This page</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-600">${accessibilityData.totalIssues || 0}</div>
          <div class="text-sm text-gray-600">All Issues</div>
          <div class="text-xs text-gray-500">Complete scan</div>
        </div>
      </div>

      <!-- WCAG Compliance Summary -->
      ${accessibilityData.issues && accessibilityData.issues.length > 0 ? `
        <div class="p-4 bg-blue-50 border-b">
          <h4 class="text-sm font-semibold text-blue-800 mb-2">WCAG Compliance Summary</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div class="bg-white p-2 rounded">
              <div class="font-semibold text-red-600">${accessibilityData.highSeverity || 0}</div>
              <div class="text-gray-600">High Priority</div>
            </div>
            <div class="bg-white p-2 rounded">
              <div class="font-semibold text-yellow-600">${accessibilityData.mediumSeverity || 0}</div>
              <div class="text-gray-600">Medium Priority</div>
            </div>
            <div class="bg-white p-2 rounded">
              <div class="font-semibold text-blue-600">${accessibilityData.lowSeverity || 0}</div>
              <div class="text-gray-600">Low Priority</div>
            </div>
            <div class="bg-white p-2 rounded">
              <div class="font-semibold text-green-600">${accessibilityData.issues ? accessibilityData.issues.filter(i => i.wcag).length : 0}</div>
              <div class="text-gray-600">WCAG Tagged</div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Code Scan Issues Section -->
      ${codeScanIssues.length > 0 ? `
        <div class="p-6 border-b">
          <h3 class="text-lg font-semibold mb-4 flex items-center space-x-2">
            <span class="text-blue-600">📁</span>
            <span>Code Scan Issues (${codeScanIssues.length})</span>
            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Static Analysis</span>
            <span class="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">${uniqueFiles.size} files</span>
          </h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WCAG</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${codeScanIssues.map(issue => `
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                      <div class="text-sm font-medium text-gray-900">${escapeHtml(issue.message)}</div>
                      ${issue.recommendation ? `<div class="text-sm text-gray-500 mt-1">💡 ${escapeHtml(issue.recommendation)}</div>` : ''}
                      ${issue.code ? `<div class="text-xs text-gray-400 mt-1 font-mono bg-gray-100 p-1 rounded">${escapeHtml(issue.code)}</div>` : ''}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">${issue.file || 'N/A'}</td>
                    <td class="px-6 py-4 text-sm text-gray-900">${issue.line || 'N/A'}</td>
                    <td class="px-6 py-4">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityClass(issue.severity)}">
                        ${issue.severity}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">
                      ${issue.wcag ? `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">${issue.wcag}</span>` : 'N/A'}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">${issue.type || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Live URL Issues Section -->
      ${liveUrlIssues.length > 0 ? `
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center space-x-2">
            <span class="text-green-600">🌐</span>
            <span>Live URL Issues (${liveUrlIssues.length})</span>
            <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Dynamic Testing</span>
          </h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${liveUrlIssues.map(issue => `
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                      <div class="text-sm font-medium text-gray-900">${escapeHtml(issue.message)}</div>
                      ${issue.recommendation ? `<div class="text-sm text-gray-500 mt-1">💡 ${escapeHtml(issue.recommendation)}</div>` : ''}
                      ${issue.context ? `<div class="text-sm text-gray-400 mt-1">${escapeHtml(issue.context)}</div>` : ''}
                      ${issue.code ? `<div class="text-xs text-gray-400 mt-1 font-mono bg-gray-100 p-1 rounded">${escapeHtml(issue.code)}</div>` : ''}
                    </td>
                    <td class="px-6 py-4 text-sm text-blue-600">
                      <a href="${issue.url}" target="_blank" class="hover:underline">${issue.url}</a>
                    </td>
                    <td class="px-6 py-4">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSourceClass(issue.source)}">
                        ${getSourceDisplayName(issue.source)}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityClass(issue.severity)}">
                        ${issue.severity}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">${issue.impact || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  container.innerHTML = html;

  // Render pagination
  renderAccessibilityPagination();
}

/**
 * Update accessibility overview in the main dashboard
 */
function updateAccessibilityOverview() {
  const totalElement = document.getElementById('accessibilityTotal');
  if (totalElement && accessibilityData) {
    const totalIssues = accessibilityData.totalIssues || (accessibilityData.issues ? accessibilityData.issues.length : 0);
    totalElement.textContent = totalIssues;
    
    // Also update the overview container with detailed breakdown if available
    const overviewContainer = document.getElementById('accessibilityOverview');
    if (overviewContainer && accessibilityData.summary) {
      overviewContainer.innerHTML = `
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-600">${totalIssues}</div>
          <div class="text-sm text-gray-500">Total Issues</div>
          <div class="text-xs text-gray-400 mt-1">
            Code: ${accessibilityData.summary.codeScanIssues || 0} | 
            Live: ${accessibilityData.summary.liveUrlIssues || 0}
          </div>
        </div>
      `;
    }
  }
}

/**
 * Setup search and filter functionality
 */
function setupAccessibilitySearchAndFilter() {
  const searchInput = document.getElementById('accessibilitySearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    filteredAccessibilityData = accessibilityData.issues.filter(issue => {
      const matchesSearch = !searchTerm || 
        issue.message.toLowerCase().includes(searchTerm) ||
        (issue.file && issue.file.toLowerCase().includes(searchTerm)) ||
        (issue.url && issue.url.toLowerCase().includes(searchTerm)) ||
        (issue.type && issue.type.toLowerCase().includes(searchTerm)) ||
        (issue.source && issue.source.toLowerCase().includes(searchTerm));
      
      return matchesSearch;
    });

    currentAccessibilityPage = 1;
    displayAccessibilityData();
  });
}

/**
 * Render pagination for accessibility issues
 */
function renderAccessibilityPagination() {
  const paginationContainer = document.getElementById('accessibilityPagination');
  if (!paginationContainer) return;

  const totalPages = Math.ceil(filteredAccessibilityData.length / accessibilityPageSize);
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let paginationHtml = '<div class="flex items-center space-x-2">';
  
  // Previous button
  paginationHtml += `
    <button onclick="changeAccessibilityPage(${currentAccessibilityPage - 1})" 
            class="px-3 py-1 border rounded ${currentAccessibilityPage <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}">
      Previous
    </button>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentAccessibilityPage - 2 && i <= currentAccessibilityPage + 2)) {
      paginationHtml += `
        <button onclick="changeAccessibilityPage(${i})" 
                class="px-3 py-1 border rounded ${i === currentAccessibilityPage ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}">
          ${i}
        </button>
      `;
    } else if (i === currentAccessibilityPage - 3 || i === currentAccessibilityPage + 3) {
      paginationHtml += '<span class="px-2 text-gray-500">...</span>';
    }
  }

  // Next button
  paginationHtml += `
    <button onclick="changeAccessibilityPage(${currentAccessibilityPage + 1})" 
            class="px-3 py-1 border rounded ${currentAccessibilityPage >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}">
      Next
    </button>
  `;

  paginationHtml += '</div>';
  paginationContainer.innerHTML = paginationHtml;
}

/**
 * Change accessibility page
 */
function changeAccessibilityPage(page) {
  const totalPages = Math.ceil(filteredAccessibilityData.length / accessibilityPageSize);
  if (page >= 1 && page <= totalPages) {
    currentAccessibilityPage = page;
    displayAccessibilityData();
  }
}

/**
 * Show accessibility section
 */
function showAccessibilitySection() {
  // Hide all sections first
  ['overviewSection', 'eslintSection', 'stylelintSection', 'npmSection', 'securitySection', 'performanceSection', 'accessibilitySection', 'lighthouseSection', 'testingSection', 'dependencySection', 'comprehensiveSection', 'excludedRulesSection'].forEach(sec => {
    const el = document.getElementById(sec);
    if (el) el.classList.add('hidden');
  });
  
  // Show accessibility section
  const accessibilitySection = document.getElementById('accessibilitySection');
  if (accessibilitySection) {
    accessibilitySection.classList.remove('hidden');
  }
  
  // Set active sidebar
  const sidebarItems = document.querySelectorAll('#sidebarMenu a');
  sidebarItems.forEach(a => a.classList.remove('bg-blue-100', 'font-bold'));
  const accessibilityTab = document.getElementById('accessibilityAuditReport');
  if (accessibilityTab) {
    accessibilityTab.classList.add('bg-blue-100', 'font-bold');
  }
  
  // Load accessibility report if not already loaded
  if (accessibilityData.length === 0) {
    loadAccessibilityReport();
  }
}

/**
 * Show accessibility message
 */
function showAccessibilityMessage(message) {
  const container = document.getElementById('accessibilityTableWrap');
  if (container) {
    container.innerHTML = `
      <div class="bg-white rounded-lg shadow p-8 text-center">
        <div class="text-4xl mb-4">⚠️</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">Accessibility Report Not Available</h3>
        <p class="text-gray-600">${message}</p>
      </div>
    `;
  }
}

/**
 * Get severity class for styling
 */
function getSeverityClass(severity) {
  switch (severity?.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get source class for styling
 */
function getSourceClass(source) {
  switch (source) {
    case 'axe-core':
      return 'bg-purple-100 text-purple-800';
    case 'lighthouse':
      return 'bg-blue-100 text-blue-800';
    case 'custom':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get source display name
 */
function getSourceDisplayName(source) {
  switch (source) {
    case 'axe-core':
      return 'Axe-Core';
    case 'lighthouse':
      return 'Lighthouse';
    case 'custom':
      return 'Code Scan';
    default:
      return source || 'Unknown';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export functions for use in other modules
export {
  loadAccessibilityReport,
  displayAccessibilityData,
  updateAccessibilityOverview,
  showAccessibilitySection,
  changeAccessibilityPage
}; 