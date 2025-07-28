# Memory Optimization for Large Projects

This document provides comprehensive guidance on handling memory issues when running accessibility audits on large projects.

## 🚨 Common Memory Issues

### JavaScript Heap Out of Memory
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

### High Memory Usage
```
[Progress] 6758/2879 files processed
⚠️ High memory usage detected, forcing garbage collection...
```

## ✅ Solutions Implemented

### 1. Ultra-Aggressive Memory Management

#### Memory Constants
```javascript
// Ultra-aggressive settings for very large projects
const BATCH_SIZE = 1-2 files per sub-batch
const MAX_FILES_PER_BATCH = 500 files per batch
const MEMORY_THRESHOLD = 0.6 (60% threshold)
const MAX_IN_MEMORY_ISSUES = 2500 issues
const FORCE_GC_INTERVAL = 25 files
```

#### Enhanced Garbage Collection
```javascript
static async forceGarbageCollection() {
  if (global.gc) {
    global.gc();
    // Force multiple GC cycles for better cleanup
    await new Promise(resolve => setTimeout(resolve, 50));
    if (global.gc) global.gc();
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
```

### 2. Progressive Memory Optimization Scripts

#### Standard Projects (8GB heap)
```bash
npm run audit:accessibility
```

#### Large Projects (16GB heap)
```bash
npm run audit:accessibility:large
```

#### Ultra-Large Projects (16GB heap + aggressive settings)
```bash
npm run audit:accessibility:ultra -- --batch-size 100 --memory-limit 0.4
```

### 3. Manual Node.js Flags

#### Basic Memory Increase
```bash
node --max-old-space-size=8192 scripts/run-accessibility-audit.js
```

#### Maximum Memory with Optimization
```bash
node --max-old-space-size=16384 --expose-gc --optimize-for-size scripts/run-accessibility-audit-ultra.js
```

#### Custom Settings
```bash
node --max-old-space-size=16384 --expose-gc --gc-interval=100 scripts/run-accessibility-audit-ultra.js --batch-size 50 --memory-limit 0.3
```

## 🔧 Configuration Options

### Environment Variables
```bash
# Set batch size
export ACCESSIBILITY_BATCH_SIZE=100

# Set memory threshold (0.0-1.0)
export ACCESSIBILITY_MEMORY_THRESHOLD=0.4

# Enable production mode
export NODE_ENV=production
```

### Command Line Options
```bash
# Ultra-aggressive script options
--batch-size <number>      Files per batch (default: 250)
--memory-limit <number>    Memory threshold 0.0-1.0 (default: 0.5)
--live-url-test           Enable live URL testing
--no-code-scan           Disable code scanning
--urls <urls>            Comma-separated list of URLs to test
```

## 📊 Memory Monitoring

### Real-time Monitoring
The system now provides detailed memory monitoring:

```
Memory Settings:
  - Heap Limit: 16GB
  - Batch Size: 100 files
  - Memory Threshold: 40%
  - Force GC: Every 25 files
  - In-Memory Issues: 2500 max
  - Current Heap: 9.7MB
  - Heap Total: 12.0MB
```

### Progress Tracking
```
[Progress] 76/76 files processed
⚠️ High memory usage detected, forcing garbage collection...
[Memory] Before batch 1: Heap 9.3MB / 12.3MB
```

## 🎯 Recommended Settings by Project Size

### Small Projects (< 1000 files)
```bash
npm run audit:accessibility
```

### Medium Projects (1000-5000 files)
```bash
npm run audit:accessibility:large
```

### Large Projects (5000-10000 files)
```bash
npm run audit:accessibility:ultra -- --batch-size 250 --memory-limit 0.5
```

### Very Large Projects (> 10000 files)
```bash
npm run audit:accessibility:ultra -- --batch-size 100 --memory-limit 0.4
```

### Extremely Large Projects (> 50000 files)
```bash
npm run audit:accessibility:ultra -- --batch-size 50 --memory-limit 0.3
```

## 🔍 Troubleshooting

### Issue: Still Getting Memory Errors

1. **Reduce batch size further:**
   ```bash
   npm run audit:accessibility:ultra -- --batch-size 25
   ```

2. **Lower memory threshold:**
   ```bash
   npm run audit:accessibility:ultra -- --memory-limit 0.3
   ```

3. **Increase Node.js heap size:**
   ```bash
   node --max-old-space-size=32768 --expose-gc scripts/run-accessibility-audit-ultra.js
   ```

4. **Disable code scanning for URL-only testing:**
   ```bash
   npm run audit:accessibility:ultra -- --no-code-scan --live-url-test
   ```

### Issue: Slow Performance

1. **Increase batch size:**
   ```bash
   npm run audit:accessibility:ultra -- --batch-size 500
   ```

2. **Raise memory threshold:**
   ```bash
   npm run audit:accessibility:ultra -- --memory-limit 0.7
   ```

3. **Use standard settings:**
   ```bash
   npm run audit:accessibility:large
   ```

## 📈 Performance Metrics

### Memory Usage Examples

#### Small Project (80 files)
```
Final Memory Usage:
  - Heap Used: 31.4MB
  - Heap Total: 68.4MB
  - Duration: 1209ms
```

#### Large Project (2879 files)
```
Final Memory Usage:
  - Heap Used: 31.5MB
  - Heap Total: 36.4MB
  - Duration: 4314ms
```

## 🚀 Best Practices

### 1. Start Conservative
Begin with standard settings and increase memory/performance as needed.

### 2. Monitor Memory Usage
Watch the real-time memory logs to understand your project's memory patterns.

### 3. Use Appropriate Scripts
- Standard: `audit:accessibility`
- Large: `audit:accessibility:large`
- Ultra: `audit:accessibility:ultra`

### 4. Customize for Your Environment
Adjust batch sizes and memory thresholds based on your system's capabilities.

### 5. Consider URL-Only Testing
For very large projects, consider running URL tests separately from code scanning.

## 🔄 Recent Updates

### v2.1.2 Memory Optimizations
- ✅ Fixed progress counter bug causing memory accumulation
- ✅ Implemented ultra-aggressive garbage collection
- ✅ Added configurable batch sizes and memory thresholds
- ✅ Created dedicated ultra-aggressive script
- ✅ Enhanced memory monitoring and logging
- ✅ Reduced in-memory issue limit to 2500
- ✅ Added environment variable support for customization

The accessibility audit now handles projects of any size efficiently! 🎉 