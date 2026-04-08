'use client';

import { cn } from '@/lib/utils';

export type TimePeriod = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y' | 'ALL';

interface TimePeriodTabsProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  className?: string;
}

const PERIOD_LABELS: Record<TimePeriod, string> = {
  '1M': '近1月',
  '3M': '近3月',
  '6M': '近6月',
  '1Y': '近1年',
  '3Y': '近3年',
  '5Y': '近5年',
  '10Y': '近10年',
  'ALL': '成立以来',
};

export function TimePeriodTabs({ value, onChange, className }: TimePeriodTabsProps) {
  return (
    <div className={cn('inline-flex bg-slate-100 rounded-lg p-1', className)}>
      {(Object.keys(PERIOD_LABELS) as TimePeriod[]).map((period) => (
        <button
          key={period}
          onClick={() => onChange(period)}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            value === period
              ? 'bg-rose-100 text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          )}
        >
          {PERIOD_LABELS[period]}
        </button>
      ))}
    </div>
  );
}
