## 总体思路

- 在现有前端 `AdminManagementPage` 的基础上，以**前端计算为主**实现“全部状态展示 + 快要过期筛选”，避免本轮直接重构后台接口调用。
- 利用已有的 `expiresAt` 字段和 `role` 字段，对“需要课时的角色”（学生/家长）做日期差计算：
  - `已过期`: `expiresAt < 今天`;
  - `即将过期`: `0 ≤ diffDays ≤ N`（N 为阈值，如 15 天），且未过期；
  - `正常`: 其它情况。
- 在 UI 上：
  1. 补齐顶层状态统计（例如在统计卡片中新增“即将过期 / 已过期”数的显示，或在列表中用 Badge 强调）。
  2. 新增一个专门的“即将过期筛选”控件，只作用于学生和家长。

## 详细设计

### 1. 状态模型与辅助函数

在 `AdminManagementPage.tsx` 内部补充几个小工具函数与常量：

```ts
const EXPIRING_SOON_DAYS = 15; // 可配置阈值，默认 15 天

const needsExpiry = (role: UserRole) =>
  role === 'student' || role === 'parent';

const isExpired = (expiresAt?: string) => {
  if (!expiresAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(expiresAt);
  return date < today;
};

const isExpiringSoon = (expiresAt?: string) => {
  if (!expiresAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(expiresAt);
  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= EXPIRING_SOON_DAYS;
};
```

说明：
- 以“日期”维度比较，避免时间部分带来的 off-by-one 错误；
- `isExpired` 与 `isExpiringSoon` 只在 `needsExpiry(user.role)` 为真时才有意义。

### 2. 前端状态统计扩展

在组件已有的 `stats` 计算基础上，增加课时维度统计：

```ts
const expiryStats = {
  expiringSoon: whitelist.filter(
    (u) => needsExpiry(u.role) && isExpiringSoon(u.expiresAt) && !isExpired(u.expiresAt)
  ).length,
  expired: whitelist.filter(
    (u) => needsExpiry(u.role) && isExpired(u.expiresAt)
  ).length,
};
```

在“统计卡片”区域中，视视觉密度情况：
- 方案 A（轻量）：保持现有三张卡片（总数/已注册/待注册），新增一行文案显示“即将过期 X 人 / 已过期 Y 人”，只做信息补充。
- 方案 B（更直观）：在第二行 grid 中增加两张小卡片，类似：
  - “即将过期（学生/家长）”：`expiryStats.expiringSoon`;
  - “已过期（学生/家长）”：`expiryStats.expired`。

推荐：**方案 B**，更符合“全部状态可视化”的目标。

### 3. 列表过滤逻辑扩展（新增“快要过期”筛选）

当前的 `filteredList` 已支持按角色、注册状态、搜索关键词过滤：

```ts
const filteredList = whitelist.filter(user => {
  const matchSearch = user.phone.includes(searchTerm) || user.name.includes(searchTerm);
  const matchRole = filterRole === 'all' || user.role === filterRole;
  const matchStatus = filterStatus === 'all' || 
    (filterStatus === 'registered' && user.isRegistered) ||
    (filterStatus === 'pending' && !user.isRegistered);
  return matchSearch && matchRole && matchStatus;
});
```

在此基础上，新增一个过期状态筛选维度 `filterExpiry`：

```ts
const [filterExpiry, setFilterExpiry] = useState<'all' | 'expiring' | 'expired'>('all');

const filteredList = whitelist.filter(user => {
  const matchSearch = ...;
  const matchRole = ...;
  const matchStatus = ...;

  const needs = needsExpiry(user.role);
  const expired = needs && isExpired(user.expiresAt);
  const expiring = needs && isExpiringSoon(user.expiresAt) && !expired;

  const matchExpiry =
    filterExpiry === 'all'
      ? true
      : filterExpiry === 'expiring'
      ? expiring
      : expired; // 'expired'

  // 老师不参与快要过期/已过期筛选，只受角色/注册状态影响
  return matchSearch && matchRole && matchStatus && (needs ? matchExpiry : filterExpiry === 'all');
});
```

注意：
- “快要过期”与“已过期”只对学生/家长有意义，老师在 `filterExpiry !== 'all'` 时可选择：
  - 仍然显示（更复杂逻辑）；或
  - 直接不显示（简单且符合“只关注学生和家长”的需求）。
- 上面实现采用“只在 `filterExpiry==='all'` 时展示老师记录”，符合“仅筛选学生和家长”的原始需求。

### 4. UI 交互设计

在白名单页面的“筛选器”区域中，新增一个过期状态选择控件，有两种风格：

1. **下拉选择（与角色/状态保持一致）**
   ```tsx
   <Select value={filterExpiry} onValueChange={(v) => setFilterExpiry(v as any)}>
     <SelectTrigger className="flex-1 bg-white rounded-2xl">
       <SelectValue placeholder="课时状态" />
     </SelectTrigger>
     <SelectContent>
       <SelectItem value="all">课时状态：全部</SelectItem>
       <SelectItem value="expiring">仅看即将过期（学生/家长）</SelectItem>
       <SelectItem value="expired">仅看已过期（学生/家长）</SelectItem>
     </SelectContent>
   </Select>
   ```

2. **单选按钮/标签组（更直观，但占空间）**
   - 三个 pill 按钮：“全部 / 即将过期 / 已过期”，选中时高亮。

考虑到现有筛选使用 `Select`，推荐**方案 1**。

在列表项展示上，进一步增强视觉提示：

- 对于 `needsExpiry(user.role)` 为 true 的记录：
  - 若 `expired`：已经有红色 “已过期” Badge，可保持；
  - 若 `expiring`：新增一个橙色 Badge，例如：
    ```tsx
    {needsExpiry && !expired && expiring && (
      <Badge className="bg-orange-100 text-orange-700 border-none text-xs flex items-center gap-1">
        <Clock className="w-3 h-3" />
        即将过期（{EXPIRING_SOON_DAYS}天内）
      </Badge>
    )}
    ```

### 5. 与后端 `/api/admin/whitelist` 的兼容性考虑（预留）

当前 `WhitelistService.list` 返回字段中包含 `validUntil`（课时有效期），而前端 mock 使用的是 `expiresAt`。为未来对接后端做准备，可在前端增加一层适配：

- 当接入真实接口时，统一在前端将 `validUntil` 映射为 `expiresAt`：
  ```ts
  expiresAt: record.validUntil ? record.validUntil.slice(0, 10) : undefined;
  ```
- 过期判断与即将过期逻辑保持复用，不依赖具体字段名。

本次迭代仍然以 mock 数据为主，仅在设计层面确保未来可以无痛替换。

### 6. 测试思路

1. 单元测试（如有前端测试基建）：
   - 针对 `isExpired` 和 `isExpiringSoon` 使用固定日期测试边界值（例如今天、+1 天、+15 天、+16 天、过去日期）。
   - 针对 `filteredList` 的组合逻辑，至少覆盖：
     - filterExpiry = all；
     - filterExpiry = expiring；
     - filterExpiry = expired；
     与角色（student/parent/teacher）、isRegistered 组合。
2. 手动验证：
   - 在白名单页面调整几个模拟 `expiresAt` 日期，观察“统计卡片 + 列表 + 筛选”是否一致；
   - 特别验证“即将过期”和“已过期”的边界日期表现是否符合预期。

