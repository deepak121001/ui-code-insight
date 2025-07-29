#!/usr/bin/env node

/**
 * Simple debug script to test Stylelint filtering logic
 */

// Simulate the current exclude rules
const excludeRules = [
  'scss/double-slash-comment-empty-line-before',
  'scss/load-partial-extension',
  'declaration-empty-line-before',
  'color-function-notation',
  'selector-max-universal'
];

// Simulate a sample result with messages
const sampleResult = {
  filePath: 'src/main/webpack/components/promotions/PR0008/PR0008.scss',
  errorCount: 77,
  warningCount: 0,
  messages: [
    {
      line: 24,
      rule: 'scss/double-slash-comment-empty-line-before',
      severity: 'error',
      message: 'Expected empty line before comment'
    },
    {
      line: 57,
      rule: 'color-no-invalid-hex',
      severity: 'error',
      message: 'Invalid hex color'
    },
    {
      line: 83,
      rule: 'declaration-block-no-duplicate-properties',
      severity: 'warning',
      message: 'Duplicate property'
    }
  ]
};

console.log('🔍 Testing Stylelint filtering logic...\n');

console.log('📋 Original result:');
console.log(`   File: ${sampleResult.filePath}`);
console.log(`   Error count: ${sampleResult.errorCount}`);
console.log(`   Warning count: ${sampleResult.warningCount}`);
console.log(`   Messages: ${sampleResult.messages.length}`);

console.log('\n📋 Original messages:');
sampleResult.messages.forEach((msg, index) => {
  console.log(`   ${index + 1}. ${msg.rule} (${msg.severity}): ${msg.message}`);
});

// Apply current filtering logic
const filteredMessages = sampleResult.messages.filter(message => {
  // Don't filter out "Unknown rule" errors as they indicate configuration issues
  if (message.message && message.message.includes('Unknown rule')) {
    return true;
  }
  return !excludeRules.includes(message.rule);
});

console.log('\n📋 Exclude rules:');
excludeRules.forEach(rule => {
  console.log(`   - ${rule}`);
});

console.log('\n📋 Filtered messages:');
if (filteredMessages.length > 0) {
  filteredMessages.forEach((msg, index) => {
    console.log(`   ${index + 1}. ${msg.rule} (${msg.severity}): ${msg.message}`);
  });
} else {
  console.log('   ❌ No messages remaining after filtering!');
}

// Count errors and warnings
const actualErrors = filteredMessages.filter(msg => msg.severity === 'error').length;
const actualWarnings = filteredMessages.filter(msg => msg.severity === 'warning').length;

console.log('\n📊 Results:');
console.log(`   Original error count: ${sampleResult.errorCount}`);
console.log(`   Original warning count: ${sampleResult.warningCount}`);
console.log(`   Original message count: ${sampleResult.messages.length}`);
console.log(`   Filtered error count: ${actualErrors}`);
console.log(`   Filtered warning count: ${actualWarnings}`);
console.log(`   Filtered message count: ${filteredMessages.length}`);

if (sampleResult.errorCount > 0 && actualErrors === 0 && actualWarnings === 0) {
  console.log('\n❌ ISSUE DETECTED: All messages filtered out!');
  console.log('   This explains the "Error count (77) doesn\'t match message count (0)" warning.');
} else {
  console.log('\n✅ Filtering working correctly');
}

// Test with a real rule that should pass through
console.log('\n🔍 Testing with a rule that should NOT be excluded:');
const testRule = 'color-no-invalid-hex';
const isExcluded = excludeRules.includes(testRule);
console.log(`   Rule: ${testRule}`);
console.log(`   In exclude list: ${isExcluded}`);
console.log(`   Should be filtered: ${isExcluded ? 'YES' : 'NO'}`);

// Show which rules from the sample are being excluded
console.log('\n📋 Rule exclusion analysis:');
sampleResult.messages.forEach(msg => {
  const isExcluded = excludeRules.includes(msg.rule);
  console.log(`   ${msg.rule}: ${isExcluded ? '❌ EXCLUDED' : '✅ INCLUDED'}`);
}); 