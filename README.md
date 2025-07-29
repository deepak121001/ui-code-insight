# UI Code Insight - Professional Code Quality & Security Audit Tool

> **Professional CLI for comprehensive code quality, security, accessibility, and performance auditing with CI/CD integration and enterprise features. Designed for frontend teams and UI architects.**

---

## 🚀 Quick Start

```bash
npx ui-code-insight
```

> _No install, no config, instant insights with comprehensive audit coverage._

### 📊 Live Demo
Check out the [Audit Sample Dashboard](https://deepak121001.github.io/Audit-Sample/) to see the tool in action with sample projects!

---

## 🌟 Why Use UI Code Insight?

| Feature | Benefit |
|---------|---------|
| **🚀 Zero Configuration** | Works out of the box with smart defaults |
| **🔍 Comprehensive Coverage** | 5 core audit categories covering all aspects of code quality |
| **🌐 Live URL Testing** | Test real websites for accessibility, security & performance |
| **📊 Interactive Dashboard** | Beautiful visual reports with actionable insights |
| **⚡ Fast & Efficient** | Optimized for large projects with batch processing |
| **🛡️ Industry Standards** | Uses ESLint, Stylelint, Lighthouse, and axe-core |
| **🎯 Framework Agnostic** | Works with React, Vue, Angular, TypeScript, Vanilla JS |
| **💡 Actionable Results** | Detailed recommendations with specific fixes |
| **🔧 CI/CD Integration** | GitHub Actions, GitLab CI, Jenkins support |
| **🏢 Enterprise Ready** | Team collaboration, custom rules, notifications |

---

## 📦 Installation & Usage

### Quick Start
```bash
# Run without installation
npx ui-code-insight

# Or install globally
npm install -g ui-code-insight
ui-code-insight
```

### 🎯 Interactive CLI Experience
```
? What type of project is this? (Use arrow keys)
❯ React
  Node.js
  Vanilla JavaScript
  TypeScript
  TypeScript + React
  Other

? Which audit(s) do you want to run? (Press <space> to select)
❯◯ 🔒 Security Audit
 ◯ ⚡ Performance Audit  
 ◯ ♿ Accessibility Audit
 ◯ 🚀 Lighthouse Audit
 ◯ 📦 Dependency Audit
 ◯ 🔧 ESLint & Stylelint
 ◯ 🎯 All Audits

? Would you like to test live URLs? (Y/n)
❯ Yes
```

---

## 🔍 Core Audit Categories

### 🔒 **Security Audit**
**Code Scanning + Live URL Testing**

- **Hardcoded Secrets Detection**: API keys, passwords, tokens, private keys
- **Input Validation**: Missing validation attributes, unsafe DOM insertion
- **File Upload Security**: Type restrictions, size limits, sanitization
- **Code Injection**: eval(), Function constructor, dynamic code execution
- **Network Security**: Insecure HTTP, development URLs, token exposure
- **Live URL Security**: Security headers, CSP, XSS vulnerabilities, HTTPS usage

### ⚡ **Performance Audit**
**Code Analysis + Bundle Analysis**

- **Inefficient Operations**: Memory leaks, expensive operations
- **Large Dependencies**: Heavy packages, bundle size optimization
- **Asset Optimization**: Image optimization, resource loading
- **Code Splitting**: Bundle analysis, lazy loading opportunities
- **Performance Patterns**: Anti-patterns, optimization opportunities

### ♿ **Accessibility Audit**
**Code Scanning + Live URL Testing with Axe-Core**

- **Image Accessibility**: Missing alt attributes, decorative images
- **Heading Structure**: Proper hierarchy, skipped levels, multiple h1s
- **Form Accessibility**: Labels, validation, keyboard navigation
- **Color Contrast**: WCAG compliance, color usage patterns
- **ARIA Usage**: Proper ARIA attributes, semantic HTML
- **Live URL Testing**: Real browser testing with **axe-core** (industry standard)
- **Keyboard Navigation**: Tab order, focus management
- **Landmarks**: Semantic structure, skip links
- **Axe-Core Features**:
  - **80+ Accessibility Rules**: Comprehensive WCAG 2.1 AA compliance testing
  - **Impact-Based Prioritization**: Critical, serious, moderate, minor impact levels
  - **Detailed Remediation**: Specific guidance for each accessibility violation
  - **Real-Time Analysis**: Live website accessibility testing via Puppeteer
  - **Cross-Browser Support**: Works across all modern browsers

### 🚀 **Lighthouse Audit**
**Live URL Performance Testing**

- **Performance Metrics**: LCP, FCP, CLS, TTI, TBT
- **Accessibility Scoring**: WCAG compliance, screen reader support
- **Best Practices**: Modern web standards, security practices
- **SEO Optimization**: Search engine optimization, meta tags
- **Mobile & Desktop**: Dual device testing with realistic throttling
- **Custom Reports**: PageSpeed Insights-like HTML reports

### 📦 **Dependency Audit**
**Package Management & Security**

- **Outdated Dependencies**: Version updates, security patches
- **Duplicate Dependencies**: Package duplication, version conflicts
- **Unused Dependencies**: Dead code, unnecessary packages
- **Missing Dependencies**: Runtime dependencies, peer dependencies
- **License Compliance**: License checking, compliance issues
- **Vulnerability Scanning**: npm audit integration, security issues

### 🔧 **ESLint & Stylelint**
**Code Quality & Style**

- **ESLint Integration**: JavaScript/TypeScript linting with configurable rules
- **Stylelint Integration**: CSS/SCSS linting with style enforcement
- **Framework Support**: React, Node, TypeScript, Vanilla JS
- **Custom Configurations**: Project-specific rule sets
- **Rule Exclusion**: Configurable rule filtering

---

## 🌐 Live URL Testing Features

### **Multi-Audit URL Testing**
- **Batch URL Processing**: Test multiple URLs simultaneously
- **URL Configuration Management**: Save and reuse URL configurations
- **Cross-Audit Integration**: Security, accessibility, and Lighthouse testing
- **Progress Tracking**: Real-time progress indicators
- **Error Handling**: Graceful failure handling with detailed logging

### **Browser Automation**
- **Puppeteer Integration**: Real browser testing with Chrome/Chromium
- **Mobile & Desktop Emulation**: Realistic device testing
- **Network Throttling**: Real-world performance simulation
- **Screenshot Capture**: Visual verification capabilities
- **Console Logging**: Detailed debugging information

---

## 🔧 Enhanced Configuration System

### **Configuration File**
Create `ui-code-insight.config.json` in your project root:

```json
{
  "version": "2.2.0",
  "audits": {
    "security": {
      "enabled": true,
      "liveUrlTest": true,
      "codeScan": true,
      "severity": ["high", "medium", "low"]
    },
    "performance": {
      "enabled": true,
      "bundleAnalysis": true,
      "codeOptimization": true,
      "severity": ["high", "medium"]
    },
    "accessibility": {
      "enabled": true,
      "useAxeCore": true,
      "liveUrlTest": true,
      "codeScan": true,
      "severity": ["high", "medium", "low"]
    },
    "lighthouse": {
      "enabled": true,
      "mobile": true,
      "desktop": true,
      "categories": ["performance", "accessibility", "best-practices", "seo"]
    },
    "dependency": {
      "enabled": true,
      "securityVulnerabilities": true,
      "outdatedPackages": true,
      "unusedDependencies": true,
      "severity": ["high", "medium"]
    }
  },
  "reporting": {
    "format": ["html", "json"],
    "severity": ["high", "medium", "low"],
    "export": true,
    "dashboard": true,
    "progress": true
  },
  "ci": {
    "enabled": false,
    "failOnHigh": true,
    "thresholds": {
      "security": 0,
      "accessibility": 5,
      "performance": 10,
      "dependency": 0
    },
    "notifications": {
      "slack": false,
      "teams": false,
      "email": false
    }
  },
  "performance": {
    "batchSize": 25,
    "memoryThreshold": 0.7,
    "maxFilesPerBatch": 500,
    "parallelProcessing": true,
    "caching": false
  },
  "filePatterns": {
    "js": [
      "./src/**/*.js",
      "./src/**/*.ts",
      "./src/**/*.jsx",
      "./src/**/*.tsx"
    ],
    "html": [
      "**/*.{html,js,ts,jsx,tsx}"
    ],
    "css": [
      "**/*.{scss,css,less}"
    ],
    "exclude": [
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      "report/",
      "reports/",
      "*.log",
      ".vscode/",
      ".idea/",
      "*.min.js",
      "*.min.css",
      "*.bundle.js",
      "*.bundle.css",
      "__tests__/",
      "test/",
      "tests/",
      "*.test.js",
      "*.test.ts",
      "*.test.jsx",
      "*.test.tsx",
      "*.spec.js",
      "*.spec.ts",
      "*.spec.jsx",
      "*.spec.tsx",
      "docs/",
      "*.md",
      "!.README.md",
      ".tmp/",
      ".cache/",
      ".temp/",
      ".git/"
    ]
  },
  "integrations": {
    "github": {
      "enabled": false,
      "token": null,
      "repository": null
    },
    "jira": {
      "enabled": false,
      "url": null,
      "username": null,
      "token": null
    },
    "slack": {
      "enabled": false,
      "webhook": null,
      "channel": null
    }
  }
}
```

### **Configuration Management**
```bash
# Initialize configuration file
ui-code-insight --init-config

# Run configuration wizard
ui-code-insight --config-wizard

# Validate configuration
ui-code-insight --validate
```

---

## 🚀 CI/CD Integration

### **GitHub Actions**
```yaml
name: UI Code Insight Audit

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  code-audit:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run UI Code Insight Audit
      run: npx ui-code-insight --ci --silent
    
    - name: Upload audit results
      uses: actions/upload-artifact@v3
      with:
        name: audit-results
        path: report/
    
    - name: Upload SARIF
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: report/ui-code-insight.sarif
```

### **GitLab CI**
```yaml
stages:
  - audit

code-audit:
  stage: audit
  image: node:18
  script:
    - npm ci
    - npx ui-code-insight --ci --silent
  artifacts:
    paths:
      - report/
    reports:
      junit: report/ui-code-insight-junit.xml
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

### **Jenkins Pipeline**
```groovy
pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Code Audit') {
            steps {
                sh 'npx ui-code-insight --ci --silent'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'report/**/*', fingerprint: true
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'report',
                        reportFiles: 'index.html',
                        reportName: 'UI Code Insight Report'
                    ])
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
```

### **Generate CI Configurations**
```bash
# Generate all CI/CD configuration files
ui-code-insight --generate-ci
```

---

## 📁 File Exclusion with `.ui-code-insight-ignore`

Like `.eslintignore` and `.stylelintignore`, you can exclude files and folders from audits:

**Create `.ui-code-insight-ignore` in your project root:**
```bash
# Node.js dependencies and build artifacts
node_modules/
dist/
build/
out/
coverage/

