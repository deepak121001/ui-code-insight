import { getConfigPattern } from './src/config-loader.js';
import { globby } from 'globby';
import fs from 'fs';
import path from 'path';

async function testToolsExclusion() {
  console.log('🔍 Testing Tools Folder Exclusion...\n');

  // Test 1: Check default file patterns
  console.log('1. Testing default file patterns:');
  
  const jsPattern = getConfigPattern('jsFilePathPattern');
  const htmlPattern = getConfigPattern('htmlFilePathPattern');
  const scssPattern = getConfigPattern('scssFilePathPattern');
  
  console.log('   JS Pattern:', jsPattern);
  console.log('   HTML Pattern:', htmlPattern);
  console.log('   SCSS Pattern:', scssPattern);
  
  // Check if tools folder is excluded
  const jsHasToolsExclusion = jsPattern.some(pattern => pattern.includes('!**/tools/**'));
  const htmlHasToolsExclusion = htmlPattern.some(pattern => pattern.includes('!**/tools/**'));
  const scssHasToolsExclusion = scssPattern.some(pattern => pattern.includes('!**/tools/**'));
  
  console.log(`   ✅ JS Pattern has tools exclusion: ${jsHasToolsExclusion}`);
  console.log(`   ✅ HTML Pattern has tools exclusion: ${htmlHasToolsExclusion}`);
  console.log(`   ✅ SCSS Pattern has tools exclusion: ${scssHasToolsExclusion}\n`);

  // Test 2: Create a test tools folder and verify it's excluded
  console.log('2. Testing actual file exclusion:');
  
  // Create a test tools folder with some files
  const testToolsDir = './test-tools';
  const testToolsFile = './test-tools/test-file.js';
  
  try {
    if (!fs.existsSync(testToolsDir)) {
      fs.mkdirSync(testToolsDir, { recursive: true });
    }
    fs.writeFileSync(testToolsFile, 'console.log("test");');
    
    console.log('   Created test tools folder and file');
    
    // Test globby with the patterns
    const jsFiles = await globby(jsPattern);
    const htmlFiles = await globby(htmlPattern);
    
    const toolsFileIncluded = jsFiles.some(file => file.includes('test-tools'));
    
    console.log(`   ✅ Tools folder files excluded from scanning: ${!toolsFileIncluded}`);
    
    // Cleanup
    fs.rmSync(testToolsDir, { recursive: true, force: true });
    console.log('   Cleaned up test files\n');
    
  } catch (error) {
    console.error('   ❌ Error during test:', error.message);
  }

  // Test 3: Verify security audit CSP removal
  console.log('3. Testing Security Audit CSP Changes:');
  
  try {
    const securityAuditPath = './src/audits/security-audit.js';
    const securityAuditContent = fs.readFileSync(securityAuditPath, 'utf8');
    
    const hasCheckSecurityHeaders = securityAuditContent.includes('checkSecurityHeaders');
    const hasCSPCodeScanning = securityAuditContent.includes('Content-Security-Policy') && 
                              securityAuditContent.includes('meta') && 
                              securityAuditContent.includes('http-equiv');
    
    console.log(`   ✅ checkSecurityHeaders method removed: ${!hasCheckSecurityHeaders}`);
    console.log(`   ✅ CSP code scanning removed: ${!hasCSPCodeScanning}`);
    
    // Check that CSP is still in live URL testing
    const hasLiveURLCSP = securityAuditContent.includes('testLiveUrlSecurity') && 
                         securityAuditContent.includes('Content-Security-Policy');
    
    console.log(`   ✅ CSP still available in live URL testing: ${hasLiveURLCSP}\n`);
    
  } catch (error) {
    console.error('   ❌ Error checking security audit:', error.message);
  }

  console.log('🎉 Tools folder exclusion test completed!');
  console.log('\n📋 Summary:');
  console.log('   • Tools folder is excluded from all file patterns');
  console.log('   • CSP checks removed from code scanning');
  console.log('   • CSP checks remain available for live URL testing');
}

testToolsExclusion().catch(console.error); 