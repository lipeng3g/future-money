import { DATA_VERSION, type AppData } from '@/types';

/** 按版本顺序执行的迁移函数：输入旧结构，输出下一版本结构 */
const migrations: Record<number, (data: AppData) => AppData> = {
  // 示例：未来从 v1 升级到 v2 时在此补充
  // 1: (data) => ({ ...data, version: 2, /* 字段变换 */ }),
};

/** 将任意来源数据迁移到当前 schema 版本 */
export function migrate(data: AppData): AppData {
  let current = data;
  while (current.version < DATA_VERSION) {
    const step = migrations[current.version];
    if (!step) throw new Error(`缺少版本 ${current.version} 的迁移函数`);
    current = step(current);
  }
  return current;
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** 校验外部 JSON 是否为合法 AppData 结构，非法则抛错 */
export function validateAppData(value: unknown): AppData {
  if (typeof value !== 'object' || value === null) {
    throw new Error('数据格式错误：根节点不是对象');
  }
  const data = value as Record<string, unknown>;
  if (typeof data.version !== 'number') {
    throw new Error('数据格式错误：缺少 version');
  }
  if (data.version > DATA_VERSION) {
    throw new Error(`数据版本（${data.version}）高于当前支持版本（${DATA_VERSION}）`);
  }
  for (const key of ['accounts', 'transactions', 'series', 'categories'] as const) {
    if (!isArray(data[key])) throw new Error(`数据格式错误：${key} 不是数组`);
  }
  return data as unknown as AppData;
}

/** 数据摘要：用于导入前预览各实体数量 */
export interface AppDataSummary {
  version: number;
  accounts: number;
  transactions: number;
  series: number;
  categories: number;
}

/** 统计各实体数量 */
export function summarize(data: AppData): AppDataSummary {
  return {
    version: data.version,
    accounts: data.accounts.length,
    transactions: data.transactions.length,
    series: data.series.length,
    categories: data.categories.length,
  };
}

/** 按 id 合并两组实体，同 id 以 incoming 为准 */
function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()];
}

/** 合并两份数据：各实体按 id 去重合并，同 id 以 incoming 覆盖 */
export function mergeAppData(current: AppData, incoming: AppData): AppData {
  return {
    version: DATA_VERSION,
    accounts: mergeById(current.accounts, incoming.accounts),
    transactions: mergeById(current.transactions, incoming.transactions),
    series: mergeById(current.series, incoming.series),
    categories: mergeById(current.categories, incoming.categories),
  };
}

/** 序列化为可下载的 JSON 字符串 */
export function serialize(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

/** 解析 JSON 字符串 → 校验 → 迁移到当前版本 */
export function deserialize(json: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('JSON 解析失败：文件内容不是合法 JSON');
  }
  return migrate(validateAppData(parsed));
}

/** 浏览器端：将数据导出为 JSON 文件并触发下载 */
export function exportToFile(data: AppData, filename = 'future-money-backup.json'): void {
  const blob = new Blob([serialize(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** 浏览器端：读取用户选择的文件并解析为 AppData */
export async function importFromFile(file: File): Promise<AppData> {
  const text = await file.text();
  return deserialize(text);
}
