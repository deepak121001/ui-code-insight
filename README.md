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
npm install git@git.corp.adobe.com:deepaksharma/ui-code-insight.git

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

Once you have created your configuration file, follow these steps to seamlessly integrate it into your project:

- **Add a Custom Command to package.json:** Open your package.json file and navigate to the "scripts" section. Add the following custom command:

```
"scripts": {
  "generate-report": "ui-code-insight config.json"
}
```
This command allows you to generate reports using your configuration file without having to type the full command in the terminal each time.
```
npm run generate-report
```
This npm script executes the ui-code-insight command with the specified config.json file, making it a convenient way to generate reports for your project.

Feel free to customize the script name and configuration file path based on your preferences.

## Dependencies

This module relies on the following npm packages:

- [Stylelint](https://www.npmjs.com/package/stylelint) - License: MIT
- [ESLint](https://www.npmjs.com/package/eslint) - License: MIT
