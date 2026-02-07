# 项目收尾任务清单

> 版本: v1.0  
> 创建日期: 2026-02-07  
> 状态: 待执行

---

## 一、文档迁移收尾

### 1.1 待删除目录

| 目录                   | 说明                                | 操作         |
| ---------------------- | ----------------------------------- | ------------ |
| `gemini-frontend-doc/` | 前端文档已迁移至 `docs/`            | 删除         |
| `deploy/`              | 部署文档已迁移至 `docs/deployment/` | 删除         |
| `deprecated-doc/`      | 归档文档已迁移至 `docs/legacy/`     | 删除         |
| `codex-develop-doc/`   | 开发文档已迁移至 `docs/guides/`     | 评估是否保留 |

### 1.2 待更新文档

| 文档                | 操作                                   |
| ------------------- | -------------------------------------- |
| `docs/README.md`    | 添加新的文档索引，移除已迁移的目录引用 |
| `helloagents/wiki/` | 添加备注，说明文档已迁移至 `docs/`     |

---

## 二、文档索引更新

### 2.1 docs/README.md 更新项

```markdown
## 文档结构

### 开发指南 (guides/)

- [x] 文档命名规范-guide.md
- [x] 数据库操作-guide.md
- [x] 环境配置-guide.md
- [x] 前端编码规范-guide.md
- [x] 前端API对接检查清单-guide.md
- [x] 验收操作-guide.md

### 需求与接口文档 (specs/)

#### API 文档 (api/)

- [x] 后端API-spec.md
- [x] 前端集成-api.md
- [x] 前端E2E联调-guide.md
- [x] 前端API审查-report.md

#### 测试用例 (test-case/)

- [x] 后端-test-case.md
- [x] 前端-test-case.md

#### 验收标准 (acceptance/)

- [x] 学生端-acceptance.md
- [x] 教师端-acceptance.md

### 架构设计 (architecture/)

- [x] 系统架构-architecture.md
- [x] 数据模型-architecture.md
- [x] 集成指南-architecture.md
- [x] 前端重构计划-architecture.md

### 部署文档 (deployment/)

- [x] 部署流程-deployment.md
- [x] 部署检查-deployment.md
- [x] 运维手册-guide.md
- [x] 错误排查-guide.md

### 归档文档 (legacy/)

- [x] 后端需求文档-legacy.md
- [x] 后端需求文档v2-legacy.md
- [x] 后端需求规范-legacy.md

### 知识库 (wiki/)

> 说明: 此目录内容复制自 `helloagents/wiki/`，作为备份保留。

- [x] overview.md
- [x] backend-deployment.md
- [x] mock-refactor-todo.md
- [x] structured-programming-guidelines.md
- [x] modules/backend-auth.md
- [x] modules/backend-question-dimensions.md
- [x] modules/backend-questions.md
- [x] modules/backend-whitelist.md
- [x] modules/frontend-integration.md
```

---

## 三、环境清理

### 3.1 Git 清理

```bash
# 1. 删除已迁移的目录
rm -rf gemini-frontend-doc/
rm -rf deploy/
rm -rf deprecated-doc/

# 2. 提交变更
git add .
git commit -m "docs: 整理文档目录结构，迁移到 docs/ 统一管理"

# 3. 推送到远程（如果需要）
git push
```

### 3.2 npm/yarn 清理（如需要）

```bash
# 删除 node_modules 和 lock 文件（如果不需要）
rm -rf node_modules
rm package-lock.json
rm -rf yarn.lock

# 重新安装
npm install
```

---

## 四、CI/CD 更新

### 4.1 如果有 CI/CD 流水线

检查以下配置文件是否需要更新:

| 文件                 | 操作             |
| -------------------- | ---------------- |
| `.github/workflows/` | 更新文档路径引用 |
| `.gitlab-ci.yml`     | 更新文档路径引用 |
| `Jenkinsfile`        | 更新文档路径引用 |

---

## 五、团队同步

### 5.1 通知团队成员

- [ ] 发送通知说明文档已迁移
- [ ] 更新团队协作平台（如飞书、Notion）的文档链接
- [ ] 更新新成员入职文档中的文档路径

---

## 六、后续维护

### 6.1 文档维护规范

1. **新增文档**
   - 遵循 `docs/` 目录结构
   - 遵循 `功能-类型.md` 命名规范
   - 更新 `docs/README.md` 索引

2. **修改文档**
   - 更新修改日期
   - 记录变更内容

3. **废弃文档**
   - 移动到 `docs/legacy/`
   - 重命名为 `*-legacy.md`

---

## 七、检查清单

### 执行前检查

- [ ] 确认所有文档已迁移完成
- [ ] 确认 `docs/README.md` 索引已更新
- [ ] 确认文档命名符合规范
- [ ] 确认没有遗漏的文档

### 执行后检查

- [ ] 确认已删除的目录不再需要
- [ ] 确认 CI/CD 流水线正常运行
- [ ] 确认团队成员已知晓文档迁移

---

## 八、相关文档

- `docs/文档迁移-record.md` - 文档迁移记录
- `docs/guides/文档命名规范-guide.md` - 文档命名规范

---

> 最后更新: 2026-02-07
