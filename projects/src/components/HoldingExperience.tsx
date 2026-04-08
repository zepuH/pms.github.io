'use client';

import { useMemo } from 'react';
import { StrategyData, STRATEGY_COLORS } from '@/types/strategy';
import { DailyData } from '@/types/strategy';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface HoldingExperienceProps {
  strategies: StrategyData[];
  className?: string;
}

// 持有体验统计指标
interface HoldingMetrics {
  newHighCount: number;           // 累计创新高次数
  holdHalfYearProb: number | null;       // 持有半年盈利概率
  hold1YearProb: number | null;         // 持有1年盈利概率
  hold3YearProb: number | null;         // 持有3年盈利概率
  quarterlyExcessWinRate: number | null; // 季度超额胜率
  quarterlyProfitRate: number | null;   // 季度盈利概率
  yearlyExcessWinRate: number | null;   // 年度超额胜率
  yearlyProfitRate: number | null;      // 年度盈利概率
}

// 年度业绩
interface YearlyPerformance {
  year: number;
  startDate: Date;
  endDate: Date;
  cumulativeReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
}

// 季度业绩
interface QuarterlyPerformance {
  quarter: string;
  startDate: Date;
  endDate: Date;
  cumulativeReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
}

// 计算持有体验指标
function calculateHoldingMetrics(dailyData: DailyData[]): HoldingMetrics {
  if (dailyData.length < 2) {
    return {
      newHighCount: 0,
      holdHalfYearProb: null,
      hold1YearProb: null,
      hold3YearProb: null,
      quarterlyExcessWinRate: null,
      quarterlyProfitRate: null,
      yearlyExcessWinRate: null,
      yearlyProfitRate: null,
    };
  }

  const data = dailyData.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // 1. 计算累计创新高次数
  // 第一个数据点不算作创新高，从第二个开始计算
  let peak = data[0].nav;
  let newHighCount = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i].nav > peak) {
      peak = data[i].nav;
      newHighCount++;
    }
  }

  // 2. 计算持有X年盈利概率
  const tradingDaysInHalfYear = 126;  // 约126个交易日
  const tradingDaysIn1Year = 252;     // 约252个交易日
  const tradingDaysIn3Year = 756;     // 约756个交易日

  // 持有半年盈利概率
  let halfYearCount = 0;
  let halfYearProfitCount = 0;
  for (let i = 0; i < data.length - tradingDaysInHalfYear; i++) {
    const startNav = data[i].nav;
    const endNav = data[i + tradingDaysInHalfYear].nav;
    halfYearCount++;
    if (endNav > startNav) {
      halfYearProfitCount++;
    }
  }

  // 持有1年盈利概率
  let oneYearCount = 0;
  let oneYearProfitCount = 0;
  for (let i = 0; i < data.length - tradingDaysIn1Year; i++) {
    const startNav = data[i].nav;
    const endNav = data[i + tradingDaysIn1Year].nav;
    oneYearCount++;
    if (endNav > startNav) {
      oneYearProfitCount++;
    }
  }

  // 持有3年盈利概率
  let threeYearCount = 0;
  let threeYearProfitCount = 0;
  for (let i = 0; i < data.length - tradingDaysIn3Year; i++) {
    const startNav = data[i].nav;
    const endNav = data[i + tradingDaysIn3Year].nav;
    threeYearCount++;
    if (endNav > startNav) {
      threeYearProfitCount++;
    }
  }

  // 3. 计算季度超额胜率和盈利概率（使用>=）
  const quarterlyData = calculateQuarterlyPerformance(dailyData);
  const quarterlyExcessWins = quarterlyData.filter(q => q.excessReturn >= 0).length;
  const quarterlyProfits = quarterlyData.filter(q => q.cumulativeReturn >= 0).length;

  // 4. 计算年度超额胜率和盈利概率（使用>=）
  const yearlyData = calculateYearlyPerformance(dailyData);
  const yearlyExcessWins = yearlyData.filter(y => y.excessReturn >= 0).length;
  const yearlyProfits = yearlyData.filter(y => y.cumulativeReturn >= 0).length;

  return {
    newHighCount,
    holdHalfYearProb: halfYearCount > 0 ? halfYearProfitCount / halfYearCount : null,
    hold1YearProb: oneYearCount > 0 ? oneYearProfitCount / oneYearCount : null,
    hold3YearProb: threeYearCount > 0 ? threeYearProfitCount / threeYearCount : null,
    quarterlyExcessWinRate: quarterlyData.length > 0 ? quarterlyExcessWins / quarterlyData.length : null,
    quarterlyProfitRate: quarterlyData.length > 0 ? quarterlyProfits / quarterlyData.length : null,
    yearlyExcessWinRate: yearlyData.length > 0 ? yearlyExcessWins / yearlyData.length : null,
    yearlyProfitRate: yearlyData.length > 0 ? yearlyProfits / yearlyData.length : null,
  };
}

