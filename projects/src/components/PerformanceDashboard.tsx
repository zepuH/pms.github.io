'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StrategyData, CustomBenchmark } from '@/types/strategy';
import { findLastTradingDayBefore, eDate, calculateMetrics } from '@/utils/calculator';
import { formatDate, formatPercentage, getReturnColorClass } from '@/utils/formatter';
import { Calendar, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_TRADING_DAYS, STRATEGY_COLORS } from '@/types/strategy';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TimePeriodTabs, TimePeriod } from './TimePeriodTabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { cn } from '@/lib/utils';

interface PerformanceDashboardProps {
  strategies: StrategyData[];
  customBenchmark?: CustomBenchmark | null;
  className?: string;
}

// 同色系配色方案
const COLOR_SCHEMES = {
  return: ['#1e40af', '#3b82f6', '#60a5fa', '#1d4ed8', '#2563eb', '#0ea5e9'], // 蓝色系
  benchmark: ['#059669', '#10b981', '#34d399', '#047857', '#065f46', '#047857'], // 绿色系
  excess: ['#dc2626', '#ef4444', '#f87171', '#b91c1c', '#991b1b', '#c2410c'], // 红色系
  custom: ['#7c3aed', '#8b5cf6', '#a78bfa', '#6d28d9', '#5b21b6', '#7c3aed'], // 紫色系
};

