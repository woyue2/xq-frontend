# 部署指南 - 性能优化版本

## 提交信息
- **Commit**: 411a39c
- **分支**: 缩减
- **提交信息**: perf: 完成性能优化 - 数据库索引、缓存、防抖、懒加载
- **文件变更**: 241 files changed, 28514 insertions(+), 16367 deletions(-)

---

## 部署前检查清单

### ✅ 已完成
- [x] 数据库迁移已应用（20260408165200_add_performance_indexes）
- [x] Prisma Client 已生成（v5.22.0）
- [x] 代码已提交到 Git
- [x] 所有性能优化已实现

### ⏳ 待完成
- [ ] 推送到远程仓库
- [ ] 部署到 Vercel
- [ ] 验证生产环境

---

## 部署步骤

### 1. 推送到远程仓库

```bash
# 推送到远程分支
git push origin 缩减

# 或者推送到 main 分支（如果需要）
git checkout main
git merge 缩减
git push origin main
```

### 2. Vercel 自动部署

推送后，Vercel 会自动：
1. 检测到新的提交
2. 开始构建流程
3. 运行 Prisma 生成
4. 部署到生产环境

**预计时间**: 2-3 分钟

### 3. 监控部署状态

访问 Vercel Dashboard：
- https://vercel.com/your-project/deployments

查看：
- 构建日志
- 部署状态
- 错误信息（如有）

---

## 部署后验证

### 1. 验证数据库索引

在 Supabase SQL Editor 中运行：

```sql
-- 查看所有 Question 表的索引
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'Question'
ORDER BY indexname;
```

**预期结果**（应该看到这些索引）:
- `Question_authorId_idx`
- `Question_createdAt_idx`
- `Question_isGoodQuestion_idx`
- `Question_status_createdAt_idx`
- `Question_subject_idx` ✨ 新增
- `Question_tags_idx` ✨ 新增

### 2. 验证应用功能

访问生产环境 URL，测试：

#### 首页测试
- [ ] 页面加载速度（应该 < 1 秒）
- [ ] 问题列表显示正常
- [ ] 图片懒加载（打开 Network 面板，滚动时才加载图片）

#### 筛选功能测试
- [ ] 按科目筛选（应该很快，< 500ms）
- [ ] 按考点筛选（应该很快，< 500ms）
- [ ] 搜索功能（输入时有防抖，不会立即请求）

#### 问题详情页测试
- [ ] 详情页加载速度（应该 < 1 秒）
- [ ] 回答列表显示正常
- [ ] 评论列表显示正常

#### 科目选择器测试
- [ ] 第一次加载科目列表
- [ ] 第二次打开（应该从缓存加载，非常快）

### 3. 性能监控

使用浏览器开发者工具：

#### Network 面板
```
检查项目：
1. API 响应时间
   - /api/questions: < 500ms
   - /api/subjects: < 200ms（第二次 < 50ms）
   - /api/answers: < 300ms
   - /api/comments: < 300ms

2. 缓存头
   - /api/subjects 应该有: Cache-Control: public, max-age=300

3. 图片加载
   - 首屏只加载可见图片
   - 滚动时才加载后续图片
```

#### Performance 面板
```
检查指标：
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1
```

#### Console 面板
```
检查：
- 无错误信息
- 无警告信息
- 搜索时防抖生效（输入后 500ms 才发送请求）
```

---

## 性能对比

### 优化前
- 首页加载: ~3s
- 问题详情: ~3s
- 搜索响应: ~1s
- 科目选择器: ~500ms

### 优化后（预期）
- 首页加载: ~0.5s ⚡ 83% 提升
- 问题详情: ~0.8s ⚡ 73% 提升
- 搜索响应: ~0.3s ⚡ 70% 提升
- 科目选择器: ~50ms ⚡ 90% 提升

---

## 回滚计划

如果部署后出现问题，可以快速回滚：

### 方法 1: Vercel Dashboard 回滚
1. 访问 Vercel Dashboard
2. 找到上一个稳定的部署
3. 点击 "Promote to Production"

### 方法 2: Git 回滚
```bash
# 回滚到上一个提交
git revert HEAD
git push origin 缩减

# 或者硬回滚（谨慎使用）
git reset --hard HEAD~1
git push -f origin 缩减
```

### 方法 3: 数据库回滚
```bash
# 如果需要回滚数据库迁移
npx prisma migrate resolve --rolled-back 20260408165200_add_performance_indexes
```

---

## 常见问题

### Q1: 部署失败，提示 Prisma 错误
**解决方案**:
```bash
# 确保 .env 文件包含正确的数据库 URL
# 重新生成 Prisma Client
npx prisma generate
git add .
git commit -m "fix: regenerate prisma client"
git push
```

### Q2: 索引没有创建成功
**解决方案**:
```bash
# 手动运行迁移
npx prisma migrate deploy

# 或者在 Supabase SQL Editor 中手动创建索引
CREATE INDEX "Question_subject_idx" ON "Question"("subject");
CREATE INDEX "Question_tags_idx" ON "Question"("tags");
CREATE INDEX "Question_authorId_idx" ON "Question"("authorId");
CREATE INDEX "Question_createdAt_idx" ON "Question"("createdAt" DESC);
```

### Q3: 性能提升不明显
**排查步骤**:
1. 检查索引是否创建成功（运行上面的 SQL）
2. 清除浏览器缓存，强制刷新（Ctrl+Shift+R）
3. 检查 Network 面板，确认 API 响应时间
4. 检查数据库查询日志（Supabase Dashboard）

### Q4: 图片懒加载不生效
**排查步骤**:
1. 检查浏览器是否支持 `loading="lazy"`（Chrome 77+, Firefox 75+）
2. 打开 Network 面板，滚动页面，观察图片加载时机
3. 检查 ImageGallery 组件代码是否正确

---

## 监控和优化

### 短期（1 周内）
- [ ] 每天检查 Vercel Analytics
- [ ] 收集用户反馈
- [ ] 记录实际性能数据
- [ ] 调整缓存时间（如需要）

### 中期（1 个月内）
- [ ] 分析慢查询日志
- [ ] 优化图片尺寸
- [ ] 实现 CDN 加速
- [ ] 添加更多缓存策略

### 长期（3 个月内）
- [ ] 实现 Service Worker
- [ ] 添加离线支持
- [ ] 优化长列表渲染
- [ ] 迁移到 Edge Functions

---

## 联系支持

如果遇到问题：
1. 查看 Vercel 部署日志
2. 查看 Supabase 数据库日志
3. 查看浏览器 Console 错误
4. 参考 `PERFORMANCE_OPTIMIZATION_DEPLOYED.md`

---

## 总结

✅ **代码已提交**: 411a39c
✅ **数据库已迁移**: 4 个新索引
✅ **性能优化已实现**: 5 个关键优化

**下一步**: 推送到远程仓库，等待 Vercel 自动部署

**预期结果**: 整体性能提升 70-83%

---

生成时间: 2026-04-09
文档版本: v1.0
