# Test Files

This folder contains all test files for the UI Code Insight tool. Each test file focuses on testing specific functionality or features.

## Test Files Overview

### Accessibility Tests
- **`test-accessibility-data.js`** - Tests accessibility data loading and processing
- **`test-accessibility-fix.js`** - Tests accessibility audit fixes and improvements
- **`test-accessibility-prompt.js`** - Tests accessibility URL prompting functionality
- **`test-accessibility-urls.js`** - Tests live URL accessibility testing
- **`test-dashboard-accessibility.js`** - Tests accessibility dashboard functionality
- **`test-enhanced-accessibility.js`** - Tests enhanced accessibility audit features
- **`test-no-headings-fix.js`** - Tests heading structure fixes for accessibility

### Security Tests
- **`test-enhanced-security.js`** - Tests enhanced security audit features
- **`test-security-filtering.js`** - Tests security audit filtering functionality

### File Scanning Tests
- **`test-file-scanning.js`** - Tests file scanning functionality across different file types
- **`test-tools-exclusion.js`** - Tests exclusion of tools folder from audits

## Running Tests

To run a specific test file:

```bash
node test/test-file-name.js
```

## Test Categories

### Accessibility Testing
These tests verify that the accessibility audit correctly:
- Scans files for accessibility issues
- Processes live URL accessibility testing
- Handles accessibility data in the dashboard
- Applies accessibility fixes and improvements

### Security Testing
These tests verify that the security audit correctly:
- Scans files for security vulnerabilities
- Processes live URL security testing
- Handles security data filtering and display

### File Processing Testing
These tests verify that the tool correctly:
- Scans different file types (JS, TS, HTML, SCSS)
- Excludes specified folders (like tools/)
- Processes file patterns and globs

## Notes

- All test files are independent and can be run separately
- Tests may require specific data files or configurations to run properly
- Some tests may generate output files in the `report/` directory
- Tests are designed to validate specific functionality rather than comprehensive integration testing 