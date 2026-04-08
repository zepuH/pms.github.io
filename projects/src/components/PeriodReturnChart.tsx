'use client';

import { StrategyData, STRATEGY_COLORS } from '@/types/strategy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatPercentage } from '@/utils/formatter';
import { BarChart3 } from 'lucide-react';

interface PeriodReturnChartProps {
  strategies: StrategyData[];
}

export default function PeriodReturnChart({ strategies }: PeriodReturnChartProps) {
  // 准备图表数据
  const chartData = [
    {
      period: '近1月',
      ...strategies.reduce((acc, strategy) => {
        acc[strategy.id] = strategy.periodReturns['1m'];
        return acc;
      }, {} as Record<string, number | null>),
    },
    {
      period: '近3月',
      ...strategies.reduce((acc, strategy) => {
        acc[strategy.id] = strategy.periodReturns['3m'];
        return acc;
      }, {} as Record<string, number | null>),
    },
    {
      period: '近6月',
      ...strategies.reduce((acc, strategy) => {
        acc[strategy.id] = strategy.periodReturns['6m'];
        return acc;
      }, {} as Record<string, number | null>),
    },
    {
      period: '近1年',
      ...strategies.reduce((acc, strategy) => {
        acc[strategy.id] = strategy.periodReturns['1y'];
        return acc;
      }, {} as Record<string, number | null>),
    },
    {
      period: '近3年',
      ...strategies.reduce((acc, strategy) => {
        acc[strategy.id] = strategy.periodReturns['3y'];
        return acc;
      }, {} as Record<string, number | null>),
    },
    {
      period: '近5年',
      ...strategies.reduce((acc, strategy) => {
        acc[strategy.id] = strategy.periodReturns['5y'];
        return acc;
      }, {} as Record<string, number | null>),
    },
    {
      period: '近10年',
      ...strategies.reduce((acc, strategy) => {
        acc[strategy.id] = strategy.periodReturns['10y'];
        return acc;
      }, {} as Record<string, number | null>),
    },
    {
      period: '成立以来',
      ...strategies.reduce((acc, strategy) => {
        acc[strategy.id] = strategy.periodReturns.sinceInception;
        return acc;
      }, {} as Record<string, number | null>),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          时间区间收益对比
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
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
                        <div className="font-medium mb-2">{payload[0].payload.period}</div>
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
