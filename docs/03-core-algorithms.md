# 核心算法设计

## 概述
本文档详细说明 FutureMoney 的核心算法，包括时间轴生成、余额计算、数据分析等。

---

## 1. 时间轴生成器 (TimelineGenerator)

时间轴生成器是整个系统的核心，负责根据事件配置生成未来每日的余额数据。

### 1.1 主算法流程

```typescript
/**
 * 时间轴生成器类
 */
class TimelineGenerator {
  /**
   * 生成未来 N 个月的每日余额数据
   *
   * @param initialBalance 初始余额
   * @param events 所有现金流事件
   * @param startDate 起始日期
   * @param months 生成月数（默认12个月）
   * @returns 每日快照数组
   */
  generate(
    initialBalance: number,
    events: CashFlowEvent[],
    startDate: Date,
    months: number = 12
  ): DailySnapshot[] {
    const timeline: DailySnapshot[] = [];

    // 计算结束日期
    const endDate = this.addMonths(startDate, months);

    // 初始化当前日期和余额
    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0); // 标准化到当天0点
    let balance = initialBalance;

    // 遍历每一天
    while (currentDate <= endDate) {
      // 1. 找出当天发生的所有事件
      const dailyEvents = this.getEventsForDate(currentDate, events);

      // 2. 计算当天的余额变化
      const dailyChange = this.calculateDailyChange(dailyEvents);
      balance += dailyChange;

      // 3. 记录快照
      timeline.push({
        date: new Date(currentDate),
        balance: balance,
        change: dailyChange,
        events: dailyEvents,
        isWeekend: this.isWeekend(currentDate),
        isToday: this.isToday(currentDate)
      });

      // 4. 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return timeline;
  }

  /**
   * 计算当日余额变化
   */
  private calculateDailyChange(events: EventOccurrence[]): number {
    return events.reduce((sum, event) => {
      // 收入为正，支出为负
      const amount = event.category === 'income' ? event.amount : -event.amount;
      return sum + amount;
    }, 0);
  }

  /**
   * 日期加月份
   */
  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }
}
```

---

### 1.2 事件匹配算法

这是核心中的核心，判断某个事件是否在指定日期发生。

```typescript
/**
 * 获取指定日期发生的所有事件
 */
private getEventsForDate(date: Date, events: CashFlowEvent[]): EventOccurrence[] {
  return events
    .filter(event => event.enabled)  // 只考虑启用的事件
    .filter(event => this.shouldEventOccur(event, date))  // 判断是否发生
    .map(event => this.toEventOccurrence(event));
}

/**
 * 判断事件是否在指定日期发生
 *
 * 核心逻辑：
 * 1. 检查日期是否在事件有效期内
 * 2. 根据事件类型判断是否符合重复规则
 */
private shouldEventOccur(event: CashFlowEvent, date: Date): boolean {
  // === 第一步：检查有效期 ===
  const eventStart = new Date(event.startDate);
  if (date < eventStart) {
    return false;  // 还未到起始日期
  }

  if (event.endDate) {
    const eventEnd = new Date(event.endDate);
    if (date > eventEnd) {
      return false;  // 已过结束日期
    }
  }

  // === 第二步：根据类型判断 ===
  switch (event.type) {
    case 'once':
      return this.matchOnceEvent(event, date);

    case 'monthly':
      return this.matchMonthlyEvent(event, date);

    case 'yearly':
      return this.matchYearlyEvent(event, date);

    default:
      return false;
  }
}

/**
 * 匹配一次性事件
 */
private matchOnceEvent(event: CashFlowEvent, date: Date): boolean {
  if (!event.onceDate) return false;

  const eventDate = new Date(event.onceDate);
  return this.isSameDay(date, eventDate);
}

/**
 * 匹配每月事件
 */
private matchMonthlyEvent(event: CashFlowEvent, date: Date): boolean {
  if (!event.monthlyDay) return false;

  // 检查日期是否匹配
  const currentDay = date.getDate();

  // 特殊处理：如果设置的是31号，但当月没有31号，则在月末执行
  if (event.monthlyDay === 31) {
    const lastDay = this.getLastDayOfMonth(date);
    return currentDay === lastDay;
  }

  return currentDay === event.monthlyDay;
}

/**
 * 匹配每年事件
 */
private matchYearlyEvent(event: CashFlowEvent, date: Date): boolean {
  if (!event.yearlyMonth || !event.yearlyDay) return false;

  const currentMonth = date.getMonth() + 1;  // 月份从1开始
  const currentDay = date.getDate();

  // 特殊处理：2月29日（闰年）
  if (event.yearlyMonth === 2 && event.yearlyDay === 29) {
    if (!this.isLeapYear(date.getFullYear())) {
      // 非闰年时，2月29日的事件在2月28日执行
      return currentMonth === 2 && currentDay === 28;
    }
  }

  return currentMonth === event.yearlyMonth && currentDay === event.yearlyDay;
}

/**
 * 获取当月最后一天
 */
private getLastDayOfMonth(date: Date): number {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return nextMonth.getDate();
}

/**
 * 判断是否为闰年
 */
private isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * 判断两个日期是否为同一天
 */
private isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * 转换为事件发生记录
 */
private toEventOccurrence(event: CashFlowEvent): EventOccurrence {
  return {
    id: event.id,
    name: event.name,
    amount: event.amount,
    category: event.category,
    color: event.color
  };
}

/**
 * 判断是否为周末
 */
private isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;  // 0=周日, 6=周六
}

/**
 * 判断是否为今天
 */
private isToday(date: Date): boolean {
  const today = new Date();
  return this.isSameDay(date, today);
}
```

