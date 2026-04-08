'use client';

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TimePeriodTabs, TimePeriod } from './TimePeriodTabs';
import { ChartToolbar } from './ChartToolbar';
import { StrategyData, DailyData } from '@/types/strategy';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/formatter';
import { ArrowDown } from 'lucide-react';

interface DrawdownRecoveryChartProps {
  strategies: StrategyData[];
  className?: string;
}

interface DrawdownInfo {
  maxDrawdown: number;
  maxDrawdownDate: string;
  recoveryDays: number | null;
  isRecovered: boolean;
  drawdownPeriod: { start: string; end: string } | null;
}

// 计算回撤修复信息
function calculateDrawdownRecovery(dailyData: DailyData[]): DrawdownInfo {
  if (dailyData.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownDate: '',
      recoveryDays: null,
      isRecovered: false,
      drawdownPeriod: null,
    };
  }

  let maxDrawdown = 0;
  let maxDrawdownIndex = -1;
  let peakNav = dailyData[0].nav;
  let peakIndex = 0;

  // 找到最大回撤
  for (let i = 1; i < dailyData.length; i++) {
    const currentNav = dailyData[i].nav;

    // 更新峰值
    if (currentNav > peakNav) {
      peakNav = currentNav;
      peakIndex = i;
    }

    // 计算回撤
    const drawdown = (peakNav - currentNav) / peakNav;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownIndex = i;
    }
  }

  if (maxDrawdownIndex === -1) {
    return {
      maxDrawdown: 0,
      maxDrawdownDate: formatDate(dailyData[0].date),
      recoveryDays: 0,
      isRecovered: true,
      drawdownPeriod: null,
    };
  }

  const maxDrawdownDate = formatDate(dailyData[maxDrawdownIndex].date);

  // 检查是否已经修复
  let recoveryDays = null;
  let isRecovered = false;
  let drawdownPeriod: { start: string; end: string } | null = null;

  // 找到回撤开始点（峰值）
  const drawdownStart = formatDate(dailyData[peakIndex].date);

  // 从最大回撤点开始，检查是否恢复到峰值
  let recoveredIndex = -1;
  for (let i = maxDrawdownIndex + 1; i < dailyData.length; i++) {
    if (dailyData[i].nav >= peakNav) {
      recoveredIndex = i;
      break;
    }
  }

  if (recoveredIndex !== -1) {
    isRecovered = true;
    const daysDiff = Math.floor(
      (dailyData[recoveredIndex].date.getTime() - dailyData[maxDrawdownIndex].date.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    recoveryDays = daysDiff;
    drawdownPeriod = {
      start: drawdownStart,
      end: formatDate(dailyData[recoveredIndex].date),
    };
  } else {
    // 还未修复，计算到现在的天数
    const daysDiff = Math.floor(
      (dailyData[dailyData.length - 1].date.getTime() - dailyData[maxDrawdownIndex].date.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    recoveryDays = daysDiff;
    isRecovered = false;
    drawdownPeriod = {
      start: drawdownStart,
      end: formatDate(dailyData[dailyData.length - 1].date),
    };
  }

  return {
    maxDrawdown,
    maxDrawdownDate,
    recoveryDays,
    isRecovered,
    drawdownPeriod,
  };
}

export function DrawdownRecoveryChart({ strategies, className }: DrawdownRecoveryChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1Y');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(
    strategies.length > 0 ? strategies[0].id : null
  );

  // 根据时间区间过滤数据
  const filterDataByPeriod = (data: DailyData[], period: TimePeriod) => {
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

    return data.filter((d) => d.date >= startDate);
  };

  // 获取当前选中的策略
  const currentStrategy = useMemo(
    () => strategies.find((s) => s.id === selectedStrategy),
    [strategies, selectedStrategy]
  );

  // 计算回撤修复信息
  const drawdownInfo = useMemo(() => {
    if (!currentStrategy) return null;
    const filteredData = filterDataByPeriod(currentStrategy.dailyData, selectedPeriod);
    return calculateDrawdownRecovery(filteredData);
  }, [currentStrategy, selectedPeriod]);

  // 准备图表数据
  const chartData = useMemo(() => {
    if (!currentStrategy) return [];

    const filteredData = filterDataByPeriod(currentStrategy.dailyData, selectedPeriod);

    return filteredData.map((data) => ({
      date: formatDate(data.date),
      回撤率: (data.dailyDrawdown || 0) * 100,
    }));
  }, [currentStrategy, selectedPeriod]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          回撤修复
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 策略选择器 */}
        {strategies.length > 1 && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-slate-600">查看策略：</span>
            <select
              value={selectedStrategy || ''}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.strategyName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 最大回撤指标 */}
        {drawdownInfo && (
          <div className="flex items-center gap-2 mb-4 p-4 bg-slate-50 rounded-lg">
            <ArrowDown className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-xs text-slate-500">最大回撤</div>
              <div className="text-lg font-semibold text-green-600">
                {(drawdownInfo.maxDrawdown * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        <ChartToolbar
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          showBenchmark={false}
          onToggleBenchmark={() => {}}
        />

        <div className={cn('h-[400px]', isFullscreen && 'h-[60vh]')}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0.05} />
                </linearGradient>
              </defs>
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
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                label={{ value: '回撤率', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                stroke="#64748b"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    return (
                      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                        <div className="font-medium mb-2 text-sm border-b pb-2">{payload[0].payload.date}</div>
                        <div className="text-sm text-green-600">
                          回撤率: {Number(payload[0].value).toFixed(2)}%
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="回撤率"
                stroke="#16a34a"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#drawdownGradient)"
              />
            </AreaChart>
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
