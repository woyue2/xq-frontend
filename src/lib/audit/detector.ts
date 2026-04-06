/**
 * Race Condition Detection Utilities
 * 
 * This module provides utilities for detecting race condition patterns
 * in the codebase through static analysis and pattern matching.
 */

import type {
  RaceConditionPattern,
  RaceConditionCategory,
  Severity,
  AuditResult,
} from './types';

/**
 * Pattern detection configuration
 */
interface DetectionPattern {
  category: RaceConditionCategory;
  searchPattern: RegExp;
  severity: Severity;
  description: string;
}

/**
 * Predefined detection patterns for common race conditions
 */
export const DETECTION_PATTERNS: DetectionPattern[] = [
  {
    category: 'create-navigate',
    searchPattern: /navigate\(ROUTES\./,
    severity: 'high',
    description: 'Navigation immediately after create operation',
  },
  {
    category: 'update-depend',
    searchPattern: /setState\(.*\).*after.*update/i,
    severity: 'medium',
    description: 'State update immediately after API update',
  },
  {
    category: 'delete-refresh',
    searchPattern: /delete.*refresh|remove.*reload/i,
    severity: 'medium',
    description: 'List refresh immediately after delete operation',
  },
  {
    category: 'auth-access',
    searchPattern: /login.*navigate|authenticate.*access/i,
    severity: 'high',
    description: 'Protected resource access immediately after auth',
  },
  {
    category: 'moderation-update',
    searchPattern: /approve|reject.*update.*list/i,
    severity: 'medium',
    description: 'List update immediately after moderation action',
  },
];

/**
 * Detector class for identifying race condition patterns
 */
export class RaceConditionDetector {
  private patterns: RaceConditionPattern[] = [];
  private nextId = 1;

  /**
   * Generate a unique ID for a pattern
   */
  private generateId(): string {
    return `RC-${String(this.nextId++).padStart(4, '0')}`;
  }

  /**
   * Add a detected pattern
   */
  addPattern(
    category: RaceConditionCategory,
    location: string,
    operation: string,
    dependentAction: string,
    severity: Severity,
    description: string
  ): RaceConditionPattern {
    const pattern: RaceConditionPattern = {
      id: this.generateId(),
      category,
      location,
      operation,
      dependentAction,
      severity,
      description,
      status: 'identified',
    };

    this.patterns.push(pattern);
    return pattern;
  }

  /**
   * Get all detected patterns
   */
  getPatterns(): RaceConditionPattern[] {
    return [...this.patterns];
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: RaceConditionCategory): RaceConditionPattern[] {
    return this.patterns.filter((p) => p.category === category);
  }

  /**
   * Get patterns by severity
   */
  getPatternsBySeverity(severity: Severity): RaceConditionPattern[] {
    return this.patterns.filter((p) => p.severity === severity);
  }

  /**
   * Get patterns by status
   */
  getPatternsByStatus(status: 'identified' | 'fixed' | 'verified'): RaceConditionPattern[] {
    return this.patterns.filter((p) => p.status === status);
  }

  /**
   * Update pattern status
   */
  updatePatternStatus(id: string, status: 'identified' | 'fixed' | 'verified'): void {
    const pattern = this.patterns.find((p) => p.id === id);
    if (pattern) {
      pattern.status = status;
    }
  }

  /**
   * Generate audit result
   */
  generateAuditResult(): AuditResult {
    const byCategory: Record<RaceConditionCategory, number> = {
      'create-navigate': 0,
      'update-depend': 0,
      'delete-refresh': 0,
      'auth-access': 0,
      'moderation-update': 0,
    };

    const affectedFilesSet = new Set<string>();

    this.patterns.forEach((pattern) => {
      byCategory[pattern.category]++;
      // Extract file path from location (format: "path/to/file.ts:line")
      const filePath = pattern.location.split(':')[0];
      affectedFilesSet.add(filePath);
    });

    return {
      patterns: this.getPatterns(),
      totalFound: this.patterns.length,
      byCategory,
      affectedFiles: Array.from(affectedFilesSet),
      timestamp: new Date(),
    };
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.patterns = [];
    this.nextId = 1;
  }
}

/**
 * Singleton instance of the detector
 */
export const detector = new RaceConditionDetector();
