# UI Insights Report Generator (ui-code-insight)

A powerful CLI tool to generate dashboards and reports for code quality, style, and package analysis in modern JavaScript, TypeScript, and CSS projects.

---

**Quick Start with npx**

Run instantly without a global install:

```bash
npx ui-code-insight ./config.json
```

---

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Supported Project Types & ESLint Configs](#supported-project-types--eslint-configs)
- [Overriding Stylelint Config](#overriding-stylelint-config)
- [CLI Usage](#cli-usage)
- [Add to package.json](#add-to-packagejson)
- [Dependencies](#dependencies)
- [Repository](#repository)

## Features
- **Interactive CLI**: Select project type and reports to generate with easy prompts.
- **Multi-environment support**: React, Node, Vanilla JS, TypeScript, TypeScript + React.
- **Comprehensive linting**: ESLint for JS/TS, Stylelint for SCSS, LESS, and CSS.
- **NPM package analysis**: Audit and report on dependencies.
- **Bundle analysis**: Visualize your webpack output.
- **Customizable**: Override lint configs with your own.

## Installation

Install globally (recommended):
```bash
npm install -g ui-code-insight
```

Or as a dev dependency:
```bash
npm install --save-dev ui-code-insight
```

## Configuration

Create a config file (e.g., `config.json`) in your project root:

```json
{
  "jsFilePathPattern": [
    "./src/**/*.js",
    "./src/**/*.ts",
    "./src/**/*.jsx",
    "./src/**/*.tsx",
    "!./src/**/*.stories.js"
  ],
  "scssFilePathPattern": [
    "./src/**/*.scss",
    "./src/**/*.less",
    "./src/**/*.css",
    "!./node_modules/**"
  ],
  "npmReport": false,
  "recommendedLintRules": false
}
```

- `jsFilePathPattern`: JS/TS file globs
- `scssFilePathPattern`: SCSS, LESS, CSS file globs
- `npmReport`: Enable NPM package report
- `recommendedLintRules`: Use recommended lint rules

## Supported Project Types & ESLint Configs

When prompted, select your project type:
- React
- Node
- Vanilla JS
- TypeScript
- TypeScript + React

Each type uses a dedicated ESLint config in `src/config/` (e.g., `eslintrc.react.json`, `eslintrc.typescript.json`). All configs extend Airbnb and recommended plugins.

## Overriding Stylelint Config

To use your own Stylelint configuration:
1. Create a Stylelint config file in your project root (e.g., `.stylelintrc.json`, `.stylelintrc.js`, or `stylelint.config.js`).
2. Set `"recommendedLintRules": false` in your `config.json`.

Example `.stylelintrc.json`:
```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "color-no-invalid-hex": true
  }
}
```

## CLI Usage

Run the CLI with your config file:

**Global install:**
```bash
ui-code-insight ./config.json
```
**npx or local install:**
```bash
npx ui-code-insight ./config.json
```

You will be prompted to select:
- **Project type** (React, Node, Vanilla JS, TypeScript, TypeScript + React, Other)
- **Reports to generate** (ESLint, Stylelint, Package Report, All)

**Prompt navigation:**
- Use **arrow keys** to move.
- Press **spacebar** to select/deselect (multi-select).
- Press **enter** to confirm.

Example prompt:
```
? What type of project is this? (Use arrow keys)
❯ React
  Node
  Vanilla JS
  TypeScript
  TypeScript + React
  Other

? Which report(s) do you want to generate? (Press <space> to select, <a> to toggle all, <i> to invert selection)
❯◯ ESLint
 ◯ Stylelint
 ◯ Package Report
 ◯ All
```

The tool will use the correct ESLint config and generate the selected reports.

## Dependencies
- [Stylelint](https://www.npmjs.com/package/stylelint)
- [ESLint](https://www.npmjs.com/package/eslint)
- [@typescript-eslint/eslint-plugin](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin)
- [eslint-config-airbnb](https://www.npmjs.com/package/eslint-config-airbnb)
- [eslint-config-airbnb-base](https://www.npmjs.com/package/eslint-config-airbnb-base)
- [eslint-config-airbnb-typescript](https://www.npmjs.com/package/eslint-config-airbnb-typescript)

## Repository

GitHub: [https://github.com/deepak121001/ui-code-insight.git](https://github.com/deepak121001/ui-code-insight.git)