# Reports and test outputs
report/
reports/
test-output/
*.log

# Development and IDE files
.vscode/
.idea/
*.swp
*.swo
.DS_Store
Thumbs.db

# Configuration files that shouldn't be audited
.env*
*.config.js
webpack.config.js
rollup.config.js
vite.config.js

# Generated files
*.min.js
*.min.css
*.bundle.js
*.bundle.css

# Test files (exclude from main audits)
__tests__/
test/
tests/
*.test.js
*.test.ts
*.test.jsx
*.test.tsx
*.spec.js
*.spec.ts
*.spec.jsx
*.spec.tsx

# Documentation
docs/
*.md
!README.md

# Temporary files
.tmp/
.cache/
.temp/

# Git
.git/

# Custom exclusions for your project
scripts/
vendor/
third-party/
legacy/
```

**Features:**
- **🔍 Smart Pattern Matching**: Supports glob patterns and negation (`!`)
- **📁 Automatic Integration**: Works with all audit types automatically
- **⚡ Performance Boost**: Excludes unnecessary files for faster audits
- **🎯 Project-Specific**: Customize exclusions per project
- **🔄 Fallback Support**: Uses default patterns if ignore file is missing

---

## 📊 Dashboard & Reporting

### **📊 Interactive Dashboard**
- **🎯 Comprehensive Overview**: All audit results in one beautiful interface
- **📈 Category Breakdown**: Detailed analysis by audit type with visual charts
- **🔍 Advanced Filtering**: Filter by severity, source, category, and more
- **🔎 Smart Search**: Find specific issues quickly with powerful search
- **📱 Responsive Design**: Works perfectly on desktop and mobile devices
- **⚡ Real-time Updates**: Dynamic data loading and instant filtering

### **📄 Report Formats**
- **📊 JSON Reports**: Structured data perfect for CI/CD integration
- **🌐 HTML Dashboard**: Beautiful interactive web interface
- **🚀 Custom Lighthouse Reports**: PageSpeed Insights-like detailed reports
- **📋 CSV Export**: Spreadsheet-friendly formats for further analysis
- **📱 Mobile-Optimized**: Responsive design for all devices

### **Report Organization**
```
report/
├── accessibility-audit-report.json
├── security-audit-report.json
├── performance-audit-report.json
├── lighthouse-audit-report.json
├── dependency-audit-report.json
├── comprehensive-audit-report.json
├── ui-code-insight.config.json
├── ui-code-insight-urls.json
├── error-report.json
├── ci-summary.json
├── ui-code-insight-junit.xml
├── ui-code-insight.sarif
└── index.html (dashboard)
```

---

## 🛠️ Supported Project Types

- **⚛️ React** (JavaScript & TypeScript)
- **🟢 Node.js** (Backend applications & APIs)
- **🟡 Vanilla JavaScript** (Traditional web projects)
- **🔵 TypeScript** (Type-safe JavaScript development)
- **⚛️ TypeScript + React** (Modern React with TypeScript)
- **🎯 Framework Agnostic** (Works with any JavaScript/TypeScript project)

---

## 🔧 CLI Options

### **Basic Usage**
```bash
# Interactive mode
ui-code-insight

