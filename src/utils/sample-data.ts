import { addMonths, formatISO } from 'date-fns';
import type { CashFlowEvent } from '@/types/event';
import { createId } from '@/utils/id';

export const generateSampleEvents = (): CashFlowEvent[] => {
  const now = new Date();
  const baseDate = formatISO(now, { representation: 'date' });
  return [
    {
      id: createId(),
      name: '工资到账',
      amount: 20000,
      category: 'income',
      type: 'monthly',
      startDate: baseDate,
      monthlyDay: 10,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: '税后收入',
    },
    {
      id: createId(),
      name: '信用卡还款',
      amount: 6000,
      category: 'expense',
      type: 'monthly',
      startDate: baseDate,
      monthlyDay: 11,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: '上月消费',
    },
    {
      id: createId(),
      name: '房贷',
      amount: 8000,
      category: 'expense',
      type: 'monthly',
      startDate: baseDate,
      monthlyDay: 20,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId(),
      name: '年度奖金',
      amount: 40000,
      category: 'income',
      type: 'yearly',
      startDate: baseDate,
      yearlyMonth: now.getMonth() + 1, // getMonth()范围0-11，+1后为1-12，安全
      yearlyDay: now.getDate(),
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: '年底发放',
    },
    {
      id: createId(),
      name: '汽车保险',
      amount: 6000,
      category: 'expense',
      type: 'yearly',
      startDate: baseDate,
      yearlyMonth: ((now.getMonth() + 2) % 12) || 12, // 避免月份越界，0变为12
      yearlyDay: 15,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId(),
      name: '家电升级',
      amount: 12000,
      category: 'expense',
      type: 'once',
      startDate: formatISO(addMonths(now, 1), { representation: 'date' }),
      onceDate: formatISO(addMonths(now, 1), { representation: 'date' }),
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: '一次性大额采购',
    },
  ];
};
