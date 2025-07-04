/* eslint-disable no-undef */
import { fetchData, hideChartCards, renderTable } from "./helper";

export const packageReportInit = () => {
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
      console.log(data);
      if (data.dependencies.length) {
        renderTable(data.dependencies, npmReportTable);
      }
      if (data.dependencies.length) {
        renderTable(data.devDependencies, npmdevReportTable);
      }
    });
};
