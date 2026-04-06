# Race Condition Audit Infrastructure

This directory contains the infrastructure for detecting, documenting, and reporting race condition patterns across the application.

## Overview

Race conditions occur when resources are created, modified, or deleted, and then immediately accessed before database writes complete, resulting in "resource not found" errors or stale data. This audit infrastructure helps identify and track these patterns systematically.

## Components

### Types (`types.ts`)

Core TypeScript types and interfaces for the audit system:

- `RaceConditionPattern` - A detected race condition pattern
- `AuditResult` - Result of an audit scan
- `RaceConditionMetrics` - Metrics about patterns and fixes
- `AuditLogEntry` - Log entry for tracking fixes
- `AuditChecklist` - Checklist of patterns to fix

### Detector (`detector.ts`)

Pattern detection utilities:

```typescript
import { detector } from '@/lib/audit';

// Add a detected pattern
detector.addPattern(
  'create-navigate',
  'src/pages/CreateQuestionPage.tsx:305',
  'createQuestion',
  'navigate to detail page',
  'high',
  'Navigation immediately after question creation'
);

// Get all patterns
const patterns = detector.getPatterns();

// Get patterns by category
const createNavigate = detector.getPatternsByCategory('create-navigate');

// Generate audit result
const result = detector.generateAuditResult();
```

### Logger (`logger.ts`)

Logging and audit entry management:

```typescript
import { auditLogger } from '@/lib/audit';

// Log messages
auditLogger.info('Starting audit...');
auditLogger.warn('Potential issue detected');
auditLogger.error('Critical error found');

// Create audit entry
auditLogger.createEntry(
  'createQuestion',
  'create-navigate',
  'high',
  'src/pages/CreateQuestionPage.tsx:305',
  'Navigation race condition',
  'wait-response',
  'identified',
  'Needs immediate fix'
);

// Export logs
const logsJson = auditLogger.exportLogs();
```

### Metrics (`metrics.ts`)

Metrics collection and analysis:

```typescript
import { metricsCollector } from '@/lib/audit';

// Calculate metrics
const metrics = metricsCollector.calculateMetrics(patterns);

// Get completion percentage
const completion = metricsCollector.getCompletionPercentage(metrics);

// Get most problematic category
const problematic = metricsCollector.getMostProblematicCategory(metrics);

// Generate summary
const summary = metricsCollector.generateSummary(metrics);
console.log(summary);
```

### Reporter (`reporter.ts`)

Report generation in multiple formats:

```typescript
import { auditReporter } from '@/lib/audit';

// Generate markdown report
const markdownReport = auditReporter.generateReport(result, 'markdown');

// Generate JSON report
const jsonReport = auditReporter.generateReport(result, 'json');

// Generate text report
const textReport = auditReporter.generateReport(result, 'text');

// Generate checklist
const checklist = auditReporter.generateChecklist(patterns);

// Generate fix priority list
const priorityList = auditReporter.generateFixPriorityList(patterns);
```

### CLI (`cli.ts`)

Command-line interface for running audits:

```bash
# Generate markdown report to stdout
tsx src/lib/audit/cli.ts

# Generate JSON report to file
tsx src/lib/audit/cli.ts --format json --output audit-report.json

# Clear existing patterns and generate new report
tsx src/lib/audit/cli.ts --clear --output audit-report.md
```

## Race Condition Categories

The audit system detects five categories of race conditions:

### 1. Create-Then-Navigate

**Pattern:** Creating a resource and immediately navigating to its detail page.

**Example:**
```typescript
// ❌ Race condition
const question = await createQuestion(data);
navigate(`/question/${question.id}`); // May fail if DB write not complete

// ✅ Fixed
const question = await createQuestion(data);
if (question && question.id) {
  navigate(`/question/${question.id}`);
}
```

### 2. Update-Then-Depend

**Pattern:** Updating data and immediately depending on the updated value.

**Example:**
```typescript
// ❌ Race condition
await updateProfile(data);
const profile = getProfile(); // May return stale data

// ✅ Fixed
const updated = await updateProfile(data);
if (updated) {
  const profile = getProfile();
}
```

### 3. Delete-Then-Refresh

**Pattern:** Deleting a resource and immediately refreshing the list.

