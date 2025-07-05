import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { globby } from 'globby';
import { writeFile } from 'fs/promises';

/**
 * Security audit module for detecting common security vulnerabilities
 */
export class SecurityAudit {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.securityIssues = [];
  }

/**
 * Check for hardcoded secrets
 */
async checkForSecrets() {
  console.log(chalk.blue('🔒 Checking for hardcoded secrets...'));

  const secretPatterns = [
    /password\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /api[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /secret\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /token\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /auth[_-]?token\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /authorization\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /bearer\s+['"`][^'"`\s]+['"`]/gi,
    /access[_-]?token\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /refresh[_-]?token\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /private[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /aws_access_key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /aws_secret_key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /client[_-]?id\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /client[_-]?secret\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /firebase\s*api[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /connection\s*string\s*[:=]\s*['"`][^'"`]+['"`]/gi,
    /-----BEGIN\s+(RSA|DSA|EC|PGP|OPENSSH|PRIVATE)\s+PRIVATE\s+KEY-----[\s\S]+?-----END\s+(?:RSA|DSA|EC|PGP|OPENSSH|PRIVATE)\s+PRIVATE\s+KEY-----/g,
    /\b[a-zA-Z0-9_-]*?(api|access|secret|auth|token|key)[a-zA-Z0-9_-]*?\s*[:=]\s*['"`][\w\-]{16,}['"`]/gi,
    /\b(PASSWORD|SECRET|TOKEN|KEY|ACCESS_KEY|PRIVATE_KEY)\s*=\s*[^'"`\n\r]+/gi
  ];

  const files = await globby([
    '**/*.{js,ts,jsx,tsx,json,env}',
    '!**/node_modules/**',
    '!**/.storybook/**',
    '!**/storybook/**',
    '!**/report/**',
    '!build/**',
    '!dist/**'
  ]);

  console.log(chalk.gray(`📁 Scanning ${files.length} files for secrets...`));

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('//')) return;

        secretPatterns.forEach(pattern => {
          if (pattern.test(trimmedLine)) {
            // Get context lines (2 lines before and after)
            const contextStart = Math.max(0, index - 2);
            const contextEnd = Math.min(lines.length - 1, index + 2);
            const contextLines = lines.slice(contextStart, contextEnd + 1);
            const contextCode = contextLines.map((line, i) => {
              const lineNum = contextStart + i + 1;
              const marker = lineNum === index + 1 ? '>>> ' : '    ';
              return `${marker}${lineNum}: ${line}`;
            }).join('\n');

            this.securityIssues.push({
              type: 'hardcoded_secret',
              file,
              line: index + 1,
              severity: 'high',
              message: 'Potential hardcoded secret detected',
              code: trimmedLine,
              context: contextCode
            });
          }
        });
      });
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Warning: Could not read file ${file}`));
    }
  }
}


/**
 * Check for unsafe eval usage
 */
async checkUnsafeEval() {
  console.log(chalk.blue('🔒 Checking for unsafe eval usage...'));

  const files = await globby([
    '**/*.{js,ts,jsx,tsx}',
    '!**/node_modules/**',
    '!**/.storybook/**',
    '!**/storybook/**',
    '!**/report/**',
    '!build/**',
    '!dist/**'
  ]);
  console.log(chalk.gray(`📁 Scanning ${files.length} JS/TS files for unsafe eval...`));

  const unsafePatterns = [
    /\beval\s*\(/,                      // eval(...)
    /\bnew\s+Function\s*\(/,           // new Function(...)
    /\bFunction\s*\(/,                 // Function(...)
    /\bsetTimeout\s*\(\s*['"`]/,       // setTimeout("...")
    /\bsetInterval\s*\(\s*['"`]/       // setInterval("...")
  ];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const pattern of unsafePatterns) {
          if (pattern.test(line)) {
            // Get context lines (2 lines before and after)
            const contextStart = Math.max(0, index - 2);
            const contextEnd = Math.min(lines.length - 1, index + 2);
            const contextLines = lines.slice(contextStart, contextEnd + 1);
            const contextCode = contextLines.map((line, i) => {
              const lineNum = contextStart + i + 1;
              const marker = lineNum === index + 1 ? '>>> ' : '    ';
              return `${marker}${lineNum}: ${line}`;
            }).join('\n');

            this.securityIssues.push({
              type: 'unsafe_eval',
              file,
              line: index + 1,
              severity: 'high',
              message: 'Unsafe eval or dynamic code execution detected',
              code: line.trim(),
              context: contextCode
            });
            break; // Only report once per line
          }
        }
      });
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not read file ${file}`));
    }
  }
}


/**
 * Check for potential XSS vulnerabilities
 */
async checkXSSVulnerabilities() {
  console.log(chalk.blue('🔒 Checking for XSS vulnerabilities...'));

  const xssPatterns = [
    { pattern: /\binnerHTML\s*=/i, message: 'Use of innerHTML can lead to XSS', severity: 'high' },
    { pattern: /\bouterHTML\s*=/i, message: 'Use of outerHTML can lead to XSS', severity: 'high' },
    { pattern: /\bdocument\.write\s*\(/i, message: 'Use of document.write is dangerous and can lead to XSS', severity: 'high' },
    { pattern: /\.insertAdjacentHTML\s*\(/i, message: 'insertAdjacentHTML can be XSS-prone', severity: 'medium' },
    { pattern: /\b dangerouslySetInnerHTML\s*=/i, message: 'React dangerouslySetInnerHTML used', severity: 'medium' },
    { pattern: /\bnew\s+DOMParser\s*\(\)/i, message: 'DOMParser can be dangerous if input is not sanitized', severity: 'low' },
  ];

  const files = await globby([
    '**/*.{js,ts,jsx,tsx}',
    '!**/node_modules/**',
    '!**/.storybook/**',
    '!**/storybook/**',
    '!**/report/**',
    '!build/**',
    '!dist/**'
  ]);

  console.log(chalk.gray(`📁 Scanning ${files.length} JS/TS files for XSS vulnerabilities...`));

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Skip commented or empty lines
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed === '') return;

        xssPatterns.forEach(({ pattern, message, severity }) => {
          if (pattern.test(trimmed)) {
            // Get context lines (2 lines before and after)
            const contextStart = Math.max(0, index - 2);
            const contextEnd = Math.min(lines.length - 1, index + 2);
            const contextLines = lines.slice(contextStart, contextEnd + 1);
            const contextCode = contextLines.map((line, i) => {
              const lineNum = contextStart + i + 1;
              const marker = lineNum === index + 1 ? '>>> ' : '    ';
              return `${marker}${lineNum}: ${line}`;
            }).join('\n');

            this.securityIssues.push({
              type: 'xss_vulnerability',
              file,
              line: index + 1,
              severity,
              message,
              code: trimmed,
              context: contextCode
            });
          }
        });
      });
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Warning: Could not read file ${file}`));
    }
  }
}