# Silent mode (minimal output)
ui-code-insight --silent

# CI mode with quality gates
ui-code-insight --ci

# Help
ui-code-insight --help
```

### **Configuration Management**
```bash
# Initialize configuration file
ui-code-insight --init-config

# Run configuration wizard
ui-code-insight --config-wizard

# Validate configuration
ui-code-insight --validate

# Generate CI/CD configurations
ui-code-insight --generate-ci
```

### **NPM Scripts**
```bash
# Initialize configuration
npm run init-config

# Run configuration wizard
npm run config-wizard

# Generate CI configurations
npm run generate-ci

# Validate configuration
npm run validate-config

# Run in CI mode
npm run ci
```

---

## 🧪 Test Categories

- **♿ Accessibility Tests**: Live URL testing with axe-core, dashboard display
- **🔒 Security Tests**: Pattern matching, live URL security analysis
- **📁 File Scanning Tests**: Pattern matching, exclusion rules validation
- **🔗 Integration Tests**: End-to-end workflow testing
- **📊 Dashboard Tests**: Interactive dashboard functionality
- **⚡ Performance Tests**: Large project handling and optimization

---

## 🔧 Technical Architecture

### **Modular Design**
- **Audit Orchestrator**: Central coordination of all audits
- **Individual Audit Modules**: Specialized audit implementations
- **File Pattern System**: Centralized file pattern management
- **Configuration Loader**: Dynamic configuration handling
- **Dashboard Integration**: Unified reporting interface
- **Error Handler**: Comprehensive error handling and recovery
- **CI Integration**: Multi-platform CI/CD support

### **Performance Optimizations**
- **Async Processing**: Non-blocking file operations
- **Batch Processing**: Efficient large file handling
- **Memory Management**: Garbage collection optimization
- **Progress Tracking**: Real-time operation feedback
- **Error Resilience**: Graceful failure handling
- **Parallel Processing**: Multi-core utilization
- **Caching System**: Result caching for incremental analysis

### **Extensibility**
- **Plugin Architecture**: Easy addition of new audit types
- **Custom Patterns**: Configurable file pattern system
- **Rule Customization**: Flexible rule exclusion system
- **Integration APIs**: Structured data output for external tools
- **Enterprise Features**: Team collaboration and notifications

---

## 📈 Advanced Features

### **Live URL Testing Capabilities**
- **Multi-Device Testing**: Desktop and mobile emulation
- **Network Simulation**: Realistic throttling and latency
- **Security Header Analysis**: CSP, HSTS, X-Frame-Options
- **Accessibility Compliance**: WCAG 2.1 AA standards with axe-core integration
- **Performance Metrics**: Core Web Vitals measurement

### **Axe-Core Accessibility Engine**
- **Industry Standard**: Uses the most trusted accessibility testing library
- **Real-Time Analysis**: Tests live websites for accessibility violations
- **Comprehensive Coverage**: 80+ accessibility rules covering all major WCAG guidelines
- **Impact-Based Prioritization**: Issues categorized by critical, serious, moderate, and minor impact
- **Detailed Remediation**: Each violation includes specific guidance on how to fix the issue
- **WCAG 2.1 AA Compliance**: Automated testing against the latest accessibility standards
- **Cross-Browser Support**: Works across all modern browsers
- **Fast Execution**: Minimal impact on page load times

### **Smart File Pattern Management**
- **Centralized Configuration**: Single source of truth for file patterns
- **Audit-Specific Patterns**: Optimized patterns for each audit type
- **Exclusion Management**: Comprehensive exclusion system
- **Pattern Validation**: Built-in pattern validation utilities
- **Statistics Tracking**: Pattern usage analytics

### **Enhanced Error Handling**
- **Graceful Degradation**: Continue operation despite individual failures
- **Detailed Logging**: Comprehensive error reporting
- **Retry Mechanisms**: Automatic retry and fallback systems
- **User Feedback**: Clear error messages and suggestions
- **Error Reports**: Detailed error analysis and recommendations

---

## ⚠️ Important Usage Notes

### **Performance Considerations**
- **Large Projects**: For very large codebases, run audits individually
- **Memory Usage**: Monitor memory usage during comprehensive audits
- **Network Testing**: Live URL testing requires internet connectivity
- **Browser Resources**: Lighthouse testing uses significant system resources

### **Best Practices**
- **Regular Audits**: Schedule periodic code quality assessments
- **Incremental Testing**: Test changes incrementally in CI/CD
- **Configuration Management**: Use version-controlled configuration files
- **Team Integration**: Share audit results and configurations with team
- **Quality Gates**: Set appropriate thresholds for CI/CD pipelines

---

## ❓ Frequently Asked Questions

**Q: How accurate are the audit reports?**  
A: The tool uses industry-standard engines (ESLint, Stylelint, Lighthouse, axe-core) and custom pattern matching. While highly accurate, manual review is recommended for critical applications.

**Q: Do I need to configure anything to get started?**  
A: No! The tool works out of the box with smart defaults. Advanced users can add configuration files for customization.

**Q: Where are the audit reports saved?**  
A: All reports are saved in the `report/` directory at your project root, with supporting files and the interactive dashboard.

**Q: Can I integrate this into my CI/CD pipeline?**  
A: Yes! The tool generates structured JSON reports perfect for CI/CD integration and automated quality gates. Use `--ci` flag for CI mode.

**Q: Does it work with monorepos and large projects?**  
A: Yes! The tool is optimized for large codebases and supports monorepos with proper file pattern configuration.

**Q: What browsers are supported for live URL testing?**  
A: All modern browsers via Puppeteer, with mobile and desktop emulation support.

**Q: How fast is the tool on large projects?**  
A: Optimized with batch processing, async operations, and memory management for efficient large project handling.

**Q: How do I exclude files from audits?**  
A: Create a `.ui-code-insight-ignore` file in your project root (similar to `.eslintignore`). Add patterns like `scripts/`, `vendor/`, `*.temp.js` to exclude specific files and folders from all audits.

**Q: Can I customize the audit rules?**  
A: Yes! Use the configuration file to customize audit settings, severity thresholds, and file patterns.

**Q: Does it support enterprise features?**  
A: Yes! The tool includes team collaboration, custom rule creation, notifications, and enterprise integrations.

---

## 🔗 Dependencies

### **Core Dependencies**
- [ESLint](https://www.npmjs.com/package/eslint) - JavaScript/TypeScript linting
- [Stylelint](https://www.npmjs.com/package/stylelint) - CSS/SCSS linting
- [Lighthouse](https://www.npmjs.com/package/lighthouse) - Web performance auditing
- [Puppeteer](https://www.npmjs.com/package/puppeteer) - Browser automation for live URL testing
- [Chalk](https://www.npmjs.com/package/chalk) - Terminal styling
- [Inquirer](https://www.npmjs.com/package/inquirer) - Interactive CLI

### **Accessibility Testing**
- **Axe-Core Integration**: Industry-standard accessibility testing engine
  - **Live URL Testing**: Real-time accessibility analysis of live websites
  - **WCAG 2.1 Compliance**: Automated testing against WCAG 2.1 AA standards
  - **Comprehensive Coverage**: Tests for color contrast, keyboard navigation, ARIA usage, semantic HTML
  - **Detailed Reporting**: Provides specific violation details with remediation guidance
  - **Impact Assessment**: Categorizes issues by critical, serious, moderate, and minor impact levels

### **Framework Support**
- [@typescript-eslint/eslint-plugin](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin) - TypeScript support
- [eslint-config-airbnb](https://www.npmjs.com/package/eslint-config-airbnb) - Airbnb style guide
- [eslint-plugin-react](https://www.npmjs.com/package/eslint-plugin-react) - React support
- [eslint-plugin-security](https://www.npmjs.com/package/eslint-plugin-security) - Security rules

---

## 📊 Live Demo & Samples

- **Audit Sample Dashboard**: [https://deepak121001.github.io/Audit-Sample/](https://deepak121001.github.io/Audit-Sample/)
- **Sample Projects**: Explore React, Node.js, and Vanilla JavaScript projects
- **Interactive Reports**: View all audit types in action

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a pull request

### **Development Setup**
```bash
git clone https://github.com/deepak121001/ui-code-insight.git
cd ui-code-insight
npm install
npm run build
```

---

## 🗺️ Roadmap

- [ ] 🤖 AI-powered code suggestions and automated fixes
- [ ] 🎨 Customizable dashboard themes and branding
- [ ] 🔗 Integration with popular CI/CD platforms (GitHub Actions, GitLab CI, Jenkins)
- [ ] 📊 Advanced performance profiling and optimization recommendations
- [ ] 🛠️ Custom audit rule creation and sharing
- [ ] 🌐 More framework support (Vue, Angular, Svelte, Next.js, Nuxt)
- [ ] 🏢 Enterprise features (SSO, LDAP, custom integrations)
- [ ] 📱 Mobile app for audit monitoring
- [ ] 🔄 Real-time collaboration features
- [ ] 📈 Advanced analytics and trending

---

## 📝 License

This project is licensed under the MIT License.

---

## 📞 Support

- **GitHub Issues**: [https://github.com/deepak121001/ui-code-insight/issues](https://github.com/deepak121001/ui-code-insight/issues)
- **Documentation**: [https://github.com/deepak121001/ui-code-insight](https://github.com/deepak121001/ui-code-insight)
- **Live Demo**: [https://deepak121001.github.io/Audit-Sample/](https://deepak121001.github.io/Audit-Sample/)

---

![Dashboard Overview](docs/dashboard-overview.png)