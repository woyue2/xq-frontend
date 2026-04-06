# Race Condition Audit Design

## Overview

This design document outlines a systematic approach to identifying, documenting, and fixing race condition issues in the application. Race conditions occur when resources are created, modified, or deleted, and then immediately accessed before database writes complete, resulting in "resource not found" errors or stale data.

The known issue in CreateQuestionPage (navigating to detail page immediately after creation) exemplifies this pattern. This audit will identify all similar patterns across the application and provide a comprehensive fix strategy.

## Problem Statement

**Current Behavior:**
- User creates a question via API
- Frontend receives success response
- Frontend immediately navigates to `/question/{id}`
- Database write may still be in progress
- Detail page loads and queries the database
- Resource not found error occurs

**Root Cause:**
- Assumption that API response = database write complete
- No verification that resource is actually persisted and queryable
- No retry logic for transient failures
- No optimistic updates or polling mechanisms

## Architecture

### Race Condition Categories

#### 1. Create-Then-Navigate Pattern
**Affected Operations:**
- Question creation → navigate to detail page
- Answer creation → navigate to question detail page
- Comment creation → add to comment list
- User registration → navigate to dashboard

**Risk Level:** HIGH - User-facing navigation failures

#### 2. Update-Then-Depend Pattern
**Affected Operations:**
- Update question → use updated data in subsequent operations
- Update user profile → display updated profile
- Update settings → apply settings immediately

**Risk Level:** MEDIUM - Data consistency issues

#### 3. Delete-Then-Refresh Pattern
**Affected Operations:**
- Delete question → refresh question list
- Delete answer → refresh answer list
- Delete comment → refresh comment list

**Risk Level:** MEDIUM - List state inconsistency

#### 4. Auth-Then-Access Pattern
**Affected Operations:**
- Login → navigate to protected page
- Logout → clear protected data
- Permission update → access restricted features

**Risk Level:** HIGH - Security and access control

#### 5. Moderation-Then-Update Pattern
**Affected Operations:**
- Approve question → update audit list
- Reject question → update audit list
- Pin/unpin question → update question list

**Risk Level:** MEDIUM - Admin workflow disruption

## Components and Interfaces

### 1. Race Condition Detection Layer

```typescript
// Audit patterns to detect
interface RaceConditionPattern {
  id: string;
  category: 'create-navigate' | 'update-depend' | 'delete-refresh' | 'auth-access' | 'moderation-update';
  location: string; // file path and line number
  operation: string; // API call being made
  dependentAction: string; // what happens after
  severity: 'high' | 'medium' | 'low';
  description: string;
}

// Audit result
interface AuditResult {
  patterns: RaceConditionPattern[];
  totalFound: number;
  byCategory: Record<string, number>;
  affectedFiles: string[];
}
```

### 2. Fix Strategy Interface

```typescript
interface FixStrategy {
  id: string;
  pattern: RaceConditionPattern;
  strategy: 'wait-response' | 'optimistic-update' | 'polling-retry' | 'delayed-navigation';
  implementation: string;
  testable: boolean;
}

interface WaitResponseStrategy {
  type: 'wait-response';
  description: 'Ensure API response received before dependent action';
  implementation: 'Verify response status and data before proceeding';
}

interface OptimisticUpdateStrategy {
  type: 'optimistic-update';
  description: 'Update UI immediately, rollback on failure';
  implementation: 'Update local state, revert on API error';
}

interface PollingRetryStrategy {
  type: 'polling-retry';
  description: 'Retry resource access with exponential backoff';
  implementation: 'Poll resource endpoint until available or timeout';
}

interface DelayedNavigationStrategy {
  type: 'delayed-navigation';
  description: 'Add small delay to ensure DB write completes';
  implementation: 'Wait 100-500ms before navigation';
}
```

### 3. Audit Checklist

```typescript
interface AuditChecklist {
  // Create operations
  createQuestion: {
    location: 'src/pages/CreateQuestionPage.tsx:305';
    pattern: 'create-navigate';
    status: 'identified';
    fix: 'wait-response';
  };
  createAnswer: {
    location: 'src/pages/AnswerQuestionPage.tsx:337';
    pattern: 'create-navigate';
    status: 'identified';
    fix: 'wait-response';
  };
  // ... more operations
}
```

## Data Models

