import { DailyData, StrategyData, Metrics, PeriodReturns, BenchmarkComparison, YearlyData, DEFAULT_TRADING_DAYS } from '@/types/strategy';

// 计算所有指标
export function calculateAllMetrics(
  dailyData: DailyData[],
  strategyName: string,
  id: string,
  tradingDays: number = DEFAULT_TRADING_DAYS
): StrategyData {
  if (dailyData.length === 0) {
    throw new Error('没有可用数据');
  }

  const startDate = dailyData[0].date;
  const endDate = dailyData[dailyData.length - 1].date;

  // 计算各项指标（使用自定义交易日系数）
  const metrics = calculateMetrics(dailyData, tradingDays);
  const periodReturns = calculatePeriodReturns(dailyData);
  const benchmarkComparison = calculateBenchmarkComparison(dailyData, tradingDays);
  const yearlyData = calculateYearlyData(dailyData, tradingDays);

  return {
    id,
    strategyName,
    startDate,
    endDate,
    dailyData,
    metrics,
    periodReturns,
    benchmarkComparison,
    yearlyData,
  };
}

// 计算核心指标（支持自定义交易日系数）
export function calculateMetrics(dailyData: DailyData[], tradingDays: number = DEFAULT_TRADING_DAYS): Metrics {
  const cumulativeReturn = calculateCumulativeReturn(dailyData);
  const cumulativeExcessReturn = calculateCumulativeExcessReturn(dailyData);
  const annualizedReturn = calculateAnnualizedReturn(dailyData, tradingDays);
  const maxDrawdown = calculateMaxDrawdown(dailyData);
  const drawdown10Percentile = calculateDrawdown10Percentile(dailyData);
  const annualizedVolatility = calculateAnnualizedVolatility(dailyData, tradingDays);
  const annualizedTrackingError = calculateAnnualizedTrackingError(dailyData, tradingDays);
  const sharpeRatio = calculateSharpeRatio(annualizedReturn, annualizedVolatility);
  const positiveProbability = calculatePositiveProbability(dailyData);

  return {
    cumulativeReturn,
    cumulativeExcessReturn,
    annualizedReturn,
    maxDrawdown,
    drawdown10Percentile,
    annualizedVolatility,
    annualizedTrackingError,
    sharpeRatio,
    positiveProbability,
  };
}

// 计算累计收益率
function calculateCumulativeReturn(dailyData: DailyData[]): number {
  const initialNav = dailyData[0].nav;
  const finalNav = dailyData[dailyData.length - 1].nav;
  return (finalNav - initialNav) / initialNav;
}

// 计算累计超额收益率 = 组合累计收益率 - 基准累计收益率
function calculateCumulativeExcessReturn(dailyData: DailyData[]): number {
  const initialNav = dailyData[0].nav;
  const finalNav = dailyData[dailyData.length - 1].nav;
  const initialBenchmark = dailyData[0].benchmark;
  const finalBenchmark = dailyData[dailyData.length - 1].benchmark;
  
  const cumulativeReturn = (finalNav - initialNav) / initialNav;
  const cumulativeBenchmarkReturn = (finalBenchmark - initialBenchmark) / initialBenchmark;
  
  return cumulativeReturn - cumulativeBenchmarkReturn;
}

// 计算年化收益率
// 公式: (1 + 累计收益率)^(交易日系数 / 区间交易日数量) - 1
function calculateAnnualizedReturn(dailyData: DailyData[], tradingDays: number = DEFAULT_TRADING_DAYS): number {
  const cumulativeReturn = calculateCumulativeReturn(dailyData);
  const tradingDaysInPeriod = dailyData.length;
  
  if (tradingDaysInPeriod === 0) return 0;
  
  // 年化收益率 = (1 + 累计收益率)^(年交易日 / 区间交易日) - 1
  return Math.pow(1 + cumulativeReturn, tradingDays / tradingDaysInPeriod) - 1;
}