---

### 1.3 算法复杂度分析

**时间复杂度**：
- 假设有 N 个事件，生成 M 天的数据
- 每天需要检查所有事件：O(N)
- 总复杂度：**O(M × N)**

**典型场景**：
- 12个月 ≈ 365天
- 50个事件
- 总计算次数：365 × 50 = 18,250 次

**优化方向**（未来可选）：
- 对事件按日期分组，建立索引
- 使用缓存避免重复计算

---

## 2. 数据分析引擎 (AnalyticsEngine)

### 2.1 月度汇总统计

```typescript
class AnalyticsEngine {
  /**
   * 按月汇总统计
   */
  getMonthlySummary(timeline: DailySnapshot[]): MonthlySummary[] {
    // 使用 Map 按月分组
    const monthlyMap = new Map<string, {
      income: number;
      expense: number;
      eventCount: number;
      firstDayBalance: number;
      lastDayBalance: number;
    }>();

    timeline.forEach((day, index) => {
      // 生成月份 key："2025-01"
      const monthKey = this.formatYearMonth(day.date);

      // 初始化月份数据
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          income: 0,
          expense: 0,
          eventCount: 0,
          firstDayBalance: day.balance - day.change,
          lastDayBalance: day.balance
        });
      }

      const monthData = monthlyMap.get(monthKey)!;

      // 累加收入和支出
      day.events.forEach(event => {
        if (event.category === 'income') {
          monthData.income += event.amount;
        } else {
          monthData.expense += event.amount;
        }
        monthData.eventCount++;
      });

      // 更新月末余额
      monthData.lastDayBalance = day.balance;
    });

    // 转换为数组
    return Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      netChange: data.income - data.expense,
      startBalance: data.firstDayBalance,
      endBalance: data.lastDayBalance,
      eventCount: data.eventCount
    }));
  }

  private formatYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
```

---

### 2.2 余额预警检测

