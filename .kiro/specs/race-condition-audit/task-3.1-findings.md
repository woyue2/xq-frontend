# Task 3.1 Findings: Update-Then-Depend Pattern Audit

**Task:** Search codebase for update operations followed by dependent actions  
**Date:** 2024  
**Validates:** Requirements 1.2

## Executive Summary

Found **15 instances** of update-then-depend patterns where API update operations are followed by immediate dependent actions without proper verification of API response completion.

### Severity Breakdown
- **HIGH:** 1 pattern
- **MEDIUM:** 11 patterns  
- **LOW:** 3 patterns

### Category Breakdown
- **Profile Updates:** 4 patterns
- **Notification Updates:** 2 patterns
- **Question Updates:** 3 patterns
- **Audit Operations:** 6 patterns

---

## Detailed Findings

### HIGH Severity Patterns

#### Pattern 4: Profile Nickname Update → User State Update
**Location:** `src/hooks/useProfile.ts:133-136`  
**Severity:** HIGH

```typescript
const updatedUser = await userService.updateProfile({ nickname: newNickname });
updateUser(updatedUser);
toast.success(aiTextConfig.auditMessages.nicknameUpdated);
setShowNicknameDialog(false);
```

**Issue:**
- Updates profile nickname via API
- Immediately updates user state with response
- Shows success message and closes dialog
- Assumes API response contains valid updated user data

**Dependent Actions:**
- `updateUser()` - Updates global user state
- `toast.success()` - Shows success message
- `setShowNicknameDialog(false)` - Closes dialog

**Risk:**
- If API returns success but with incomplete data, user state becomes invalid
- Nickname might not pass AI audit, but UI shows success
- User sees updated nickname immediately, but it might be rejected later

**Fix Strategy:** Wait Response + Verify
- Verify API response contains valid user data
- Check if nickname was actually updated (not just pending audit)
- Show appropriate message based on audit status
- Keep dialog open if update is pending audit

---

### MEDIUM Severity Patterns

#### Pattern 1: Notification Mark as Read → State Update
**Location:** `src/pages/NotificationsPage.tsx:93-95`  
**Severity:** MEDIUM

```typescript
await notificationService.markAsRead([n.id]);
setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, isRead: true } : it)));
setUnreadCount((prev) => Math.max(0, prev - 1));
```

**Issue:**
- After marking notification as read via API, immediately updates local state
- If API call succeeds but response is delayed, state updates before confirmation
- No verification that the API operation actually completed successfully

**Dependent Actions:**
- `setItems()` - Updates notification list state
- `setUnreadCount()` - Updates unread counter

**Risk:**
- UI shows notification as read before database confirms the update
- If API fails silently, UI state becomes inconsistent with server state
- User might see notification as read, but it's still unread on server

**Fix Strategy:** Wait Response

---

#### Pattern 2: Mark All Notifications as Read → Batch State Update
**Location:** `src/pages/NotificationsPage.tsx:115-117`  
**Severity:** MEDIUM

```typescript
await notificationService.markAsRead(ids);
setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
setUnreadCount(0);
```

**Issue:**
- Batch marks all notifications as read via API
- Immediately updates all items in state to isRead: true
- Sets unread count to 0 without verifying API success

**Dependent Actions:**
- `setItems()` - Updates all notifications to read state
- `setUnreadCount(0)` - Resets counter to zero

**Risk:**
- If API partially fails (some notifications marked, others not), state is incorrect
- No way to know which notifications were actually marked as read
- Unread count becomes inaccurate if API fails

**Fix Strategy:** Wait Response

---

#### Pattern 3: Understanding Status Update → State Update
**Location:** `src/pages/HomePage.tsx:151-154`  
**Severity:** MEDIUM

```typescript
await questionService.setUnderstandingStatus(question.id, next);
setUnderstandingStates((prev) => ({
  ...prev,
  [question.id]: next,
}));
```

**Issue:**
- Updates understanding status via API
- Immediately updates local state with new status
- No verification that API call succeeded

**Dependent Actions:**
- `setUnderstandingStates()` - Updates local understanding status map

**Risk:**
- UI shows new understanding status before server confirms
- If API fails, UI state diverges from server state
- User sees incorrect understanding status

**Fix Strategy:** Wait Response

---

#### Pattern 5: Profile Avatar Update → User State Update
**Location:** `src/hooks/useProfile.ts:145-148`  
**Severity:** MEDIUM

```typescript
const updatedUser = await userService.updateProfile({ avatar: url });
updateUser(updatedUser);
toast.success('头像已更新');
setShowAvatarDialog(false);
```

**Issue:**
- Updates profile avatar via API
- Immediately updates user state with response
- Shows success message and closes dialog
- No verification of response data

**Dependent Actions:**
- `updateUser()` - Updates global user state
- `toast.success()` - Shows success message
- `setShowAvatarDialog(false)` - Closes dialog

**Risk:**
- If API returns success but avatar URL is invalid, user state has broken avatar
- Avatar might not be accessible immediately after update
- User sees new avatar in UI, but it might not load

