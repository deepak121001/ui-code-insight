import { fetchData } from "./helper";

export const componentUsageDom = () => {
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
