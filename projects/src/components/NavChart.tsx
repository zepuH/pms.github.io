'use client';

import { useMemo } from 'react';
import { StrategyData, STRATEGY_COLORS } from '@/types/strategy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '@/utils/formatter';
import { TrendingUp } from 'lucide-react';

interface NavChartProps {
  strategies: StrategyData[];
}

export default function NavChart({ strategies }: NavChartProps) {
  // 合并所有策略的数据，按日期对齐
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

    // 创建图表数据
    return sortedDates.map(dateStr => {
      const dataPoint: Record<string, string | number | null> = { date: dateStr };

      strategies.forEach((strategy) => {
        const dayData = strategy.dailyData.find(d => formatDate(d.date) === dateStr);
        if (dayData) {
          dataPoint[strategy.id] = dayData.nav; // 直接使用净值，不转换为百分比
          dataPoint[`${strategy.id}-benchmark`] = dayData.benchmark; // 基准
        } else {
          dataPoint[strategy.id] = null;
          dataPoint[`${strategy.id}-benchmark`] = null;
        }
      });

      return dataPoint;
    });
  }, [strategies]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          净值曲线对比
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
                tickFormatter={(value) => value.toFixed(3)}
                label={{ value: '净值（归一化）', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow-lg">
                        <div className="font-medium mb-2">{payload[0].payload.date}</div>
                        {payload.map((item, index) => {
                          const value = typeof item.value === 'number' ? item.value : null;
                          const dataKey = typeof item.dataKey === 'string' ? item.dataKey : '';
                          const isBenchmark = dataKey.includes('-benchmark');

                          // 找到对应的策略
                          let strategyName = '';
                          if (dataKey) {
                            if (isBenchmark) {
                              const strategyId = dataKey.replace('-benchmark', '');
                              const strategy = strategies.find(s => s.id === strategyId);
                              strategyName = strategy ? strategy.strategyName : '';
                            } else {
                              const strategy = strategies.find(s => s.id === dataKey);
                              strategyName = strategy ? strategy.strategyName : '';
                            }
                          }

                          return (
                            <div key={index} className="text-sm" style={{ color: item.color }}>
                              <span className="font-medium">
                                {strategyName} {isBenchmark ? '(基准)' : ''}:
                              </span>{' '}
                              {value !== null ? `${value.toFixed(4)}` : 'N/A'}
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
                height={72}
                iconType="circle"
                formatter={(value) => {
                  const dataKey = typeof value === 'string' ? value : '';
                  // 检查是否是基准线
                  if (dataKey.includes('-benchmark')) {
                    const strategyId = dataKey.replace('-benchmark', '');
                    const strategy = strategies.find(s => s.id === strategyId);
                    return strategy ? `${strategy.strategyName} (基准)` : value;
                  }
                  const strategy = strategies.find(s => s.id === dataKey);
                  return strategy ? strategy.strategyName : value;
                }}
              />
              {strategies.map((strategy, index) => (
                <Line
                  key={strategy.id}
                  type="monotone"
                  dataKey={strategy.id}
                  stroke={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls={false}
                />
              ))}
              {strategies.map((strategy, index) => (
                <Line
                  key={`${strategy.id}-benchmark`}
                  type="monotone"
                  dataKey={`${strategy.id}-benchmark`}
                  stroke={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                  strokeWidth={1.5}
                  strokeDasharray="5,5"
                  dot={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
