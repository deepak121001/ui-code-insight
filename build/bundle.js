(function () {
  'use strict';

  const fetchData = async (reportType) => {
    const response = await fetch(`./${reportType}-report.json`);
    if (!response.ok) {
      throw new Error(
        `Error fetching ${reportType}-report.json: ${response.status}`
      );
    }
    const data = await response.json();
    return data;
  };

  const hideChartCards = () => {
    const dashboardContent = document.getElementById("dashboardContent");
    if (dashboardContent) dashboardContent.style.display = "none";
  };

  const renderTable = (data, table) => {
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

  const renderAccordion = (data) => {
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
      // Calculate total error and warning counts
      const totalErrors = data.reduce(
        (acc, item) => (item.errorCount ? acc + item.errorCount : acc + 0),
        0
      );
      const totalWarnings = data.reduce(
        (acc, item) => (item.warningCount ? acc + item.warningCount : acc + 0),
        0
      );

      const totalItems = data.length;

      const fileWithErrors = data.reduce((acc, item) => {
        if (item.errorCount) {
          acc += 1;
        }
        return acc;
      }, 0);
      const percentageWithErrors = Math.floor(
        (fileWithErrors / totalItems) * 100
      );

      const fileWithOnlyWarnings = data.reduce((acc, item) => {
        if (item.errorCount === 0 && item.warningCount) {
          acc += 1;
        }
        return acc;
      }, 0);

      const percentageOnlyWarnings = Math.floor(
        (fileWithOnlyWarnings / totalItems) * 100
      );

      const passFile = data.reduce((acc, item) => {
        if (!item.errorCount && !item.warningCount) {
          acc += 1;
        }
        return acc;
      }, 0);
      const percentagePassFile = Math.floor((passFile / totalItems) * 100);

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

  const componentUsageDom = () => {
    fetchData("component-usage")
      .then((data) => {


        const table = `
      <div>
Total Component Count: ${data.length}
</div>

      <h3 class="text-2xl font-bold mt-8 mb-4 dark:text-white">Top Used Components</h3>

      <div class="relative overflow-x-auto shadow-md sm:rounded-lg max-w-xl">

      <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 	">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
        
      <tr>
          <th scope="col" class="px-6 py-3">
          Component</th>
          <th scope="col" class="px-6 py-3 w-9 text-center">
          Usage</th>
      </tr>
      </thead> <tbody>
        ${data.sort((a, b) => {
          if (parseInt(a.usageCount) > parseInt(b.usageCount)) {
            return -1;
          } else if (parseInt(a.usageCount) < parseInt(b.usageCount)) {
            return 1;
          } else {
            return 0;
          }
        }).slice(0,5).map(
            (item) => `
       

        <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
        ${item.title}</th>
        <td class="px-6 py-4 text-center">
        ${item.usageCount}
        </td>
        </tr>
        `
          )
          .join("")}
          </tbody>
</table>
</div>
<h3 class="text-2xl font-bold mt-8 mb-4 dark:text-white">Least Used Components</h3>

<div class="relative overflow-x-auto shadow-md sm:rounded-lg max-w-xl">

<table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 	">
<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">

<tr>
<th scope="col" class="px-6 py-3">
Component</th>
<th scope="col" class="px-6 py-3 w-9 text-center">
Usage</th>
</tr>
</thead><tbody>
${data.sort((a, b) => {
  if (parseInt(a.usageCount) > parseInt(b.usageCount)) {
    return 1;
  } else if (parseInt(a.usageCount) < parseInt(b.usageCount)) {
    return -1;
  } else {
    return 0;
  }
}).slice(0,5).map(
(item) => `


<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
<th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
${item.title}</th>
<td class="px-6 py-4 text-center">
${item.usageCount}                        
</td>
</tr>
`
)
.join("")}
</tbody>
</table>
</div>
`;
        document.querySelector("#component-usage-table").innerHTML = table;
      })
      .catch((error) => console.error("Error fetching data:", error));
  };

  /* eslint-disable no-undef */

  document.addEventListener("DOMContentLoaded", () => {
    chartInit();
    eslintDom();
    stylelintDom();
    globalInit();
    packageReportInit();
    componentUsageDom();
  });

})();
