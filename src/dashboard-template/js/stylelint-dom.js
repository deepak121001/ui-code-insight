import { fetchData, hideChartCards, renderAccordion } from "./helper";

export const stylelintDom = () => {
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
