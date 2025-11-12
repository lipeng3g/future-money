# 数据模型设计

## 概述
本文档定义了 FutureMoney 应用的核心数据结构。所有类型定义使用 TypeScript。

## 核心数据类型

### 1. 现金流事件类型

现金流事件是系统的核心概念，代表所有收入和支出。

```typescript
/**
 * 事件重复类型
 */
type RecurrenceType =
  | 'once'      // 一次性事件
  | 'monthly'   // 每月重复
  | 'yearly'    // 每年重复

/**
 * 收入/支出分类
 */
type TransactionCategory = 'income' | 'expense'

/**
 * 现金流事件（统一模型）
 */
interface CashFlowEvent {
  // === 基础信息 ===
  id: string;                    // 唯一标识符
  name: string;                  // 事件名称（如："工资"、"房贷"）
  amount: number;                // 金额（正数，通过 category 区分收入/支出）
  category: TransactionCategory; // 收入/支出类型
  type: RecurrenceType;          // 重复类型

  // === 日期配置 ===
  startDate: string;             // 起始日期（ISO 8601格式："2025-01-01"）
  endDate?: string;              // 结束日期（可选，不填表示永久有效）

  // === 重复规则配置（根据 type 使用不同字段）===

  // 当 type === 'once' 时使用
  onceDate?: string;             // 一次性事件的日期（如："2025-12-25"）

  // 当 type === 'monthly' 时使用
  monthlyDay?: number;           // 每月的第几天（1-31）

  // 当 type === 'yearly' 时使用
  yearlyMonth?: number;          // 几月（1-12）
  yearlyDay?: number;            // 几号（1-31）

  // === 可选配置 ===
  color?: string;                // 图表显示颜色（十六进制，如："#52c41a"）
  notes?: string;                // 备注说明
  enabled: boolean;              // 是否启用（false 时暂时不计入计算）

  // === 审计字段 ===
  createdAt: string;             // 创建时间（ISO 8601）
  updatedAt: string;             // 最后更新时间（ISO 8601）
}
```

#### 使用示例

**示例1：每月工资**
```typescript
{
  id: "evt_001",
  name: "工资",
  amount: 2000,
  category: "income",
  type: "monthly",
  monthlyDay: 10,           // 每月10号
  startDate: "2025-01-01",
  color: "#52c41a",
  enabled: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z"
}
```

**示例2：每月房贷**
```typescript
{
  id: "evt_002",
  name: "房贷",
  amount: 3000,
  category: "expense",
  type: "monthly",
  monthlyDay: 20,           // 每月20号
  startDate: "2025-01-01",
  color: "#ff4d4f",
  enabled: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z"
}
```

**示例3：年终奖**
```typescript
{
  id: "evt_003",
  name: "年终奖",
  amount: 20000,
  category: "income",
  type: "yearly",
  yearlyMonth: 1,           // 每年1月
  yearlyDay: 15,            // 15号
  startDate: "2025-01-01",
  color: "#faad14",
  enabled: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z"
}
```

**示例4：一次性购物**
```typescript
{
  id: "evt_004",
  name: "购买电脑",
  amount: 8000,
  category: "expense",
  type: "once",
  onceDate: "2025-06-15",   // 具体日期
  startDate: "2025-06-15",
  color: "#722ed1",
  notes: "MacBook Pro",
  enabled: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z"
}
```

---

### 2. 账户配置

```typescript
/**
 * 账户配置
 */
interface AccountConfig {
  initialBalance: number;    // 初始余额（单位：元）
  currency: string;          // 货币符号（固定为 "¥"）
  warningThreshold: number;  // 余额预警阈值（低于此值时预警）
  createdAt: string;         // 账户创建时间
  updatedAt: string;         // 最后更新时间
}
```

#### 使用示例
```typescript
{
  initialBalance: 10000,
  currency: "¥",
  warningThreshold: 1000,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z"
}
```

---

### 3. 应用状态

```typescript
/**
 * 用户偏好设置
 */
interface UserPreferences {
  defaultViewMonths: number;       // 默认展示月数（12）
  chartType: 'line' | 'area';      // 图表类型
  showWeekends: boolean;           // 是否在图表标记周末
}

/**
 * 应用完整状态（用于持久化存储）
 */
interface AppState {
  version: string;                 // 数据版本号（用于迁移兼容）
  account: AccountConfig;          // 账户配置
  events: CashFlowEvent[];         // 所有现金流事件
  preferences: UserPreferences;    // 用户偏好
}
```

---

### 4. 时间轴相关数据类型

这些类型用于计算和展示结果。

```typescript
/**
 * 事件发生记录
 * 用于记录某个事件在特定日期的实际发生
 */
interface EventOccurrence {
  id: string;                      // 对应的事件ID
  name: string;                    // 事件名称
  amount: number;                  // 金额（正数=收入，负数=支出）
  category: TransactionCategory;   // 收入/支出
  color?: string;                  // 显示颜色
}

/**
 * 每日快照
 * 记录某一天的余额状态和发生的事件
 */
interface DailySnapshot {
  date: Date;                      // 日期
  balance: number;                 // 当天结束时的余额
  change: number;                  // 当天的余额变化量
  events: EventOccurrence[];       // 当天发生的所有事件
  isWeekend: boolean;              // 是否是周末
  isToday: boolean;                // 是否是今天
}
```