**Example:**
```typescript
// ❌ Race condition
await deleteQuestion(id);
refreshQuestionList(); // May still show deleted item

// ✅ Fixed
await deleteQuestion(id);
await refreshQuestionList();
```

### 4. Auth-Then-Access

**Pattern:** Authenticating and immediately accessing protected resources.

**Example:**
```typescript
// ❌ Race condition
await login(credentials);
navigate('/dashboard'); // May fail if auth state not updated

// ✅ Fixed
const user = await login(credentials);
if (user) {
  navigate('/dashboard');
}
```

### 5. Moderation-Then-Update

**Pattern:** Performing moderation action and immediately updating lists.

**Example:**
```typescript
// ❌ Race condition
await approveQuestion(id);
refreshAuditList(); // May still show pending item

// ✅ Fixed
await approveQuestion(id);
await refreshAuditList();
```

## Fix Strategies

### Wait-Response

Ensure API response is received and validated before dependent action.

**Use for:** Most race conditions, especially create/update/delete operations.

### Optimistic-Update

Update UI immediately, rollback on failure.

**Use for:** Better UX when operation is likely to succeed.

### Polling-Retry

Retry resource access with exponential backoff.

**Use for:** Eventual consistency scenarios, moderation actions.

### Delayed-Navigation

Add small delay to ensure DB write completes.

**Use for:** Last resort when other strategies don't apply.

## Usage Example

```typescript
import {
  detector,
  auditLogger,
  auditReporter,
  metricsCollector,
} from '@/lib/audit';

// 1. Detect patterns (manual or automated)
detector.addPattern(
  'create-navigate',
  'src/pages/CreateQuestionPage.tsx:305',
  'createQuestion',
  'navigate(ROUTES.question(id))',
  'high',
  'Navigation immediately after question creation'
);

// 2. Log the detection
auditLogger.info('Pattern detected in CreateQuestionPage');

// 3. Generate audit result
const result = detector.generateAuditResult();

// 4. Calculate metrics
const metrics = metricsCollector.calculateMetrics(result.patterns);

// 5. Generate report
const report = auditReporter.generateReport(result, 'markdown');

// 6. Output report
console.log(report);

// 7. Generate fix priority list
const priorityList = auditReporter.generateFixPriorityList(result.patterns);
console.log(priorityList);
```

## Integration with Testing

The audit infrastructure integrates with the testing framework to verify fixes:

```typescript
import { describe, it, expect } from 'vitest';
import { detector } from '@/lib/audit';

describe('Race Condition Fixes', () => {
  it('should wait for response before navigation', async () => {
    // Test implementation
    const question = await createQuestion(data);
    expect(question.id).toBeDefined();
    
    // Mark pattern as fixed
    detector.updatePatternStatus('RC-0001', 'fixed');
  });
});
```

## Best Practices

1. **Detect Early:** Add patterns as soon as they're identified during code review or testing.

2. **Prioritize by Severity:** Fix high-severity patterns first (user-facing, security-related).

3. **Log Everything:** Use the logger to track all detection, fix, and verification activities.

4. **Generate Reports Regularly:** Run audits periodically to track progress.

5. **Verify Fixes:** Update pattern status to 'verified' only after thorough testing.

6. **Document Patterns:** Include clear descriptions and locations for each pattern.

## File Structure

```
src/lib/audit/
├── index.ts          # Main exports
├── types.ts          # TypeScript types
├── detector.ts       # Pattern detection
├── logger.ts         # Logging utilities
├── metrics.ts        # Metrics collection
├── reporter.ts       # Report generation
├── cli.ts            # Command-line interface
└── README.md         # This file
```

## Requirements Coverage

This infrastructure supports the following requirements from the race-condition-audit spec:

- **1.1** - Detect create-then-navigate patterns
- **1.2** - Detect update-then-depend patterns
- **1.3** - Detect delete-then-refresh patterns
- **2.1** - Detect auth-then-access patterns
- **2.2** - Verify auth state before protected access
- **3.1** - Detect moderation-then-update patterns
- **3.2** - Ensure moderation actions complete before list updates

## Next Steps

1. Run initial audit to detect all patterns
2. Generate comprehensive report
3. Prioritize fixes by severity
4. Implement fixes using appropriate strategies
5. Write tests to verify fixes
6. Update pattern status as fixes are verified
7. Monitor for new patterns in code reviews