```typescript
/**
 * 检测余额预警
 *
 * 策略：
 * 1. 找出所有低于阈值的日期
 * 2. 合并连续的预警期
 * 3. 计算严重程度
 */
detectWarnings(
  timeline: DailySnapshot[],
  threshold: number
): BalanceWarning[] {
  const warnings: BalanceWarning[] = [];

  // 第一步：找出所有预警日期
  const warningDays = timeline.filter(day => day.balance < threshold);

  if (warningDays.length === 0) {
    return warnings;
  }

  // 第二步：合并连续预警期
  let currentWarning: BalanceWarning = {
    date: warningDays[0].date,
    endDate: warningDays[0].date,
    balance: warningDays[0].balance,
    deficit: threshold - warningDays[0].balance,
    severity: this.calculateSeverity(warningDays[0].balance, threshold)
  };

  for (let i = 1; i < warningDays.length; i++) {
    const prevDay = warningDays[i - 1];
    const currDay = warningDays[i];

    // 计算日期差（毫秒转天数）
    const daysDiff = (currDay.date.getTime() - prevDay.date.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff === 1) {
      // 连续，更新当前预警期
      currentWarning.endDate = currDay.date;

      // 更新最低余额
      if (currDay.balance < currentWarning.balance) {
        currentWarning.balance = currDay.balance;
        currentWarning.deficit = threshold - currDay.balance;
      }

      // 更新严重程度（取最严重的）
      const currSeverity = this.calculateSeverity(currDay.balance, threshold);
      currentWarning.severity = this.maxSeverity(currentWarning.severity, currSeverity);
    } else {
      // 不连续，保存当前预警，开始新的
      warnings.push(currentWarning);

      currentWarning = {
        date: currDay.date,
        endDate: currDay.date,
        balance: currDay.balance,
        deficit: threshold - currDay.balance,
        severity: this.calculateSeverity(currDay.balance, threshold)
      };
    }
  }

  // 保存最后一个预警
  warnings.push(currentWarning);

  return warnings;
}

/**
 * 计算严重程度
 * - high: 余额 < 阈值的30%
 * - medium: 余额在30%-60%之间
 * - low: 余额在60%-100%之间
 */
private calculateSeverity(
  balance: number,
  threshold: number
): 'low' | 'medium' | 'high' {
  const ratio = balance / threshold;

  if (ratio < 0.3) return 'high';
  if (ratio < 0.6) return 'medium';
  return 'low';
}

/**
 * 比较两个严重程度，返回更严重的
 */
private maxSeverity(
  s1: 'low' | 'medium' | 'high',
  s2: 'low' | 'medium' | 'high'
): 'low' | 'medium' | 'high' {
  const order = { low: 1, medium: 2, high: 3 };
  return order[s1] > order[s2] ? s1 : s2;
}
```

---

### 2.3 关键指标计算

```typescript
/**
 * 计算关键指标
 */
getKeyMetrics(timeline: DailySnapshot[]): KeyMetrics {
  if (timeline.length === 0) {
    throw new Error('时间轴数据为空');
  }

  const balances = timeline.map(d => d.balance);

  // 最小值和最大值
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);

  // 对应的日期
  const minBalanceDay = timeline.find(d => d.balance === minBalance)!;
  const maxBalanceDay = timeline.find(d => d.balance === maxBalance)!;

  // 平均值
  const avgBalance = balances.reduce((a, b) => a + b, 0) / balances.length;

  // 总收入和总支出
  let totalIncome = 0;
  let totalExpense = 0;

  timeline.forEach(day => {
    day.events.forEach(event => {
      if (event.category === 'income') {
        totalIncome += event.amount;
      } else {
        totalExpense += event.amount;
      }
    });
  });

  // 净现金流
  const netCashFlow = timeline[timeline.length - 1].balance - timeline[0].balance;

  // 波动性（标准差）
  const volatility = this.calculateStandardDeviation(balances);

  return {
    minBalance,
    maxBalance,
    avgBalance,
    minBalanceDate: minBalanceDay.date,
    maxBalanceDate: maxBalanceDay.date,
    totalIncome,
    totalExpense,
    netCashFlow,
    volatility
  };
}

/**
 * 计算标准差
 */
private calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => {
    return sum + Math.pow(val - mean, 2);
  }, 0) / values.length;

  return Math.sqrt(variance);
}
```

---

## 3. 数据持久化管理 (StorageManager)

### 3.1 本地存储

```typescript
class StorageManager {
  private readonly STORAGE_KEY = 'future_money_data';
  private readonly VERSION = '1.0.0';

  /**
   * 保存数据到 localStorage
   */
  save(state: AppState): void {
    const data = {
      version: this.VERSION,
      timestamp: new Date().toISOString(),
      state: state
    };

    try {
      const json = JSON.stringify(data);
      localStorage.setItem(this.STORAGE_KEY, json);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('浏览器存储空间不足，请清理缓存或导出数据');
      }
      throw error;
    }
  }

  /**
   * 从 localStorage 加载数据
   */
  load(): AppState | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const data = JSON.parse(raw);

      // 版本检查
      if (data.version !== this.VERSION) {
        console.warn('数据版本不匹配，尝试迁移');
        return this.migrate(data);
      }

      return data.state;
    } catch (error) {
      console.error('加载数据失败:', error);
      return null;
    }
  }

  /**
   * 清空数据
   */
  clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * 数据版本迁移（预留）
   */
  private migrate(oldData: any): AppState {
    // 未来版本升级时实现
    console.warn('数据迁移功能待实现');
    return oldData.state;
  }
}
```

