# Potential 401 Authentication Issues Analysis

## All Issues Found and Fixed ✅

### 1. ✅ FIXED: SubjectConfigService - Wrong Endpoint
**Location:** `src/services/subjectConfig.service.ts`
**Issue:** Calling `/subjects` instead of `/config/subjects`
**Fix:** Changed to `/config/subjects` and fixed response data extraction

### 2. ✅ FIXED: Profile Service - My Likes Endpoint
**Location:** `src/services/admin.service.ts` - `profileService.getMyLikes()`
**Issue:** Calling `/users/likes` instead of `/users/me/likes`
**Fix:** Changed to `/users/me/likes`

### 3. ✅ FIXED: Profile Service - My Favorites Endpoint
**Location:** `src/services/admin.service.ts` - `profileService.getMyFavorites()`
**Issue:** Calling `/interactions/favorite` instead of `/users/me/favorites`
**Fix:** Changed to `/users/me/favorites`

### 4. ✅ FIXED: User Service - Profile Update
**Location:** `src/services/auth.service.ts` - `userService.updateProfile()`
**Issue:** Using `PUT /users/profile` instead of `PATCH /users/me`
**Fix:** Changed to `PATCH /users/me`

### 5. ✅ FIXED: Question Service - Get Question Detail
**Location:** `src/services/question.service.ts` - `getQuestionById()`
**Issue:** Calling `/questions/detail?id=xxx` instead of `/questions/:id`
**Fix:** Changed to `GET /questions/${id}`

### 6. ✅ FIXED: Question Service - Delete Question
**Location:** `src/services/question.service.ts` - `delete()`
**Issue:** Using `POST /questions/delete` instead of `DELETE /questions/:id`
**Fix:** Changed to `DELETE /questions/${id}`

### 7. ✅ FIXED: Admin Service - Whitelist Endpoints
**Location:** `src/services/admin.service.ts` - `adminService`
**Issues:**
- `getWhitelist()`: Using `/admin?action=whitelist` instead of `/admin/whitelist`
- `addToWhitelist()`: Using `/admin?action=whitelist` instead of `/admin/whitelist`
- `removeFromWhitelist()`: Using `POST /admin?action=whitelist&subaction=delete` instead of `DELETE /admin/whitelist/:id`
**Fix:** Updated all to use proper RESTful endpoints

### 8. ✅ FIXED: Audit Service - All Audit Endpoints
**Location:** `src/services/admin.service.ts` - `auditService`
**Issues:**
- `getPendingQuestions()`: Using `/admin?action=audit&subaction=pending` instead of `/admin/audit/pending`
- `getPendingComments()`: Using `/admin?action=audit&subaction=pending` instead of `/admin/audit/pending`
- `approveQuestion()`: Using `/admin?action=audit&subaction=approve` instead of `/admin/audit/:contentId/approve`
- `rejectQuestion()`: Using `/admin?action=audit&subaction=reject` instead of `/admin/audit/:contentId/reject`
- `approveComment()`: Using `/admin?action=audit&subaction=approve` instead of `/admin/audit/:contentId/approve`
- `banComment()`: Using `/admin?action=audit&subaction=ban` instead of `/admin/audit/:contentId/ban`
- `togglePinQuestion()`: Using `/admin?action=audit&subaction=pin` instead of `/admin/audit/questions/:questionId/pin`
**Fix:** Updated all to use proper RESTful endpoints

### 9. ✅ FIXED: Answer Service - Answer Endpoints
**Location:** `src/services/admin.service.ts` - `answerService`
**Issues:**
- `create()`: Using `POST /answers` instead of `POST /questions/:questionId/answers`
- `listByQuestion()`: Using `GET /answers?questionId=xxx` instead of `GET /questions/:questionId/answers`
**Fix:** Updated to use nested resource endpoints

### 10. ✅ FIXED: Comment Service - Comment Endpoints
**Location:** `src/services/admin.service.ts` - `commentService`
**Issues:**
- `create()`: Using `POST /comments` instead of `POST /questions/:questionId/comments`
- `listByQuestion()`: Using `GET /comments?questionId=xxx` instead of `GET /questions/:questionId/comments`
**Fix:** Updated to use nested resource endpoints

## Summary

Fixed 10 major endpoint mismatches that would have caused 401, 404, or 405 errors. The main issues were:

1. **Wrong endpoint paths** - Frontend calling non-existent endpoints
2. **Query parameter-based routing** - Old pattern using `?action=xxx&subaction=yyy` instead of RESTful paths
3. **Wrong HTTP methods** - Using POST instead of DELETE, PUT instead of PATCH
4. **Nested resource paths** - Not following REST conventions for nested resources

All services now correctly match the backend API routes.
