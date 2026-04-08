'use client';

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TimePeriodTabs, TimePeriod } from './TimePeriodTabs';
import { StrategyData } from '@/types/strategy';
import { formatDate } from '@/utils/formatter';

const STRATEGY_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'];

interface UnitNavChartProps {
  strategies: StrategyData[];
  className?: string;
}

export function UnitNavChart({ strategies, className }: UnitNavChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1Y');

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
  const chartData = useMemo(() => {
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
          dataPoint[strategy.id] = dayData.nav;
        } else {
          dataPoint[strategy.id] = null;
        }
      });

      return dataPoint;
    });
  }, [strategies, selectedPeriod]);

  if (chartData.length === 0) {
    return <div className="text-center py-8 text-slate-400">暂无数据</div>;
  }

  return (
    <div className={className}>
      {/* 标题 */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">单位净值</h3>
      </div>

      {/* 图表 */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => {
                const [, month, day] = value.split('-');
                return `${parseInt(month)}/${parseInt(day)}`;
              }}
              stroke="#64748b"
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => value.toFixed(4)}
              stroke="#64748b"
              domain={['auto', 'auto']}
              width={70}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              formatter={(value: number) => [value.toFixed(4), '']}
              labelFormatter={(label) => `日期: ${label}`}
            />
            {filterDataByPeriod(strategies, selectedPeriod).map((strategy, index) => (
              <Line
                key={strategy.id}
                type="monotone"
                dataKey={strategy.id}
                stroke={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name={strategy.strategyName}
              />
            ))}
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 时间区间选项 */}
      <div className="flex items-center justify-center mt-4">
        <TimePeriodTabs value={selectedPeriod} onChange={setSelectedPeriod} />
      </div>
    </div>
  );
}
