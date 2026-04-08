'use client';

import { useMemo } from 'react';
import { StrategyData, STRATEGY_COLORS } from '@/types/strategy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatPercentage } from '@/utils/formatter';
import { Calendar } from 'lucide-react';

interface YearlyPerformanceChartProps {
  strategies: StrategyData[];
}

export default function YearlyPerformanceChart({ strategies }: YearlyPerformanceChartProps) {
  // 合并所有年份的数据
  const chartData = useMemo(() => {
    // 收集所有年份
    const allYears = new Set<number>();
    strategies.forEach(strategy => {
      strategy.yearlyData.forEach(data => {
        allYears.add(data.year);
      });
    });

    // 按年份排序
    const sortedYears = Array.from(allYears).sort((a, b) => a - b);

    // 创建图表数据
    return sortedYears.map(year => {
      const dataPoint: Record<string, string | number | null> = { year: `${year}年` };

      strategies.forEach((strategy) => {
        const yearData = strategy.yearlyData.find(d => d.year === year);
        if (yearData) {
          dataPoint[strategy.id] = yearData.annualReturn;
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
          <Calendar className="w-5 h-5" />
          分年度表现对比
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                label={{ value: '收益率 (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow-lg">
                        <div className="font-medium mb-2">{payload[0].payload.year}</div>
                        {payload.map((entry, index) => {
                          const value = typeof entry.value === 'number' ? entry.value : null;
                          return (
                            <div key={index} className="text-sm" style={{ color: entry.color }}>
                              <span className="font-medium">{strategies[index].strategyName}:</span>{' '}
                              {value !== null && value !== undefined
                                ? formatPercentage(value)
                                : 'N/A'}
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
                <Bar
                  key={strategy.id}
                  dataKey={strategy.id}
                  fill={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
