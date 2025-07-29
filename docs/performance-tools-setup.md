# 🚀 Enhanced Performance Audit Tools Setup

This guide covers the setup and configuration of advanced performance analysis tools for UI Code Insight.

## 📦 Recommended Tools

### 1. Bundle Analysis Tools

#### **webpack-bundle-analyzer** (Already included)
```bash
# Already included in ui-code-insight
npm install webpack-bundle-analyzer
```

**Configuration:**
```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-analysis.html'
    })
  ]
};
```

#### **size-limit** (Bundle Size Monitoring)
```bash
npm install --save-dev size-limit
```

**Configuration:**
```json
// package.json
{
  "size-limit": [
    {
      "path": "dist/**/*.js",
      "limit": "100 KB"
    },
    {
      "path": "dist/**/*.css",
      "limit": "50 KB"
    }
  ]
}
```

#### **dependency-cruiser** (Dependency Analysis)
```bash
npm install --save-dev dependency-cruiser
npx depcruise --init
```

**Configuration:**
```javascript
// .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are not allowed',
      from: {},
      to: {
        circular: true
      }
    }
  ]
};
```

### 2. Performance Monitoring Tools

#### **Lighthouse CI** (Automated Performance Testing)
```bash
npm install --save-dev @lhci/cli
```

**Configuration:**
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', {minScore: 0.8}],
        'categories:accessibility': ['error', {minScore: 0.9}]
      }
    }
  }
};
```

#### **Web Vitals** (Core Web Vitals Monitoring)
```bash
npm install web-vitals
```

**Usage:**
```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### 3. Code Quality Tools

#### **Prettier** (Code Formatting)
```bash
npm install --save-dev prettier
```

**Configuration:**
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

#### **Import Cost** (Import Size Analysis)
```bash
npm install --save-dev import-cost
```

## 🔧 Integration with UI Code Insight

### Enhanced Performance Audit

The enhanced performance audit automatically detects and uses these tools when available:

```javascript
// Automatically runs when tools are available
await checkEnhancedBundleAnalysis();    // webpack-bundle-analyzer + size-limit
await checkPerformanceAntiPatterns();   // React performance patterns
await checkLargeDependencies();         // Package analysis
await checkImageOptimization();         // Image optimization suggestions
```

### Fallback Strategy

If tools are not available, the audit gracefully falls back to basic checks:

1. **webpack-bundle-analyzer unavailable** → Basic file size analysis
2. **size-limit not configured** → Skip bundle size limits
3. **dependency-cruiser not configured** → Skip dependency analysis
4. **Lighthouse CI not available** → Skip automated performance testing

## 📊 Performance Metrics

### Bundle Analysis
- **Bundle size limits** with size-limit
- **Dependency graphs** with dependency-cruiser
- **Bundle visualization** with webpack-bundle-analyzer

### Code Quality
- **Performance anti-patterns** detection
- **React optimization** suggestions
- **Import cost** analysis

### Asset Optimization
- **Image size** analysis
- **Format optimization** suggestions
- **WebP conversion** recommendations

## 🎯 Best Practices

### 1. Bundle Optimization
```javascript
// Use dynamic imports for code splitting
const LazyComponent = React.lazy(() => import('./LazyComponent'));

// Use tree shaking
import { map } from 'lodash-es'; // Instead of full lodash
```

### 2. React Performance
```javascript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{expensiveCalculation(data)}</div>;
});

// Use useCallback for stable references
const handleClick = useCallback(() => {
  // handler logic
}, [dependencies]);
```

### 3. Image Optimization
```javascript
// Use WebP format with fallbacks
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description">
</picture>
```

## 🚀 Quick Start

1. **Install recommended tools:**
```bash
npm install --save-dev webpack-bundle-analyzer size-limit dependency-cruiser @lhci/cli
```

2. **Run enhanced performance audit:**
```bash
ui-code-insight --audit performance --enhanced
```

3. **Review generated reports:**
- `bundle-analysis.html` - Bundle visualization
- `dependency-graph.svg` - Dependency relationships
- `enhanced-performance-audit-report.json` - Comprehensive analysis

## 📈 Continuous Integration

### GitHub Actions Example
```yaml
name: Performance Audit
on: [push, pull_request]
jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm ci
      - run: npm run build
      - run: npx @lhci/autorun
      - run: ui-code-insight --audit performance --enhanced
```

This enhanced setup provides comprehensive performance analysis with industry-standard tools! 🎯 