# GEB Code Review - Remaining Work

## 已完成工作总结

### ✅ Phase A: 关键问题修复（3.5 小时）- 100% 完成
1. Prisma Client 单例化
2. requireAdmin() 重构为纯函数
3. 错误处理标准化

### ✅ Phase B: TypeScript Strict Mode + 重构（6 小时）- 100% 完成
1. 替换 API 层所有 `any` 类型（7 处）
2. 内部重构 api/subjects.ts（-24% 代码量）

### ✅ Phase C: 持续重构（部分完成，3/6 小时）- 50% 完成
1. 内部重构 api/questions.ts（-32% 代码量）

---

## 🔴 剩余工作清单

### 1. 拆分超大组件（预计 8 小时）⚠️ 未开始

**需要拆分的 7 个组件**:

#### 1.1 TopicManager.tsx（332 行）- 优先级：高
**当前问题**:
- 文件过长（332 行，超出 150 行限制 2.2 倍）
- 混合了列表展示、表单编辑、操作按钮等多个职责
- 状态管理复杂（编辑模式、删除确认等）

**建议拆分方案**:
```
TopicManager.tsx (主组件，约 80 行)
├── TopicList.tsx (列表展示，约 60 行)
├── TopicEditForm.tsx (编辑表单，约 80 行)
└── TopicActions.tsx (操作按钮，约 40 行)
```

**预计时间**: 2 小时

---

#### 1.2 SubjectManager.tsx（329 行）- 优先级：高
**当前问题**:
- 文件过长（329 行，超出 150 行限制 2.2 倍）
- 与 TopicManager 类似的结构问题
- 混合了多个职责

**建议拆分方案**:
```
SubjectManager.tsx (主组件，约 80 行)
├── SubjectList.tsx (列表展示，约 60 行)
├── SubjectEditForm.tsx (编辑表单，约 80 行)
└── SubjectActions.tsx (操作按钮，约 40 行)
```

**预计时间**: 2 小时

---

#### 1.3 ImageUploader.tsx（319 行）- 优先级：中
**当前问题**:
- 文件过长（319 行，超出 150 行限制 2.1 倍）
- 混合了上传逻辑、预览展示、进度显示等

**建议拆分方案**:
```
ImageUploader.tsx (主组件，约 80 行)
├── UploadButton.tsx (上传按钮，约 40 行)
├── ImagePreview.tsx (图片预览，约 60 行)
├── UploadProgress.tsx (上传进度，约 40 行)
└── useImageUpload.ts (上传逻辑 Hook，约 80 行)
```

**预计时间**: 1.5 小时

---

#### 1.4 SubjectForm.tsx（272 行）- 优先级：中
**当前问题**:
- 文件过长（272 行，超出 150 行限制 1.8 倍）
- 验证逻辑分散在组件中
- 表单状态管理复杂

**建议拆分方案**:
```
SubjectForm.tsx (主组件，约 100 行)
├── useSubjectForm.ts (表单逻辑 Hook，约 80 行)
└── useSubjectValidation.ts (验证逻辑 Hook，约 60 行)
```

**预计时间**: 1 小时

---

#### 1.5 QuestionDetail.tsx（214 行）- 优先级：低
**当前问题**:
- 文件过长（214 行，超出 150 行限制 1.4 倍）
- 混合了问题展示、回答列表、评论列表等

**建议拆分方案**:
```
QuestionDetail.tsx (主组件，约 80 行)
├── QuestionHeader.tsx (问题头部，约 40 行)
├── QuestionContent.tsx (问题内容，约 40 行)
└── QuestionActions.tsx (操作按钮，约 40 行)
```

**预计时间**: 1 小时

---

#### 1.6 ImageGallery.tsx（175 行）- 优先级：低
**当前问题**:
- 文件过长（175 行，超出 150 行限制 1.2 倍）
- 混合了网格展示和模态框逻辑

**建议拆分方案**:
```
ImageGallery.tsx (主组件，约 60 行)
├── GalleryGrid.tsx (网格展示，约 50 行)
└── GalleryModal.tsx (模态框，约 60 行)
```

**预计时间**: 0.5 小时

---

#### 1.7 SubjectTopicSelector.tsx（164 行）- 优先级：低
**当前问题**:
- 文件略长（164 行，超出 150 行限制 1.1 倍）
- 混合了科目选择和考点选择逻辑