**Fix Strategy:** Wait Response + Verify

---

#### Pattern 7: Bind Child → Reload Children List
**Location:** `src/hooks/useProfile.ts:107-115`  
**Severity:** MEDIUM

```typescript
await parentService.bindChild({
  childName: bindName,
  phone: bindPhone,
  code: bindCode,
  school: bindSchool,
});
toast.success('绑定成功');
setShowBindDialog(false);
// ... clear form fields
loadChildren();
```

**Issue:**
- Binds child via API
- Immediately shows success message and closes dialog
- Calls loadChildren() to refresh list
- No verification that bind operation succeeded

**Dependent Actions:**
- `toast.success()` - Shows success message
- `setShowBindDialog(false)` - Closes dialog
- Form field clearing
- `loadChildren()` - Reloads children list

**Risk:**
- If bind succeeds but child data isn't immediately available, list refresh fails
- Race condition: loadChildren() might execute before database write completes
- User sees success message but child doesn't appear in list

**Fix Strategy:** Wait Response + Polling Retry

---

#### Pattern 9: Audit Approve Question → State Update
**Location:** `src/pages/AuditPage.tsx:244-253`  
**Severity:** MEDIUM

```typescript
auditService
  .approveQuestion(q.id, {
    isGoodQuestion: q.isGoodQuestion,
    score: q.score,
    tags: q.tags,
    difficulty: q.difficulty,
  })
  .then(() => {
    handleAudit(q.id, 'question', 'approved');
  })
```

**Issue:**
- Approves question via API
- In .then() callback, immediately updates local state
- handleAudit() updates question status to 'approved'
- No verification of response data

**Dependent Actions:**
- `handleAudit()` - Updates question status in local state

**Risk:**
- If API succeeds but approval has side effects (notifications, etc.), state updates before those complete
- Question appears approved in UI immediately, but backend processing might still be ongoing
- If backend processing fails, UI state is inconsistent

**Fix Strategy:** Wait Response

---

#### Pattern 10: Audit Approve Comment → State Update
**Location:** `src/pages/AuditPage.tsx:323-330`  
**Severity:** MEDIUM

```typescript
auditService
  .approveComment(c.id)
  .then(() => {
    handleAudit(c.id, 'comment', 'approved');
  })
```

**Issue:**
- Approves comment via API
- In .then() callback, immediately updates local state
- handleAudit() updates comment status to 'approved'
- No verification of response data

**Dependent Actions:**
- `handleAudit()` - Updates comment status in local state

**Risk:**
- Same as Pattern 9 for questions
- Comment appears approved immediately, but backend processing might be ongoing

**Fix Strategy:** Wait Response

---

#### Pattern 11: Audit Reject Question → State Update
**Location:** `src/hooks/useAudit.ts:135-140`  
**Severity:** MEDIUM

```typescript
await auditService.rejectQuestion(rejectTarget.id, rejectReason);
handleAudit(rejectTarget.id, 'question', 'rejected');
toast.success('已驳回问题');
```

**Issue:**
- Rejects question via API
- Immediately updates local state to 'rejected'
- Shows success message
- No verification of response data

**Dependent Actions:**
- `handleAudit()` - Updates question status in local state
- `toast.success()` - Shows success message

**Risk:**
- If rejection triggers notifications or other side effects, state updates before those complete
- Question appears rejected immediately, but user might not receive notification yet

**Fix Strategy:** Wait Response

---

#### Pattern 12: Audit Ban Comment → State Update
**Location:** `src/hooks/useAudit.ts:142-144`  
**Severity:** MEDIUM

```typescript
await auditService.banComment(rejectTarget.id, rejectReason);
handleAudit(rejectTarget.id, 'comment', 'rejected');
toast.success('已封禁评论');
```

**Issue:**
- Bans comment via API
- Immediately updates local state to 'rejected'
- Shows success message
- No verification of response data

**Dependent Actions:**
- `handleAudit()` - Updates comment status in local state
- `toast.success()` - Shows success message

**Risk:**
- Same as Pattern 11 for questions
- Comment appears banned immediately, but backend processing might be ongoing

**Fix Strategy:** Wait Response

---

#### Pattern 15: Delete Question → Refetch List
**Location:** `src/pages/MyQuestionsPage.tsx:81-83`  
**Severity:** MEDIUM

```typescript
await questionService.delete(question.id);
toast.success('删除成功');
await refetch();
```

**Issue:**
- Deletes question via API
- Shows success message
- Immediately refetches question list
- Race condition: refetch might execute before database delete completes

**Dependent Actions:**
- `toast.success()` - Shows success message
- `refetch()` - Reloads question list

**Risk:**
- If refetch executes before delete completes, deleted question still appears in list
- User sees success message but question is still visible
- Requires page refresh to see actual deletion

**Fix Strategy:** Wait Response + Polling Retry

---

### LOW Severity Patterns

#### Pattern 6: Password Update → Success Message
**Location:** `src/hooks/useProfile.ts:189-192`  
**Severity:** LOW

```typescript
await authService.setPassword(newPassword);
toast.success('密码已更新');
setShowPasswordDialog(false);
setNewPassword('');
```

