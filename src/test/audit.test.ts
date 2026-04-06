/**
 * Race Condition Audit Infrastructure Tests
 * 
 * Unit tests for the audit detection, logging, metrics, and reporting utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RaceConditionDetector } from './detector';
import { AuditLogger } from './logger';
import { MetricsCollector } from './metrics';
import { AuditReporter } from './reporter';
import type { RaceConditionPattern } from './types';

describe('RaceConditionDetector', () => {
  let detector: RaceConditionDetector;

  beforeEach(() => {
    detector = new RaceConditionDetector();
  });

  it('should add a pattern', () => {
    const pattern = detector.addPattern(
      'create-navigate',
      'src/pages/CreateQuestionPage.tsx:305',
      'createQuestion',
      'navigate to detail page',
      'high',
      'Navigation immediately after question creation'
    );

    expect(pattern.id).toBe('RC-0001');
    expect(pattern.category).toBe('create-navigate');
    expect(pattern.severity).toBe('high');
    expect(pattern.status).toBe('identified');
  });

  it('should get patterns by category', () => {
    detector.addPattern(
      'create-navigate',
      'src/pages/CreateQuestionPage.tsx:305',
      'createQuestion',
      'navigate',
      'high',
      'Test 1'
    );
    detector.addPattern(
      'update-depend',
      'src/pages/ProfilePage.tsx:100',
      'updateProfile',
      'display',
      'medium',
      'Test 2'
    );

    const createNavigate = detector.getPatternsByCategory('create-navigate');
    expect(createNavigate).toHaveLength(1);
    expect(createNavigate[0].category).toBe('create-navigate');
  });

  it('should get patterns by severity', () => {
    detector.addPattern('create-navigate', 'file1.ts:1', 'op1', 'action1', 'high', 'desc1');
    detector.addPattern('update-depend', 'file2.ts:2', 'op2', 'action2', 'medium', 'desc2');
    detector.addPattern('delete-refresh', 'file3.ts:3', 'op3', 'action3', 'high', 'desc3');

    const highSeverity = detector.getPatternsBySeverity('high');
    expect(highSeverity).toHaveLength(2);
  });

  it('should update pattern status', () => {
    const pattern = detector.addPattern(
      'create-navigate',
      'file.ts:1',
      'op',
      'action',
      'high',
      'desc'
    );

    detector.updatePatternStatus(pattern.id, 'fixed');
    const patterns = detector.getPatterns();
    expect(patterns[0].status).toBe('fixed');
  });

  it('should generate audit result', () => {
    detector.addPattern('create-navigate', 'file1.ts:1', 'op1', 'action1', 'high', 'desc1');
    detector.addPattern('update-depend', 'file2.ts:2', 'op2', 'action2', 'medium', 'desc2');

    const result = detector.generateAuditResult();

    expect(result.totalFound).toBe(2);
    expect(result.byCategory['create-navigate']).toBe(1);
    expect(result.byCategory['update-depend']).toBe(1);
    expect(result.affectedFiles).toContain('file1.ts');
    expect(result.affectedFiles).toContain('file2.ts');
  });

  it('should clear all patterns', () => {
    detector.addPattern('create-navigate', 'file.ts:1', 'op', 'action', 'high', 'desc');
    detector.clear();

    const patterns = detector.getPatterns();
    expect(patterns).toHaveLength(0);
  });
});

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger();
  });

  it('should log messages', () => {
    logger.info('Test info message');
    logger.warn('Test warn message');
    logger.error('Test error message');

    const logs = logger.getLogs();
    expect(logs).toHaveLength(3);
    expect(logs[0].level).toBe('info');
    expect(logs[1].level).toBe('warn');
    expect(logs[2].level).toBe('error');
  });

  it('should create audit entry', () => {
    const entry = logger.createEntry(
      'createQuestion',
      'create-navigate',
      'high',
      'file.ts:1',
      'Test description',
      'wait-response',
      'identified',
      'Test notes'
    );

    expect(entry.id).toBe('LOG-0001');
    expect(entry.operation).toBe('createQuestion');
    expect(entry.category).toBe('create-navigate');
  });

  it('should update audit entry', () => {
    const entry = logger.createEntry(
      'op',
      'create-navigate',
      'high',
      'file.ts:1',
      'desc',
      'wait-response',
      'identified'
    );

    logger.updateEntry(entry.id, { status: 'fixed', notes: 'Fixed successfully' });

    const entries = logger.getEntries();
    expect(entries[0].status).toBe('fixed');
    expect(entries[0].notes).toBe('Fixed successfully');
  });

  it('should get entries by category', () => {
    logger.createEntry('op1', 'create-navigate', 'high', 'file1.ts:1', 'desc1', 'wait-response', 'identified');
    logger.createEntry('op2', 'update-depend', 'medium', 'file2.ts:2', 'desc2', 'wait-response', 'identified');

    const createNavigate = logger.getEntriesByCategory('create-navigate');
    expect(createNavigate).toHaveLength(1);
    expect(createNavigate[0].category).toBe('create-navigate');
  });

  it('should export logs as JSON', () => {
    logger.info('Test message');
    const json = logger.exportLogs();

    expect(json).toContain('Test message');
    expect(json).toContain('exportedAt');
  });
});

describe('MetricsCollector', () => {
  let collector: MetricsCollector;
  let patterns: RaceConditionPattern[];

  beforeEach(() => {
    collector = new MetricsCollector();
    patterns = [
      {
        id: 'RC-0001',
        category: 'create-navigate',
        location: 'file1.ts:1',
        operation: 'op1',
        dependentAction: 'action1',
        severity: 'high',
        description: 'desc1',
        status: 'identified',
      },
      {
        id: 'RC-0002',
        category: 'update-depend',
        location: 'file2.ts:2',
        operation: 'op2',
        dependentAction: 'action2',
        severity: 'medium',
        description: 'desc2',
        status: 'fixed',
      },
      {
        id: 'RC-0003',
        category: 'create-navigate',
        location: 'file3.ts:3',
        operation: 'op3',
        dependentAction: 'action3',
        severity: 'high',
        description: 'desc3',
        status: 'verified',
      },
    ];
  });

  it('should calculate metrics', () => {
    const metrics = collector.calculateMetrics(patterns);

    expect(metrics.totalPatterns).toBe(3);
    expect(metrics.byCategory['create-navigate']).toBe(2);
    expect(metrics.byCategory['update-depend']).toBe(1);
    expect(metrics.bySeverity.high).toBe(2);
    expect(metrics.bySeverity.medium).toBe(1);
    expect(metrics.fixedCount).toBe(1);
    expect(metrics.verifiedCount).toBe(1);
    expect(metrics.pendingCount).toBe(1);
  });

  it('should calculate completion percentage', () => {
    const metrics = collector.calculateMetrics(patterns);
    const completion = collector.getCompletionPercentage(metrics);

    // 2 out of 3 are fixed or verified = 67%
    expect(completion).toBe(67);
  });

  it('should get most problematic category', () => {
    const metrics = collector.calculateMetrics(patterns);
    const problematic = collector.getMostProblematicCategory(metrics);

    expect(problematic).not.toBeNull();
    expect(problematic?.category).toBe('create-navigate');
    expect(problematic?.count).toBe(2);
  });

  it('should get severity distribution', () => {
    const metrics = collector.calculateMetrics(patterns);
    const distribution = collector.getSeverityDistribution(metrics);

    expect(distribution.high).toBe(67); // 2/3 = 67%
    expect(distribution.medium).toBe(33); // 1/3 = 33%
    expect(distribution.low).toBe(0);
  });

  it('should generate summary text', () => {
    const metrics = collector.calculateMetrics(patterns);
    const summary = collector.generateSummary(metrics);

    expect(summary).toContain('Total Patterns: 3');
    expect(summary).toContain('Fixed: 1');
    expect(summary).toContain('Verified: 1');
    expect(summary).toContain('Pending: 1');
    expect(summary).toContain('Create-Navigate: 2');
  });
});

describe('AuditReporter', () => {
  let reporter: AuditReporter;
  let detector: RaceConditionDetector;

  beforeEach(() => {
    reporter = new AuditReporter();
    detector = new RaceConditionDetector();
    
    detector.addPattern(
      'create-navigate',
      'src/pages/CreateQuestionPage.tsx:305',
      'createQuestion',
      'navigate',
      'high',
      'Navigation race condition'
    );
  });

  it('should generate markdown report', () => {
    const result = detector.generateAuditResult();
    const report = reporter.generateReport(result, 'markdown');

    expect(report).toContain('# Race Condition Audit Report');
    expect(report).toContain('Total Patterns Found');
    expect(report).toContain('Create-Navigate');
    expect(report).toContain('RC-0001');
  });

  it('should generate JSON report', () => {
    const result = detector.generateAuditResult();
    const report = reporter.generateReport(result, 'json');

    const parsed = JSON.parse(report);
    expect(parsed.summary.totalFound).toBe(1);
    expect(parsed.patterns).toHaveLength(1);
  });

  it('should generate text report', () => {
    const result = detector.generateAuditResult();
    const report = reporter.generateReport(result, 'text');

    expect(report).toContain('RACE CONDITION AUDIT REPORT');
    expect(report).toContain('Total Patterns Found: 1');
    expect(report).toContain('CREATE-NAVIGATE');
  });

  it('should generate checklist', () => {
    const patterns = detector.getPatterns();
    const checklist = reporter.generateChecklist(patterns);

    expect(Object.keys(checklist)).toHaveLength(1);
    const firstKey = Object.keys(checklist)[0];
    expect(checklist[firstKey].pattern).toBe('create-navigate');
  });

  it('should generate fix priority list', () => {
    detector.addPattern('update-depend', 'file2.ts:2', 'op2', 'action2', 'medium', 'desc2');
    detector.addPattern('delete-refresh', 'file3.ts:3', 'op3', 'action3', 'low', 'desc3');

    const patterns = detector.getPatterns();
    const priorityList = reporter.generateFixPriorityList(patterns);

    expect(priorityList).toContain('# Fix Priority List');
    expect(priorityList).toContain('## High Priority');
    expect(priorityList).toContain('## Medium Priority');
    expect(priorityList).toContain('## Low Priority');
  });
});