**建议拆分方案**:
```
SubjectTopicSelector.tsx (主组件，约 60 行)
├── SubjectSelect.tsx (科目选择，约 50 行)
└── TopicSelect.tsx (考点选择，约 50 行)
```

**预计时间**: 0.5 小时

---

### 2. 检查并替换剩余 `any` 类型（预计 2 小时）⚠️ 未开始

**当前状态**:
- ✅ API 层：0 个 `any`（100% 完成）
- ⚠️ 组件层：需要检查（主要在测试文件中）
- ⚠️ 工具层：需要检查

**工作内容**:
1. 搜索所有生产代码中的 `any` 类型（排除测试文件）
2. 分析每个 `any` 的使用场景
3. 替换为具体类型或 `unknown` + 类型守卫
4. 运行 TypeScript 类型检查验证

**注意事项**:
- 测试文件中的 `any` 类型是可接受的（用于 mocking）
- 重点关注生产代码（`src/` 目录，排除 `src/test/`）

**预计时间**: 2 小时

---

### 3. 最终验证和文档更新（预计 3 小时）⚠️ 未开始

**验证清单**:
- [ ] 运行完整测试套件（`npm run test`）
- [ ] 运行集成测试（`npm run test:integration`）
- [ ] TypeScript 类型检查（`npm run type-check`）
- [ ] 本地开发服务器（`npm run dev`）
- [ ] 构建生产版本（`npm run build`）
- [ ] 检查所有 GEB L3 标记是否完整
- [ ] 更新所有相关文档

**文档更新清单**:
- [ ] 更新 `CLAUDE.md`（添加组件拆分说明）
- [ ] 创建 `src/components/CLAUDE.md`（L2 文档）
- [ ] 更新 `GEB_REVIEW_SUMMARY.md`（最终总结）
- [ ] 创建组件拆分前后对比文档

**预计时间**: 3 小时

---

## 总体进度

### 已完成工作
- ✅ Phase A: 3.5 小时（100%）
- ✅ Phase B: 6 小时（100%）
- ✅ Phase C（部分）: 3 小时（50%）
- **总计**: 12.5 小时 / 25.5 小时（49%）

### 剩余工作
- ⚠️ 拆分超大组件: 8 小时
- ⚠️ 替换剩余 `any` 类型: 2 小时
- ⚠️ 最终验证和文档: 3 小时
- **总计**: 13 小时（51%）

---

## 优先级建议

### 高优先级（本周完成）
1. **TopicManager.tsx 拆分**（2 小时）
   - 影响最大的组件
   - 代码复杂度最高
   - 维护成本最高

2. **SubjectManager.tsx 拆分**（2 小时）
   - 与 TopicManager 类似的问题
   - 管理员功能的核心组件

3. **运行完整测试验证**（1 小时）
   - 确保所有修改没有破坏现有功能
   - 及早发现潜在问题

### 中优先级（本月完成）
4. **ImageUploader.tsx 拆分**（1.5 小时）
5. **SubjectForm.tsx 拆分**（1 小时）
6. **检查并替换剩余 `any` 类型**（2 小时）

### 低优先级（有时间再做）
7. **QuestionDetail.tsx 拆分**（1 小时）
8. **ImageGallery.tsx 拆分**（0.5 小时）
9. **SubjectTopicSelector.tsx 拆分**（0.5 小时）
10. **最终文档更新**（2 小时）

---

## 下一步行动

### 立即开始（如果继续）
1. 拆分 TopicManager.tsx
2. 拆分 SubjectManager.tsx
3. 运行测试验证

### 如果暂停
建议创建一个 GitHub Issue 或 TODO 文件，记录：
- 剩余工作清单
- 优先级排序
- 预计时间
- 注意事项

---

## 总结

**已完成的核心工作**:
- ✅ API 层 100% 重构完成
- ✅ 代码质量显著提升（-27% 代码量）
- ✅ TypeScript 类型安全（API 层 0 个 `any`）
- ✅ 遵循 GEB 协议标准

**剩余工作主要集中在**:
- ⚠️ 组件层拆分（7 个超大组件）
- ⚠️ 类型安全检查（组件层和工具层）
- ⚠️ 最终验证和文档

**当前代码状态**: 可以正常使用，API 层已经非常健康，组件层需要进一步优化。
