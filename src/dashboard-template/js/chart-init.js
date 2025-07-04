import { fetchData } from "./helper";

export const chartInit = () => {
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
