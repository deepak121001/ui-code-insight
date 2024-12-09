/* eslint-disable no-undef */
import { chartInit } from "./js/chart-init";
import { eslintDom } from "./js/eslint-dom";
import { globalInit } from "./js/global";
import { packageReportInit } from "./js/packages-dom";
import { stylelintDom } from "./js/stylelint-dom";
import {componentUsageDom} from "./js/component-usage";
import "./main.scss";

document.addEventListener("DOMContentLoaded", () => {
  chartInit();
  eslintDom();
  stylelintDom();
  globalInit();
  packageReportInit();
  componentUsageDom();
});