---

### 3.2 导出功能

```typescript
/**
 * 导出为 JSON 文件
 */
export(state: AppState): void {
  const data = {
    version: this.VERSION,
    exportDate: new Date().toISOString(),
    state: state
  };

  // 格式化 JSON（缩进2个空格）
  const json = JSON.stringify(data, null, 2);

  // 创建 Blob
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });

  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `future-money-backup-${this.formatDate(new Date())}.json`;

  // 触发下载
  document.body.appendChild(a);
  a.click();

  // 清理
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

private formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; // "2025-01-01"
}
```

---

### 3.3 导入功能

```typescript
/**
 * 从 JSON 文件导入
 */
async import(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target!.result as string;
        const data = JSON.parse(content);

        // 验证数据格式
        if (!this.validateImportData(data)) {
          throw new Error('数据格式不正确');
        }

        resolve(data.state);
      } catch (error) {
        reject(new Error('文件解析失败：' + (error as Error).message));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsText(file, 'utf-8');
  });
}

/**
 * 验证导入数据格式
 */
private validateImportData(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (!data.state) {
    return false;
  }

  const state = data.state;

  // 验证必需字段
  if (!state.account || !Array.isArray(state.events) || !state.preferences) {
    return false;
  }

  return true;
}
```

---

## 4. 算法测试用例

### 4.1 时间轴生成测试

```typescript
describe('TimelineGenerator', () => {
  it('应该正确生成每月事件', () => {
    const events: CashFlowEvent[] = [{
      id: '1',
      name: '工资',
      amount: 2000,
      category: 'income',
      type: 'monthly',
      monthlyDay: 10,
      startDate: '2025-01-01',
      enabled: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }];

    const generator = new TimelineGenerator();
    const timeline = generator.generate(10000, events, new Date('2025-01-01'), 3);

    // 应该有 3 次工资收入（1/10, 2/10, 3/10）
    const salaryDays = timeline.filter(day => day.events.length > 0);
    expect(salaryDays.length).toBe(3);
    expect(salaryDays[0].date.getDate()).toBe(10);
  });

  it('应该正确处理月末日期（31号）', () => {
    const events: CashFlowEvent[] = [{
      id: '1',
      name: '月末结算',
      amount: 1000,
      category: 'income',
      type: 'monthly',
      monthlyDay: 31,
      startDate: '2025-01-01',
      enabled: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }];

    const generator = new TimelineGenerator();
    const timeline = generator.generate(10000, events, new Date('2025-01-01'), 2);

    // 1月31号，2月28号（非闰年）
    const eventDays = timeline.filter(day => day.events.length > 0);
    expect(eventDays[0].date.getDate()).toBe(31);  // 1月
    expect(eventDays[1].date.getDate()).toBe(28);  // 2月
  });
});
```

---

## 5. 性能优化建议

### 5.1 计算结果缓存

```typescript
class CachedTimelineGenerator extends TimelineGenerator {
  private cache = new Map<string, DailySnapshot[]>();

  generate(
    initialBalance: number,
    events: CashFlowEvent[],
    startDate: Date,
    months: number = 12
  ): DailySnapshot[] {
    // 生成缓存键
    const cacheKey = this.generateCacheKey(initialBalance, events, startDate, months);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = super.generate(initialBalance, events, startDate, months);
    this.cache.set(cacheKey, result);

    return result;
  }

  private generateCacheKey(...args: any[]): string {
    return JSON.stringify(args);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

### 5.2 Vue Computed 自动缓存

在 Vue 3 中使用 `computed`，自动实现响应式缓存：

```typescript
const timeline = computed(() => {
  return generator.generate(
    account.value.initialBalance,
    events.value,
    viewStartDate.value,
    viewMonths.value
  );
});

// 只有当依赖变化时才会重新计算
```

---

## 总结

核心算法的关键点：
1. **时间轴生成**：遍历每一天，匹配事件，累加余额
2. **事件匹配**：根据类型（一次性/每月/每年）判断是否发生
3. **边界处理**：月末、闰年、周末等特殊情况
4. **数据分析**：月度汇总、预警检测、关键指标
5. **持久化**：localStorage 存储、导入导出

所有算法都经过精心设计，确保准确性和性能。
