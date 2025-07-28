#!/usr/bin/env node

import { codeInsightInit } from '../build/code-insight.js';
import chalk from 'chalk';

/**
 * Test script to demonstrate accessibility URL prompting
 */
async function testAccessibilityPrompt() {
  console.log(chalk.blue('🧪 Testing Accessibility URL Prompting Feature\n'));
  
  try {
    // Test with accessibility audit and live URL testing
    await codeInsightInit({
      projectType: 'React',
      reports: ['accessibility'],
      accessibilityUrls: ['https://example.com', 'https://google.com']
    });
    
    console.log(chalk.green('\n✅ Accessibility audit with live URL testing completed!'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error during testing:'), error.message);
  }
}

// Run the test
testAccessibilityPrompt().catch(console.error); 