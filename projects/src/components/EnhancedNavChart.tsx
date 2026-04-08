'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TimePeriodTabs, TimePeriod } from './TimePeriodTabs';
import { ChartToolbar } from './ChartToolbar';
import { StrategyData } from '@/types/strategy';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/formatter';

const STRATEGY_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c'];

interface EnhancedNavChartProps {
  strategies: StrategyData[];
  className?: string;
}

export function EnhancedNavChart({ strategies, className }: EnhancedNavChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1Y');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(true);

  // 根据时间区间过滤数据
  const filterDataByPeriod = (data: StrategyData[], period: TimePeriod) => {
    if (data.length === 0) return data;

    const now = new Date();
    const startDate = new Date(now);

    switch (period) {
      case '1M':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '3Y':
        startDate.setFullYear(startDate.getFullYear() - 3);
        break;
      case '5Y':
        startDate.setFullYear(startDate.getFullYear() - 5);
        break;
      case '10Y':
        startDate.setFullYear(startDate.getFullYear() - 10);
        break;
      case 'ALL':
        return data;
    }

    return data.map((strategy) => ({
      ...strategy,
      dailyData: strategy.dailyData.filter((d) => d.date >= startDate),
    }));
  };

  // 准备图表数据
  const chartData = (() => {
    const filteredStrategies = filterDataByPeriod(strategies, selectedPeriod);

    // 收集所有日期
    const allDates = new Set<string>();
    filteredStrategies.forEach((strategy) => {
      strategy.dailyData.forEach((data) => {
        allDates.add(formatDate(data.date));
      });
    });

    // 按日期排序
    const sortedDates = Array.from(allDates).sort();

    // 创建图表数据
    return sortedDates.map((dateStr) => {
      const dataPoint: Record<string, string | number | null> = { date: dateStr };

      filteredStrategies.forEach((strategy) => {
        const dayData = strategy.dailyData.find((d) => formatDate(d.date) === dateStr);
        if (dayData) {
          // 归一化到1开始
          const firstNav = strategy.dailyData[0].nav;
          dataPoint[strategy.id] = (dayData.nav / firstNav) * 100; // 转换为百分比显示
          dataPoint[`${strategy.id}-benchmark`] = (dayData.benchmark / firstNav) * 100; // 基准
        } else {
          dataPoint[strategy.id] = null;
          dataPoint[`${strategy.id}-benchmark`] = null;
        }
      });

      return dataPoint;
    });
  })();

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          净值走势
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        <ChartToolbar
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          showBenchmark={showBenchmark}
          onToggleBenchmark={() => setShowBenchmark(!showBenchmark)}
        />

        <div className={cn('h-[450px]', isFullscreen && 'h-[70vh]')}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
                stroke="#64748b"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                label={{ value: '累计收益率', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                stroke="#64748b"
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    return (
                      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg min-w-[200px]">
                        <div className="font-medium mb-2 text-sm border-b pb-2">
                          {payload[0].payload.date}
                        </div>
                        {payload.map((item, index) => {
                          const value = typeof item.value === 'number' ? item.value : null;
                          const dataKey = typeof item.dataKey === 'string' ? item.dataKey : '';
                          const isBenchmark = dataKey.includes('-benchmark');

                          // 找到对应的策略
                          let strategyName = '';
                          if (dataKey) {
                            if (isBenchmark) {
                              const strategyId = dataKey.replace('-benchmark', '');
                              const strategy = strategies.find((s) => s.id === strategyId);
                              strategyName = strategy ? `${strategy.strategyName} 基准` : '';
                            } else {
                              const strategy = strategies.find((s) => s.id === dataKey);
                              strategyName = strategy ? strategy.strategyName : '';
                            }
                          }

                          const color = isBenchmark ? '#94a3b8' : item.color;

                          return (
                            <div key={index} className="text-sm" style={{ color }}>
                              <span className="font-medium">
                                {strategyName}:
                              </span>{' '}
                              {value !== null ? `${value.toFixed(2)}%` : 'N/A'}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="3 3" />
              {filterDataByPeriod(strategies, selectedPeriod).map((strategy, index) => (
                <React.Fragment key={strategy.id}>
                  <Line
                    type="monotone"
                    dataKey={strategy.id}
                    stroke={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {showBenchmark && (
                    <Line
                      type="monotone"
                      dataKey={`${strategy.id}-benchmark`}
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  )}
                </React.Fragment>
              ))}
              <Legend
                verticalAlign="top"
                height={72}
                iconType="circle"
                formatter={(value) => {
                  const dataKey = typeof value === 'string' ? value : '';
                  // 检查是否是基准线
                  if (dataKey.includes('-benchmark')) {
                    const strategyId = dataKey.replace('-benchmark', '');
                    const strategy = strategies.find((s) => s.id === strategyId);
                    return strategy ? `${strategy.strategyName} (基准)` : '';
                  } else {
                    const strategy = strategies.find((s) => s.id === dataKey);
                    return strategy ? strategy.strategyName : '';
                  }
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 时间区间选项 - 放在图表下方 */}
        <div className="flex items-center justify-center mt-4">
          <TimePeriodTabs value={selectedPeriod} onChange={setSelectedPeriod} />
        </div>
      </CardContent>
    </Card>
  );
}
