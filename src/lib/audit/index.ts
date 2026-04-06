/**
 * Race Condition Audit Infrastructure
 * 
 * This module provides a comprehensive suite of tools for detecting,
 * documenting, and reporting race condition patterns in the application.
 * 
 * @module audit
 */

// Export types
export type {
  RaceConditionPattern,
  RaceConditionCategory,
  Severity,
  FixStrategyType,
  PatternStatus,
  AuditResult,
  FixStrategy,
  AuditLogEntry,
  RaceConditionMetrics,
  AuditChecklistItem,
  AuditChecklist,
} from './types';

// Export detector
export { RaceConditionDetector, detector, DETECTION_PATTERNS } from './detector';

// Export logger
export { AuditLogger, auditLogger } from './logger';
export type { LogLevel } from './logger';

// Export metrics
export { MetricsCollector, metricsCollector } from './metrics';

// Export reporter
export { AuditReporter, auditReporter } from './reporter';
export type { ReportFormat } from './reporter';

/**
 * Convenience function to run a complete audit
 */
export function runAudit() {
  const { detector, auditLogger, auditReporter } = require('./index');
  
  auditLogger.info('Starting race condition audit...');
  
  const result = detector.generateAuditResult();
  auditLogger.info(`Audit complete. Found ${result.totalFound} patterns.`);
  
  const report = auditReporter.generateReport(result, 'markdown');
  
  return {
    result,
    report,
  };
}
