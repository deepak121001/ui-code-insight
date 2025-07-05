# UI Insights Report Generator (ui-code-insight)

A powerful CLI tool to generate dashboards and reports for code quality, style, and package analysis in modern JavaScript, TypeScript, and CSS projects.

---

**Quick Start with npx**

Run instantly without a global install:

```bash
npx ui-code-insight
```

---

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Advanced Configuration](#advanced-configuration)
- [Supported Project Types & ESLint Configs](#supported-project-types--eslint-configs)
- [CLI Usage](#cli-usage)
- [Overriding Stylelint Config](#overriding-stylelint-config)
- [Dependencies](#dependencies)
- [Repository](#repository)

## Features
- **Interactive CLI**: Select project type and reports to generate with easy prompts.
- **Multi-environment support**: React, Node, Vanilla JS, TypeScript, TypeScript + React.
- **Comprehensive linting**: ESLint for JS/TS, Stylelint for SCSS, LESS, and CSS.
- **NPM package analysis**: Audit and report on dependencies.
- **Bundle analysis**: Visualize your webpack output.
- **Comprehensive Code Audits**: Security, Performance, Accessibility, Modern Practices, Testing, and Dependency audits.
- **Customizable**: Override lint configs with your own.
- **Smart dependency management**: Automatically installs missing dependencies for your project type.

## Installation

**Recommended:** Use as a dev dependency or with npx (preferred for most users):

```bash
npm install --save-dev ui-code-insight
```

Or run directly with npx (no install needed):

```bash
npx ui-code-insight
```

## Quick Start

That's it! Just run the CLI and follow the prompts:

```bash
npx ui-code-insight
```

The CLI will:
1. Ask you to select your project type
2. **Automatically detect** which dependencies are already installed
3. **Prompt you** to install any missing dependencies
4. **Install only what's needed** for your specific project type
5. Generate the reports you select

## Advanced Configuration

### Optional: Create Configuration File

For custom file patterns or advanced settings, create a config file (e.g., `config.json`) in your project root:

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

**Configuration Options:**
- `jsFilePathPattern`: JS/TS file globs (defaults to common patterns)
- `scssFilePathPattern`: SCSS, LESS, CSS file globs (defaults to common patterns)
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

## CLI Usage

Run the CLI:

```bash
npx ui-code-insight
```

You will be prompted to select:
- **Project type** (React, Node, Vanilla JS, TypeScript, TypeScript + React, Other)
- **Dependency installation** (automatic detection and installation of missing dependencies)
- **Reports to generate** (ESLint, Stylelint, Package Report, Security Audit, Performance Audit, Accessibility Audit, Modern Practices Audit, Testing Audit, Dependency Audit, Comprehensive Audit, All Traditional Reports)

**Prompt navigation:**
- Use **arrow keys** to move.
- Press **spacebar** to select/deselect (multi-select).
- Press **enter** to confirm.

Example prompt flow:
```
? What type of project is this? (Use arrow keys)
❯ React

? Would you like to install all required dependencies for React? (Y/n)
❯ Yes

Installing missing dependencies: eslint-plugin-jsx-a11y eslint-config-airbnb
✅ Dependencies installed successfully!

? Which report(s) do you want to generate? (Press <space> to select, <a> to toggle all, <i> to invert selection)
❯◯ ESLint
 ◯ Stylelint
 ◯ Package Report
 ◯ Security Audit
 ◯ Performance Audit
 ◯ Accessibility Audit
 ◯ Modern Practices Audit
 ◯ Testing Audit
 ◯ Dependency Audit
 ◯ Comprehensive Audit (All Categories)
 ◯ All Traditional Reports
```

The tool will use the correct ESLint config and generate the selected reports.

## Comprehensive Code Audits

The tool now includes comprehensive audit categories that go beyond traditional linting:

### 🔒 Security Audit
- **Hardcoded secrets detection**: Finds passwords, API keys, tokens in code
- **Unsafe eval usage**: Identifies dangerous dynamic code execution
- **XSS vulnerabilities**: Detects potential cross-site scripting issues
- **SQL injection patterns**: Flags potential SQL injection vulnerabilities
- **Dependency vulnerabilities**: Uses npm audit to check for known security issues

### ⚡ Performance Audit
- **Bundle size analysis**: Checks for large bundle sizes and suggests code splitting
- **Inefficient operations**: Identifies performance anti-patterns
- **Memory leak detection**: Finds potential memory leaks in event listeners and timers
- **Large dependencies**: Flags heavy packages that could impact performance
- **Unused code detection**: Identifies dead code and unused imports

### ♿ Accessibility Audit
- **Image accessibility**: Checks for missing alt attributes
- **Heading structure**: Validates proper heading hierarchy
- **Form labels**: Ensures form controls have proper labeling
- **Color contrast**: Flags color usage for manual contrast verification
- **Keyboard navigation**: Checks for keyboard accessibility support
- **ARIA usage**: Validates ARIA attribute implementation

### 🔄 Modern Practices Audit
- **ES6+ features**: Tracks usage of modern JavaScript features
- **Deprecated patterns**: Identifies outdated code patterns
- **TypeScript features**: Analyzes TypeScript usage and best practices
- **React hooks**: Tracks modern React patterns
- **Async/await usage**: Monitors modern async patterns
- **Modern CSS**: Checks for modern CSS features like Flexbox and Grid

### 🧪 Testing Audit
- **Test file detection**: Identifies test files and testing frameworks
- **Test coverage**: Checks for coverage reports and scripts
- **Testing patterns**: Analyzes testing best practices
- **Mocking patterns**: Tracks mocking and stubbing usage
- **E2E testing**: Checks for end-to-end testing setup
- **Test configuration**: Validates testing framework configuration

### 📦 Dependency Audit
- **Outdated dependencies**: Identifies packages that need updates
- **Duplicate dependencies**: Finds redundant package entries
- **Unused dependencies**: Detects packages that aren't being used
- **Missing dependencies**: Checks for missing packages in node_modules
- **Peer dependencies**: Validates peer dependency requirements
- **License compliance**: Checks for license compatibility issues

### Comprehensive Audit Report
When you select "Comprehensive Audit (All Categories)", the tool runs all audit categories and generates:
- **Detailed JSON report**: `comprehensive-audit-report.json`
- **Summary dashboard**: Console output with issue counts and recommendations
- **Category breakdown**: Issues organized by severity and type
- **Actionable recommendations**: Specific steps to improve your codebase

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

## Dependencies
- [Stylelint](https://www.npmjs.com/package/stylelint)
- [ESLint](https://www.npmjs.com/package/eslint)
- [@typescript-eslint/eslint-plugin](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin)
- [eslint-config-airbnb](https://www.npmjs.com/package/eslint-config-airbnb)
- [eslint-config-airbnb-base](https://www.npmjs.com/package/eslint-config-airbnb-base)
- [eslint-config-airbnb-typescript](https://www.npmjs.com/package/eslint-config-airbnb-typescript)

## Repository

GitHub: [https://github.com/deepak121001/ui-code-insight.git](https://github.com/deepak121001/ui-code-insight.git)
