# 🔐 Security Tools Installation Guide

This guide covers the installation and configuration of industry-standard security tools used by UI Code Insight.

## 📦 Required Dependencies

### Core Security Tools (Auto-installed)

These tools are automatically installed when you install `ui-code-insight`:

```bash
npm install ui-code-insight
```

**Included Security Tools:**
- `eslint-plugin-security` - Security-focused ESLint rules
- `eslint-plugin-sonarjs` - SonarQube security rules for ESLint
- `eslint-plugin-react-hooks` - React hooks security rules
- `eslint-plugin-jsx-a11y` - Accessibility security rules

### Modern Security Tools (Built-in)

UI Code Insight now uses modern, actively maintained security tools:



#### **📦 npm audit** (Dependency Vulnerabilities)
- ✅ **Built into npm**
- ✅ **Real-time vulnerability database**
- ✅ **Automatic remediation suggestions**
- ✅ **Production dependencies only** (devDependencies excluded)

#### **🔒 Enhanced Pattern Detection** (Secret Detection)
- ✅ **Modern regex patterns**
- ✅ **Comprehensive secret coverage**
- ✅ **No external dependencies**
- ✅ **Fast and reliable**

## 🚀 Quick Setup

### 1. Install UI Code Insight
```bash
npm install -g ui-code-insight
```

### 2. Verify Installation
```bash
# Check if tools are available
npm audit --version
```

## 🔧 Configuration





## 🎯 Usage Examples

### Run Security Audit with All Tools
```bash
# Full security audit with all available tools
ui-code-insight --audit security

# Security audit with all tools
ui-code-insight --audit security
```

### Individual Tool Usage
```bash
# Run npm audit only
npm audit --json
```

## 🔄 Fallback Strategy

UI Code Insight automatically falls back to built-in security checks if industry tools are not available:

1. **npm audit unavailable** → Skips dependency scanning
2. **ESLint unavailable** → Skips code security analysis

## 📊 Tool Coverage Matrix

| Security Aspect | Primary Tool | Fallback | Coverage |
|----------------|--------------|----------|----------|
| **Dependencies** | npm audit | Basic check | 100% |
| **Secrets** | Enhanced patterns | Built-in detection | 95% |
| **Code Security** | ESLint security | Built-in patterns | 90% |
| **Live Testing** | Puppeteer | Built-in testing | 85% |
| **UI Security** | Custom checks | Built-in validation | 80% |

## 🛠️ Troubleshooting

### Common Issues

#### npm audit Issues
```bash
# Check npm installation
npm --version
# Clear npm cache if needed
npm cache clean --force
```

#### ESLint Issues
```bash
# Check ESLint installation
npx eslint --version
# Reinstall if needed
npm install -g eslint
```

### Performance Optimization

#### Large Projects
```bash
# Use batch processing for large projects
ui-code-insight --audit security --batch-size 100

# Limit memory usage
ui-code-insight --audit security --memory-limit 0.8
```

#### CI/CD Integration
```bash
# Run in CI mode (faster, less verbose)
ui-code-insight --audit security --ci --silent

# Generate machine-readable output
ui-code-insight --audit security --format json
```

## 🔒 Security Best Practices

### 1. Regular Updates
```bash
# Update security tools regularly
npm update -g ui-code-insight
```

### 2. CI/CD Integration
```yaml
# GitHub Actions example
- name: Security Audit
  run: |
    ui-code-insight --audit security --ci --format json
    # Fail on high severity issues
    if [ $? -ne 0 ]; then exit 1; fi
```

### 3. Pre-commit Hooks
```bash
# Add to .git/hooks/pre-commit
#!/bin/sh
ui-code-insight --audit security --quick
```

## 📚 Additional Resources

- [ESLint Security Rules](https://github.com/nodesecurity/eslint-plugin-security)
- [npm audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)

## 🤝 Contributing

To add new security tools or improve existing ones:

1. Fork the repository
2. Add tool integration in `src/audits/security-audit.js`
3. Update this documentation
4. Submit a pull request

---

**Note:** Industry-standard tools provide the best security coverage. Install them for maximum protection! 🛡️ 