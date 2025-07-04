export const globalInit = () => {
  const dashboardMainLink = document.getElementById("mainPage");
  dashboardMainLink.addEventListener("click", (event) => {
    event.preventDefault();
    location.reload();
  });

  // Dynamically show/hide menu items based on available reports
  const menuChecks = [
    { id: 'jsAuditReport', file: 'eslint-report.json' },
    { id: 'scssAuditReport', file: 'stylelint-report.json' },
    { id: 'npmPackagesReport', file: 'npm-report.json' },
  ];
  menuChecks.forEach(({ id, file }) => {
    fetch(`./${file}`, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        }
      })
      .catch(() => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
  });
};
