'use client';

import { useMemo } from 'react';
import { StrategyData, STRATEGY_COLORS } from '@/types/strategy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateDrawdownSeries } from '@/utils/calculator';
import { formatDate } from '@/utils/formatter';
import { TrendingDown } from 'lucide-react';

interface DrawdownChartProps {
  strategies: StrategyData[];
}

export default function DrawdownChart({ strategies }: DrawdownChartProps) {
  // 计算每个策略的回撤序列
  const chartData = useMemo(() => {
    // 收集所有日期
    const allDates = new Set<string>();
    strategies.forEach(strategy => {
      strategy.dailyData.forEach(data => {
        allDates.add(formatDate(data.date));
      });
    });

    // 按日期排序
    const sortedDates = Array.from(allDates).sort();

    // 为每个策略计算回撤序列
    const drawdownSeriesMap = new Map<string, { date: Date; drawdown: number }[]>();
    strategies.forEach(strategy => {
      drawdownSeriesMap.set(strategy.id, calculateDrawdownSeries(strategy.dailyData));
    });

    // 创建图表数据
    return sortedDates.map(dateStr => {
      const dataPoint: Record<string, string | number | null> = { date: dateStr };

      strategies.forEach((strategy) => {
        const drawdownSeries = drawdownSeriesMap.get(strategy.id)!;
        const dayData = drawdownSeries.find(d => formatDate(d.date) === dateStr);
        if (dayData) {
          dataPoint[strategy.id] = dayData.drawdown * 100;
        } else {
          dataPoint[strategy.id] = null;
        }
      });

      return dataPoint;
    });
  }, [strategies]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          回撤分析对比
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                label={{ value: '回撤 (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow-lg">
                        <div className="font-medium mb-2">{payload[0].payload.date}</div>
                        {payload.map((entry, index) => {
                          const value = typeof entry.value === 'number' ? entry.value : null;
                          return (
                            <div key={index} className="text-sm" style={{ color: entry.color }}>
                              <span className="font-medium">{strategies[index].strategyName}:</span>{' '}
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
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                formatter={(value, entry) => {
                  const strategy = strategies.find(s => s.id === entry.dataKey);
                  return strategy ? strategy.strategyName : value;
                }}
              />
              {strategies.map((strategy, index) => (
                <Area
                  key={strategy.id}
                  type="monotone"
                  dataKey={strategy.id}
                  stroke={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                  fill={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  connectNulls={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