/**
 * Check for potential SQL injection patterns
 */
async checkSQLInjection() {
  console.log(chalk.blue('🔒 Checking for SQL injection patterns...'));

  const sqlPatterns = [
    {
      pattern: /\b(query|execute)\s*\(\s*[`'"][^`'"']*\$\{[^}]+\}[^`'"']*[`'"]\s*\)/gi,
      message: 'SQL query contains template string interpolation — possible injection risk',
      severity: 'high'
    },
    {
      pattern: /\bsql\s*[:=]\s*[`'"][^`'"']*\$\{[^}]+\}[^`'"']*[`'"]/gi,
      message: 'Interpolated SQL assignment — risk of SQL injection',
      severity: 'high'
    },
    {
      pattern: /\bSELECT\s+.*\s+FROM\s+/i,
      message: 'Direct SQL query detected, check for unsafe input handling',
      severity: 'medium'
    },
    {
      pattern: /\bINSERT\s+INTO\s+/i,
      message: 'Direct SQL INSERT detected — validate inputs',
      severity: 'medium'
    },
    {
      pattern: /\bUPDATE\s+\w+\s+SET\s+/i,
      message: 'Direct SQL UPDATE detected — check parameter usage',
      severity: 'medium'
    },
    {
      pattern: /\bDELETE\s+FROM\s+/i,
      message: 'Direct SQL DELETE detected — confirm query safety',
      severity: 'medium'
    }
  ];

  const files = await globby([
    '**/*.{js,ts,jsx,tsx}',
    '!**/node_modules/**',
    '!**/.storybook/**',
    '!**/storybook/**',
    '!**/report/**',
    '!build/**',
    '!dist/**'
  ]);

  console.log(chalk.gray(`📁 Scanning ${files.length} JS/TS files for SQL injection patterns...`));

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('//')) return;

        for (const { pattern, message, severity } of sqlPatterns) {
          if (pattern.test(trimmed)) {
            // Get context lines (2 lines before and after)
            const contextStart = Math.max(0, index - 2);
            const contextEnd = Math.min(lines.length - 1, index + 2);
            const contextLines = lines.slice(contextStart, contextEnd + 1);
            const contextCode = contextLines.map((line, i) => {
              const lineNum = contextStart + i + 1;
              const marker = lineNum === index + 1 ? '>>> ' : '    ';
              return `${marker}${lineNum}: ${line}`;
            }).join('\n');

            this.securityIssues.push({
              type: 'sql_injection',
              file,
              line: index + 1,
              severity,
              message,
              code: trimmed,
              context: contextCode
            });
            break; // Only one issue per line
          }
        }
      });
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Warning: Could not read file ${file}`));
    }
  }
}


  /**
   * Check for outdated dependencies with known vulnerabilities
   */
  async checkDependencyVulnerabilities() {
    console.log(chalk.blue('🔒 Checking for dependency vulnerabilities...'));
    
    try {
      // Run npm audit to check for vulnerabilities
      const auditResult = execSync('npm audit --json', { 
        encoding: 'utf8', 
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      const auditData = JSON.parse(auditResult);
      
      if (auditData.vulnerabilities && Object.keys(auditData.vulnerabilities).length > 0) {
        Object.keys(auditData.vulnerabilities).forEach(packageName => {
          const vuln = auditData.vulnerabilities[packageName];
          this.securityIssues.push({
            type: 'dependency_vulnerability',
            package: packageName,
            severity: vuln.severity || 'medium',
            message: `Vulnerability in ${packageName}: ${vuln.title || 'Unknown vulnerability'}`,
            recommendation: vuln.recommendation || 'Update package version'
          });
        });
      } else {
        // No vulnerabilities found - this is good!
        this.securityIssues.push({
          type: 'no_vulnerabilities',
          severity: 'info',
          message: 'No known vulnerabilities found in dependencies',
          positive: true
        });
      }
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      if (error.status === 1) {
        try {
          const output = error.stdout.toString();
          const auditData = JSON.parse(output);
          
          if (auditData.vulnerabilities) {
            Object.keys(auditData.vulnerabilities).forEach(packageName => {
              const vuln = auditData.vulnerabilities[packageName];
              this.securityIssues.push({
                type: 'dependency_vulnerability',
                package: packageName,
                severity: vuln.severity || 'medium',
                message: `Vulnerability in ${packageName}: ${vuln.title || 'Unknown vulnerability'}`,
                recommendation: vuln.recommendation || 'Update package version'
              });
            });
          }
        } catch (parseError) {
          console.warn(chalk.yellow('Warning: Could not parse npm audit results'));
        }
      } else {
        console.warn(chalk.yellow('Warning: Could not run npm audit - this may be due to network issues or npm configuration'));
      }
    }
  }

  /**
   * Run all security checks
   */
  async runSecurityAudit() {
    console.log(chalk.blue('🔒 Starting Security Audit...'));
    
    await this.checkForSecrets();
    await this.checkUnsafeEval();
    await this.checkXSSVulnerabilities();
    await this.checkSQLInjection();
    await this.checkDependencyVulnerabilities();
    
    const results = {
      timestamp: new Date().toISOString(),
      totalIssues: this.securityIssues.length,
      highSeverity: this.securityIssues.filter(issue => issue.severity === 'high').length,
      mediumSeverity: this.securityIssues.filter(issue => issue.severity === 'medium').length,
      lowSeverity: this.securityIssues.filter(issue => issue.severity === 'low').length,
      infoIssues: this.securityIssues.filter(issue => issue.severity === 'info').length,
      issues: this.securityIssues
    };

    // Generate JSON report
    try {
      const reportPath = path.join(this.folderPath, 'security-audit-report.json');
      await writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`✅ Security audit report saved to: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Error saving security audit report:', error.message));
    }

    // Display summary
    console.log(chalk.blue('\n🔒 SECURITY AUDIT SUMMARY'));
    console.log(chalk.blue('='.repeat(40)));
    console.log(chalk.white(`Total Issues: ${results.totalIssues}`));
    console.log(chalk.red(`High Severity: ${results.highSeverity}`));
    console.log(chalk.yellow(`Medium Severity: ${results.mediumSeverity}`));
    console.log(chalk.blue(`Low Severity: ${results.lowSeverity}`));
    console.log(chalk.green(`Info/Positive: ${results.infoIssues}`));

    return results;
  }
} 