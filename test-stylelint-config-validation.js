#!/usr/bin/env node

/**
 * Test script to validate Stylelint configuration
 * This script checks for deprecated or incorrect rule names
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Known deprecated or incorrect rules
const deprecatedRules = {
  'selector-max-compound': 'selector-max-compound-selectors',
  'selector-max-class': 'selector-max-type',
  'selector-max-attribute': 'selector-max-attribute',
  'selector-max-pseudo-class': 'selector-max-pseudo-class',
  'selector-max-combinators': 'selector-max-combinators',
  'selector-max-type-and-class': 'selector-max-type-and-class',
  'selector-max-type-and-attribute': 'selector-max-type-and-attribute',
  'selector-max-type-and-pseudo-class': 'selector-max-type-and-pseudo-class',
  'selector-max-type-and-combinators': 'selector-max-type-and-combinators',
  'selector-max-type-and-attribute-and-pseudo-class': 'selector-max-type-and-attribute-and-pseudo-class',
  'selector-max-type-and-attribute-and-combinators': 'selector-max-type-and-attribute-and-combinators',
  'selector-max-type-and-pseudo-class-and-combinators': 'selector-max-type-and-pseudo-class-and-combinators',
  'selector-max-type-and-attribute-and-pseudo-class-and-combinators': 'selector-max-type-and-attribute-and-pseudo-class-and-combinators'
};

// Current valid rules (as of Stylelint 15.x)
const validRules = [
  'selector-max-compound-selectors',
  'selector-max-specificity',
  'selector-no-qualifying-type',
  'selector-max-id',
  'selector-max-type',
  'selector-max-universal',
  'selector-max-attribute',
  'selector-max-pseudo-class',
  'selector-max-combinators',
  'selector-max-type-and-class',
  'selector-max-type-and-attribute',
  'selector-max-type-and-pseudo-class',
  'selector-max-type-and-combinators',
  'selector-max-type-and-attribute-and-pseudo-class',
  'selector-max-type-and-attribute-and-combinators',
  'selector-max-type-and-pseudo-class-and-combinators',
  'selector-max-type-and-attribute-and-pseudo-class-and-combinators'
];

function validateStylelintConfig() {
  console.log('🔍 Validating Stylelint configuration...\n');
  
  // Read the Stylelint config
  const configPath = path.join(__dirname, 'src/config/.stylelintrc.json');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ Stylelint config file not found:', configPath);
    return;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const rules = config.rules || {};
    
    console.log('📋 Current configuration rules:');
    Object.entries(rules).forEach(([rule, value]) => {
      console.log(`  ${rule}: ${value}`);
    });
    
    console.log('\n🔍 Checking for deprecated rules...');
    let hasDeprecatedRules = false;
    
    Object.entries(rules).forEach(([rule, value]) => {
      if (deprecatedRules[rule]) {
        console.log(`❌ Deprecated rule found: "${rule}" should be "${deprecatedRules[rule]}"`);
        hasDeprecatedRules = true;
      } else if (!validRules.includes(rule) && !rule.startsWith('scss/')) {
        console.log(`⚠️  Unknown rule: "${rule}" - may not exist in current Stylelint version`);
      } else {
        console.log(`✅ Valid rule: "${rule}"`);
      }
    });
    
    if (hasDeprecatedRules) {
      console.log('\n🛠️  To fix deprecated rules, update your .stylelintrc.json:');
      Object.entries(deprecatedRules).forEach(([oldRule, newRule]) => {
        if (rules[oldRule] !== undefined) {
          console.log(`  Change "${oldRule}": ${rules[oldRule]} to "${newRule}": ${rules[oldRule]}`);
        }
      });
    } else {
      console.log('\n✅ No deprecated rules found!');
    }
    
    // Check for common issues
    console.log('\n🔍 Checking for common issues...');
    
    if (rules['selector-max-compound']) {
      console.log('❌ Found deprecated rule "selector-max-compound" - this is causing "Unknown rule" errors');
      console.log('   Change to "selector-max-compound-selectors"');
    }
    
    if (rules['selector-max-class']) {
      console.log('❌ Found deprecated rule "selector-max-class" - this may cause issues');
      console.log('   Change to "selector-max-type"');
    }
    
    console.log('\n✅ Configuration validation complete!');
    
  } catch (error) {
    console.error('❌ Error reading Stylelint config:', error.message);
  }
}

function checkReportForUnknownRules() {
  console.log('\n📊 Checking existing reports for "Unknown rule" errors...\n');
  
  const reportPath = path.join(__dirname, 'report/stylelint-report copy.json');
  
  if (!fs.existsSync(reportPath)) {
    console.log('ℹ️  No report file found to analyze');
    return;
  }
  
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const results = report.results || [];
    
    let unknownRuleCount = 0;
    const unknownRules = new Set();
    
    results.forEach(result => {
      if (result.messages) {
        result.messages.forEach(message => {
          if (message.message && message.message.includes('Unknown rule')) {
            unknownRuleCount++;
            const ruleMatch = message.message.match(/Unknown rule ([^.]+)/);
            if (ruleMatch) {
              unknownRules.add(ruleMatch[1]);
            }
          }
        });
      }
    });
    
    if (unknownRuleCount > 0) {
      console.log(`❌ Found ${unknownRuleCount} "Unknown rule" errors`);
      console.log('📋 Unknown rules found:');
      unknownRules.forEach(rule => {
        console.log(`  - ${rule}`);
        if (deprecatedRules[rule]) {
          console.log(`    → Should be: ${deprecatedRules[rule]}`);
        }
      });
    } else {
      console.log('✅ No "Unknown rule" errors found in report');
    }
    
  } catch (error) {
    console.error('❌ Error reading report file:', error.message);
  }
}

// Run validation
validateStylelintConfig();
checkReportForUnknownRules(); 