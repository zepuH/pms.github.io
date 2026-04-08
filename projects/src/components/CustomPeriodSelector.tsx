'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StrategyData, Metrics } from '@/types/strategy';
import { calculateCustomPeriodMetrics } from '@/utils/calculator';
import { formatDate } from '@/utils/formatter';
import { Calendar, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_TRADING_DAYS } from '@/types/strategy';

interface CustomPeriodSelectorProps {
  strategies: StrategyData[];
  onFilterChange?: (filteredStrategies: StrategyData[], customMetrics: Record<string, Metrics>) => void;
}

export function CustomPeriodSelector({ strategies, onFilterChange }: CustomPeriodSelectorProps) {
  // 获取所有策略的日期范围
  const getDateRange = useCallback(() => {
    if (strategies.length === 0) return { min: '', max: '' };
    
    let minDate = strategies[0].startDate;
    let maxDate = strategies[0].endDate;
    
    strategies.forEach(s => {
      if (s.startDate < minDate) minDate = s.startDate;
      if (s.endDate > maxDate) maxDate = s.endDate;
    });
    
    return {
      min: formatDate(minDate),
      max: formatDate(maxDate),
    };
  }, [strategies]);

  const dateRange = getDateRange();
  
  const [startDate, setStartDate] = useState(dateRange.min);
  const [endDate, setEndDate] = useState(dateRange.max);
  const [tradingDays, setTradingDays] = useState(DEFAULT_TRADING_DAYS);
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);

  // 当策略数据变化时，更新日期范围
  useEffect(() => {
    if (strategies.length > 0) {
      const range = getDateRange();
      setStartDate(range.min);
      setEndDate(range.max);
      setIsCustomPeriod(false);
    }
  }, [strategies, getDateRange]);

  // 重置为全区间
  const handleReset = () => {
    const range = getDateRange();
    setStartDate(range.min);
    setEndDate(range.max);
    setIsCustomPeriod(false);
    
    // 传递原始策略数据
    onFilterChange?.(strategies, {});
  };

  // 计算自定义区间的指标
  const handleCalculate = () => {
    if (strategies.length === 0) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 过滤在区间内的数据
    const filteredStrategies = strategies.map(strategy => {
      const filteredData = strategy.dailyData.filter(
        d => d.date >= start && d.date <= end
      );
      
      // 计算自定义指标
      let customMetrics = {};
      if (filteredData.length >= 2) {
        customMetrics = calculateCustomPeriodMetrics(filteredData, start, end, tradingDays);
      }
      
      return {
        ...strategy,
        dailyData: filteredData,
        metrics: {
          ...strategy.metrics,
          ...customMetrics,
        },
      };
    }).filter(s => s.dailyData.length >= 2);
    
    setIsCustomPeriod(true);
    onFilterChange?.(filteredStrategies, {});
  };

  if (strategies.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-600">自定义时间区间:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">开始:</label>
          <input
            type="date"
            value={startDate}
            min={dateRange.min}
            max={dateRange.max}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">结束:</label>
          <input
            type="date"
            value={endDate}
            min={dateRange.min}
            max={dateRange.max}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">交易日/年:</label>
          <input
            type="number"
            value={tradingDays}
            min={200}
            max={252}
            onChange={(e) => setTradingDays(Number(e.target.value))}
            className="w-20 px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <Button onClick={handleCalculate} size="sm" variant="default">
          <Calculator className="w-4 h-4 mr-1" />
          应用
        </Button>
        
        {isCustomPeriod && (
          <Button onClick={handleReset} size="sm" variant="outline">
            重置
          </Button>
        )}
      </div>

      {/* 提示信息 */}
      {isCustomPeriod && (
        <div className="mt-2 text-xs text-slate-500">
          当前使用自定义时间区间 ({startDate} 至 {endDate}) 的数据进行展示和计算
        </div>
      )}
    </div>
  );
}
