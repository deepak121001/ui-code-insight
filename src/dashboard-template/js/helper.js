/**
 * Fetches report data from a JSON file. Returns an empty array/object if not found.
 * @async
 * @param {string} reportType - The type of report to fetch (e.g., 'eslint', 'stylelint', 'npm', 'component-usage').
 * @returns {Promise<Object|Array>} The parsed JSON data or an empty array/object if not found.
 */
export const fetchData = async (reportType) => {
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
export const hideChartCards = () => {
  const dashboardContent = document.getElementById("dashboardContent");
  if (dashboardContent) dashboardContent.style.display = "none";
};

/**
 * Renders a table of package data.
 * @param {Array} data - Array of package objects.
 * @param {HTMLElement} table - The table element to render into.
 */
export const renderTable = (data, table) => {
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
export const createAccordionItem = (
  filePath,
  errorCount,
  warningCount,
  messages
) => {
  hideChartCards();
  // Always show filePath if present, otherwise 'N/A'
  const displayFilePath = filePath || 'N/A';
  // Use 0 for errorCount/warningCount if undefined/null
  const displayErrorCount = typeof errorCount === 'number' ? errorCount : 0;
  const displayWarningCount = typeof warningCount === 'number' ? warningCount : 0;
  messages = messages || [];

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
  if (displayErrorCount > 0) {
    accordionButton.classList.add("border-red-300");
  } else if (displayWarningCount > 0) {
    accordionButton.classList.add("border-yellow-300");
  } else {
    accordionButton.classList.add("border-green-300");
  }

  accordionButton.setAttribute("type", "button");
  // Count suggestions with enhanced logic
  const suggestionCount = messages.reduce((count, message) => {
    let suggestions = 0;
    
    // Count automatic fixes
    if (message.fix && message.fix.text && message.fix.text.trim()) suggestions++;
    
    // Count manual suggestions
    if (message.suggestions && Array.isArray(message.suggestions)) {
      suggestions += message.suggestions.filter(s => s.desc || s.message).length;
    }
    
    // Count recommendations
    if (message.recommendations && Array.isArray(message.recommendations)) {
      suggestions += message.recommendations.length;
    }
    
    // Count extracted suggestions from message text
    const messageText = message.message || '';
    const suggestionPatterns = [
      /(?:Use|Consider|Try)\s+([^.]+)/,
      /(?:should|recommended to)\s+([^.]+)/,
      /(?:prefer|instead of)\s+([^.]+)/,
      /(?:add|include|remove|change)\s+([^.]+)/,
      /(?:missing|required)\s+([^.]+)/
    ];
    
    suggestionPatterns.forEach(pattern => {
      if (messageText.match(pattern)) suggestions++;
    });
    
    return count + suggestions;
  }, 0);

  accordionButton.innerHTML = `
  File: ${displayFilePath}
  <div class="flex items-center space-x-2">
   <span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">Errors: ${displayErrorCount}</span>
   <span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">Warnings: ${displayWarningCount}</span>
   ${suggestionCount > 0 ? `<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">Suggestions: ${suggestionCount}</span>` : ''}
  </div>
  `;

  const accordionContent = document.createElement("div");
  accordionContent.classList.add("hidden", "mt-2"); // Initially hidden

  // Count total suggestions with enhanced logic
  const totalSuggestions = messages.reduce((count, message) => {
    let suggestions = 0;
    
    // Count automatic fixes
    if (message.fix && message.fix.text && message.fix.text.trim()) suggestions++;
    
    // Count manual suggestions
    if (message.suggestions && Array.isArray(message.suggestions)) {
      suggestions += message.suggestions.filter(s => s.desc || s.message).length;
    }
    
    // Count recommendations
    if (message.recommendations && Array.isArray(message.recommendations)) {
      suggestions += message.recommendations.length;
    }
    
    // Count extracted suggestions from message text
    const messageText = message.message || '';
    const suggestionPatterns = [
      /(?:Use|Consider|Try)\s+([^.]+)/,
      /(?:should|recommended to)\s+([^.]+)/,
      /(?:prefer|instead of)\s+([^.]+)/,
      /(?:add|include|remove|change)\s+([^.]+)/,
      /(?:missing|required)\s+([^.]+)/
    ];
    
    suggestionPatterns.forEach(pattern => {
      if (messageText.match(pattern)) suggestions++;
    });
    
    return count + suggestions;
  }, 0);

  const contentText = `
  <div class="px-4 py-2">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span class="font-semibold text-red-800">Errors: ${displayErrorCount}</span>
            </div>
          </div>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span class="font-semibold text-yellow-800">Warnings: ${displayWarningCount}</span>
            </div>
          </div>
          ${totalSuggestions > 0 ? `
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <span class="font-semibold text-blue-800">Suggestions: ${totalSuggestions}</span>
            </div>
          </div>
          ` : ''}
        </div>
        <p class="font-semibold text-gray-700 mb-3">Issues and Suggestions:</p>
        <ul class="list-disc list-inside">
            ${(messages || [])
              .map(
                (
                  message
                ) => {
                  // Handle both ESLint (numeric) and Stylelint (string) severity
                  let severity;
                  if (typeof message.severity === 'number') {
                    severity = message.severity >= 2 ? "error" : "warning";
                  } else {
                    severity = message.severity === "error" ? "error" : "warning";
                  }
                  const severityColor = severity === "error" ? "text-red-600" : "text-yellow-600";
                  const severityBg = severity === "error" ? "bg-red-50" : "bg-yellow-50";
                  const severityBorder = severity === "error" ? "border-red-200" : "border-yellow-200";
                  
                  // Extract suggestions from the message with enhanced parsing
                  let suggestions = [];
                  let fixDetails = [];
                  let suggestionDetails = [];
                  
                  // Handle automatic fixes
                  if (message.fix && message.fix.text) {
                    const fixText = message.fix.text.trim();
                    if (fixText) {
                      suggestions.push(`🔧 Auto-fix: ${fixText}`);
                      fixDetails.push({
                        type: 'auto-fix',
                        text: fixText,
                        range: message.fix.range
                      });
                    }
                  }
                  
                  // Handle manual suggestions
                  if (message.suggestions && Array.isArray(message.suggestions)) {
                    message.suggestions.forEach((suggestion, index) => {
                      const desc = suggestion.desc || suggestion.message || suggestion;
                      if (desc && !suggestions.includes(desc)) {
                        suggestions.push(`💡 ${desc}`);
                        suggestionDetails.push({
                          type: 'manual-suggestion',
                          text: desc,
                          fix: suggestion.fix
                        });
                      }
                    });
                  }
                  
                  // Handle recommendations
                  if (message.recommendations && Array.isArray(message.recommendations)) {
                    message.recommendations.forEach(rec => {
                      if (!suggestions.includes(rec)) {
                        suggestions.push(`📋 ${rec}`);
                      }
                    });
                  }
                  
                  // Extract suggestions from message text patterns
                  const messageText = message.message || '';
                  const suggestionPatterns = [
                    /(?:Use|Consider|Try)\s+([^.]+)/,
                    /(?:should|recommended to)\s+([^.]+)/,
                    /(?:prefer|instead of)\s+([^.]+)/,
                    /(?:add|include|remove|change)\s+([^.]+)/,
                    /(?:missing|required)\s+([^.]+)/
                  ];
                  
                  suggestionPatterns.forEach(pattern => {
                    const match = messageText.match(pattern);
                    if (match && !suggestions.includes(match[1])) {
                      suggestions.push(`💭 ${match[1].trim()}`);
                    }
                  });
                  
                  // Handle range information
                  let rangeInfo = '';
                  if (message.endLine && message.endColumn) {
                    rangeInfo = ` (Line ${message.line}-${message.endLine}, Col ${message.column}-${message.endColumn})`;
                  } else if (message.line && message.column) {
                    rangeInfo = ` (Line ${message.line}, Col ${message.column})`;
                  }
                  
                  return `<li class="hover:bg-gray-50 cursor-pointer bg-white shadow flex flex-col p-4 mb-4 rounded-lg mt-1.5 border-l-4 ${severityBorder}">
                    <div class="flex items-start space-x-3">
                      <svg class="w-5 h-5 ${severityColor} mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2 mb-1">
                          <span class="font-semibold text-gray-900">
                            ${rangeInfo || `Line ${message.line}, Column ${message.column}`}
                          </span>
                          ${message.ruleId ? `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">${message.ruleId}</span>` : ''}
                          ${message.rule ? `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">${message.rule}</span>` : ''}
                          ${message.fatal ? `<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Fatal</span>` : ''}
                        </div>
                        <p class="text-gray-700 mb-2">${message.message}</p>
                        ${suggestions.length > 0 ? `
                          <div class="${severityBg} border ${severityBorder} rounded-md p-3">
                            <div class="flex items-center space-x-2 mb-2">
                              <svg class="w-4 h-4 ${severityColor}" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                              </svg>
                              <span class="font-medium text-sm ${severityColor}">Suggestions (${suggestions.length}):</span>
                            </div>
                            <div class="space-y-2">
                              ${suggestions.map(suggestion => {
                                const isAutoFix = suggestion.includes('🔧');
                                const isManualSuggestion = suggestion.includes('💡');
                                const isRecommendation = suggestion.includes('📋');
                                const isExtracted = suggestion.includes('💭');
                                
                                let bgClass = 'bg-white';
                                let borderClass = 'border-gray-200';
                                
                                if (isAutoFix) {
                                  bgClass = 'bg-green-50';
                                  borderClass = 'border-green-200';
                                } else if (isManualSuggestion) {
                                  bgClass = 'bg-blue-50';
                                  borderClass = 'border-blue-200';
                                } else if (isRecommendation) {
                                  bgClass = 'bg-purple-50';
                                  borderClass = 'border-purple-200';
                                } else if (isExtracted) {
                                  bgClass = 'bg-yellow-50';
                                  borderClass = 'border-yellow-200';
                                }
                                
                                return `
                                  <div class="${bgClass} border ${borderClass} rounded-md p-2 text-sm">
                                    <div class="flex items-start space-x-2">
                                      <span class="text-xs font-medium text-gray-500 mt-0.5">•</span>
                                      <span class="text-gray-700">${suggestion}</span>
                                    </div>
                                  </div>
                                `;
                              }).join('')}
                            </div>
                            ${fixDetails.length > 0 ? `
                              <div class="mt-3 pt-3 border-t border-gray-200">
                                <div class="text-xs font-medium text-gray-600 mb-2">Auto-fix Details:</div>
                                ${fixDetails.map(fix => `
                                  <div class="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                    <div><strong>Text:</strong> "${fix.text}"</div>
                                    ${fix.range ? `<div><strong>Range:</strong> [${fix.range[0]}, ${fix.range[1]}]</div>` : ''}
                                  </div>
                                `).join('')}
                              </div>
                            ` : ''}
                          </div>
                        ` : ''}
                        ${message.code ? `
                          <div class="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 overflow-x-auto">
                            <div class="font-semibold mb-1">Code Context:</div>
                            <pre class="whitespace-pre-wrap">${message.code}</pre>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </li>`;
                }
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
export const renderAccordion = (data) => {
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
export const updateProgress = () => {
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
export const globalInit = () => {
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
export const showDashboardMessage = (message) => {
  const msgDiv = document.getElementById('dashboardMessage');
  if (msgDiv) {
    msgDiv.textContent = message;
    msgDiv.classList.remove('hidden');
  }
};
