export const lighthouseDom = {
  init: () => {
    const lighthouseAuditReport = document.getElementById("lighthouseAuditReport");
    if (lighthouseAuditReport) {
      lighthouseAuditReport.addEventListener("click", (event) => {
        event.preventDefault();
        lighthouseDom.showLighthouseSection();
      });
    }
  },

  showLighthouseSection: () => {
    // Hide all sections
    document.querySelectorAll('main > section').forEach(section => {
      section.classList.add('hidden');
    });

    // Show lighthouse section
    const lighthouseSection = document.getElementById('lighthouseSection');
    if (lighthouseSection) {
      lighthouseSection.classList.remove('hidden');
    }

    // Update active menu item
    document.querySelectorAll('#sidebarMenu a').forEach(link => {
      link.classList.remove('bg-blue-100', 'text-blue-700');
    });
    document.getElementById('lighthouseAuditReport').classList.add('bg-blue-100', 'text-blue-700');

    // Load lighthouse data
    lighthouseDom.loadLighthouseData();
  },

  loadLighthouseData: async () => {
    try {
      const response = await fetch('./lightHouseCombine-report.json');
      if (!response.ok) {
        throw new Error('Lighthouse report not found');
      }
      
      const data = await response.json();
      lighthouseDom.displayLighthouseData(data);
    } catch (error) {
      console.error('Error loading lighthouse data:', error);
      document.getElementById('lighthouseTableWrap').innerHTML = 
        '<div class="text-center text-gray-500 py-8">No lighthouse report data available</div>';
    }
  },

  displayLighthouseData: (data) => {
    const tableWrap = document.getElementById('lighthouseTableWrap');
    
    if (!data || data.length === 0) {
      tableWrap.innerHTML = '<div class="text-center text-gray-500 py-8">No lighthouse data available</div>';
      return;
    }

    let tableHTML = `
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accessibility</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Practices</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SEO</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
    `;

    data.forEach((item, index) => {
      const performanceColor = lighthouseDom.getScoreColor(item.performance);
      const accessibilityColor = lighthouseDom.getScoreColor(item.accessibility);
      const bestPracticesColor = lighthouseDom.getScoreColor(item.bestPractices);
      const seoColor = lighthouseDom.getScoreColor(item.seo);
      
      const issuesCount = item.issues ? item.issues.length : 0;
      const issuesColor = issuesCount === 0 ? 'text-green-600' : issuesCount > 10 ? 'text-red-600' : 'text-yellow-600';

      tableHTML += `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            <div class="truncate max-w-xs" title="${item.url}">${item.url}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <span class="font-semibold ${performanceColor}">${item.performance ? Math.round(item.performance) + '%' : 'N/A'}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <span class="font-semibold ${accessibilityColor}">${item.accessibility ? Math.round(item.accessibility) + '%' : 'N/A'}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <span class="font-semibold ${bestPracticesColor}">${item.bestPractices ? Math.round(item.bestPractices) + '%' : 'N/A'}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <span class="font-semibold ${seoColor}">${item.seo ? Math.round(item.seo) + '%' : 'N/A'}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <span class="font-semibold ${issuesColor}">${issuesCount}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <a href="./${item.fileName}" target="_blank" class="text-blue-600 hover:text-blue-900">View Report</a>
          </td>
        </tr>
      `;
    });

    tableHTML += `
          </tbody>
        </table>
      </div>
    `;

    tableWrap.innerHTML = tableHTML;
  },

  getScoreColor: (score) => {
    if (!score) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  },

  updateOverview: (data) => {
    if (!data || data.length === 0) return;
    
    let totalIssues = 0;
    data.forEach(item => {
      if (item.issues) {
        totalIssues += item.issues.length;
      }
    });

    const lighthouseTotal = document.getElementById('lighthouseTotal');
    if (lighthouseTotal) {
      lighthouseTotal.textContent = totalIssues;
    }
  }
}; 