### Audit Log Entry

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  operation: string;
  category: string;
  severity: 'high' | 'medium' | 'low';
  location: string;
  description: string;
  fixStrategy: string;
  status: 'identified' | 'fixed' | 'verified';
  notes: string;
}
```

### Race Condition Metrics

```typescript
interface RaceConditionMetrics {
  totalPatterns: number;
  byCategory: {
    'create-navigate': number;
    'update-depend': number;
    'delete-refresh': number;
    'auth-access': number;
    'moderation-update': number;
  };
  bySeverity: {
    high: number;
    medium: number;
    low: number;
  };
  fixedCount: number;
  verifiedCount: number;
  pendingCount: number;
}
```

## Audit Methodology

### Phase 1: Code Pattern Detection

**Search Patterns:**
1. `navigate(ROUTES.*)` immediately after API calls
2. `setState(...)` immediately after API calls without response verification
3. List refresh operations without waiting for delete/update responses
4. Auth state changes without verification before protected access

**Tools:**
- Grep search for navigation patterns
- AST analysis for control flow
- Manual code review for context

### Phase 2: Pattern Classification

For each detected pattern:
1. Identify the operation type (create/update/delete/auth/moderation)
2. Determine the dependent action
3. Assess severity based on user impact
4. Document the exact code location

### Phase 3: Fix Strategy Selection

For each pattern, select the appropriate fix:

| Pattern | Strategy | Rationale |
|---------|----------|-----------|
| Create-Navigate | Wait Response | Ensure resource exists before navigation |
| Update-Depend | Wait Response | Ensure data is persisted before use |
| Delete-Refresh | Wait Response | Ensure deletion is complete before refresh |
| Auth-Access | Wait Response + Verify | Ensure auth state is updated before access |
| Moderation-Update | Polling Retry | Handle eventual consistency |

### Phase 4: Implementation

**For Wait Response Strategy:**
```typescript
// Before (race condition)
const created = await questionService.createQuestion(payload);
navigate(ROUTES.question(created.id));

