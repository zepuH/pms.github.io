'use client';

import { StrategyData, STRATEGY_COLORS } from '@/types/strategy';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPercentage, formatNumber, getReturnColorClass } from '@/utils/formatter';

interface MetricsTableProps {
  strategies: StrategyData[];
}

export default function MetricsTable({ strategies }: MetricsTableProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">核心指标对比</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-900">策略名称</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">累计收益</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">累计超额</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">年化收益</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">最大回撤</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">回撤10分位</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">波动率</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">跟踪误差</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">夏普比率</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">信息比率</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">Beta</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">Alpha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {strategies.map((strategy, index) => (
              <TableRow key={strategy.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: STRATEGY_COLORS[index % STRATEGY_COLORS.length] }}
                    />
                    <span className="font-medium text-slate-900">{strategy.strategyName}</span>
                  </div>
                </TableCell>

                {/* 累计收益 */}
                <TableCell className={getReturnColorClass(strategy.metrics.cumulativeReturn)}>
                  {formatPercentage(strategy.metrics.cumulativeReturn)}
                </TableCell>

                {/* 累计超额收益 */}
                <TableCell className={getReturnColorClass(strategy.metrics.cumulativeExcessReturn)}>
                  {formatPercentage(strategy.metrics.cumulativeExcessReturn)}
                </TableCell>

                {/* 年化收益 */}
                <TableCell className={getReturnColorClass(strategy.metrics.annualizedReturn)}>
                  {formatPercentage(strategy.metrics.annualizedReturn)}
                </TableCell>

                {/* 最大回撤 - 显示为负值 */}
                <TableCell className="text-blue-600">
                  {formatPercentage(strategy.metrics.maxDrawdown)}
                </TableCell>

                {/* 回撤10分位 - 显示为负值 */}
                <TableCell className="text-blue-600">
                  {formatPercentage(strategy.metrics.drawdown10Percentile)}
                </TableCell>

                {/* 波动率 */}
                <TableCell className="text-slate-700">
                  {formatPercentage(strategy.metrics.annualizedVolatility)}
                </TableCell>

                {/* 跟踪误差 */}
                <TableCell className="text-slate-700">
                  {formatPercentage(strategy.metrics.annualizedTrackingError)}
                </TableCell>

                {/* 夏普比率 */}
                <TableCell className="text-slate-700">
                  {formatNumber(strategy.metrics.sharpeRatio, 2)}
                </TableCell>

                {/* 信息比率 */}
                <TableCell className="text-slate-700">
                  {formatNumber(strategy.benchmarkComparison.informationRatio, 2)}
                </TableCell>

                {/* Beta */}
                <TableCell className="text-slate-700">
                  {formatNumber(strategy.benchmarkComparison.beta, 2)}
                </TableCell>

                {/* Alpha */}
                <TableCell className={getReturnColorClass(strategy.benchmarkComparison.alpha)}>
                  {formatPercentage(strategy.benchmarkComparison.alpha)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
