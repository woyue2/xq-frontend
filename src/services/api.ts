/**
 * api.ts — Re-export 桶文件（向后兼容层）
 *
 * ⚠️  请勿在此文件中添加任何业务逻辑。
 *     所有功能已拆分至各自独立的 service 文件：
 *       http.ts               — axios 实例 + 拦截器
 *       auth.service.ts       — authService / userService
 *       question.service.ts   — questionService
 *       interaction.service.ts — interactionService / behaviorService
 *       notification.service.ts — notificationService / configService
 *       admin.service.ts      — adminService / auditService / answerService
 *                               commentService / profileService / classHoursService
 *
 * 现有 `import { xxx } from '@/services/api'` 无需修改。
 */

export { api } from './http';

export { authService, userService }         from './auth.service';
export { questionService }                  from './question.service';
export { interactionService, behaviorService } from './interaction.service';
export { notificationService, configService }  from './notification.service';
export {
    adminService,
    auditService,
    answerService,
    commentService,
    profileService,
    classHoursService,
}                                            from './admin.service';

// parentService 保留在原独立文件，从此处 re-export 统一出口
export { parentService }                     from './parentService';
