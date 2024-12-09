export const fetchData = async (reportType) => {
  const response = await fetch(`./${reportType}-report.json`);
  if (!response.ok) {
    throw new Error(
      `Error fetching ${reportType}-report.json: ${response.status}`
    );
  }
  const data = await response.json();
  return data;
};

export const hideChartCards = () => {
  const dashboardContent = document.getElementById("dashboardContent");
  if (dashboardContent) dashboardContent.style.display = "none";
};

export const renderTable = (data, table) => {
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

  if (table) {
    table.innerHTML = rows;
  }
};

export const createAccordionItem = (
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

export const renderAccordion = (data) => {
  const accordionContent = document.getElementById("accordionContent");
  const accordionContainer = document.getElementById("accordion");

  if (accordionContent) {
    accordionContent.classList.remove("hidden");
  }
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

export const globalInit = () => {
  const dashboardMainLink = document.getElementById("mainPage");
  dashboardMainLink.addEventListener("click", () => {
    location.reload();
  });
};