**Issue:**
- Sets password via API
- Immediately shows success message
- Closes dialog and clears password field
- Assumes API call succeeded

**Dependent Actions:**
- `toast.success()` - Shows success message
- `setShowPasswordDialog(false)` - Closes dialog
- `setNewPassword('')` - Clears password field

**Risk:**
- If API fails silently, user thinks password is updated but it's not
- User might try to login with new password and fail
- No way to verify password was actually updated

**Fix Strategy:** Wait Response

---

#### Pattern 13: Audit Score Question → State Update
**Location:** `src/hooks/useAudit.ts:169-173`  
**Severity:** LOW

```typescript
await auditService.approveQuestion(scoreTargetId, { score: currentScore });
setQuestions((prev) =>
  prev.map((q) => (q.id === scoreTargetId ? { ...q, score: currentScore } : q))
);
toast.success('评分已保存');
```

**Issue:**
- Updates question score via API
- Immediately updates local state with new score
- Shows success message
- No verification of response data

**Dependent Actions:**
- `setQuestions()` - Updates question score in local state
- `toast.success()` - Shows success message

**Risk:**
- If score update fails or is rejected, UI shows incorrect score
- Score appears updated immediately, but might not be persisted

**Fix Strategy:** Wait Response

---

#### Pattern 14: Toggle Good Question → State Update
**Location:** `src/hooks/useAudit.ts:183-187`  
**Severity:** LOW

```typescript
await auditService.approveQuestion(id, { isGoodQuestion: checked });
setQuestions((prev) =>
  prev.map((q) => (q.id === id ? { ...q, isGoodQuestion: checked } : q))
);
```

**Issue:**
- Toggles good question flag via API
- Immediately updates local state with new flag value
- No verification of response data

**Dependent Actions:**
- `setQuestions()` - Updates isGoodQuestion flag in local state

**Risk:**
- If toggle fails, UI shows incorrect good question status
- Flag appears toggled immediately, but might not be persisted

**Fix Strategy:** Wait Response

---

### Already Fixed Patterns

#### Pattern 8: Question Update → Navigation
**Location:** `src/pages/CreateQuestionPage.tsx:279-286`  
**Status:** ✅ FIXED

```typescript
await questionService.updateQuestion(editId, payload);

// 验证更新后的问题是否可以访问（防止竞态条件）
try {
  await questionService.getQuestionById(editId);
  toast.success('问题已更新');
  navigate(ROUTES.question(editId));
} catch (error) {
  // Retry logic with exponential backoff
}
```

**Note:** This is a good example of proper fix implementation with verification and retry logic.

---

## Affected Files Summary

| File | Pattern Count | Patterns |
|------|--------------|----------|
| `src/hooks/useProfile.ts` | 4 | 4, 5, 6, 7 |
| `src/hooks/useAudit.ts` | 4 | 11, 12, 13, 14 |
| `src/pages/NotificationsPage.tsx` | 2 | 1, 2 |
| `src/pages/AuditPage.tsx` | 2 | 9, 10 |
| `src/pages/HomePage.tsx` | 1 | 3 |
| `src/pages/MyQuestionsPage.tsx` | 1 | 15 |
| `src/pages/CreateQuestionPage.tsx` | 1 | 8 (fixed) |

---

## Fix Strategy Summary

| Strategy | Pattern Count | Patterns |
|----------|--------------|----------|
| Wait Response | 11 | 1, 2, 3, 6, 9, 10, 11, 12, 13, 14 |
| Wait Response + Verify | 2 | 4, 5 |
| Wait Response + Polling Retry | 2 | 7, 15 |

---

## Recommendations

### Immediate Actions (HIGH Priority)
1. **Fix Pattern 4** (Profile Nickname Update) - HIGH severity
   - Add verification of API response
   - Handle AI audit pending state
   - Show appropriate messages based on audit status

### Short-term Actions (MEDIUM Priority)
2. **Fix Notification Patterns** (1, 2)
   - Add response verification
   - Implement optimistic updates with rollback
   
3. **Fix Profile Patterns** (5, 7)
   - Verify avatar URL validity
   - Add retry logic for child binding

4. **Fix Audit Patterns** (9, 10, 11, 12)
   - Verify API responses
   - Ensure side effects complete before UI updates

5. **Fix Question Patterns** (3, 15)
   - Add response verification
   - Implement retry logic for list refresh

### Long-term Actions (LOW Priority)
6. **Fix Low Severity Patterns** (6, 13, 14)
   - Add response verification
   - Improve error handling

### Testing & Monitoring
7. **Implement Property-Based Tests**
   - Test update operations with various timing scenarios
   - Verify state consistency after updates

8. **Add Monitoring**
   - Track race condition errors
   - Monitor API response times
   - Alert on state inconsistencies

---

## Next Steps

1. Review findings with team
2. Prioritize fixes based on user impact
3. Implement fixes starting with HIGH severity
4. Write property-based tests for each fix
5. Deploy and monitor for race condition errors
6. Update design document with lessons learned
