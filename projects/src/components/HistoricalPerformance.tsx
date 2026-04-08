'use client';

import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { StrategyData, STRATEGY_COLORS } from '@/types/strategy';
import { calculatePeriodMetrics } from '@/utils/calculator';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import { Button } from './ui/button';

interface HistoricalPerformanceProps {
  strategies: StrategyData[];
  className?: string;
}

// 时间区间配置
const periods = [
  { key: '1m' as const, label: '近1月' },
  { key: '3m' as const, label: '近3月' },
  { key: '6m' as const, label: '近6月' },
  { key: '1y' as const, label: '近一年' },
  { key: '2y' as const, label: '近2年' },
  { key: '3y' as const, label: '近3年' },
  { key: 'ytd' as const, label: '今年以来' },
  { key: 'all' as const, label: '成立以来' },
];

export function HistoricalPerformance({ strategies, className }: HistoricalPerformanceProps) {
  // 截止日期状态，默认为今日
  const [endDate, setEndDate] = useState<Date>(() => new Date());

  // 计算各策略在不同时间区间的业绩（使用截止日期）
  const periodMetricsData = useMemo(() => {
    return strategies.map((strategy, index) => {
      const metrics = calculatePeriodMetrics(strategy.dailyData, endDate);
      return {
        strategy,
        metrics,
        color: STRATEGY_COLORS[index % STRATEGY_COLORS.length],
      };
    });
  }, [strategies, endDate]);

  // 格式化日期为 YYYY-MM-DD
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 格式化日期为中文格式
  const formatDateChinese = (date: Date) => {
    return date.toLocaleDateString('zh-CN');
  };

  // 重置为今日
  const handleResetToToday = () => {
    setEndDate(new Date());
  };

  return (
    <div className={className}>
      {/* 截止日期选择器 */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">截止日期：</span>
        </div>
        <input
          type="date"
          value={formatDateForInput(endDate)}
          onChange={(e) => {
            const date = new Date(e.target.value);
            date.setHours(23, 59, 59, 999); // 设置为当天结束
            setEndDate(date);
          }}
          className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetToToday}
          className="text-xs"
        >
          重置为今日
        </Button>
        <span className="text-xs text-slate-500">
          （仅影响下方历史业绩表格数据）
        </span>
      </div>

      {/* 历史业绩表格 - 每个策略单独一个表 */}
      <div className="space-y-6">
        {periodMetricsData.map(({ strategy, metrics, color }) => (
          <div key={strategy.id} className="rounded-lg border border-slate-200 overflow-hidden">
            {/* 策略标题 */}
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-medium text-slate-900">{strategy.strategyName}</span>
              </div>
            </div>

            {/* 表格内容 */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-center font-semibold text-slate-900 text-xs py-2 w-[100px]">时间段</TableHead>
                    <TableHead className="text-right font-semibold text-slate-900 text-xs py-2 w-[120px]">时间（起始）</TableHead>
                    <TableHead className="text-right font-semibold text-slate-900 text-xs py-2 w-[120px]">时间（截止）</TableHead>
                    <TableHead className="text-right font-semibold text-slate-900 text-xs py-2 w-[120px]">累计收益率</TableHead>
                    <TableHead className="text-right font-semibold text-slate-900 text-xs py-2 w-[120px]">基准收益率</TableHead>
                    <TableHead className="text-right font-semibold text-slate-900 text-xs py-2 w-[120px]">超额收益率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => {
                    const periodData = metrics[period.key];

                    return (
                      <TableRow key={period.key} className="hover:bg-slate-50/50">
                        <TableCell className="text-center font-medium text-slate-700 text-xs py-2">
                          {period.label}
                        </TableCell>
                        {periodData !== null ? (
                          <>
                            <TableCell className="text-right text-slate-500 text-xs py-2">
                              {formatDateChinese(periodData.startDate)}
                            </TableCell>
                            <TableCell className="text-right text-slate-500 text-xs py-2">
                              {formatDateChinese(periodData.endDate)}
                            </TableCell>
                            <TableCell className={cn('text-right text-xs py-2', periodData.cumulativeReturn >= 0 ? 'text-red-600' : 'text-green-600')}>
                              {periodData.cumulativeReturn >= 0 ? '+' : ''}{(periodData.cumulativeReturn * 100).toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-right text-slate-600 text-xs py-2">
                              {periodData.benchmarkReturn >= 0 ? '+' : ''}{(periodData.benchmarkReturn * 100).toFixed(2)}%
                            </TableCell>
                            <TableCell className={cn('text-right text-xs py-2', periodData.excessReturn >= 0 ? 'text-red-600' : 'text-green-600')}>
                              {periodData.excessReturn >= 0 ? '+' : ''}{(periodData.excessReturn * 100).toFixed(2)}%
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-right text-slate-400 text-xs py-2">-</TableCell>
                            <TableCell className="text-right text-slate-400 text-xs py-2">-</TableCell>
                            <TableCell className="text-right text-slate-400 text-xs py-2">-</TableCell>
                            <TableCell className="text-right text-slate-400 text-xs py-2">-</TableCell>
                            <TableCell className="text-right text-slate-400 text-xs py-2">-</TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