// 计算最大回撤
function calculateMaxDrawdown(dailyData: DailyData[]): number {
  let peak = dailyData[0].nav;
  let maxDrawdown = 0;

  for (let i = 1; i < dailyData.length; i++) {
    const currentNav = dailyData[i].nav;

    if (currentNav > peak) {
      peak = currentNav;
    }

    const drawdown = (peak - currentNav) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // 返回负值，表示亏损
  return -maxDrawdown;
}

// 计算回撤10分位（最大回撤的前10%，返回负值）
function calculateDrawdown10Percentile(dailyData: DailyData[]): number {
  // 计算所有回撤值
  const drawdowns: number[] = [];
  let peak = dailyData[0].nav;

  for (let i = 1; i < dailyData.length; i++) {
    const currentNav = dailyData[i].nav;

    if (currentNav > peak) {
      peak = currentNav;
    }

    const drawdown = peak > 0 ? (peak - currentNav) / peak : 0;
    drawdowns.push(drawdown);
  }

  if (drawdowns.length === 0) return 0;

  // 排序回撤值（降序排列）
  drawdowns.sort((a, b) => b - a);

  // 取前10%的回撤值（最大回撤的前10%）
  const percentileIndex = Math.max(0, Math.floor(drawdowns.length * 0.1) - 1);
  // 返回负值表示回撤
  return -(drawdowns[percentileIndex] || 0);
}

// 计算年化波动率
// 公式: 日涨跌标准差 * sqrt(交易日系数)
function calculateAnnualizedVolatility(dailyData: DailyData[], tradingDays: number = DEFAULT_TRADING_DAYS): number {
  if (dailyData.length < 2) return 0;

  // 计算每日收益率
  const dailyReturns: number[] = [];
  for (let i = 1; i < dailyData.length; i++) {
    const prevNav = dailyData[i - 1].nav;
    const currentNav = dailyData[i].nav;

    if (prevNav !== 0) {
      dailyReturns.push((currentNav - prevNav) / prevNav);
    }
  }

  if (dailyReturns.length < 2) return 0;

  // 计算标准差
  const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (dailyReturns.length - 1);
  const stdDev = Math.sqrt(variance);

  // 年化波动率 = 日收益率标准差 * sqrt(年交易日)
  return stdDev * Math.sqrt(tradingDays);
}

// 计算年化跟踪误差
// 公式: 超额日涨跌的标准差 * sqrt(交易日系数)
function calculateAnnualizedTrackingError(dailyData: DailyData[], tradingDays: number = DEFAULT_TRADING_DAYS): number {
  if (dailyData.length < 2) return 0;

  // 计算超额日收益率
  const excessReturns: number[] = [];
  for (let i = 1; i < dailyData.length; i++) {
    const prevNav = dailyData[i - 1].nav;
    const currentNav = dailyData[i].nav;
    const prevBenchmark = dailyData[i - 1].benchmark;
    const currentBenchmark = dailyData[i].benchmark;

    if (prevNav !== 0 && prevBenchmark !== 0) {
      const strategyReturn = (currentNav - prevNav) / prevNav;
      const benchmarkReturn = (currentBenchmark - prevBenchmark) / prevBenchmark;
      excessReturns.push(strategyReturn - benchmarkReturn);
    }
  }

  if (excessReturns.length < 2) return 0;

  // 计算超额收益率标准差
  const mean = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
  const variance =
    excessReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (excessReturns.length - 1);
  const stdDev = Math.sqrt(variance);

  // 年化跟踪误差 = 超额日收益率标准差 * sqrt(年交易日)
  return stdDev * Math.sqrt(tradingDays);
}

// 计算夏普比率
function calculateSharpeRatio(
  annualizedReturn: number,
  annualizedVolatility: number
): number {
  if (annualizedVolatility === 0) return 0;

  // 假设无风险利率为3%
  const riskFreeRate = 0.03;

  return (annualizedReturn - riskFreeRate) / annualizedVolatility;
}

// 计算正收益概率
function calculatePositiveProbability(dailyData: DailyData[]): number {
  let positiveDays = 0;
  let totalDays = 0;

  for (let i = 1; i < dailyData.length; i++) {
    const prevNav = dailyData[i - 1].nav;
    const currentNav = dailyData[i].nav;

    if (prevNav !== 0) {
      totalDays++;
      if (currentNav > prevNav) {
        positiveDays++;
      }
    }
  }

  return totalDays === 0 ? 0 : positiveDays / totalDays;
}

// 计算时间区间收益率
function calculatePeriodReturns(dailyData: DailyData[]): PeriodReturns {
  const endDate = dailyData[dailyData.length - 1].date;
  const endNav = dailyData[dailyData.length - 1].nav;

  const periods: PeriodReturns = {
    '1m': null,
    '3m': null,
    '6m': null,
    '1y': null,
    '3y': null,
    '5y': null,
    '10y': null,
    sinceInception: 0,
  };

  // 计算各个时间区间的收益率（交易日）
  periods['1m'] = calculatePeriodReturn(dailyData, endDate, 21);   // 1个月 ≈ 21个交易日
  periods['3m'] = calculatePeriodReturn(dailyData, endDate, 63);   // 3个月 ≈ 63个交易日
  periods['6m'] = calculatePeriodReturn(dailyData, endDate, 126);  // 6个月 ≈ 126个交易日
  periods['1y'] = calculatePeriodReturn(dailyData, endDate, 252);  // 1年 ≈ 252个交易日
  periods['3y'] = calculatePeriodReturn(dailyData, endDate, 756);  // 3年 ≈ 756个交易日
  periods['5y'] = calculatePeriodReturn(dailyData, endDate, 1260); // 5年 ≈ 1260个交易日
  periods['10y'] = calculatePeriodReturn(dailyData, endDate, 2520); // 10年 ≈ 2520个交易日

  // 成立以来
  const startNav = dailyData[0].nav;
  periods.sinceInception = (endNav - startNav) / startNav;

  return periods;
}

// 计算指定时间区间的收益率
function calculatePeriodReturn(
  dailyData: DailyData[],
  endDate: Date,
  tradingDays: number
): number | null {
  const startIndex = dailyData.length - 1 - tradingDays;

  if (startIndex < 0) return null;

  const startNav = dailyData[startIndex].nav;
  const endNav = dailyData[dailyData.length - 1].nav;

  if (startNav === 0) return null;

  return (endNav - startNav) / startNav;
}

// 计算基准对比
function calculateBenchmarkComparison(dailyData: DailyData[], tradingDays: number = DEFAULT_TRADING_DAYS): BenchmarkComparison {
  const strategyReturns: number[] = [];
  const benchmarkReturns: number[] = [];
  const excessReturns: number[] = [];

  for (let i = 1; i < dailyData.length; i++) {
    const prevNav = dailyData[i - 1].nav;
    const currentNav = dailyData[i].nav;

    const prevBenchmark = dailyData[i - 1].benchmark;
    const currentBenchmark = dailyData[i].benchmark;

    if (prevNav !== 0 && prevBenchmark !== 0) {
      const strategyReturn = (currentNav - prevNav) / prevNav;
      const benchmarkReturn = (currentBenchmark - prevBenchmark) / prevBenchmark;
      const excessReturn = strategyReturn - benchmarkReturn;

      strategyReturns.push(strategyReturn);
      benchmarkReturns.push(benchmarkReturn);
      excessReturns.push(excessReturn);
    }
  }

  if (excessReturns.length === 0) {
    return {
      excessReturn: 0,
      trackingError: 0,
      informationRatio: 0,
      excessMaxDrawdown: 0,
      beta: 0,
      alpha: 0,
      correlation: 0,
    };
  }

  // 计算平均超额收益
  const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;

  // 计算跟踪误差（超额收益的标准差）
  const meanExcessReturn = avgExcessReturn;
  const varianceExcess = excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcessReturn, 2), 0) / excessReturns.length;
  const trackingError = Math.sqrt(varianceExcess) * Math.sqrt(tradingDays);

  // 计算信息比率（超额收益/跟踪误差）
  const annualizedExcessReturn = avgExcessReturn * tradingDays;
  const informationRatio = trackingError !== 0 ? annualizedExcessReturn / trackingError : 0;

  // 计算超额最大回撤
  let cumulativeExcess = 0;
  let maxCumulativeExcess = 0;
  let excessMaxDrawdown = 0;

  for (let i = 0; i < excessReturns.length; i++) {
    cumulativeExcess += excessReturns[i];
    if (cumulativeExcess > maxCumulativeExcess) {
      maxCumulativeExcess = cumulativeExcess;
    }
    const drawdown = maxCumulativeExcess !== 0 ? (maxCumulativeExcess - cumulativeExcess) / maxCumulativeExcess : 0;
    if (drawdown > excessMaxDrawdown) {
      excessMaxDrawdown = drawdown;
    }
  }

  // 计算Beta（策略收益率对基准收益率的回归系数）
  const avgStrategyReturn = strategyReturns.reduce((sum, r) => sum + r, 0) / strategyReturns.length;
  const avgBenchmarkReturn = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;

  let covariance = 0;
  let varianceBenchmark = 0;

  for (let i = 0; i < strategyReturns.length; i++) {
    covariance += (strategyReturns[i] - avgStrategyReturn) * (benchmarkReturns[i] - avgBenchmarkReturn);
    varianceBenchmark += Math.pow(benchmarkReturns[i] - avgBenchmarkReturn, 2);
  }

  const beta = varianceBenchmark !== 0 ? covariance / varianceBenchmark : 0;

  // 计算Alpha（策略收益率 - Beta * 基准收益率）
  const alpha = avgStrategyReturn * tradingDays - beta * (avgBenchmarkReturn * tradingDays);

  // 计算相关系数
  let varianceStrategy = 0;
  for (let i = 0; i < strategyReturns.length; i++) {
    varianceStrategy += Math.pow(strategyReturns[i] - avgStrategyReturn, 2);
  }

  const correlation = Math.sqrt(varianceStrategy) * Math.sqrt(varianceBenchmark) !== 0
    ? covariance / (Math.sqrt(varianceStrategy) * Math.sqrt(varianceBenchmark))
    : 0;

  return {
    excessReturn: annualizedExcessReturn,
    trackingError,
    informationRatio,
    excessMaxDrawdown,
    beta,
    alpha,
    correlation,
  };
}