---

### 5. 分析统计数据类型

```typescript
/**
 * 月度汇总统计
 */
interface MonthlySummary {
  month: string;                   // 月份（格式："2025-01"）
  income: number;                  // 当月总收入
  expense: number;                 // 当月总支出
  netChange: number;               // 净变化（收入 - 支出）
  startBalance: number;            // 月初余额
  endBalance: number;              // 月末余额
  eventCount: number;              // 事件总数
}

/**
 * 余额预警
 */
interface BalanceWarning {
  date: Date;                      // 预警开始日期
  endDate?: Date;                  // 预警结束日期（连续预警期）
  balance: number;                 // 最低余额
  deficit: number;                 // 缺口金额（阈值 - 最低余额）
  severity: 'low' | 'medium' | 'high'; // 严重程度
}

/**
 * 关键指标
 */
interface KeyMetrics {
  minBalance: number;              // 最低余额
  maxBalance: number;              // 最高余额
  avgBalance: number;              // 平均余额
  minBalanceDate: Date;            // 最低余额发生日期
  maxBalanceDate: Date;            // 最高余额发生日期
  totalIncome: number;             // 总收入
  totalExpense: number;            // 总支出
  netCashFlow: number;             // 净现金流
  volatility: number;              // 波动性（标准差）
}
```

---

## 数据验证规则

### CashFlowEvent 验证

```typescript
/**
 * 验证现金流事件数据
 */
function validateCashFlowEvent(event: CashFlowEvent): string[] {
  const errors: string[] = [];

  // 基础字段验证
  if (!event.name || event.name.trim() === '') {
    errors.push('事件名称不能为空');
  }

  if (event.amount <= 0) {
    errors.push('金额必须大于0');
  }

  if (!['income', 'expense'].includes(event.category)) {
    errors.push('类型必须是收入或支出');
  }

  if (!['once', 'monthly', 'yearly'].includes(event.type)) {
    errors.push('重复类型无效');
  }

  // 日期格式验证
  if (!isValidISODate(event.startDate)) {
    errors.push('起始日期格式错误');
  }

  if (event.endDate && !isValidISODate(event.endDate)) {
    errors.push('结束日期格式错误');
  }

  // 根据类型验证特定字段
  switch (event.type) {
    case 'once':
      if (!event.onceDate) {
        errors.push('一次性事件必须指定日期');
      }
      break;

    case 'monthly':
      if (!event.monthlyDay || event.monthlyDay < 1 || event.monthlyDay > 31) {
        errors.push('每月日期必须在1-31之间');
      }
      break;

    case 'yearly':
      if (!event.yearlyMonth || event.yearlyMonth < 1 || event.yearlyMonth > 12) {
        errors.push('月份必须在1-12之间');
      }
      if (!event.yearlyDay || event.yearlyDay < 1 || event.yearlyDay > 31) {
        errors.push('日期必须在1-31之间');
      }
      break;
  }

  return errors;
}
```

---

## 默认值配置

```typescript
/**
 * 默认账户配置
 */
const DEFAULT_ACCOUNT_CONFIG: AccountConfig = {
  initialBalance: 10000,
  currency: '¥',
  warningThreshold: 1000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

/**
 * 默认用户偏好
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  defaultViewMonths: 12,
  chartType: 'line',
  showWeekends: true
};

/**
 * 默认颜色配置
 */
const DEFAULT_COLORS = {
  income: '#52c41a',      // 绿色
  expense: '#ff4d4f',     // 红色
  warning: '#faad14',     // 橙色
  neutral: '#1890ff'      // 蓝色
};
```

---

## 数据存储格式

localStorage 中存储的数据结构：

```typescript
{
  "version": "1.0.0",
  "timestamp": "2025-01-01T00:00:00Z",
  "state": {
    "account": { /* AccountConfig */ },
    "events": [ /* CashFlowEvent[] */ ],
    "preferences": { /* UserPreferences */ }
  }
}
```

---

## 类型文件组织

建议的文件结构：

```
src/
├── types/
│   ├── index.ts           # 导出所有类型
│   ├── event.ts           # CashFlowEvent 相关类型
│   ├── account.ts         # AccountConfig 相关类型
│   ├── timeline.ts        # 时间轴相关类型
│   ├── analytics.ts       # 分析统计相关类型
│   └── storage.ts         # 存储相关类型
```

---

## 注意事项

1. **日期格式**：统一使用 ISO 8601 格式字符串（`YYYY-MM-DD`）
2. **金额单位**：所有金额单位为"元"，不使用"分"
3. **金额符号**：存储时统一为正数，通过 `category` 区分收入/支出
4. **ID生成**：使用时间戳 + 随机数确保唯一性
5. **时间处理**：使用 date-fns 库处理日期操作，避免直接使用 Date 对象
