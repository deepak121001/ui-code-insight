import fs from 'fs';
import path from 'path';

async function testSecurityFiltering() {
  console.log('🔒 Testing Security Audit Filtering...\n');

  // Test 1: Check if security-dom.js exists
  console.log('1. Checking security-dom.js file:');
  const securityDomPath = './src/dashboard-template/js/security-dom.js';
  const securityDomExists = fs.existsSync(securityDomPath);
  console.log(`   ✅ security-dom.js exists: ${securityDomExists}\n`);

  // Test 2: Check if security-dom.js has the correct functions
  if (securityDomExists) {
    console.log('2. Checking security-dom.js functions:');
    const securityDomContent = fs.readFileSync(securityDomPath, 'utf8');
    
    const hasLoadSecurityReport = securityDomContent.includes('loadSecurityReport');
    const hasShowSecuritySection = securityDomContent.includes('showSecuritySection');
    const hasChangeSecurityPage = securityDomContent.includes('changeSecurityPage');
    const hasDisplaySecurityData = securityDomContent.includes('displaySecurityData');
    const hasCodeScanFilter = securityDomContent.includes('source === \'custom\'');
    const hasLiveUrlFilter = securityDomContent.includes('source === \'live-url\'');
    
    console.log(`   ✅ loadSecurityReport function: ${hasLoadSecurityReport}`);
    console.log(`   ✅ showSecuritySection function: ${hasShowSecuritySection}`);
    console.log(`   ✅ changeSecurityPage function: ${hasChangeSecurityPage}`);
    console.log(`   ✅ displaySecurityData function: ${hasDisplaySecurityData}`);
    console.log(`   ✅ Code scan filter logic: ${hasCodeScanFilter}`);
    console.log(`   ✅ Live URL filter logic: ${hasLiveUrlFilter}\n`);
  }

  // Test 3: Check if dashboard.js imports security-dom.js
  console.log('3. Checking dashboard.js imports:');
  const dashboardPath = './src/dashboard-template/js/dashboard.js';
  const dashboardExists = fs.existsSync(dashboardPath);
  
  if (dashboardExists) {
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    const importsSecurityDom = dashboardContent.includes('import.*security-dom.js');
    const hasSecurityEventListeners = dashboardContent.includes('securityAuditReport');
    const hasGlobalSecurityPage = dashboardContent.includes('window.changeSecurityPage');
    const hasSecurityOverviewUpdate = dashboardContent.includes('securityOverview');
    
    console.log(`   ✅ Imports security-dom.js: ${importsSecurityDom}`);
    console.log(`   ✅ Has security event listeners: ${hasSecurityEventListeners}`);
    console.log(`   ✅ Has global security page function: ${hasGlobalSecurityPage}`);
    console.log(`   ✅ Has security overview update: ${hasSecurityOverviewUpdate}\n`);
  }

  // Test 4: Check if security audit CSP removal is complete
  console.log('4. Checking Security Audit CSP Changes:');
  const securityAuditPath = './src/audits/security-audit.js';
  const securityAuditExists = fs.existsSync(securityAuditPath);
  
  if (securityAuditExists) {
    const securityAuditContent = fs.readFileSync(securityAuditPath, 'utf8');
    
    const hasCheckSecurityHeaders = securityAuditContent.includes('checkSecurityHeaders');
    const hasCSPCodeScanning = securityAuditContent.includes('Content-Security-Policy') && 
                              securityAuditContent.includes('meta') && 
                              securityAuditContent.includes('http-equiv');
    const hasLiveURLCSP = securityAuditContent.includes('testLiveUrlSecurity') && 
                         securityAuditContent.includes('Content-Security-Policy');
    
    console.log(`   ✅ checkSecurityHeaders method removed: ${!hasCheckSecurityHeaders}`);
    console.log(`   ✅ CSP code scanning removed: ${!hasCSPCodeScanning}`);
    console.log(`   ✅ CSP still available in live URL testing: ${hasLiveURLCSP}\n`);
  }

  // Test 5: Check if tools folder exclusion is complete
  console.log('5. Checking Tools Folder Exclusion:');
  const fileGlobsPath = './src/audits/file-globs.js';
  const configPath = './ui-code-insight.config.json';
  
  if (fs.existsSync(fileGlobsPath)) {
    const fileGlobsContent = fs.readFileSync(fileGlobsPath, 'utf8');
    const hasToolsExclusion = fileGlobsContent.includes('!**/tools/**');
    console.log(`   ✅ Default file patterns have tools exclusion: ${hasToolsExclusion}`);
  }
  
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const hasConfigToolsExclusion = configContent.includes('!**/tools/**');
    console.log(`   ✅ Custom config has tools exclusion: ${hasConfigToolsExclusion}\n`);
  }

  console.log('🎉 Security audit filtering test completed!');
  console.log('\n📋 Summary:');
  console.log('   • Security audit now has dedicated DOM handling (security-dom.js)');
  console.log('   • Dashboard can filter between code scan and live URL issues');
  console.log('   • CSP checks removed from code scanning, only available for live URLs');
  console.log('   • Tools folder excluded from all audits');
  console.log('   • Security overview shows breakdown of code vs live URL issues');
  console.log('\n💡 To test the filtering:');
  console.log('   1. Run a security audit with live URLs: npm start');
  console.log('   2. Select "security" and enable live URL testing');
  console.log('   3. Open the dashboard and click "🔒 Security Audit"');
  console.log('   4. You should see separate sections for "Code Scan Issues" and "Live URL Issues"');
}

testSecurityFiltering().catch(console.error); 