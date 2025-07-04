# UI Insights Report Generator (ui-code-insight)

The UI Insights Report Generator empowers you to effortlessly create insightful dashboards for your ESLint, Stylelint, NPM packages, Bundle Analyzer and AEM component usage reports.

# Demo
You can view a live demo of this project [here](https://audit-hazel.vercel.app/pdc/report.html).


## Overview

This project is currently at version 1.0.0, providing a stable foundation for creating detailed reports on your project's code quality (JavaScript, CSS), NPM package dependencies, and AEM component usage based on the configuration.

## Features

- **ESLint Reports**: Easily visualize and analyze ESLint code quality metrics.
- **Stylelint Reports**: Gain insights into your project's style and CSS linting.
- **NPM Packages Reports**: Understand your project's dependency landscape and identify potential vulnerabilities.
- **AEM Component Usage Reports**: Track and analyze the usage of Adobe Experience Manager components.
- **Bundle Analyzer**: Visualize size of webpack output files with an interactive zoomable treemap.
- **Detailed Insights**: Drill down into specific issues for a deeper understanding of problem areas.
- **Code Quality Recommendations**: Receive suggestions and best practices for improving code quality.
- **Streamlined Analysis**: Easily integrate into your project workflow to streamline the process of analyzing code quality and style violations.


## Installation
Install the UI Insights Report Generator globally using the following npm command:

```
npm install git@github.com:deepak121001/ui-code-insight.git

```

## Configuration

Create a config.json file in your project's root directory. You can name the file anything you want.
Example config.json:

```
{
  "jsFilePathPattern": [
    "./src/**/*.js",
    "./src/**/*.ts",
    "./src/**/*.jsx",
    "./src/**/*.tsx",
    "!./src/**/*.stories.js"
  ],
  "scssFilePathPattern": ["./src/**/*.scss", "!./node_modules/**"],
  "npmReport": false,
  "recommendedLintRules": false,
  
    
    // optional configurations
    
    // Required for getting the component usage report. This requires an AEM instance to be up & running
    "aemBasePath":"http://localhost:4502", 
    "aemContentPath":"/content/wknd",
    "aemAppsPath":"/apps/wknd",
    "slingResourceTypeBase":"wknd/components/",
    
    // bundleAnalyzer configuration
    "bundleAnalyzer":true,
    "webpackConfigFile":"./webpack.config.js",
    "webpackBundleFolder":"dist"
}

```
Adjust the file patterns to match the structure of your project.

- **jsFilePathPattern**: An array of patterns specifying JavaScript/TypeScript file paths to be included in the reports. Supports glob patterns for file matching.
- **scssFilePathPattern**: An array of patterns specifying SCSS file paths to be included in the reports. Supports glob patterns for file matching.
- **npmReport**: An boolean value to run Npm packages report.
- **bundleAnalyzer**: An boolean value to run bundleanalizer.
- **recommendedLintRules**: A boolean value that, when set to `true`, indicates the use of Adobe's recommended linting standards. Enabling this flag will overwrite your project's existing linting configuration with Adobe's default settings.

## Usage

Once you have created your configuration file, you can generate reports using the CLI from anywhere in your terminal:

```
ui-code-insight path/to/your/config.json [options]
```

- Replace `path/to/your/config.json` with the path to your configuration file.
- You can run this command from any directory if the package is installed globally.

**Example:**
```
ui-code-insight ./config.json
```

### Optional: Add a Custom Command to package.json

If you prefer, you can add a script to your `package.json` for convenience:

```
"scripts": {
  "generate-report": "ui-code-insight config.json"
}
```
Then run:
```
npm run generate-report
```

This npm script executes the `ui-code-insight` command with the specified config file, making it a convenient way to generate reports for your project. This step is optional if you use the CLI directly.

Feel free to customize the script name and configuration file path based on your preferences.

## Dependencies

This module relies on the following npm packages:

- [Stylelint](https://www.npmjs.com/package/stylelint) - License: MIT
- [ESLint](https://www.npmjs.com/package/eslint) - License: MIT

## XSS Safety Audit

UI Code Insight now audits for potential XSS vulnerabilities by:
- Detecting usage of unsafe DOM manipulation APIs (e.g., innerHTML, outerHTML, insertAdjacentHTML).
- Recommending the use of safer alternatives (e.g., textContent) or sanitization (e.g., sanitize-html).
- Integrating [eslint-plugin-no-unsanitized](https://www.npmjs.com/package/eslint-plugin-no-unsanitized) to statically analyze and flag risky code patterns.

### How it works
- The audit will flag any direct use of innerHTML, outerHTML, insertAdjacentHTML, etc., in your codebase.
- The report will recommend using [sanitize-html](https://www.npmjs.com/package/sanitize-html) to sanitize any dynamic HTML before inserting it into the DOM.
- The tool will also recommend enabling the ESLint plugin 'eslint-plugin-no-unsanitized' for ongoing static analysis.

### Remediation
- Use `textContent` for plain text insertion.
- Use `sanitize-html` for any dynamic HTML.
- Fix or refactor any code flagged by the audit or ESLint plugin.

## Code Complexity & Cognitive Complexity Audit

UI Code Insight now audits for code complexity and cognitive complexity issues by:
- Detecting functions with too many parameters, deeply nested blocks, and high cyclomatic/cognitive complexity.
- Highlighting redundant conditions, unnecessary operations, and code smells.
- Integrating [eslint-plugin-sonarjs](https://www.npmjs.com/package/eslint-plugin-sonarjs) for advanced static analysis.

### How it works
- The audit will flag:
  - Functions with more than 4 parameters.
  - Functions with more than 3 levels of nesting.
  - Functions with a cognitive complexity score above 15.
  - Redundant or always-true/false conditions.
  - Unnecessary boolean casts or operations.
- The tool uses the following ESLint rules:
  - `complexity` (max 10)
  - `max-params` (max 4)
  - `max-depth` (max 3)
  - `sonarjs/cognitive-complexity` (max 15)

### Remediation
- Refactor flagged functions to reduce complexity.
- Split large or deeply nested functions into smaller, simpler ones.
- Remove redundant or unnecessary code.
- Fix or refactor any code flagged by the audit or ESLint plugin.