// 计算年度业绩 - 使用上年末最后一个交易日作为起始日
function calculateYearlyPerformance(dailyData: DailyData[]): YearlyPerformance[] {
  if (dailyData.length < 2) return [];

  const data = dailyData.sort((a, b) => a.date.getTime() - b.date.getTime());
  const result: YearlyPerformance[] = [];

  // 按年份分组
  const byYear = new Map<number, DailyData[]>();
  for (const d of data) {
    const year = d.date.getFullYear();
    if (!byYear.has(year)) {
      byYear.set(year, []);
    }
    byYear.get(year)!.push(d);
  }

  // 获取所有年份并排序
  const years = Array.from(byYear.keys()).sort((a, b) => a - b);

  // 计算每个年度的业绩
  // 年度区间：从前一年的最后一个交易日起，到当年的最后一个交易日
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const yearData = byYear.get(year)!;
    if (yearData.length < 1) continue;

    // 获取当年的最后一个数据点
    const endData = yearData[yearData.length - 1];

    // 获取前一年的最后一个数据点（作为起始点）
    let startData: DailyData;
    if (i === 0) {
      // 第一年，使用数据的第一天
      startData = data[0];
    } else {
      // 非第一年，使用前一年的最后一天
      const prevYear = years[i - 1];
      const prevYearData = byYear.get(prevYear)!;
      startData = prevYearData[prevYearData.length - 1];
    }

    result.push({
      year,
      startDate: startData.date,
      endDate: endData.date,
      cumulativeReturn: (endData.nav / startData.nav - 1),
      benchmarkReturn: (endData.benchmark / startData.benchmark - 1),
      excessReturn: (endData.nav / startData.nav - endData.benchmark / startData.benchmark),
    });
  }

  return result;
}

// 计算季度业绩 - 使用上季末最后一个交易日作为起始日
function calculateQuarterlyPerformance(dailyData: DailyData[]): QuarterlyPerformance[] {
  if (dailyData.length < 2) return [];

  const data = dailyData.sort((a, b) => a.date.getTime() - b.date.getTime());
  const result: QuarterlyPerformance[] = [];

  // 按季度分组（使用 (year, quarterIndex) 作为key）
  const byQuarter = new Map<string, { year: number; quarterIndex: number; data: DailyData[] }>();
  for (const d of data) {
    const year = d.date.getFullYear();
    const quarterIndex = Math.floor(d.date.getMonth() / 3);
    const key = `${year}-${quarterIndex}`;
    if (!byQuarter.has(key)) {
      byQuarter.set(key, { year, quarterIndex, data: [] });
    }
    byQuarter.get(key)!.data.push(d);
  }

  // 获取所有季度并排序
  const quarters = Array.from(byQuarter.entries()).sort((a, b) => {
    const [yearA, qA] = a[0].split('-').map(Number);
    const [yearB, qB] = b[0].split('-').map(Number);
    if (yearA !== yearB) return yearA - yearB;
    return qA - qB;
  });

  // 计算每个季度的业绩
  // 季度区间：从上一季的最后一个交易日起，到当季的最后一个交易日
  for (let i = 0; i < quarters.length; i++) {
    const quarterInfo = quarters[i][1];
    const { year, quarterIndex, data: quarterData } = quarterInfo;

    if (quarterData.length < 1) continue;

    // 获取当季的最后一个数据点
    const endData = quarterData[quarterData.length - 1];

    // 获取上一季的最后一天（作为起始点）
    let startData: DailyData;
    if (i === 0) {
      // 第一个季度，使用数据的第一天
      startData = data[0];
    } else {
      // 非第一个季度，使用上一季的最后一天
      const prevQuarterInfo = quarters[i - 1][1];
      const prevQuarterData = prevQuarterInfo.data;
      startData = prevQuarterData[prevQuarterData.length - 1];
    }

    result.push({
      quarter: `${year}Q${quarterIndex + 1}`,
      startDate: startData.date,
      endDate: endData.date,
      cumulativeReturn: (endData.nav / startData.nav - 1),
      benchmarkReturn: (endData.benchmark / startData.benchmark - 1),
      excessReturn: (endData.nav / startData.nav - endData.benchmark / startData.benchmark),
    });
  }

  return result;
}

