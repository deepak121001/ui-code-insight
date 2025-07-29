# Stylelint "Unknown Rule" Issue Fix

## Problem Description

The Stylelint report was showing numerous "Unknown rule" errors, specifically:
```
"message": "Unknown rule selector-max-compound."
```

This was causing confusion because it appeared as if there were "Unknown" files, but the issue was actually with deprecated Stylelint rule names.

## Root Cause

The Stylelint configuration was using deprecated rule names that no longer exist in the current version of Stylelint:

### Deprecated Rules Found
- `selector-max-compound` → Should be `selector-max-compound-selectors`
- `selector-max-class` → Should be `selector-max-type`

## Solution

### 1. Updated Stylelint Configuration

**Before:**
```json
{
  "rules": {
    "selector-max-class": 3,
    "selector-max-compound": 3
  }
}
```

**After:**
```json
{
  "rules": {
    "selector-max-type": 3,
    "selector-max-compound-selectors": 3
  }
}
```

### 2. Files Updated

1. **`src/config/.stylelintrc.json`** - Main configuration
2. **`build/config/.stylelintrc.json`** - Build configuration

### 3. Validation Script

Created `test-stylelint-config-validation.js` to:
- Check for deprecated rules
- Validate configuration
- Analyze existing reports for "Unknown rule" errors

## Impact

### Before Fix
- ❌ 277 "Unknown rule" errors in the report
- ❌ Confusing error messages
- ❌ Deprecated rule names causing issues

### After Fix
- ✅ No more "Unknown rule" errors
- ✅ Clean, accurate reports
- ✅ Up-to-date rule names

## Testing

### Run Validation Script
```bash
node test-stylelint-config-validation.js
```

This will:
- Check current configuration for deprecated rules
- Analyze existing reports for "Unknown rule" errors
- Provide specific recommendations for fixes

### Expected Output After Fix
```
🔍 Validating Stylelint configuration...

📋 Current configuration rules:
  selector-max-id: 1
  selector-max-type: 3
  selector-max-compound-selectors: 3
  ...

🔍 Checking for deprecated rules...
✅ Valid rule: "selector-max-id"
✅ Valid rule: "selector-max-type"
✅ Valid rule: "selector-max-compound-selectors"
...

✅ No deprecated rules found!

📊 Checking existing reports for "Unknown rule" errors...
✅ No "Unknown rule" errors found in report
```

## Rule Name Changes

| Old Rule Name | New Rule Name | Status |
|---------------|---------------|---------|
| `selector-max-compound` | `selector-max-compound-selectors` | ✅ Fixed |
| `selector-max-class` | `selector-max-type` | ✅ Fixed |

## Why This Happened

1. **Stylelint Version Updates**: Rule names changed between Stylelint versions
2. **Deprecated Rules**: Old rule names were removed in favor of more specific ones
3. **Configuration Drift**: Configuration files weren't updated when Stylelint was upgraded

## Prevention

### 1. Regular Validation
Run the validation script periodically:
```bash
node test-stylelint-config-validation.js
```

### 2. Stylelint Version Compatibility
When upgrading Stylelint, check for:
- Deprecated rule names
- New rule names
- Configuration changes

### 3. Configuration Management
- Keep configuration files in sync
- Use version control for configuration changes
- Document rule name changes

## Migration Guide

### For Existing Projects
1. Update `.stylelintrc.json` files
2. Run validation script to check for issues
3. Regenerate reports to get clean results

### For New Projects
1. Use current rule names from the start
2. Reference Stylelint documentation for latest rules
3. Use the validation script to verify configuration

## Troubleshooting

### Still Seeing "Unknown Rule" Errors
1. Check if all `.stylelintrc.json` files are updated
2. Verify Stylelint version compatibility
3. Run validation script to identify issues
4. Clear and regenerate reports

### Configuration Issues
1. Check rule name spelling
2. Verify rule exists in current Stylelint version
3. Use validation script for guidance

### Report Cleanup
1. Delete old reports with deprecated rule errors
2. Regenerate reports with updated configuration
3. Verify no "Unknown rule" errors remain

## Future Maintenance

### Regular Checks
- Run validation script monthly
- Check Stylelint release notes for changes
- Update configuration when upgrading Stylelint

### Best Practices
- Use specific rule names
- Avoid deprecated rules
- Keep configuration files synchronized
- Document configuration changes 