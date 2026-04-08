# TypeScript Error Fix Plan

## Analysis Complete

**Total Errors**: 78 errors in 20 files

**Root Cause**: Incomplete cleanup after app-simplification. Many files from the full version still exist but reference deleted types/features.

---

## Category 1: Unused Files from Full Version (DELETE)

These files are NOT used in the simplified version and should be deleted:

### Hooks (NOT used by any simplified pages/components)
- `src/hooks/useAdminDimension.ts` - References QuestionDimensionDto (deleted feature)
- `src/hooks/useAdminSubject.ts` - References SubjectAdminDto (deleted feature)
- `src/hooks/useAdminWhitelist.ts` - References WhitelistUser (deleted feature)
- `src/hooks/useRealtime.ts` - References useRealtimeNotifications (deleted file)
- `src/hooks/useRealtimeAnswers.ts` - Realtime feature not in simplified version
- `src/hooks/useRealtimeQuestions.ts` - Realtime feature not in simplified version

### Services (NOT used by simplified version)
- `src/services/admin.service.ts` - Full version admin features (whitelist, audit, etc.)
- `src/services/auth.service.ts` - References deleted types (LoginPayload, SendCodePayload, etc.)
- `src/services/interaction.service.ts` - References deleted types (LikePayload, FavoritePayload)
- `src/services/interaction.supa.ts` - References deleted tables (Favorite, QuestionUnderstanding)
- `src/services/subjectConfig.service.ts` - References deleted types (SubjectDto, TopicDto)

### Test Files (Reference deleted pages)
- `src/test/advanced_coverage.test.tsx` - References AdminManagementPage, TestApiPage
- `src/test/full_p0_coverage.test.tsx` - References ProfilePage

### Lib Files (Incomplete/Broken)
- `src/lib/race-condition-fix.ts` - Missing React imports, not used

---

## Category 2: Files That Need Fixing (KEEP & FIX)

### src/components/QuestionList.tsx
**Error**: Property 'updatedAt' missing in type 'Question'
**Fix**: Add updatedAt to Question type or handle missing property

### src/hooks/useLogin.ts
**Error**: UserDTO.role (string) not assignable to User.role (UserRole enum)
**Fix**: Update User type to accept string role, or cast UserDTO properly

### src/hooks/useQuestionDetail.ts
**Error**: Expression of type 'void' cannot be tested for truthiness
**Fix**: Check response properly

### src/hooks/useQuestions.ts
**Error**: References QuestionListParams with deleted properties
**Fix**: Update to use simplified QuestionListParams

### src/pages/LoginPage.tsx
**Error**: References deleted child-related properties
**Fix**: Remove child registration logic (not in simplified version)

### src/pages/admin/AdminLayout.tsx
**Error**: References ROUTES.profile (deleted route)
**Fix**: Remove profile navigation

### src/services/question.service.ts
**Error**: References deleted QuestionListParams properties (status, isGoodQuestion, tags, authorId)
**Fix**: Remove references to deleted properties

---

## Execution Plan

### Phase 1: Delete Unused Files (10 minutes)
Delete all files in Category 1 - they're not used in simplified version

### Phase 2: Fix Type Definitions (20 minutes)
1. Update src/types/index.ts - Fix User.role type
2. Update src/types/dto.ts - Ensure QuestionDTO has updatedAt
3. Update src/types/api.ts - Ensure QuestionListParams matches simplified version

### Phase 3: Fix Remaining Files (30 minutes)
1. Fix src/hooks/useLogin.ts - Handle role type properly
2. Fix src/hooks/useQuestionDetail.ts - Fix void check
3. Fix src/hooks/useQuestions.ts - Use correct params
4. Fix src/pages/LoginPage.tsx - Remove child logic
5. Fix src/pages/admin/AdminLayout.tsx - Remove profile link
6. Fix src/services/question.service.ts - Remove deleted params
7. Fix src/components/QuestionList.tsx - Handle updatedAt

### Phase 4: Verify (10 minutes)
1. Run `npx tsc --noEmit` - Should have 0 errors
2. Run `npm run build` - Should succeed
3. Run `npm run test:integration` - Should pass

---

## Expected Outcome

- **Before**: 78 errors in 20 files
- **After**: 0 errors
- **Deleted**: ~10 unused files
- **Fixed**: ~7 files
- **Time**: ~70 minutes

---

## Files to Keep (Core Simplified Version)

### Pages (6 total)
- HomePage.tsx ✅
- LoginPage.tsx ⚠️ (needs fix)
- CreateQuestionPage.tsx ✅
- QuestionDetailPage.tsx ✅
- AnswerQuestionPage.tsx ✅
- admin/AdminSubjectsPage.tsx ✅

### Components (12 total)
- QuestionCard.tsx ✅
- QuestionDetail.tsx ✅
- QuestionList.tsx ⚠️ (needs fix)
- QuestionFilter.tsx ✅
- AnswerCard.tsx ✅
- CommentCard.tsx ✅
- ImageUploader.tsx ✅
- ImageGallery.tsx ✅
- SubjectTopicSelector.tsx ✅
- SubjectManager.tsx ✅
- TopicManager.tsx ✅
- SubjectForm.tsx ✅
- TopicForm.tsx ✅

### Hooks (Keep only these)
- useAuthStore.ts ✅
- useLogin.ts ⚠️ (needs fix)
- useQuestions.ts ⚠️ (needs fix)
- useQuestionDetail.ts ⚠️ (needs fix)

### Services (Keep only these)
- api.ts ✅
- http.ts ✅
- question.service.ts ⚠️ (needs fix)

### API Files (6 total - all working)
- api/auth.ts ✅
- api/questions.ts ✅
- api/answers.ts ✅
- api/comments.ts ✅
- api/subjects.ts ✅
- api/upload.ts ✅