export function HoldingExperience({ strategies, className }: HoldingExperienceProps) {
  // 计算各策略的持有体验指标（使用完整数据）
  const holdingMetricsData = useMemo(() => {
    return strategies.map((strategy, index) => {
      const metrics = calculateHoldingMetrics(strategy.dailyData);
      return {
        strategy,
        metrics,
        color: STRATEGY_COLORS[index % STRATEGY_COLORS.length],
      };
    });
  }, [strategies]);

  // 指标配置
  const metricConfigs = [
    { key: 'newHighCount', label: '累计创新高次数', format: (v: number | null) => v !== null ? `${v}次` : '/' },
    { key: 'holdHalfYearProb', label: '持有半年盈利概率', format: (v: number | null) => v !== null ? `${(v * 100).toFixed(1)}%` : '/' },
    { key: 'hold1YearProb', label: '持有1年盈利概率', format: (v: number | null) => v !== null ? `${(v * 100).toFixed(1)}%` : '/' },
    { key: 'hold3YearProb', label: '持有3年盈利概率', format: (v: number | null) => v !== null ? `${(v * 100).toFixed(1)}%` : '/' },
    { key: 'quarterlyExcessWinRate', label: '季度超额胜率', format: (v: number | null) => v !== null ? `${(v * 100).toFixed(1)}%` : '/' },
    { key: 'quarterlyProfitRate', label: '季度盈利概率', format: (v: number | null) => v !== null ? `${(v * 100).toFixed(1)}%` : '/' },
    { key: 'yearlyExcessWinRate', label: '年度超额胜率', format: (v: number | null) => v !== null ? `${(v * 100).toFixed(1)}%` : '/' },
    { key: 'yearlyProfitRate', label: '年度盈利概率', format: (v: number | null) => v !== null ? `${(v * 100).toFixed(1)}%` : '/' },
  ];

  // 计算分年度业绩（按策略分组，使用完整数据）
  const yearlyPerformanceData = useMemo(() => {
    return strategies.map((strategy, index) => {
      return {
        strategy,
        color: STRATEGY_COLORS[index % STRATEGY_COLORS.length],
        data: calculateYearlyPerformance(strategy.dailyData),
      };
    });
  }, [strategies]);

  // 计算分季度业绩（按策略分组，使用完整数据）
  const quarterlyPerformanceData = useMemo(() => {
    return strategies.map((strategy, index) => {
      return {
        strategy,
        color: STRATEGY_COLORS[index % STRATEGY_COLORS.length],
        data: calculateQuarterlyPerformance(strategy.dailyData),
      };
    });
  }, [strategies]);

  if (strategies.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* 成立以来持有体验指标对比 */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold text-slate-900 w-[180px]">指标</TableHead>
              {holdingMetricsData.map(({ strategy, color }) => (
                <TableHead 
                  key={strategy.id} 
                  className="text-center font-semibold text-slate-900"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="truncate">{strategy.strategyName}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {metricConfigs.map(({ key, label, format }) => (
              <TableRow key={key} className="hover:bg-slate-50/50">
                <TableCell className="font-medium text-slate-700">{label}</TableCell>
                {holdingMetricsData.map(({ strategy, metrics }) => {
                  const value = metrics[key as keyof HoldingMetrics] as number | null;
                  return (
                    <TableCell key={`${strategy.id}-${key}`} className="text-center text-slate-700">
                      {format(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 分年度业绩（每个策略单独一个表） */}
      <div className="space-y-6">
        <h4 className="text-base font-medium text-slate-800">分年度业绩</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {yearlyPerformanceData.map(({ strategy, color, data }) => (
            <div key={strategy.id} className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-medium text-slate-900">{strategy.strategyName}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-center font-semibold text-slate-900 text-xs py-2">年度</TableHead>
                      <TableHead className="text-right font-semibold text-slate-900 text-xs py-2">起始日</TableHead>
                      <TableHead className="text-right font-semibold text-slate-900 text-xs py-2">截止日</TableHead>
                      <TableHead className="text-right font-semibold text-slate-900 text-xs py-2">累计收益</TableHead>
                      <TableHead className="text-right font-semibold text-slate-900 text-xs py-2">基准收益</TableHead>
                      <TableHead className="text-right font-semibold text-slate-900 text-xs py-2">超额收益</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item) => (
                      <TableRow key={item.year} className="hover:bg-slate-50/50">
                        <TableCell className="text-center font-medium text-slate-700 text-xs py-2">
                          {item.year}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 text-xs py-2">
                          {item.startDate.toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 text-xs py-2">
                          {item.endDate.toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell className={cn('text-right text-xs py-2', item.cumulativeReturn >= 0 ? 'text-red-600' : 'text-green-600')}>
                          {item.cumulativeReturn >= 0 ? '+' : ''}{(item.cumulativeReturn * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right text-slate-600 text-xs py-2">
                          {item.benchmarkReturn >= 0 ? '+' : ''}{(item.benchmarkReturn * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className={cn('text-right text-xs py-2', item.excessReturn >= 0 ? 'text-red-600' : 'text-green-600')}>
                          {item.excessReturn >= 0 ? '+' : ''}{(item.excessReturn * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-400 text-sm py-4">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分季度业绩（每个策略单独一个表） */}
      <div className="space-y-6">
        <h4 className="text-base font-medium text-slate-800">分季度业绩</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {quarterlyPerformanceData.map(({ strategy, color, data }) => (
            <div key={strategy.id} className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-medium text-slate-900">{strategy.strategyName}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-center font-semibold text-slate-900 text-xs py-2">季度</TableHead>
                      <TableHead className="text-right font-semibold text-slate-900 text-xs py-2">起始日</TableHead>
                      <TableHead className="text-right font-semibold text-slate-900 text-xs py-2">截止日</TableHead>
                      <TableHead className="text-right font-semibold text-slate-900 text-xs py-2">累计收益</TableHead>
                      <TableHead className="text-right font-semibold text-slate-900 text-xs py-2">基准收益</TableHead>
                      <TableHead className="text-right font-semibold text-slate-900 text-xs py-2">超额收益</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item) => (
                      <TableRow key={item.quarter} className="hover:bg-slate-50/50">
                        <TableCell className="text-center font-medium text-slate-700 text-xs py-2">
                          {item.quarter}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 text-xs py-2">
                          {item.startDate.toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 text-xs py-2">
                          {item.endDate.toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell className={cn('text-right text-xs py-2', item.cumulativeReturn >= 0 ? 'text-red-600' : 'text-green-600')}>
                          {item.cumulativeReturn >= 0 ? '+' : ''}{(item.cumulativeReturn * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right text-slate-600 text-xs py-2">
                          {item.benchmarkReturn >= 0 ? '+' : ''}{(item.benchmarkReturn * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className={cn('text-right text-xs py-2', item.excessReturn >= 0 ? 'text-red-600' : 'text-green-600')}>
                          {item.excessReturn >= 0 ? '+' : ''}{(item.excessReturn * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-400 text-sm py-4">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
