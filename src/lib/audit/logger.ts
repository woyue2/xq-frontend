/**
 * Race Condition Audit Logger
 * 
 * This module provides logging and metrics collection for race condition
 * detection, fixes, and verification.
 */

import type {
  AuditLogEntry,
  RaceConditionCategory,
  Severity,
  FixStrategyType,
  PatternStatus,
} from './types';

/**
 * Log level for audit messages
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Audit log message
 */
interface AuditLogMessage {
  level: LogLevel;
  timestamp: Date;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Audit logger class
 */
export class AuditLogger {
  private logs: AuditLogMessage[] = [];
  private entries: AuditLogEntry[] = [];
  private nextEntryId = 1;

  /**
   * Generate a unique ID for a log entry
   */
  private generateEntryId(): string {
    return `LOG-${String(this.nextEntryId++).padStart(4, '0')}`;
  }

  /**
   * Log a message
   */
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const logMessage: AuditLogMessage = {
      level,
      timestamp: new Date(),
      message,
      context,
    };

    this.logs.push(logMessage);

    // In development, also log to console
    if (import.meta.env.DEV) {
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      console.log(`[${level.toUpperCase()}] ${message}${contextStr}`);
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Create an audit log entry
   */
  createEntry(
    operation: string,
    category: RaceConditionCategory,
    severity: Severity,
    location: string,
    description: string,
    fixStrategy: FixStrategyType,
    status: PatternStatus,
    notes: string = ''
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: this.generateEntryId(),
      timestamp: new Date(),
      operation,
      category,
      severity,
      location,
      description,
      fixStrategy,
      status,
      notes,
    };

    this.entries.push(entry);
    this.info(`Audit entry created: ${operation}`, {
      id: entry.id,
      category,
      severity,
      status,
    });

    return entry;
  }

  /**
   * Update an audit log entry
   */
  updateEntry(id: string, updates: Partial<AuditLogEntry>): void {
    const entry = this.entries.find((e) => e.id === id);
    if (entry) {
      Object.assign(entry, updates);
      this.info(`Audit entry updated: ${id}`, updates);
    }
  }

  /**
   * Get all audit log entries
   */
  getEntries(): AuditLogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries by category
   */
  getEntriesByCategory(category: RaceConditionCategory): AuditLogEntry[] {
    return this.entries.filter((e) => e.category === category);
  }

  /**
   * Get entries by status
   */
  getEntriesByStatus(status: PatternStatus): AuditLogEntry[] {
    return this.entries.filter((e) => e.status === status);
  }

  /**
   * Get all log messages
   */
  getLogs(): AuditLogMessage[] {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): AuditLogMessage[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Clear all logs and entries
   */
  clear(): void {
    this.logs = [];
    this.entries = [];
    this.nextEntryId = 1;
  }

  /**
   * Export logs to JSON
   */
  exportLogs(): string {
    return JSON.stringify(
      {
        logs: this.logs,
        entries: this.entries,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

/**
 * Singleton instance of the logger
 */
export const auditLogger = new AuditLogger();
