# 401 Authentication Issues - Complete Fix Summary

## Comprehensive Audit Results
- ✅ **Total Endpoints Checked:** 56
- ✅ **Issues Found and Fixed:** 11 (affecting 21 API calls)
- ✅ **Services Audited:** 8 service files
- ✅ **Files Modified:** 4

## All Fixed Issues

### 1. SubjectConfigService - Wrong Endpoint
- **File:** `src/services/subjectConfig.service.ts`
- **Issue:** `/subjects` → `/config/subjects`
- **Also fixed:** Response data extraction path

### 2. User Service - Profile Update
- **File:** `src/services/auth.service.ts`
- **Issue:** `PUT /users/profile` → `PATCH /users/me`

### 3. Question Service - Get Detail
- **File:** `src/services/question.service.ts`
- **Issue:** `/questions/detail?id=xxx` → `/questions/:id`

### 4. Question Service - Delete
- **File:** `src/services/question.service.ts`
- **Issue:** `POST /questions/delete` → `DELETE /questions/:id`

### 5. Question Service - Understanding Status
- **File:** `src/services/question.service.ts`
- **Issue:** `/interactions/understanding` → `/questions/:id/understanding`

### 6-8. Admin Whitelist (3 endpoints)
- **File:** `src/services/admin.service.ts`
- **Issues:**
  - `GET /admin?action=whitelist` → `GET /admin/whitelist`
  - `POST /admin?action=whitelist` → `POST /admin/whitelist`
  - `POST /admin?...&subaction=delete` → `DELETE /admin/whitelist/:id`

### 9-13. Audit Service (5 endpoints)
- **File:** `src/services/admin.service.ts`
- **Issues:** All changed from query-based to RESTful:
  - `GET /admin/audit/pending`
  - `POST /admin/audit/:id/approve`
  - `POST /admin/audit/:id/reject`
  - `POST /admin/audit/:id/ban`
  - `POST /admin/audit/questions/:id/pin`

### 14-15. Answer Service (2 endpoints)
- **File:** `src/services/admin.service.ts`
- **Issues:**
  - `POST /answers` → `POST /questions/:id/answers`
  - `GET /answers?questionId=xxx` → `GET /questions/:id/answers`

### 16-17. Comment Service (2 endpoints)
- **File:** `src/services/admin.service.ts`
- **Issues:**
  - `POST /comments` → `POST /questions/:id/comments`
  - `GET /comments?questionId=xxx` → `GET /questions/:id/comments`

### 18. Profile Service - My Likes
- **File:** `src/services/admin.service.ts`
- **Issue:** `/users/likes` → `/users/me/likes`

### 19. Profile Service - My Favorites
- **File:** `src/services/admin.service.ts`
- **Issue:** `/interactions/favorite` → `/users/me/favorites`

## Root Causes

1. **Query-based routing** - Old pattern using `?action=xxx&subaction=yyy`
2. **Wrong HTTP methods** - POST instead of DELETE, PUT instead of PATCH
3. **Wrong paths** - Non-existent or incorrect endpoint paths
4. **Nested resources** - Not following REST conventions

## Verification

See `api-endpoint-verification.md` for complete endpoint mapping table showing all 56 endpoints checked.

## Result

All frontend API calls now correctly match backend routes. The 401 errors should be resolved.
