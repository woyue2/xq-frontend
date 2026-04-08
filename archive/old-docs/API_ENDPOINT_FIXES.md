# API Endpoint Fixes Summary

## Issues Found and Fixed

### 1. Admin Service - Audit Endpoints ✅ FIXED
**Problem:** Frontend calling path-based routes, backend expects query parameters
- Frontend: `/admin/audit/pending`
- Backend: `/admin?action=audit-pending`

**Fixed in:** `src/services/admin.service.ts`

### 2. Admin Service - Whitelist Endpoints ✅ FIXED
**Problem:** Frontend calling path-based routes, backend expects query parameters
- Frontend: `/admin/whitelist`
- Backend: `/admin?action=whitelist-list`

**Fixed in:** `src/services/admin.service.ts`

### 3. Profile Service - My Likes/Favorites ✅ FIXED
**Problem:** Endpoints didn't exist
- Created new API: `api/profile.ts`
- Endpoints: `/profile?action=my-likes`, `/profile?action=my-favorites`

**Fixed in:** `api/profile.ts`, `src/services/admin.service.ts`

### 4. Answer & Comment Service ✅ FIXED
**Problem:** Frontend calling path-based routes, backend expects query parameters
- Frontend: `/questions/:id/answers`
- Backend: `/content?action=answers-list&id=:id`

**Fixed in:** `src/services/admin.service.ts`

### 5. Question Service - CRUD Operations ✅ FIXED
**Problem:** Frontend calling path-based routes, backend expects query parameters
- Frontend: `/questions/:id`
- Backend: `/content?action=questions-get&id=:id`

**Fixed in:** `src/services/question.service.ts`

## Issues Found - NOT YET IMPLEMENTED

### 6. Question Dimensions Endpoints ❌ NOT IMPLEMENTED
**Frontend calls:**
- `GET /admin/question-dimensions`
- `PUT /admin/question-dimensions/:key`
- `POST /admin/question-dimensions/:key/options`
- `PUT /admin/question-dimensions/:key/options/:optionId`

**Backend:** These endpoints don't exist in any API file

**Used in:** `src/services/admin.service.ts` (adminService.getQuestionDimensions, etc.)

### 7. Subjects Admin Endpoints ❌ NOT IMPLEMENTED
**Frontend calls:**
- `GET /admin/subjects`
- `PUT /admin/subjects/:key`
- `POST /admin/subjects/:key/topics`
- `PUT /admin/subjects/:key/topics/:topicId`

**Backend:** These endpoints don't exist in admin API
**Note:** There is a read-only subjects endpoint in `api/core.ts` at `/core?module=subjects`

**Used in:** `src/services/admin.service.ts` (adminService.getSubjects, etc.)

### 8. My Answers Endpoint ❌ NOT IMPLEMENTED
**Frontend calls:** `GET /profile/my-answers`
**Backend:** This endpoint doesn't exist

**Used in:** `src/services/admin.service.ts` (profileService.getMyAnswers)

### 9. Class Hours Endpoint ❌ NOT IMPLEMENTED
**Frontend calls:** `PATCH /admin/class-hours/batch-update`
**Backend:** This endpoint doesn't exist

**Used in:** `src/services/admin.service.ts` (classHoursService.batchUpdate)

### 10. Upload Endpoints ❌ NOT IMPLEMENTED
**Frontend calls:**
- `POST /upload/audio`
- `POST /upload/image`

**Backend:** Upload API exists but returns TODO (not implemented)

**Used in:** `src/services/question.service.ts` (questionService.uploadAudio, uploadImage)

### 11. Notification Mark as Read ❌ NOT IMPLEMENTED
**Frontend calls:** `POST /notifications/read`
**Backend:** This endpoint doesn't exist in social API

**Used in:** `src/services/notification.service.ts` (notificationService.markAsRead)

### 12. Config Question Dimensions ❌ NOT IMPLEMENTED
**Frontend calls:** `GET /config/question-dimensions`
**Backend:** This endpoint doesn't exist

**Used in:** `src/services/notification.service.ts` (configService.getQuestionDimensions)

### 13. Parent Service Endpoints ❌ NOT IMPLEMENTED
**Frontend calls:**
- `POST /auth/send-code` (with type: 'bind_child')
- `POST /parent/bind`
- `GET /parent/children`
- `POST /parent/unbind`
- `GET /parent/questions/:childId`

**Backend:** These endpoints don't exist

**Used in:** `src/services/parentService.ts`

### 14. Interaction Service Endpoints ⚠️ PARTIALLY WORKING
**Frontend calls:**
- `POST /interactions/like`
- `POST /interactions/favorite`

**Backend:** These exist in social API but need module parameter
**Should be:** `/social?module=interactions` with URL path `/like` or `/favorite`

**Used in:** `src/services/interaction.service.ts`

### 15. Behavior Service Endpoints ❌ NOT IMPLEMENTED
**Frontend calls:** `POST /behavior/log`
**Backend:** This endpoint doesn't exist

**Used in:** `src/services/interaction.service.ts` (behaviorService.log)

### 16. User Profile Update ⚠️ NEEDS VERIFICATION
**Frontend calls:** `PATCH /users/me`
**Backend:** Need to verify if this exists

**Used in:** `src/services/auth.service.ts` (userService.updateProfile)

## Recommendations

1. **High Priority:** Implement upload endpoints (audio/image) as they're critical for content creation
2. **High Priority:** Implement notification mark as read functionality
3. **Medium Priority:** Implement question dimensions and subjects admin endpoints
4. **Medium Priority:** Fix interaction service to use correct module routing
5. **Low Priority:** Implement parent service endpoints (if family features are needed)
6. **Low Priority:** Implement behavior logging (analytics feature)
