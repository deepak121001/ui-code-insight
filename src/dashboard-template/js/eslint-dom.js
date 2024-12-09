import { fetchData, hideChartCards, renderAccordion } from "./helper";

export const eslintDom = () => {
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
