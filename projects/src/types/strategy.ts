// 每日数据
export interface DailyData {
  date: Date;
  nav: number;                    // 净值
  benchmark: number;              // 基准
  dailyDrawdown: number;          // 每日回撤
  dailyReturn: number;            // 每日收益
  annualizedReturn: number;       // 年化收益
  benchmarkReturn: number;        // 基准收益
}

// 核心指标
export interface Metrics {
  cumulativeReturn: number;       // 累计收益
  cumulativeExcessReturn: number; // 累计超额收益
  annualizedReturn: number;       // 年化收益率
  maxDrawdown: number;           // 最大回撤
  drawdown10Percentile: number;   // 回撤10分位
  annualizedVolatility: number;   // 年化波动率
  annualizedTrackingError: number; // 年化跟踪误差
  sharpeRatio: number;           // 夏普比率
  positiveProbability: number;   // 正收益概率
}

// 时间区间收益
export interface PeriodReturns {
  '1m': number | null;
  '3m': number | null;
  '6m': number | null;
  '1y': number | null;
  '3y': number | null;
  '5y': number | null;
  '10y': number | null;
  sinceInception: number;
}

// 基准对比
export interface BenchmarkComparison {
  excessReturn: number;           // 超额收益
  trackingError: number;          // 跟踪误差
  informationRatio: number;       // 信息比率
  excessMaxDrawdown: number;      // 超额最大回撤
  beta: number;                   // Beta系数
  alpha: number;                  // Alpha系数
  correlation: number;            // 相关系数
}

// 分年度数据
export interface YearlyData {
  year: number;
  startDate: Date;
  endDate: Date;
  annualReturn: number;
  volatility: number;
  maxDrawdown: number;
}

// 策略数据
export interface StrategyData {
  id: string;
  strategyName: string;
  startDate: Date;
  endDate: Date;
  dailyData: DailyData[];
  metrics: Metrics;
  periodReturns: PeriodReturns;
  benchmarkComparison: BenchmarkComparison;
  yearlyData: YearlyData[];
}

// 颜色配置
export const STRATEGY_COLORS = [
  '#2E8BC0',
  '#145374',
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#FF6F91',
  '#845EC2',
];

// 自定义基准数据
export interface CustomBenchmark {
  id: string;
  name: string;
  data: Array<{
    date: Date;
    cumulativeReturn: number; // 累计收益率（小数形式，如0.1表示10%）
  }>;
}

// 默认交易日系数
export const DEFAULT_TRADING_DAYS = 245; // 中国A股一般使用245或250

// 扩展StrategyData以支持自定义基准显示
export interface StrategyDataWithCustomBenchmark extends StrategyData {
  customBenchmark?: CustomBenchmark;
}

// 数据格式配置（用于解析非标准Excel）
export interface DataFormatConfig {
  dateColumn: number;
  navColumn?: number;           // 组合净值列
  benchmarkColumn?: number;      // 基准净值列
  cumulativeReturnColumn?: number; // 累计收益率列
  benchmarkReturnColumn?: number; // 基准累计收益率列
  dailyReturnColumn?: number;    // 日收益率列
  drawdownColumn?: number;      // 回撤列
  hasHeader: boolean;            // 是否有表头
}
