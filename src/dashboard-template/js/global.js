export const globalInit = () => {
  const dashboardMainLink = document.getElementById("mainPage");
  dashboardMainLink.addEventListener("click", (event) => {
    event.preventDefault();
    location.reload();
  });
};
