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
    
    // Update overview data
    lighthouseDom.updateOverviewFromData();
    
    // Refresh the overview display
    if (typeof refreshLighthouseOverview === 'function') {
      refreshLighthouseOverview();
    }
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
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
      // Display desktop results
      if (item.desktop) {
        const desktopData = item.desktop;
        const performanceColor = lighthouseDom.getScoreColor(desktopData.performance);
        const accessibilityColor = lighthouseDom.getScoreColor(desktopData.accessibility);
        const bestPracticesColor = lighthouseDom.getScoreColor(desktopData.bestPractices);
        const seoColor = lighthouseDom.getScoreColor(desktopData.seo);
        
        const issuesCount = desktopData.issues ? desktopData.issues.length : 0;
        const issuesColor = issuesCount === 0 ? 'text-green-600' : issuesCount > 10 ? 'text-red-600' : 'text-yellow-600';

        tableHTML += `
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              <div class="truncate max-w-xs" title="${item.url}">${item.url}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                💻 Desktop
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="font-semibold ${performanceColor}">${desktopData.performance ? Math.round(desktopData.performance) + '%' : 'N/A'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="font-semibold ${accessibilityColor}">${desktopData.accessibility ? Math.round(desktopData.accessibility) + '%' : 'N/A'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="font-semibold ${bestPracticesColor}">${desktopData.bestPractices ? Math.round(desktopData.bestPractices) + '%' : 'N/A'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="font-semibold ${seoColor}">${desktopData.seo ? Math.round(desktopData.seo) + '%' : 'N/A'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="font-semibold ${issuesColor}">${issuesCount}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              ${desktopData.error ? 
                `<span class="text-red-600">Error: ${desktopData.error}</span>` :
                `<a href="./${item.url.replace(/^https?:\/\//, "").replace(/\//g, "")}.desktop.custom.html" target="_blank" class="text-green-600 hover:text-green-900">View Report</a>`
              }
            </td>
          </tr>
        `;
      }

      // Display mobile results
      if (item.mobile) {
        const mobileData = item.mobile;
        const performanceColor = lighthouseDom.getScoreColor(mobileData.performance);
        const accessibilityColor = lighthouseDom.getScoreColor(mobileData.accessibility);
        const bestPracticesColor = lighthouseDom.getScoreColor(mobileData.bestPractices);
        const seoColor = lighthouseDom.getScoreColor(mobileData.seo);
        
        const issuesCount = mobileData.issues ? mobileData.issues.length : 0;
        const issuesColor = issuesCount === 0 ? 'text-green-600' : issuesCount > 10 ? 'text-red-600' : 'text-yellow-600';

        tableHTML += `
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              <div class="truncate max-w-xs" title="${item.url}">${item.url}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                📱 Mobile
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="font-semibold ${performanceColor}">${mobileData.performance ? Math.round(mobileData.performance) + '%' : 'N/A'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="font-semibold ${accessibilityColor}">${mobileData.accessibility ? Math.round(mobileData.accessibility) + '%' : 'N/A'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="font-semibold ${bestPracticesColor}">${mobileData.bestPractices ? Math.round(mobileData.bestPractices) + '%' : 'N/A'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="font-semibold ${seoColor}">${mobileData.seo ? Math.round(mobileData.seo) + '%' : 'N/A'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span class="font-semibold ${issuesColor}">${issuesCount}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              ${mobileData.error ? 
                `<span class="text-red-600">Error: ${mobileData.error}</span>` :
                `<a href="./${item.url.replace(/^https?:\/\//, "").replace(/\//g, "")}.mobile.custom.html" target="_blank" class="text-green-600 hover:text-green-900">View Report</a>`
              }
            </td>
          </tr>
        `;
      }
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
      // Count desktop issues
      if (item.desktop && item.desktop.issues) {
        totalIssues += item.desktop.issues.length;
      }
      // Count mobile issues
      if (item.mobile && item.mobile.issues) {
        totalIssues += item.mobile.issues.length;
      }
    });

    const lighthouseTotal = document.getElementById('lighthouseTotal');
    if (lighthouseTotal) {
      lighthouseTotal.textContent = totalIssues;
    }
  },

  updateOverviewFromData: async () => {
    try {
      const response = await fetch('./lightHouseCombine-report.json');
      if (!response.ok) {
        throw new Error('Lighthouse report not found');
      }
      
      const data = await response.json();
      lighthouseDom.updateOverview(data);
    } catch (error) {
      console.error('Error updating lighthouse overview:', error);
    }
  }
}; 