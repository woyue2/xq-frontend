/**
 * Race Condition Audit Reporter
 * 
 * This module provides utilities for generating comprehensive audit reports
 * in various formats (text, JSON, markdown).
 */

import type {
  AuditResult,
  RaceConditionPattern,
  RaceConditionMetrics,
  AuditChecklist,
  AuditChecklistItem,
} from './types';
import { metricsCollector } from './metrics';

/**
 * Report format options
 */
export type ReportFormat = 'text' | 'json' | 'markdown';

/**
 * Report generator class
 */
export class AuditReporter {
  /**
   * Generate a comprehensive audit report
   */
  generateReport(
    auditResult: AuditResult,
    format: ReportFormat = 'markdown'
  ): string {
    switch (format) {
      case 'text':
        return this.generateTextReport(auditResult);
      case 'json':
        return this.generateJsonReport(auditResult);
      case 'markdown':
        return this.generateMarkdownReport(auditResult);
      default:
        return this.generateMarkdownReport(auditResult);
    }
  }

  /**
   * Generate text format report
   */
  private generateTextReport(auditResult: AuditResult): string {
    const metrics = metricsCollector.calculateMetrics(auditResult.patterns);
    const lines = [
      '========================================',
      '   RACE CONDITION AUDIT REPORT',
      '========================================',
      '',
      `Generated: ${auditResult.timestamp.toISOString()}`,
      `Total Patterns Found: ${auditResult.totalFound}`,
      '',
      metricsCollector.generateSummary(metrics),
      '',
      '========================================',
      '   AFFECTED FILES',
      '========================================',
      '',
      ...auditResult.affectedFiles.map((file, i) => `${i + 1}. ${file}`),
      '',
      '========================================',
      '   DETECTED PATTERNS',
      '========================================',
      '',
    ];

    // Group patterns by category
    const categories = [
      'create-navigate',
      'update-depend',
      'delete-refresh',
      'auth-access',
      'moderation-update',
    ] as const;

    categories.forEach((category) => {
      const categoryPatterns = auditResult.patterns.filter(
        (p) => p.category === category
      );

      if (categoryPatterns.length > 0) {
        lines.push(`--- ${category.toUpperCase()} (${categoryPatterns.length}) ---`);
        lines.push('');

        categoryPatterns.forEach((pattern) => {
          lines.push(`ID: ${pattern.id}`);
          lines.push(`Location: ${pattern.location}`);
          lines.push(`Severity: ${pattern.severity.toUpperCase()}`);
          lines.push(`Operation: ${pattern.operation}`);
          lines.push(`Dependent Action: ${pattern.dependentAction}`);
          lines.push(`Description: ${pattern.description}`);
          lines.push(`Status: ${pattern.status || 'identified'}`);
          if (pattern.fixStrategy) {
            lines.push(`Fix Strategy: ${pattern.fixStrategy}`);
          }
          lines.push('');
        });
      }
    });

    return lines.join('\n');
  }

  /**
   * Generate JSON format report
   */
  private generateJsonReport(auditResult: AuditResult): string {
    const metrics = metricsCollector.calculateMetrics(auditResult.patterns);

    return JSON.stringify(
      {
        timestamp: auditResult.timestamp.toISOString(),
        summary: {
          totalFound: auditResult.totalFound,
          affectedFiles: auditResult.affectedFiles.length,
          metrics,
        },
        patterns: auditResult.patterns,
        affectedFiles: auditResult.affectedFiles,
      },
      null,
      2
    );
  }