// 计算分年度数据（基于VBA代码逻辑）
function calculateYearlyData(dailyData: DailyData[], tradingDays: number = DEFAULT_TRADING_DAYS): YearlyData[] {
  if (dailyData.length === 0) return [];

  // 按年份分组
  const yearMap = new Map<number, DailyData[]>();

  for (const data of dailyData) {
    const year = data.date.getFullYear();
    if (!yearMap.has(year)) {
      yearMap.set(year, []);
    }
    yearMap.get(year)!.push(data);
  }

  // 对每个年份的数据按日期排序
  yearMap.forEach((data) => {
    data.sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  // 提取所有年份并排序
  const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
  const yearlyData: YearlyData[] = [];

  // 为每个年份计算指标
  for (const year of years) {
    const yearData = yearMap.get(year)!;
    const startDate = yearData[0].date;
    const endDate = yearData[yearData.length - 1].date;

    // 计算年度收益率（基于VBA逻辑）
    const annualReturn = calculateYearlyReturn(years, year, yearData);

    // 计算年度波动率
    const volatility = calculateYearlyVolatility(yearData, tradingDays);

    // 计算跨年度最大回撤
    const maxDrawdown = calculateCrossYearMaxDrawdown(years, year, yearMap, yearData);

    yearlyData.push({
      year,
      startDate,
      endDate,
      annualReturn,
      volatility,
      maxDrawdown,
    });
  }

  return yearlyData;
}

// 计算年度收益率（基于VBA逻辑）
function calculateYearlyReturn(
  allYears: number[],
  targetYear: number,
  yearData: DailyData[]
): number {
  const targetYearInfo = getYearInfo(yearData);
  const prevYear = targetYear - 1;

  // 查找上年最后一个交易日
  let prevYearLastNav = 0;
  const prevYearIndex = allYears.findIndex(y => y === prevYear);

  if (prevYearIndex !== -1 && prevYearIndex < allYears.length) {
    // 这里需要从全局数据中获取上年最后一个交易日
    // 简化处理：使用本年第一个交易日作为基准
    prevYearLastNav = targetYearInfo.firstNav;
  }

  if (prevYearLastNav !== 0) {
    return (targetYearInfo.lastNav - prevYearLastNav) / prevYearLastNav;
  } else {
    // 使用本年首个交易日到最后一个交易日
    return (targetYearInfo.lastNav - targetYearInfo.firstNav) / targetYearInfo.firstNav;
  }
}

// 获取年份的起止信息
function getYearInfo(yearData: DailyData[]): { firstNav: number; lastNav: number } {
  if (yearData.length === 0) {
    return { firstNav: 0, lastNav: 0 };
  }

  return {
    firstNav: yearData[0].nav,
    lastNav: yearData[yearData.length - 1].nav,
  };
}

// 计算年度波动率（基于VBA逻辑）
function calculateYearlyVolatility(yearData: DailyData[], tradingDays: number = DEFAULT_TRADING_DAYS): number {
  if (yearData.length < 2) return 0;

  // 计算日收益率
  const dailyReturns: number[] = [];
  for (let i = 1; i < yearData.length; i++) {
    const prevNav = yearData[i - 1].nav;
    const currentNav = yearData[i].nav;

    if (prevNav !== 0) {
      dailyReturns.push((currentNav - prevNav) / prevNav);
    }
  }

  if (dailyReturns.length < 2) return 0;

  // 计算标准差
  const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (dailyReturns.length - 1);
  const stdDev = Math.sqrt(variance);

  // 年化波动率 = 日收益率标准差 * sqrt(年交易日)
  return stdDev * Math.sqrt(tradingDays);
}

// 计算跨年度最大回撤（基于VBA逻辑）
function calculateCrossYearMaxDrawdown(
  allYears: number[],
  targetYear: number,
  yearMap: Map<number, DailyData[]>,
  yearData: DailyData[]
): number {
  // 确定回撤起始点
  let startData: DailyData[];
  const prevYear = targetYear - 1;

  if (allYears.includes(prevYear)) {
    startData = yearMap.get(prevYear)!;
  } else {
    startData = yearData;
  }

  // 合并数据和本年数据
  const combinedData = [...startData, ...yearData];

  // 计算最大回撤
  let peak = combinedData[0].nav;
  let maxDrawdown = 0;

  for (let i = 1; i < combinedData.length; i++) {
    const currentNav = combinedData[i].nav;

    if (currentNav > peak) {
      peak = currentNav;
    }

    const drawdown = peak !== 0 ? (peak - currentNav) / peak : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

// 计算滚动回撤序列（用于绘制回撤曲线）
export function calculateDrawdownSeries(dailyData: DailyData[]): { date: Date; drawdown: number }[] {
  const drawdownSeries: { date: Date; drawdown: number }[] = [];
  let peak = dailyData[0].nav;

  for (const data of dailyData) {
    if (data.nav > peak) {
      peak = data.nav;
    }

    const drawdown = peak !== 0 ? (peak - data.nav) / peak : 0;
    drawdownSeries.push({
      date: data.date,
      drawdown,
    });
  }

  return drawdownSeries;
}

// 计算累计超额收益序列
export function calculateExcessReturnSeries(dailyData: DailyData[]): { date: Date; excessReturn: number }[] {
  const excessReturnSeries: { date: Date; excessReturn: number }[] = [];
  
  const baseNav = dailyData[0].nav;
  const baseBenchmark = dailyData[0].benchmark;

  for (const data of dailyData) {
    const cumulativeReturn = baseNav !== 0 ? (data.nav - baseNav) / baseNav : 0;
    const cumulativeBenchmarkReturn = baseBenchmark !== 0 ? (data.benchmark - baseBenchmark) / baseBenchmark : 0;
    
    excessReturnSeries.push({
      date: data.date,
      excessReturn: cumulativeReturn - cumulativeBenchmarkReturn,
    });
  }

  return excessReturnSeries;
}

// 计算滚动收益率序列（用于滚动收益分析）
export function calculateRollingReturns(
  dailyData: DailyData[],
  holdingDays: number
): { date: Date; rollingReturn: number }[] {
  const rollingReturns: { date: Date; rollingReturn: number }[] = [];

  for (let i = 0; i < dailyData.length - holdingDays; i++) {
    const startNav = dailyData[i].nav;
    const endNav = dailyData[i + holdingDays].nav;

    if (startNav !== 0) {
      rollingReturns.push({
        date: dailyData[i].date,
        rollingReturn: (endNav - startNav) / startNav,
      });
    }
  }

  return rollingReturns;
}

// 计算各时间区间的业绩指标（支持自定义起止时间）
export function calculateCustomPeriodMetrics(
  dailyData: DailyData[],
  startDate: Date,
  endDate: Date,
  tradingDays: number = DEFAULT_TRADING_DAYS
): Metrics {
  // 过滤指定时间区间的数据
  const periodData = dailyData.filter(d => d.date >= startDate && d.date <= endDate);
  
  if (periodData.length < 2) {
    return {
      cumulativeReturn: 0,
      cumulativeExcessReturn: 0,
      annualizedReturn: 0,
      maxDrawdown: 0,
      drawdown10Percentile: 0,
      annualizedVolatility: 0,
      annualizedTrackingError: 0,
      sharpeRatio: 0,
      positiveProbability: 0,
    };
  }
  
  return calculateMetrics(periodData, tradingDays);
}

// 计算各时间区间的业绩指标
// 计算指定日期之前最后一个交易日
export function findLastTradingDayBefore(dailyData: DailyData[], targetDate: Date): Date | null {
  const sortedData = dailyData.filter(d => d.date <= targetDate).sort((a, b) => a.date.getTime() - b.date.getTime());
  return sortedData.length > 0 ? sortedData[sortedData.length - 1].date : null;
}

// 模拟Excel的EDATE函数：返回指定日期往前推N个月后的日期
// EDATE(2025/12/31, -6) = 2025/06/30（因为6月只有30天）
export function eDate(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const day = date.getDate();

  // 计算目标年月
  let targetMonth = month - months;
  let targetYear = year;

  // 处理月份溢出
  while (targetMonth < 0) {
    targetMonth += 12;
    targetYear -= 1;
  }

  // 获取目标月的最后一天
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  // 使用原始日期和目标月最后一天的较小值
  const targetDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(targetYear, targetMonth, targetDay);
}

export function calculatePeriodMetrics(
  dailyData: DailyData[],
  endDate?: Date
): {
  '1m': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
  '3m': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
  '6m': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
  '1y': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
  '2y': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
  '3y': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
  '5y': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
  '10y': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
  'ytd': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
  'all': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
} {
  const now = endDate ? new Date(endDate) : new Date();

  // 找到截止日之前的最后一个交易日
  const endTradingDay = findLastTradingDayBefore(dailyData, now);
  if (!endTradingDay) {
    // 如果没有截止日之前的交易日，返回空结果
    return {
      '1m': null, '3m': null, '6m': null, '1y': null, '2y': null, '3y': null, '5y': null, '10y': null, 'ytd': null, 'all': null,
    };
  }

  // 定义时间区间配置
  const periods = [
    { key: '1m' as const, months: 1 },
    { key: '3m' as const, months: 3 },
    { key: '6m' as const, months: 6 },
    { key: '1y' as const, years: 1 },
    { key: '2y' as const, years: 2 },
    { key: '3y' as const, years: 3 },
    { key: '5y' as const, years: 5 },
    { key: '10y' as const, years: 10 },
  ];

  const result: {
    '1m': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
    '3m': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
    '6m': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
    '1y': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
    '2y': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
    '3y': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
    '5y': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
    '10y': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
    'ytd': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
    'all': { startDate: Date; endDate: Date; cumulativeReturn: number; benchmarkReturn: number; excessReturn: number; annualizedReturn: number; maxDrawdown: number; volatility: number; sharpeRatio: number } | null;
  } = {
    '1m': null, '3m': null, '6m': null, '1y': null, '2y': null, '3y': null, '5y': null, '10y': null, 'ytd': null, 'all': null,
  };

  // 计算所有时间区间
  for (const period of periods) {
    // 使用 EDATE 计算起始日期：往前推X个月或X年
    let targetStartDate: Date;
    if (period.months) {
      // 使用自定义EDATE函数，保持与Excel一致的日期计算行为
      targetStartDate = eDate(endTradingDay, period.months);
    } else if (period.years) {
      // 年份计算：保持月和日不变
      targetStartDate = new Date(endTradingDay);
      targetStartDate.setFullYear(endTradingDay.getFullYear() - period.years);
    } else {
      continue;
    }

    // 找到目标日期之前的最后一个交易日
    const startTradingDay = findLastTradingDayBefore(dailyData, targetStartDate);

    if (startTradingDay) {
      // 获取起始和结束之间的数据
      const periodData = dailyData.filter(d => d.date >= startTradingDay && d.date <= endTradingDay);

      if (periodData.length > 1) {
        const metrics = calculateMetrics(periodData);
        const firstData = periodData[0];
        const lastData = periodData[periodData.length - 1];

        const cumulativeReturn = metrics.cumulativeReturn;
        const benchmarkReturn = (lastData.benchmark - firstData.benchmark) / firstData.benchmark;
        const excessReturn = cumulativeReturn - benchmarkReturn;

        result[period.key as keyof typeof result] = {
          startDate: startTradingDay,
          endDate: endTradingDay,
          cumulativeReturn,
          benchmarkReturn,
          excessReturn,
          annualizedReturn: metrics.annualizedReturn,
          maxDrawdown: metrics.maxDrawdown,
          volatility: metrics.annualizedVolatility,
          sharpeRatio: metrics.sharpeRatio,
        };
      }
    }
  }

  // 计算今年以来（YTD）：当年1月1日之前最后一个交易日
  const currentYear = endTradingDay.getFullYear();
  const ytdTargetDate = new Date(currentYear, 0, 1); // 当年1月1日
  const ytdStartTradingDay = findLastTradingDayBefore(dailyData, ytdTargetDate);

  if (ytdStartTradingDay && ytdStartTradingDay !== endTradingDay) {
    const ytdData = dailyData.filter(d => d.date >= ytdStartTradingDay && d.date <= endTradingDay);
    if (ytdData.length > 1) {
      const metrics = calculateMetrics(ytdData);
      const firstData = ytdData[0];
      const lastData = ytdData[ytdData.length - 1];

      const cumulativeReturn = metrics.cumulativeReturn;
      const benchmarkReturn = (lastData.benchmark - firstData.benchmark) / firstData.benchmark;
      const excessReturn = cumulativeReturn - benchmarkReturn;

      result['ytd'] = {
        startDate: ytdStartTradingDay,
        endDate: endTradingDay,
        cumulativeReturn,
        benchmarkReturn,
        excessReturn,
        annualizedReturn: metrics.annualizedReturn,
        maxDrawdown: metrics.maxDrawdown,
        volatility: metrics.annualizedVolatility,
        sharpeRatio: metrics.sharpeRatio,
      };
    }
  }

  // 计算成立以来
  if (dailyData.length > 1) {
    const metrics = calculateMetrics(dailyData);
    const firstData = dailyData[0];
    const lastData = dailyData[dailyData.length - 1];

    const cumulativeReturn = metrics.cumulativeReturn;
    const benchmarkReturn = (lastData.benchmark - firstData.benchmark) / firstData.benchmark;
    const excessReturn = cumulativeReturn - benchmarkReturn;

    result['all'] = {
      startDate: firstData.date,
      endDate: lastData.date,
      cumulativeReturn,
      benchmarkReturn,
      excessReturn,
      annualizedReturn: metrics.annualizedReturn,
      maxDrawdown: metrics.maxDrawdown,
      volatility: metrics.annualizedVolatility,
      sharpeRatio: metrics.sharpeRatio,
    };
  }

  return result;
}