// After (fixed)
const created = await questionService.createQuestion(payload);
if (created && created.id) {
  // Verify response contains required data
  navigate(ROUTES.question(created.id));
} else {
  toast.error('Failed to create question');
}
```

**For Polling Retry Strategy:**
```typescript
// Implement retry logic with exponential backoff
async function fetchWithRetry(
  fetchFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 100
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = initialDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**For Optimistic Update Strategy:**
```typescript
// Update UI immediately, revert on failure
const optimisticId = generateTempId();
setItems([...items, { id: optimisticId, ...newItem }]);

try {
  const created = await service.create(newItem);
  setItems(items => items.map(item => 
    item.id === optimisticId ? created : item
  ));
} catch (error) {
  setItems(items => items.filter(item => item.id !== optimisticId));
  toast.error('Failed to create item');
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Create Operations Wait for Response

*For any* create operation (question, answer, comment), the system SHALL NOT navigate to or access the created resource until the API response is successfully received and contains the resource ID.

**Validates: Requirements 1.1, 4.1, 4.2**

### Property 2: Update Operations Complete Before Dependent Actions

*For any* update operation, the system SHALL NOT perform dependent operations (state updates, navigation, list refresh) until the API response is successfully received.

**Validates: Requirements 1.2**

### Property 3: Delete Operations Complete Before List Refresh

*For any* delete operation, the system SHALL NOT refresh the resource list until the API response is successfully received.

**Validates: Requirements 1.3, 3.2**

### Property 4: Auth State Verified Before Protected Access

*For any* protected resource access, the system SHALL verify that auth state is properly updated before allowing navigation or data access.

**Validates: Requirements 2.1, 2.2**

### Property 5: Moderation Actions Update Lists After Response

*For any* moderation action (approve, reject, pin, unpin), the system SHALL NOT update the audit or question list until the API response is successfully received.

**Validates: Requirements 3.1, 3.2**

### Property 6: Resource Not Found Handled Gracefully

*For any* resource access that results in a 404 error, the system SHALL display an appropriate error message and not crash or show broken UI.

**Validates: Requirements 5.1**

### Property 7: Retry Logic Implements Exponential Backoff

*For any* retry attempt after a transient failure, the system SHALL implement exponential backoff with delays increasing by a factor of 2 (100ms, 200ms, 400ms, etc.).

**Validates: Requirements 5.2**

## Error Handling

### Error Scenarios

1. **API Response Timeout**
   - Timeout after 30 seconds
   - Show "Request timeout" error
   - Allow user to retry

2. **Resource Not Found After Creation**
   - Implement polling retry (3 attempts, exponential backoff)
   - If still not found, show error with option to navigate to list
   - Log incident for debugging

3. **Network Failure During Operation**
   - Catch network errors
   - Show "Network error" message
   - Provide retry button

4. **Auth State Mismatch**
   - Detect when auth state doesn't match expected state
   - Force re-authentication
   - Clear cached data

5. **Concurrent Operations**
   - Prevent duplicate submissions (disable button during request)
   - Queue operations if necessary
   - Show loading state

### Error Recovery Strategies

| Error Type | Recovery Strategy |
|-----------|------------------|
| Timeout | Retry with exponential backoff |
| Not Found | Poll with retry, then show error |
| Network Error | Retry with user confirmation |
| Auth Mismatch | Force re-authentication |
| Concurrent | Queue or prevent duplicate |

## Testing Strategy

### Unit Testing Approach

**Test Examples (not exhaustive):**

1. **Create Question Success**
   - Create question with valid data
   - Verify API response received
   - Verify navigation occurs
   - Verify question is accessible at detail page

2. **Create Question Failure**
   - Create question with invalid data
   - Verify error message shown
   - Verify no navigation occurs
   - Verify form state preserved

3. **Delete Question Success**
   - Delete question
   - Verify API response received
   - Verify list refreshed
   - Verify question removed from list

4. **Auth State Update**
   - Login with valid credentials
   - Verify auth state updated
   - Verify protected page accessible
   - Verify user data loaded

### Property-Based Testing Approach

**Configuration:**
- Minimum 100 iterations per property test
- Use fast-check or similar library for TypeScript
- Tag each test with feature and property reference

**Property Test 1: Create Operations Wait for Response**
```typescript
// Feature: race-condition-audit, Property 1: Create Operations Wait for Response
test('create operations wait for response before navigation', async () => {
  // Generate random question data
  const questionData = fc.record({
    title: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ maxLength: 500 }),
    subject: fc.sampled(['math', 'english', 'science']),
  });

  await fc.assert(
    fc.asyncProperty(questionData, async (data) => {
      // Create question
      const response = await questionService.createQuestion(data);
      
      // Verify response contains ID
      expect(response.id).toBeDefined();
      
      // Verify resource is accessible
      const fetched = await questionService.getQuestionById(response.id);
      expect(fetched).toBeDefined();
      expect(fetched.title).toBe(data.title);
    }),
    { numRuns: 100 }
  );
});
```

**Property Test 2: Update Operations Complete Before Dependent Actions**
```typescript
// Feature: race-condition-audit, Property 2: Update Operations Complete Before Dependent Actions
test('update operations complete before dependent actions', async () => {
  const updateData = fc.record({
    title: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ maxLength: 500 }),
  });

  await fc.assert(
    fc.asyncProperty(updateData, async (data) => {
      // Create initial question
      const created = await questionService.createQuestion({
        title: 'Original',
        content: 'Original content',
        subject: 'math',
      });

      // Update question
      const updated = await questionService.updateQuestion(created.id, data);
      
      // Verify update is reflected
      const fetched = await questionService.getQuestionById(created.id);
      expect(fetched.title).toBe(data.title);
      expect(fetched.content).toBe(data.content);
    }),
    { numRuns: 100 }
  );
});
```

**Property Test 3: Delete Operations Complete Before List Refresh**
```typescript
// Feature: race-condition-audit, Property 3: Delete Operations Complete Before List Refresh
test('delete operations complete before list refresh', async () => {
  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (count) => {
      // Create multiple questions
      const questions = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          questionService.createQuestion({
            title: `Question ${i}`,
            content: `Content ${i}`,
            subject: 'math',
          })
        )
      );

      // Delete first question
      await questionService.delete(questions[0].id);

      // Refresh list
      const list = await questionService.getQuestions();

      // Verify deleted question not in list
      const ids = list.items.map(q => q.id);
      expect(ids).not.toContain(questions[0].id);
    }),
    { numRuns: 100 }
  );
});
```

**Property Test 4: Auth State Verified Before Protected Access**
```typescript
// Feature: race-condition-audit, Property 4: Auth State Verified Before Protected Access
test('auth state verified before protected access', async () => {
  const credentials = fc.record({
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    password: fc.string({ minLength: 6, maxLength: 20 }),
  });

  await fc.assert(
    fc.asyncProperty(credentials, async (creds) => {
      // Login
      const response = await authService.login(creds.phone, creds.password);
      
      // Verify auth state updated
      const user = useAuthStore.getState().user;
      expect(user).toBeDefined();
      expect(user?.id).toBe(response.user.id);

      // Verify protected resource accessible
      const profile = await userService.getProfile();
      expect(profile).toBeDefined();
    }),
    { numRuns: 100 }
  );
});
```

**Property Test 5: Moderation Actions Update Lists After Response**
```typescript
// Feature: race-condition-audit, Property 5: Moderation Actions Update Lists After Response
test('moderation actions update lists after response', async () => {
  await fc.assert(
    fc.asyncProperty(fc.boolean(), async (shouldApprove) => {
      // Get pending question
      const pending = await auditService.getPendingQuestions({ page: 1, pageSize: 1 });
      if (pending.items.length === 0) return; // Skip if no pending

      const question = pending.items[0];

      // Perform moderation action
      if (shouldApprove) {
        await auditService.approveQuestion(question.id);
      } else {
        await auditService.rejectQuestion(question.id, 'Test rejection');
      }

      // Verify list updated
      const updated = await auditService.getPendingQuestions({ page: 1, pageSize: 1 });
      const ids = updated.items.map(q => q.id);
      expect(ids).not.toContain(question.id);
    }),
    { numRuns: 100 }
  );
});
```

**Property Test 6: Resource Not Found Handled Gracefully**
```typescript
// Feature: race-condition-audit, Property 6: Resource Not Found Handled Gracefully
test('resource not found handled gracefully', async () => {
  const fakeId = fc.string({ minLength: 20, maxLength: 30 });

  await fc.assert(
    fc.asyncProperty(fakeId, async (id) => {
      try {
        await questionService.getQuestionById(id);
        // Should throw or return null
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        // Verify error is handled gracefully
        expect(error.response?.status).toBe(404);
      }
    }),
    { numRuns: 100 }
  );
});
```

**Property Test 7: Retry Logic Implements Exponential Backoff**
```typescript
// Feature: race-condition-audit, Property 7: Retry Logic Implements Exponential Backoff
test('retry logic implements exponential backoff', async () => {
  const delays: number[] = [];
  let attemptCount = 0;

  const mockFetch = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('Transient failure');
    }
    return { success: true };
  };

  const startTime = Date.now();
  const result = await fetchWithRetry(mockFetch, 3, 100);
  const totalTime = Date.now() - startTime;

  // Verify exponential backoff: 100ms + 200ms = 300ms minimum
  expect(totalTime).toBeGreaterThanOrEqual(300);
  expect(result.success).toBe(true);
});
```

## Implementation Approach

### Phase 1: Audit (Week 1)
1. Identify all race condition patterns using grep and manual review
2. Document each pattern with location, severity, and impact
3. Create audit report with metrics

### Phase 2: Fix Strategy (Week 2)
1. For each pattern, select appropriate fix strategy
2. Implement fixes in order of severity
3. Add error handling and retry logic

### Phase 3: Testing (Week 3)
1. Write unit tests for each fixed operation
2. Implement property-based tests
3. Run full test suite

### Phase 4: Verification (Week 4)
1. Manual testing of fixed flows
2. Load testing to verify no new issues
3. Deploy and monitor

## Known Issues and Mitigations

### Issue 1: CreateQuestionPage Navigation Race
**Location:** `src/pages/CreateQuestionPage.tsx:305`
**Current Behavior:** Navigates immediately after API response
**Mitigation:** Verify response contains valid ID before navigation
**Status:** Identified, awaiting fix

### Issue 2: AnswerQuestionPage Navigation Race
**Location:** `src/pages/AnswerQuestionPage.tsx:337`
**Current Behavior:** Navigates immediately after API response
**Mitigation:** Verify response contains valid ID before navigation
**Status:** Identified, awaiting fix

## Monitoring and Observability

### Metrics to Track
- Number of "resource not found" errors after navigation
- API response times for create/update/delete operations
- Retry attempt counts and success rates
- User-reported race condition issues

### Logging Strategy
- Log all API responses with timestamps
- Log navigation events with resource IDs
- Log retry attempts with backoff delays
- Log errors with full context

### Alerts
- Alert on high rate of "resource not found" errors
- Alert on API response timeouts
- Alert on repeated retry failures

## References

- [Race Conditions in Web Applications](https://owasp.org/www-community/attacks/Race_condition)
- [Optimistic UI Updates](https://www.apollographql.com/docs/react/performance/optimistic-ui/)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Property-Based Testing](https://hypothesis.works/articles/what-is-property-based-testing/)
