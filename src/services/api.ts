/**
 * [POS] src/services/api.ts — Re-export 桶文件（向后兼容层）
 *   所属：services 层 | 角色：统一出口，现有 import 路径零改动
 *   兄弟：所有 *.service.ts（本文件 re-export 它们）
 *
 * [INPUT]
 *   - ./http                  → api（axios 实例）
 *   - ./auth.service          → authService / userService
 *   - ./question.service      → questionService
 *   - ./interaction.service   → interactionService / behaviorService
 *   - ./notification.service  → notificationService / configService
 *   - ./admin.service         → adminService / auditService / answerService /
 *                               commentService / profileService / classHoursService
 *   - ./parentService         → parentService
 *
 * [OUTPUT] （全部 re-export，同 [INPUT]）
 *
 * ⚠️ 禁止在此文件中添加任何业务逻辑。
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（新增/删除 service 时）
 *   2. src/services/CLAUDE.md 的文件清单
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
