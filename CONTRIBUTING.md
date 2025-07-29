# Contributing to UI Code Insight

Thank you for your interest in contributing to UI Code Insight! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing Guidelines](#contributing-guidelines)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 16.0.0 or higher
- npm 7.0.0 or higher
- Git

### Quick Start

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/ui-code-insight.git
   cd ui-code-insight
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Development Setup

### Environment Setup

1. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/ui-code-insight.git
   cd ui-code-insight
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/deepak121001/ui-code-insight.git
   ```

3. **Create a development branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

### Development Commands

```bash
# Build the project
npm run build

# Watch for changes during development
npm run dev

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Run specific audits for testing
npm run audit:security
npm run audit:performance
npm run audit:accessibility
```

## Project Structure

```
ui-code-insight/
├── src/                          # Source code
│   ├── audits/                   # Audit implementations
│   │   ├── security-audit.js     # Security audit logic
│   │   ├── performance-audit.js  # Performance audit logic
│   │   ├── accessibility-audit.js # Accessibility audit logic
│   │   ├── lighthouse-audit.js   # Lighthouse audit logic
│   │   ├── dependency-audit.js   # Dependency audit logic
│   │   ├── audit-orchestrator.js # Main orchestrator
│   │   └── file-globs.js         # File pattern management
│   ├── config/                   # Configuration files
│   │   ├── enhanced-config.js    # Enhanced configuration system
│   │   └── eslintrc.*.json       # ESLint configurations
│   ├── dashboard-template/       # Dashboard templates
│   │   ├── index.html           # Main dashboard
│   │   ├── simple-dashboard.html # Simplified dashboard
│   │   ├── css/                 # Stylesheets
│   │   └── js/                  # Dashboard JavaScript
│   ├── utils/                   # Utility functions
│   │   ├── report-standardizer.js # Report standardization
│   │   ├── error-handler.js     # Error handling
│   │   └── performance-analyzer.js # Performance analysis
│   ├── eslint/                  # ESLint integration
│   ├── stylelint/               # Stylelint integration
│   └── index.js                 # Main entry point
├── test/                        # Test files
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── setup.js                 # Test setup
├── scripts/                     # Build and utility scripts
├── docs/                        # Documentation
├── bin/                         # Binary files
└── report/                      # Generated reports
```

## Contributing Guidelines

### Before You Start

1. **Check existing issues** - Look for existing issues or discussions related to your contribution
2. **Create an issue** - If you're planning a significant change, create an issue first to discuss it
3. **Follow the coding standards** - Ensure your code follows the project's style guidelines

### Code Style Guidelines

#### JavaScript/TypeScript

- Use ES6+ features
- Prefer `const` and `let` over `var`
- Use arrow functions where appropriate
- Use template literals for string interpolation
- Use destructuring for object/array assignment
- Use async/await over Promises where possible

#### Code Formatting

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Use trailing commas in objects and arrays
- Maximum line length: 100 characters

#### Naming Conventions

- Use camelCase for variables and functions
- Use PascalCase for classes and constructors
- Use UPPER_SNAKE_CASE for constants
- Use descriptive names that explain the purpose

#### File Organization

- One class per file
- Export classes and functions at the bottom of the file
- Group related functionality together
- Use meaningful file names

### Example Code Style

```javascript
// Good
const calculateScore = (issues, weights) => {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const weightedScore = Object.entries(issues).reduce((score, [severity, count]) => {
    return score + (count * (weights[severity] || 0));
  }, 0);
  
  return Math.max(0, 100 - (weightedScore / totalWeight) * 100);
};

// Bad
function calcScore(issues, weights) {
  var totalWeight = 0;
  for (var key in weights) {
    totalWeight += weights[key];
  }
  var weightedScore = 0;
  for (var severity in issues) {
    weightedScore += issues[severity] * (weights[severity] || 0);
  }
  return Math.max(0, 100 - (weightedScore / totalWeight) * 100);
}
```

### Commit Message Guidelines

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

#### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

#### Examples

```
feat(security): add secret detection patterns

fix(dashboard): resolve chart rendering issue

docs(readme): update installation instructions

test(accessibility): add WCAG compliance tests

refactor(performance): optimize file processing
```

## Testing

### Writing Tests

1. **Unit Tests** - Test individual functions and classes
2. **Integration Tests** - Test how components work together
3. **E2E Tests** - Test complete workflows

### Test Structure

```javascript
// Example test structure
describe('SecurityAudit', () => {
  describe('checkForSecrets', () => {
    it('should detect API keys in code', async () => {
      // Test implementation
    });

    it('should ignore commented secrets', async () => {
      // Test implementation
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/unit/security-audit.test.js

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch
```

### Test Coverage

- Aim for at least 80% code coverage
- Focus on critical paths and edge cases
- Test error conditions and edge cases
- Mock external dependencies

## Pull Request Process

### Before Submitting

1. **Update your branch** - Rebase on the latest main branch
2. **Run tests** - Ensure all tests pass
3. **Check linting** - Fix any linting issues
4. **Update documentation** - Add or update relevant documentation
5. **Test your changes** - Verify your changes work as expected

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Tests have been added/updated and pass
- [ ] Documentation has been updated
- [ ] Commit messages follow conventional format
- [ ] PR description clearly describes the changes
- [ ] All CI checks pass

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have made corresponding changes to documentation
- [ ] My changes generate no new warnings
```

### Review Process

1. **Automated checks** - CI/CD pipeline runs tests and linting
2. **Code review** - At least one maintainer reviews the PR
3. **Address feedback** - Make requested changes
4. **Merge** - PR is merged once approved

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Release Steps

1. **Update version** - Update version in `package.json`
2. **Update changelog** - Add release notes to `CHANGELOG.md`
3. **Create release branch** - Create a release branch
4. **Test release** - Run full test suite
5. **Create tag** - Create a git tag
6. **Publish** - Publish to npm
7. **Create release** - Create GitHub release

### Release Checklist

- [ ] All tests pass
- [ ] Documentation is up to date
- [ ] Changelog is updated
- [ ] Version is bumped
- [ ] Release notes are written
- [ ] Tag is created
- [ ] Package is published to npm

## Community

### Getting Help

- **GitHub Issues** - For bug reports and feature requests
- **GitHub Discussions** - For questions and general discussion
- **Documentation** - Check the README and docs folder

### Communication Channels

- **GitHub Issues** - Primary communication channel
- **GitHub Discussions** - Community discussions
- **Email** - For security issues (see SECURITY.md)

### Recognition

Contributors are recognized in:

- **README.md** - List of contributors
- **CHANGELOG.md** - Release notes
- **GitHub Contributors** - GitHub's built-in contributor graph

### Mentorship

We welcome new contributors and provide mentorship:

- **Good First Issues** - Labeled issues for newcomers
- **Documentation** - Comprehensive setup and contribution guides
- **Code Reviews** - Constructive feedback on PRs
- **Pair Programming** - Available for complex features

## Additional Resources

- [Project Roadmap](ROADMAP.md)
- [Security Policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [License](LICENSE)

Thank you for contributing to UI Code Insight! 🚀 