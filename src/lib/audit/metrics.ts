/**
 * Race Condition Audit Metrics
 * 
 * This module provides metrics collection and analysis for race condition
 * patterns, fixes, and verification status.
 */

import type {
  RaceConditionMetrics,
  RaceConditionPattern,
  RaceConditionCategory,
  Severity,
} from './types';

/**
 * Metrics collector class
 */
export class MetricsCollector {
  /**
   * Calculate metrics from patterns
   */
  calculateMetrics(patterns: RaceConditionPattern[]): RaceConditionMetrics {
    const byCategory: Record<RaceConditionCategory, number> = {
      'create-navigate': 0,
      'update-depend': 0,
      'delete-refresh': 0,
      'auth-access': 0,
      'moderation-update': 0,
    };

    const bySeverity = {
      high: 0,
      medium: 0,
      low: 0,
    };

    let fixedCount = 0;
    let verifiedCount = 0;
    let pendingCount = 0;

    patterns.forEach((pattern) => {
      // Count by category
      byCategory[pattern.category]++;

      // Count by severity
      bySeverity[pattern.severity]++;

      // Count by status
      if (pattern.status === 'fixed') {
        fixedCount++;
      } else if (pattern.status === 'verified') {
        verifiedCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      totalPatterns: patterns.length,
      byCategory,
      bySeverity,
      fixedCount,
      verifiedCount,
      pendingCount,
    };
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(metrics: RaceConditionMetrics): number {
    if (metrics.totalPatterns === 0) return 100;
    return Math.round(
      ((metrics.fixedCount + metrics.verifiedCount) / metrics.totalPatterns) * 100
    );
  }

  /**
   * Get category with most issues
   */
  getMostProblematicCategory(
    metrics: RaceConditionMetrics
  ): { category: RaceConditionCategory; count: number } | null {
    let maxCategory: RaceConditionCategory | null = null;
    let maxCount = 0;

    Object.entries(metrics.byCategory).forEach(([category, count]) => {
      if (count > maxCount) {
        maxCategory = category as RaceConditionCategory;
        maxCount = count;
      }
    });

    if (!maxCategory) return null;

    return { category: maxCategory, count: maxCount };
  }

  /**
   * Get severity distribution as percentages
   */
  getSeverityDistribution(metrics: RaceConditionMetrics): {
    high: number;
    medium: number;
    low: number;
  } {
    const total = metrics.totalPatterns;
    if (total === 0) {
      return { high: 0, medium: 0, low: 0 };
    }

    return {
      high: Math.round((metrics.bySeverity.high / total) * 100),
      medium: Math.round((metrics.bySeverity.medium / total) * 100),
      low: Math.round((metrics.bySeverity.low / total) * 100),
    };
  }

  /**
   * Generate metrics summary text
   */
  generateSummary(metrics: RaceConditionMetrics): string {
    const completion = this.getCompletionPercentage(metrics);
    const mostProblematic = this.getMostProblematicCategory(metrics);
    const severityDist = this.getSeverityDistribution(metrics);

    const lines = [
      '=== Race Condition Audit Metrics ===',
      '',
      `Total Patterns: ${metrics.totalPatterns}`,
      `Fixed: ${metrics.fixedCount}`,
      `Verified: ${metrics.verifiedCount}`,
      `Pending: ${metrics.pendingCount}`,
      `Completion: ${completion}%`,
      '',
      '--- By Category ---',
      `Create-Navigate: ${metrics.byCategory['create-navigate']}`,
      `Update-Depend: ${metrics.byCategory['update-depend']}`,
      `Delete-Refresh: ${metrics.byCategory['delete-refresh']}`,
      `Auth-Access: ${metrics.byCategory['auth-access']}`,
      `Moderation-Update: ${metrics.byCategory['moderation-update']}`,
      '',
      '--- By Severity ---',
      `High: ${metrics.bySeverity.high} (${severityDist.high}%)`,
      `Medium: ${metrics.bySeverity.medium} (${severityDist.medium}%)`,
      `Low: ${metrics.bySeverity.low} (${severityDist.low}%)`,
    ];

    if (mostProblematic) {
      lines.push('');
      lines.push('--- Most Problematic ---');
      lines.push(`Category: ${mostProblematic.category}`);
      lines.push(`Count: ${mostProblematic.count}`);
    }

    return lines.join('\n');
  }
}

/**
 * Singleton instance of the metrics collector
 */
export const metricsCollector = new MetricsCollector();
