# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.2.x   | :white_check_mark: |
| 2.1.x   | :white_check_mark: |
| 2.0.x   | :x:                |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 1. **DO NOT** create a public GitHub issue
Security vulnerabilities should be reported privately to prevent potential exploitation.

### 2. **Email us directly**
Send an email to: `security@ui-code-insight.com`

### 3. **Include the following information**
- **Description**: Clear description of the vulnerability
- **Steps to reproduce**: Detailed steps to reproduce the issue
- **Impact**: Potential impact of the vulnerability
- **Suggested fix**: If you have a suggested fix (optional)
- **Affected versions**: Which versions are affected
- **Proof of concept**: If applicable, include a proof of concept

### 4. **What to expect**
- **Initial response**: Within 48 hours
- **Assessment**: We'll assess the vulnerability within 1 week
- **Fix timeline**: Critical issues are addressed within 30 days
- **Credit**: You'll be credited in the security advisory (if desired)

## Security Best Practices

### For Users
- Always use the latest stable version
- Keep your dependencies updated
- Review audit reports regularly
- Follow security recommendations in reports

### For Contributors
- Follow secure coding practices
- Review code for security issues
- Use the tool's own security audit features
- Report any security concerns immediately

## Security Features

UI Code Insight includes several security features:

### 1. **Dependency Vulnerability Scanning**
- Automatic npm audit integration
- Real-time vulnerability detection
- Detailed vulnerability reports

### 2. **Code Security Analysis**
- Secret detection patterns
- Input validation checks
- Security header analysis
- XSS and injection detection

### 3. **Live URL Security Testing**
- Security header validation
- CSP analysis
- HTTPS enforcement checks
- Security misconfiguration detection

### 4. **Configuration Security**
- Secure default configurations
- Environment variable protection
- Secure file handling

## Security Advisories

Security advisories are published on:
- [GitHub Security Advisories](https://github.com/deepak121001/ui-code-insight/security/advisories)
- [NPM Security Advisories](https://www.npmjs.com/advisories)

## Responsible Disclosure

We follow responsible disclosure practices:
- Vulnerabilities are kept private until fixed
- Coordinated disclosure with affected parties
- Clear communication about fixes and updates
- Credit given to security researchers

## Security Team

Our security team consists of:
- **Security Lead**: Deepak Sharma
- **Code Review**: All maintainers
- **External Review**: Community security experts

## Security Tools Integration

UI Code Insight integrates with:
- **npm audit**: Dependency vulnerability scanning
- **ESLint security plugins**: Code security analysis
- **Puppeteer**: Live security testing
- **Custom patterns**: Project-specific security rules

## Reporting False Positives

If you believe a security issue reported by UI Code Insight is a false positive:

1. **Document the case**: Provide clear evidence
2. **Submit via email**: security@ui-code-insight.com
3. **Include context**: Explain why it's a false positive
4. **Suggest improvement**: Help improve detection accuracy

## Security Metrics

We track security metrics including:
- **Vulnerability response time**
- **False positive rate**
- **Security issue resolution time**
- **User security adoption rate**

## Security Updates

Security updates are released as:
- **Patch releases**: For critical security fixes
- **Minor releases**: For security improvements
- **Major releases**: For security feature additions

## Contact Information

- **Security Email**: security@ui-code-insight.com
- **PGP Key**: Available upon request
- **Emergency Contact**: For critical issues only

## Acknowledgments

We thank the security research community for:
- Reporting vulnerabilities
- Improving security features
- Contributing security best practices
- Supporting responsible disclosure

---

**Note**: This security policy is subject to updates. Please check back regularly for the latest information. 