export function PerformanceDashboard({ strategies, customBenchmark, className }: PerformanceDashboardProps) {
  // 获取所有策略的日期范围
  const getDateRange = useCallback(() => {
    if (strategies.length === 0) return { min: '', max: '' };
    
    let minDate = strategies[0].startDate;
    let maxDate = strategies[0].endDate;
    
    strategies.forEach(s => {
      if (s.startDate < minDate) minDate = s.startDate;
      if (s.endDate > maxDate) maxDate = s.endDate;
    });
    
    // 如果有自定义基准，扩大范围
    if (customBenchmark && customBenchmark.data.length > 0) {
      const benchmarkMin = customBenchmark.data[0].date;
      const benchmarkMax = customBenchmark.data[customBenchmark.data.length - 1].date;
      if (benchmarkMin < minDate) minDate = benchmarkMin;
      if (benchmarkMax > maxDate) maxDate = benchmarkMax;
    }
    
    return {
      min: formatDate(minDate),
      max: formatDate(maxDate),
    };
  }, [strategies, customBenchmark]);

  const dateRange = getDateRange();
  
  const [startDate, setStartDate] = useState(dateRange.min);
  const [endDate, setEndDate] = useState(dateRange.max);
  const [tradingDays, setTradingDays] = useState(DEFAULT_TRADING_DAYS);
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('ALL');

  // 图例多选状态
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());

  // 当策略数据或基准变化时，更新日期范围
  useEffect(() => {
    const range = getDateRange();
    setStartDate(range.min);
    setEndDate(range.max);
    setIsCustomPeriod(false);
  }, [getDateRange]);

  // 重置为全区间
  const handleReset = () => {
    const range = getDateRange();
    setStartDate(range.min);
    setEndDate(range.max);
    setSelectedPeriod('ALL');
    setIsCustomPeriod(false);
    setSelectedLines(new Set());
  };

  // 根据时间区间过滤数据
  const filterDataByPeriod = useMemo(() => {
    return (data: StrategyData[], period: TimePeriod): StrategyData[] => {
      if (data.length === 0) return data;

      const now = new Date();
      const startDateObj = new Date(now);

      switch (period) {
        case '1M':
          startDateObj.setMonth(startDateObj.getMonth() - 1);
          break;
        case '3M':
          startDateObj.setMonth(startDateObj.getMonth() - 3);
          break;
        case '6M':
          startDateObj.setMonth(startDateObj.getMonth() - 6);
          break;
        case '1Y':
          startDateObj.setFullYear(startDateObj.getFullYear() - 1);
          break;
        case '3Y':
          startDateObj.setFullYear(startDateObj.getFullYear() - 3);
          break;
        case '5Y':
          startDateObj.setFullYear(startDateObj.getFullYear() - 5);
          break;
        case '10Y':
          startDateObj.setFullYear(startDateObj.getFullYear() - 10);
          break;
        case 'ALL':
        default:
          return data;
      }

      return data.map((strategy) => ({
        ...strategy,
        dailyData: strategy.dailyData.filter((d) => d.date >= startDateObj),
      }));
    };
  }, []);

  // 获取过滤后的策略数据（考虑时间区间）
  const filteredStrategies = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return strategies.map(strategy => {
      // 应用自定义时间区间
      const periodFiltered = filterDataByPeriod([strategy], selectedPeriod)[0];
      
      // 进一步过滤日期范围
      const dateFilteredData = periodFiltered.dailyData.filter(
        d => d.date >= start && d.date <= end
      );
      
      return {
        ...periodFiltered,
        dailyData: dateFilteredData,
      };
    }).filter(s => s.dailyData.length >= 2);
  }, [strategies, startDate, endDate, selectedPeriod, filterDataByPeriod]);

  // 切换图例（支持多选）
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

  // 准备图表数据
  const chartData = useMemo(() => {
    if (filteredStrategies.length === 0) return { data: [], customBenchmarkData: [] };

    // 收集所有日期
    const allDates = new Set<string>();
    filteredStrategies.forEach((strategy) => {
      strategy.dailyData.forEach((data) => {
        allDates.add(formatDate(data.date));
      });
    });

    // 添加自定义基准日期
    if (customBenchmark) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      customBenchmark.data.forEach((d) => {
        if (d.date >= start && d.date <= end) {
          allDates.add(formatDate(d.date));
        }
      });
    }

    // 按日期排序
    const sortedDates = Array.from(allDates).sort();

    // 创建图表数据
    const data = sortedDates.map((dateStr) => {
      const dataPoint: Record<string, string | number | null> = { date: dateStr };

      filteredStrategies.forEach((strategy) => {
        const dayData = strategy.dailyData.find((d) => formatDate(d.date) === dateStr);
        if (dayData) {
          const baseNav = strategy.dailyData[0]?.nav || 1;
          const baseBenchmark = strategy.dailyData[0]?.benchmark || 1;
          const cumulativeReturn = ((dayData.nav / baseNav) - 1) * 100;
          const cumulativeBenchmarkReturn = ((dayData.benchmark / baseBenchmark) - 1) * 100;
          const excessReturn = cumulativeReturn - cumulativeBenchmarkReturn;

          dataPoint[`${strategy.id}_return`] = cumulativeReturn;
          dataPoint[`${strategy.id}_benchmark`] = cumulativeBenchmarkReturn;
          dataPoint[`${strategy.id}_excess`] = excessReturn;
        } else {
          dataPoint[`${strategy.id}_return`] = null;
          dataPoint[`${strategy.id}_benchmark`] = null;
          dataPoint[`${strategy.id}_excess`] = null;
        }
      });

      // 添加自定义基准数据
      if (customBenchmark) {
        const customData = customBenchmark.data.find((d) => formatDate(d.date) === dateStr);
        if (customData) {
          dataPoint['custom_benchmark'] = customData.cumulativeReturn * 100;
        } else {
          dataPoint['custom_benchmark'] = null;
        }
      }

      return dataPoint;
    });

    return { data, customBenchmarkData: customBenchmark ? [{ id: 'custom_benchmark', name: customBenchmark.name }] : [] };
  }, [filteredStrategies, customBenchmark, startDate, endDate]);

  // 构建图例项
  const legendItems = useMemo(() => {
    const items: Array<{ key: string; label: string; color: string; type: string; strategyId?: string }> = [];

    // 策略线条
    filteredStrategies.forEach((strategy, index) => {
      const returnColor = COLOR_SCHEMES.return[index % COLOR_SCHEMES.return.length];
      const benchmarkColor = COLOR_SCHEMES.benchmark[index % COLOR_SCHEMES.benchmark.length];
      const excessColor = COLOR_SCHEMES.excess[index % COLOR_SCHEMES.excess.length];
      
      items.push({
        key: `${strategy.id}_return`,
        label: strategy.strategyName,
        color: returnColor,
        type: 'return',
        strategyId: strategy.id,
      });
      items.push({
        key: `${strategy.id}_benchmark`,
        label: `${strategy.strategyName} 基准`,
        color: benchmarkColor,
        type: 'benchmark',
        strategyId: strategy.id,
      });
      items.push({
        key: `${strategy.id}_excess`,
        label: `${strategy.strategyName} 超额`,
        color: excessColor,
        type: 'excess',
        strategyId: strategy.id,
      });
    });

    // 自定义基准线条
    if (customBenchmark) {
      items.push({
        key: 'custom_benchmark',
        label: customBenchmark.name,
        color: COLOR_SCHEMES.custom[0],
        type: 'custom',
      });
    }

    return items;
  }, [filteredStrategies, customBenchmark]);

  // 获取线条样式
  const getLineConfig = (type: string) => {
    switch (type) {
      case 'return':
        return { strokeWidth: 2, strokeDasharray: undefined };
      case 'benchmark':
        return { strokeWidth: 1.5, strokeDasharray: '5 5' };
      case 'excess':
        return { strokeWidth: 1.5, strokeDasharray: '3 3' };
      case 'custom':
        return { strokeWidth: 2, strokeDasharray: undefined };
      default:
        return { strokeWidth: 2, strokeDasharray: undefined };
    }
  };

  // 计算核心指标
  const coreMetrics = useMemo(() => {
    return strategies.map((strategy, index) => {
      let metrics = strategy.metrics;
      
      // 只有在非全区间（ALL）时才重新计算
      if (selectedPeriod !== 'ALL') {
        const end = new Date(endDate);
        // 找到截止日之前的最后一个交易日
        const endTradingDay = findLastTradingDayBefore(strategy.dailyData, end);
        
        if (endTradingDay) {
          // 计算起始日期
          let targetStartDate: Date;
          
          switch (selectedPeriod) {
            case '1M':
              targetStartDate = eDate(endTradingDay, 1);
              break;
            case '3M':
              targetStartDate = eDate(endTradingDay, 3);
              break;
            case '6M':
              targetStartDate = eDate(endTradingDay, 6);
              break;
            case '1Y':
              targetStartDate = eDate(endTradingDay, 12);
              break;
            case '3Y':
              targetStartDate = eDate(endTradingDay, 36);
              break;
            case '5Y':
              targetStartDate = eDate(endTradingDay, 60);
              break;
            case '10Y':
              targetStartDate = eDate(endTradingDay, 120);
              break;
            default:
              targetStartDate = endTradingDay;
          }
          
          // 找到起始日期之前的最后一个交易日
          const startTradingDay = findLastTradingDayBefore(strategy.dailyData, targetStartDate);
          
          if (startTradingDay && startTradingDay !== endTradingDay) {
            // 过滤数据
            const periodData = strategy.dailyData.filter(
              d => d.date >= startTradingDay && d.date <= endTradingDay
            );
            
            if (periodData.length >= 2) {
              metrics = calculateMetrics(periodData, tradingDays);
            }
          }
        }
      }
      
      return {
        ...strategy,
        metrics,
        color: STRATEGY_COLORS[index % STRATEGY_COLORS.length],
      };
    });
  }, [strategies, selectedPeriod, endDate, tradingDays]);

  if (strategies.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* 控制栏 */}
      <div className="bg-slate-50 rounded-lg p-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* 时间区间选择 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <TimePeriodTabs value={selectedPeriod} onChange={setSelectedPeriod} />
          </div>
          
          <div className="h-5 w-px bg-slate-300" />
          
          {/* 自定义日期范围 */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              min={dateRange.min}
              max={dateRange.max}
              onChange={(e) => {
                setStartDate(e.target.value);
                setIsCustomPeriod(true);
                setSelectedPeriod('ALL');
              }}
              className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400 text-sm">至</span>
            <input
              type="date"
              value={endDate}
              min={dateRange.min}
              max={dateRange.max}
              onChange={(e) => {
                setEndDate(e.target.value);
                setIsCustomPeriod(true);
                setSelectedPeriod('ALL');
              }}
              className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="h-5 w-px bg-slate-300" />
          
          {/* 交易日系数 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 whitespace-nowrap">交易日/年:</span>
            <input
              type="number"
              value={tradingDays}
              min={200}
              max={252}
              onChange={(e) => setTradingDays(Number(e.target.value))}
              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {isCustomPeriod && (
            <>
              <div className="h-5 w-px bg-slate-300" />
              <Button onClick={handleReset} size="sm" variant="outline">
                <RotateCcw className="w-3 h-3 mr-1" />
                重置
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 图表区域 */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
              stroke="#64748b"
              domain={['auto', 'auto']}
              width={60}
              tickCount={6}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              formatter={(value: number, name: string) => {
                const item = legendItems.find(item => item.key === name);
                const label = item ? item.label : name;
                return [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, label];
              }}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />

            {/* 绘制所有线条 */}
            {legendItems.map((item) => {
              const config = getLineConfig(item.type);
              return (
                <Line
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  stroke={item.color}
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
                <div className="flex flex-wrap justify-center gap-2">
                  {legendItems.map((item) => (
                    <div
                      key={item.key}
                      onClick={() => toggleLegend(item.key)}
                      className={cn(
                        'flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded text-xs transition-all',
                        isLineDimmed(item.key) ? 'opacity-40' : 'opacity-100',
                        isLineVisible(item.key) ? 'bg-slate-100' : ''
                      )}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className={cn(
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

      {/* 核心指标表格 */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold text-slate-900 w-[180px]">策略名称</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">累计收益</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">累计超额</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">年化收益</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">最大回撤</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">回撤10分位</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">波动率</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">跟踪误差</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">夏普比率</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">Beta</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">Alpha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coreMetrics.map((strategy) => (
              <TableRow key={strategy.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: strategy.color }}
                    />
                    <span className="truncate">{strategy.strategyName}</span>
                  </div>
                </TableCell>
                <TableCell className={cn('text-right', getReturnColorClass(strategy.metrics.cumulativeReturn))}>
                  {formatPercentage(strategy.metrics.cumulativeReturn)}
                </TableCell>
                <TableCell className={cn('text-right', getReturnColorClass(strategy.metrics.cumulativeExcessReturn))}>
                  {formatPercentage(strategy.metrics.cumulativeExcessReturn)}
                </TableCell>
                <TableCell className={cn('text-right', getReturnColorClass(strategy.metrics.annualizedReturn))}>
                  {formatPercentage(strategy.metrics.annualizedReturn)}
                </TableCell>
                <TableCell className="text-right text-blue-600">
                  {formatPercentage(strategy.metrics.maxDrawdown)}
                </TableCell>
                <TableCell className="text-right text-blue-600">
                  {formatPercentage(strategy.metrics.drawdown10Percentile)}
                </TableCell>
                <TableCell className="text-right text-slate-700">
                  {(strategy.metrics.annualizedVolatility * 100).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right text-slate-700">
                  {(strategy.metrics.annualizedTrackingError * 100).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right text-slate-700">
                  {strategy.metrics.sharpeRatio.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-slate-700">
                  {strategy.benchmarkComparison.beta.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-slate-700">
                  {(strategy.benchmarkComparison.alpha * 100).toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 图例说明 */}
      <div className="text-center text-xs text-slate-400 -mt-2">
        点击图例可多选显示，点击已选中可取消选择
      </div>
    </div>
  );
}
