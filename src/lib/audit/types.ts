/**
 * Race Condition Audit Types
 * 
 * This module defines the core types for detecting, documenting, and reporting
 * race condition patterns across the application.
 */

/**
 * Categories of race condition patterns
 */
export type RaceConditionCategory =
  | 'create-navigate'
  | 'update-depend'
  | 'delete-refresh'
  | 'auth-access'
  | 'moderation-update';

/**
 * Severity levels for race conditions
 */
export type Severity = 'high' | 'medium' | 'low';

/**
 * Fix strategies for race conditions
 */
export type FixStrategyType =
  | 'wait-response'
  | 'optimistic-update'
  | 'polling-retry'
  | 'delayed-navigation';

/**
 * Status of a race condition pattern
 */
export type PatternStatus = 'identified' | 'fixed' | 'verified';

/**
 * A detected race condition pattern
 */
export interface RaceConditionPattern {
  id: string;
  category: RaceConditionCategory;
  location: string; // file path and line number
  operation: string; // API call being made
  dependentAction: string; // what happens after
  severity: Severity;
  description: string;
  status?: PatternStatus;
  fixStrategy?: FixStrategyType;
}

/**
 * Result of an audit scan
 */
export interface AuditResult {
  patterns: RaceConditionPattern[];
  totalFound: number;
  byCategory: Record<RaceConditionCategory, number>;
  affectedFiles: string[];
  timestamp: Date;
}

/**
 * Fix strategy for a race condition pattern
 */
export interface FixStrategy {
  id: string;
  pattern: RaceConditionPattern;
  strategy: FixStrategyType;
  implementation: string;
  testable: boolean;
}

/**
 * Audit log entry for tracking race condition fixes
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  operation: string;
  category: RaceConditionCategory;
  severity: Severity;
  location: string;
  description: string;
  fixStrategy: FixStrategyType;
  status: PatternStatus;
  notes: string;
}

/**
 * Metrics for race condition audit
 */
export interface RaceConditionMetrics {
  totalPatterns: number;
  byCategory: Record<RaceConditionCategory, number>;
  bySeverity: {
    high: number;
    medium: number;
    low: number;
  };
  fixedCount: number;
  verifiedCount: number;
  pendingCount: number;
}

/**
 * Audit checklist item
 */
export interface AuditChecklistItem {
  location: string;
  pattern: RaceConditionCategory;
  status: PatternStatus;
  fix: FixStrategyType;
  description: string;
}

/**
 * Complete audit checklist
 */
export interface AuditChecklist {
  [key: string]: AuditChecklistItem;
}