  /**
   * Generate markdown format report
   */
  private generateMarkdownReport(auditResult: AuditResult): string {
    const metrics = metricsCollector.calculateMetrics(auditResult.patterns);
    const completion = metricsCollector.getCompletionPercentage(metrics);
    const severityDist = metricsCollector.getSeverityDistribution(metrics);

    const lines = [
      '# Race Condition Audit Report',
      '',
      `**Generated:** ${auditResult.timestamp.toISOString()}`,
      '',
      '## Summary',
      '',
      `- **Total Patterns Found:** ${auditResult.totalFound}`,
      `- **Fixed:** ${metrics.fixedCount}`,
      `- **Verified:** ${metrics.verifiedCount}`,
      `- **Pending:** ${metrics.pendingCount}`,
      `- **Completion:** ${completion}%`,
      '',
      '## Metrics',
      '',
      '### By Category',
      '',
      '| Category | Count |',
      '|----------|-------|',
      `| Create-Navigate | ${metrics.byCategory['create-navigate']} |`,
      `| Update-Depend | ${metrics.byCategory['update-depend']} |`,
      `| Delete-Refresh | ${metrics.byCategory['delete-refresh']} |`,
      `| Auth-Access | ${metrics.byCategory['auth-access']} |`,
      `| Moderation-Update | ${metrics.byCategory['moderation-update']} |`,
      '',
      '### By Severity',
      '',
      '| Severity | Count | Percentage |',
      '|----------|-------|------------|',
      `| High | ${metrics.bySeverity.high} | ${severityDist.high}% |`,
      `| Medium | ${metrics.bySeverity.medium} | ${severityDist.medium}% |`,
      `| Low | ${metrics.bySeverity.low} | ${severityDist.low}% |`,
      '',
      '## Affected Files',
      '',
    ];

    auditResult.affectedFiles.forEach((file) => {
      lines.push(`- \`${file}\``);
    });

    lines.push('');
    lines.push('## Detected Patterns');
    lines.push('');

    // Group patterns by category
    const categories = [
      'create-navigate',
      'update-depend',
      'delete-refresh',
      'auth-access',
      'moderation-update',
    ] as const;

    categories.forEach((category) => {
      const categoryPatterns = auditResult.patterns.filter(
        (p) => p.category === category
      );

      if (categoryPatterns.length > 0) {
        lines.push(`### ${this.formatCategoryName(category)} (${categoryPatterns.length})`);
        lines.push('');

        categoryPatterns.forEach((pattern) => {
          lines.push(`#### ${pattern.id}: ${pattern.operation}`);
          lines.push('');
          lines.push(`- **Location:** \`${pattern.location}\``);
          lines.push(`- **Severity:** ${pattern.severity.toUpperCase()}`);
          lines.push(`- **Dependent Action:** ${pattern.dependentAction}`);
          lines.push(`- **Description:** ${pattern.description}`);
          lines.push(`- **Status:** ${pattern.status || 'identified'}`);
          if (pattern.fixStrategy) {
            lines.push(`- **Fix Strategy:** ${pattern.fixStrategy}`);
          }
          lines.push('');
        });
      }
    });

    return lines.join('\n');
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-');
  }

  /**
   * Generate audit checklist
   */
  generateChecklist(patterns: RaceConditionPattern[]): AuditChecklist {
    const checklist: AuditChecklist = {};

    patterns.forEach((pattern) => {
      const key = pattern.id.toLowerCase().replace(/[^a-z0-9]/g, '_');
      checklist[key] = {
        location: pattern.location,
        pattern: pattern.category,
        status: pattern.status || 'identified',
        fix: pattern.fixStrategy || 'wait-response',
        description: pattern.description,
      };
    });

    return checklist;
  }

  /**
   * Export checklist as markdown
   */
  exportChecklistMarkdown(checklist: AuditChecklist): string {
    const lines = [
      '# Race Condition Audit Checklist',
      '',
      '| ID | Location | Pattern | Status | Fix Strategy | Description |',
      '|----|----------|---------|--------|--------------|-------------|',
    ];

    Object.entries(checklist).forEach(([key, item]) => {
      lines.push(
        `| ${key} | \`${item.location}\` | ${item.pattern} | ${item.status} | ${item.fix} | ${item.description} |`
      );
    });

    return lines.join('\n');
  }

  /**
   * Generate fix priority list
   */
  generateFixPriorityList(patterns: RaceConditionPattern[]): string {
    const pending = patterns.filter((p) => p.status === 'identified');

    // Sort by severity (high > medium > low)
    const sorted = pending.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    const lines = [
      '# Fix Priority List',
      '',
      '## High Priority',
      '',
    ];

    const high = sorted.filter((p) => p.severity === 'high');
    high.forEach((pattern, i) => {
      lines.push(`${i + 1}. **${pattern.id}** - ${pattern.operation}`);
      lines.push(`   - Location: \`${pattern.location}\``);
      lines.push(`   - Fix: ${pattern.fixStrategy || 'wait-response'}`);
      lines.push('');
    });

    lines.push('## Medium Priority');
    lines.push('');

    const medium = sorted.filter((p) => p.severity === 'medium');
    medium.forEach((pattern, i) => {
      lines.push(`${i + 1}. **${pattern.id}** - ${pattern.operation}`);
      lines.push(`   - Location: \`${pattern.location}\``);
      lines.push(`   - Fix: ${pattern.fixStrategy || 'wait-response'}`);
      lines.push('');
    });

    lines.push('## Low Priority');
    lines.push('');

    const low = sorted.filter((p) => p.severity === 'low');
    low.forEach((pattern, i) => {
      lines.push(`${i + 1}. **${pattern.id}** - ${pattern.operation}`);
      lines.push(`   - Location: \`${pattern.location}\``);
      lines.push(`   - Fix: ${pattern.fixStrategy || 'wait-response'}`);
      lines.push('');
    });

    return lines.join('\n');
  }
}

/**
 * Singleton instance of the reporter
 */
export const auditReporter = new AuditReporter();
