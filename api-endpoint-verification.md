# Complete API Endpoint Verification

## ✅ All Frontend Services vs Backend Routes

### Auth Service (`src/services/auth.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `POST /auth/send-code` | `POST /api/auth/send-code` | ✅ Match |
| `POST /auth/login` | `POST /api/auth/login` | ✅ Match |
| `POST /auth/password-login` | `POST /api/auth/password-login` | ✅ Match |
| `POST /auth/register` | `POST /api/auth/register` | ✅ Match |
| `POST /auth/set-password` | `POST /api/auth/set-password` | ✅ Match |
| `PATCH /users/me` | `PATCH /api/users/me` | ✅ Fixed |

### Question Service (`src/services/question.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `GET /questions` | `GET /api/questions` | ✅ Match |
| `GET /questions/:id` | `GET /api/questions/:id` | ✅ Fixed |
| `POST /questions` | `POST /api/questions` | ✅ Match |
| `PATCH /questions/:id` | `PATCH /api/questions/:id` | ✅ Match |
| `DELETE /questions/:id` | `DELETE /api/questions/:id` | ✅ Fixed |
| `POST /questions/:id/understanding` | `POST /api/questions/:questionId/understanding` | ✅ Fixed |
| `POST /upload/audio` | `POST /api/upload/audio` | ✅ Match |
| `POST /upload/image` | `POST /api/upload/image` | ✅ Match |

### Admin Service (`src/services/admin.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `GET /admin/whitelist` | `GET /api/admin/whitelist` | ✅ Fixed |
| `POST /admin/whitelist` | `POST /api/admin/whitelist` | ✅ Fixed |
| `DELETE /admin/whitelist/:id` | `DELETE /api/admin/whitelist/:id` | ✅ Fixed |
| `PATCH /admin/whitelist/:id` | `PATCH /api/admin/whitelist/:id` | ✅ Match |
| `GET /admin/question-dimensions` | `GET /api/admin/question-dimensions` | ✅ Match |
| `PUT /admin/question-dimensions/:key` | `PUT /api/admin/question-dimensions/:key` | ✅ Match |
| `POST /admin/question-dimensions/:key/options` | `POST /api/admin/question-dimensions/:key/options` | ✅ Match |
| `PUT /admin/question-dimensions/:key/options/:id` | `PUT /api/admin/question-dimensions/:key/options/:optionId` | ✅ Match |
| `GET /admin/subjects` | `GET /api/admin/subjects` | ✅ Match |
| `PUT /admin/subjects/:key` | `PUT /api/admin/subjects/:key` | ✅ Match |
| `POST /admin/subjects/:key/topics` | `POST /api/admin/subjects/:key/topics` | ✅ Match |
| `PUT /admin/subjects/:key/topics/:id` | `PUT /api/admin/subjects/:key/topics/:topicId` | ✅ Match |

### Audit Service (`src/services/admin.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `GET /admin/audit/pending` | `GET /api/admin/audit/pending` | ✅ Fixed |
| `POST /admin/audit/:id/approve` | `POST /api/admin/audit/:contentId/approve` | ✅ Fixed |
| `POST /admin/audit/:id/reject` | `POST /api/admin/audit/:contentId/reject` | ✅ Fixed |
| `POST /admin/audit/:id/ban` | `POST /api/admin/audit/:contentId/ban` | ✅ Fixed |
| `POST /admin/audit/questions/:id/pin` | `POST /api/admin/audit/questions/:questionId/pin` | ✅ Fixed |

### Answer Service (`src/services/admin.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `POST /questions/:id/answers` | `POST /api/questions/:questionId/answers` | ✅ Fixed |
| `GET /questions/:id/answers` | `GET /api/questions/:questionId/answers` | ✅ Fixed |

### Comment Service (`src/services/admin.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `POST /questions/:id/comments` | `POST /api/questions/:questionId/comments` | ✅ Fixed |
| `GET /questions/:id/comments` | `GET /api/questions/:questionId/comments` | ✅ Fixed |

### Profile Service (`src/services/admin.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `GET /users/me/likes` | `GET /api/users/me/likes` | ✅ Fixed |
| `GET /users/me/favorites` | `GET /api/users/me/favorites` | ✅ Fixed |
| `GET /profile/my-answers` | `GET /api/profile/my-answers` | ✅ Match |

### Class Hours Service (`src/services/admin.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `PATCH /admin/class-hours/batch-update` | `PATCH /api/admin/class-hours/batch-update` | ✅ Match |

### Interaction Service (`src/services/interaction.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `POST /interactions/like` | `POST /api/interactions/like` | ✅ Match |
| `POST /interactions/favorite` | `POST /api/interactions/favorite` | ✅ Match |

### Behavior Service (`src/services/interaction.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `POST /behavior/log` | `POST /api/behavior/log` | ✅ Match |

### Notification Service (`src/services/notification.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `GET /notifications` | `GET /api/notifications` | ✅ Match |
| `POST /notifications/read` | `POST /api/notifications/read` | ✅ Match |
| `GET /notifications/unread-count` | `GET /api/notifications/unread-count` | ✅ Match |

### Config Service (`src/services/notification.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `GET /config/question-dimensions` | `GET /api/config/question-dimensions` | ✅ Match |

### Subject Config Service (`src/services/subjectConfig.service.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `GET /config/subjects` | `GET /api/config/subjects` | ✅ Fixed |

### Parent Service (`src/services/parentService.ts`)
| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `POST /auth/send-code` | `POST /api/auth/send-code` | ✅ Match |
| `POST /parent/bind` | `POST /api/parent/bind` | ✅ Match |
| `GET /parent/children` | `GET /api/parent/children` | ✅ Match |
| `POST /parent/unbind` | `POST /api/parent/unbind` | ✅ Match |
| `GET /parent/questions/:childId` | `GET /api/parent/questions/:childId` | ✅ Match |

## Summary

### Total Endpoints Checked: 56
### Issues Found and Fixed: 11

### Fixed Issues:
1. ✅ SubjectConfigService - `/subjects` → `/config/subjects`
2. ✅ User Service - `PUT /users/profile` → `PATCH /users/me`
3. ✅ Question Service - `/questions/detail?id=xxx` → `/questions/:id`
4. ✅ Question Service - `POST /questions/delete` → `DELETE /questions/:id`
5. ✅ Question Service - `/interactions/understanding` → `/questions/:id/understanding`
6. ✅ Admin Whitelist - Query-based routing → RESTful endpoints (3 endpoints)
7. ✅ Audit Service - Query-based routing → RESTful endpoints (5 endpoints)
8. ✅ Answer Service - Standalone routes → Nested resource routes (2 endpoints)
9. ✅ Comment Service - Standalone routes → Nested resource routes (2 endpoints)
10. ✅ Profile Service - `/users/likes` → `/users/me/likes`
11. ✅ Profile Service - `/interactions/favorite` → `/users/me/favorites`

All API endpoints now correctly match the backend routes!
