'use client';

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { TimePeriodTabs, TimePeriod } from './TimePeriodTabs';
import { StrategyData } from '@/types/strategy';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/formatter';

interface ReturnChartProps {
  strategies: StrategyData[];
  className?: string;
}

// 同色系配色方案 - 累计收益用蓝色系，基准用绿色系，超额用红色系
const COLOR_SCHEMES = {
  return: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#2563eb'], // 蓝色系
  benchmark: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#047857', '#047857'], // 绿色系
  excess: ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#b91c1c', '#c2410c'], // 红色系
};

export function ReturnChart({ strategies, className }: ReturnChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1Y');

  // 图例显示状态: 'all' | 选中的策略ID数组
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());

  // 切换图例模式（支持多选）
  const toggleLegend = (key: string) => {
    setSelectedLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // 判断某条线是否应该显示
  const isLineVisible = (key: string) => {
    if (selectedLines.size === 0) return true;
    return selectedLines.has(key);
  };

  // 判断某条线是否应该置灰
  const isLineDimmed = (key: string) => {
    if (selectedLines.size === 0) return false;
    return !selectedLines.has(key);
  };

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
          // 累计收益率（百分比）
          const baseNav = strategy.dailyData[0]?.nav || 1;
          const baseBenchmark = strategy.dailyData[0]?.benchmark || 1;
          const cumulativeReturn = ((dayData.nav / baseNav) - 1) * 100;

          dataPoint[`${strategy.id}_return`] = cumulativeReturn;

          // 基准累计收益率
          const cumulativeBenchmarkReturn = ((dayData.benchmark / baseBenchmark) - 1) * 100;
          dataPoint[`${strategy.id}_benchmark`] = cumulativeBenchmarkReturn;

          // 超额收益率
          const excessReturn = cumulativeReturn - cumulativeBenchmarkReturn;
          dataPoint[`${strategy.id}_excess`] = excessReturn;
        } else {
          dataPoint[`${strategy.id}_return`] = null;
          dataPoint[`${strategy.id}_benchmark`] = null;
          dataPoint[`${strategy.id}_excess`] = null;
        }
      });

      return dataPoint;
    });
  }, [strategies, selectedPeriod]);

  // 构建图例项
  const legendItems = useMemo(() => {
    const filteredStrategies = filterDataByPeriod(strategies, selectedPeriod);
    const items: Array<{ key: string; label: string; color: string; strategyId: string; type: 'return' | 'benchmark' | 'excess' }> = [];

    // 按类型分组显示图例
    filteredStrategies.forEach((strategy, index) => {
      const returnColor = COLOR_SCHEMES.return[index % COLOR_SCHEMES.return.length];
      
      // 累计收益线
      items.push({
        key: `${strategy.id}_return`,
        label: `${strategy.strategyName}`,
        color: returnColor,
        strategyId: strategy.id,
        type: 'return',
      });
    });

    filteredStrategies.forEach((strategy, index) => {
      const benchmarkColor = COLOR_SCHEMES.benchmark[index % COLOR_SCHEMES.benchmark.length];
      
      // 基准收益线
      items.push({
        key: `${strategy.id}_benchmark`,
        label: `${strategy.strategyName} 基准`,
        color: benchmarkColor,
        strategyId: strategy.id,
        type: 'benchmark',
      });
    });

    filteredStrategies.forEach((strategy, index) => {
      const excessColor = COLOR_SCHEMES.excess[index % COLOR_SCHEMES.excess.length];
      
      // 超额收益线
      items.push({
        key: `${strategy.id}_excess`,
        label: `${strategy.strategyName} 超额`,
        color: excessColor,
        strategyId: strategy.id,
        type: 'excess',
      });
    });

    return items;
  }, [strategies, selectedPeriod]);

  // 按类型分组获取线条配置
  const getLineConfig = (item: typeof legendItems[0]) => {
    const baseColor = item.color;
    
    switch (item.type) {
      case 'return':
        return {
          stroke: baseColor,
          strokeWidth: 2,
          strokeDasharray: undefined,
        };
      case 'benchmark':
        return {
          stroke: baseColor,
          strokeWidth: 1.5,
          strokeDasharray: '5 5',
        };
      case 'excess':
        return {
          stroke: baseColor,
          strokeWidth: 1.5,
          strokeDasharray: '3 3',
        };
      default:
        return {
          stroke: baseColor,
          strokeWidth: 2,
          strokeDasharray: undefined,
        };
    }
  };

  // 获取当前指标
  const currentMetrics = useMemo(() => {
    const lastData = chartData[chartData.length - 1];

    const metrics: Array<{
      strategyName: string;
      cumulativeReturn: number;
      benchmarkReturn: number;
      excessReturn: number;
    }> = lastData ? [] : [];

    strategies.forEach((strategy) => {
      const returnKey = `${strategy.id}_return`;
      const benchmarkKey = `${strategy.id}_benchmark`;
      const excessKey = `${strategy.id}_excess`;

      metrics.push({
        strategyName: strategy.strategyName,
        cumulativeReturn: (lastData[returnKey] as number) || 0,
        benchmarkReturn: (lastData[benchmarkKey] as number) || 0,
        excessReturn: (lastData[excessKey] as number) || 0,
      });
    });

    return metrics;
  }, [chartData, strategies]);

  return (
    <div className={className}>
      {chartData.length === 0 ? (
        <div className="text-center py-8 text-slate-400">暂无数据</div>
      ) : (
        <>
      {/* 标题和当前指标 */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">收益走势</h3>
        <div className="mt-2 space-y-1">
          {currentMetrics.map((metric) => (
            <div key={metric.strategyName} className="flex gap-4 text-sm flex-wrap">
              <div className="text-slate-600 min-w-[120px]">
                {metric.strategyName}:
              </div>
              <div className="text-slate-600">
                累计收益:{' '}
                <span className={cn('font-semibold', metric.cumulativeReturn >= 0 ? 'text-red-600' : 'text-green-600')}>
                  {metric.cumulativeReturn >= 0 ? '+' : ''}{metric.cumulativeReturn.toFixed(2)}%
                </span>
              </div>
              <div className="text-slate-600">
                超额收益:{' '}
                <span className={cn('font-semibold', metric.excessReturn >= 0 ? 'text-red-600' : 'text-green-600')}>
                  {metric.excessReturn >= 0 ? '+' : ''}{metric.excessReturn.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
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
                const parts = value.split('-');
                if (parts.length === 3) {
                  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
                }
                return value;
              }}
              stroke="#64748b"
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
              stroke="#64748b"
              domain={['auto', 'auto']}
              width={60}
              tickCount={6}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              formatter={(value: number, name: string, props: { dataKey?: string | number }) => {
                const item = legendItems.find(item => item.key === props.dataKey);
                const label = item ? item.label : String(name);
                return [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, label];
              }}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" strokeDasharray="3 3" />

            {/* 绘制所有策略的线 */}
            {legendItems.map((item) => {
              const config = getLineConfig(item);
              return (
                <Line
                  key={item.key}
                  yAxisId="left"
                  type="monotone"
                  dataKey={item.key}
                  stroke={config.stroke}
                  strokeWidth={config.strokeWidth}
                  strokeDasharray={config.strokeDasharray}
                  dot={false}
                  activeDot={{ r: 3 }}
                  name={item.key}
                  connectNulls={true}
                  hide={!isLineVisible(item.key)}
                  opacity={isLineDimmed(item.key) ? 0.3 : 1}
                />
              );
            })}

            {/* 自定义图例 */}
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              content={() => (
                <div className="flex flex-wrap justify-center gap-3">
                  {legendItems.map((item) => (
                    <div
                      key={item.key}
                      onClick={() => toggleLegend(item.key)}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer px-3 py-1 rounded transition-all',
                        isLineDimmed(item.key) ? 'opacity-40' : 'opacity-100',
                        isLineVisible(item.key) ? 'bg-slate-100' : ''
                      )}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className={cn(
                        'text-sm',
                        isLineDimmed(item.key) ? 'text-slate-400' : 'text-slate-700'
                      )}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 时间区间选项 */}
      <div className="flex items-center justify-center mt-4">
        <TimePeriodTabs value={selectedPeriod} onChange={setSelectedPeriod} />
      </div>

      {/* 图例说明 */}
      <div className="text-center mt-2 text-xs text-slate-400">
        点击图例可多选显示，点击已选中可取消选择
      </div>
        </>
      )}
    </div>
  );
}
