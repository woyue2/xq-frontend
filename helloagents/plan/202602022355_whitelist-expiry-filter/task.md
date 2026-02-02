## 任务清单 - 202602022355_whitelist-expiry-filter

### A. 状态模型与工具函数

- [ ] A1. 在 `AdminManagementPage.tsx` 内提取 `needsExpiry`、`isExpired`，并新增 `isExpiringSoon` 与阈值常量 `EXPIRING_SOON_DAYS`。
- [ ] A2. 确保日期比较以“日期”而非“时间戳”精度进行，避免时区或时间部分导致的 off-by-one 问题。

### B. 统计与展示

- [ ] B1. 在现有 `stats` 之外新增 `expiryStats`，统计“即将过期学生/家长数量”和“已过期学生/家长数量”。
- [ ] B2. 在“统计卡片”区域添加相应展示（选择方案 A/B 其一），确保一眼能看出课时状态分布。
- [ ] B3. 在列表项中为 `expiringSoon` 的学生/家长添加橙色 Badge（例如“即将过期（15天内）”），与已有的红色“已过期” Badge 区分。

### C. 筛选逻辑

- [ ] C1. 在组件中新增 `filterExpiry` 状态（`'all' | 'expiring' | 'expired'`），默认 `'all'`。
- [ ] C2. 扩展 `filteredList` 过滤逻辑，使其在保持原有角色/注册状态/搜索条件的同时，按 `filterExpiry` 对 **学生/家长** 的 `expiresAt` 做过期/即将过期筛选。
- [ ] C3. 在 UI 中新增“课时状态”筛选控件（`Select` 或 pill 按钮组），明确标注“仅影响学生/家长”。

### D. 兼容性与未来扩展

- [ ] D1. 在代码中对 `expiresAt` 字段添加注释，说明其未来会与后端 `validUntil` 字段对齐，可通过适配层映射。
- [ ] D2. 在 `codex-develop-doc/后端需求文档-完整版.md` 中补一小段说明（后续开发实施阶段执行）：当接入 `/api/admin/whitelist` 时，前端“快要过期”判定以 `valid_until` 为准。

