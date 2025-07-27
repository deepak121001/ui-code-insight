/* eslint-disable no-undef */
import { chartInit } from "./js/chart-init";
import { eslintDom } from "./js/eslint-dom";
import { globalInit } from "./js/global";
import { packageReportInit } from "./js/packages-dom";
import { stylelintDom } from "./js/stylelint-dom";
import { lighthouseDom } from "./js/lighthouse-dom";
import {componentUsageDom} from "./js/component-usage";
import "./main.scss";
import './js/dashboard.js';

document.addEventListener("DOMContentLoaded", () => {
  chartInit();
  eslintDom();
  stylelintDom();
  lighthouseDom.init();
  globalInit();
  packageReportInit();
  // componentUsageDom();
});
