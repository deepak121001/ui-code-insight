import audit from "./main.js";
import { AuditOrchestrator } from "./audits/audit-orchestrator.js";

export const codeInsightInit = async (options = {}) => {
  try {
    await audit.createReportFolder();

    const { reports = [], projectType } = options;
    
    if (projectType) {
      console.log(`Project type selected: ${projectType}`);
    }

    // Traditional reports
    if (reports.includes('all') || reports.includes('eslint')) {
      await audit.generateESLintReport(true, projectType, reports);
    }
    if (reports.includes('all') || reports.includes('stylelint')) {
      await audit.generateStyleLintReport(true, projectType, reports);
    }
    if (reports.includes('all') || reports.includes('package')) {
      await audit.generateNpmPackageReport(projectType, reports);
    }

    // Comprehensive audits
    const auditCategories = ['security', 'performance', 'accessibility', 'testing', 'dependency'];
    const hasAuditReports = auditCategories.some(category => reports.includes(category));
    
    if (reports.includes('comprehensive') || hasAuditReports) {
      const orchestrator = new AuditOrchestrator('./report');
      
      if (reports.includes('comprehensive')) {
        await orchestrator.runAllAudits();
      } else {
        for (const category of auditCategories) {
          if (reports.includes(category)) {
            console.log(`\nRunning ${category} audit...`);
            await orchestrator.runSpecificAudit(category);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in codeInsightInit:", error);
  }
  // Ensure config is copied to report folder after all reports
  audit.copyConfigToReportFolder();
};
