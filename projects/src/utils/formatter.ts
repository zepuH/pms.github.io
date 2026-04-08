// 格式化百分比
export function formatPercentage(value: number, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(decimals)}%`;
}

// 格式化数字
export function formatNumber(value: number, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  return value.toFixed(decimals);
}

// 格式化日期
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 格式化日期范围
export function formatDateRange(startDate: Date, endDate: Date): string {
  return `${formatDate(startDate)} 至 ${formatDate(endDate)}`;
}

// 判断数值是否为正收益
export function isPositive(value: number): boolean {
  return value > 0;
}

// 获取收益颜色类名（符合中国习惯：涨红跌绿）
export function getReturnColorClass(value: number): string {
  if (value > 0) return 'text-red-600';
  if (value < 0) return 'text-green-600';
  return 'text-gray-600';
}

// 获取背景颜色类名（符合中国习惯：涨红跌绿）
export function getReturnBgClass(value: number): string {
  if (value > 0) return 'bg-red-50';
  if (value < 0) return 'bg-green-50';
  return 'bg-gray-50';
}

// 格式化年份
export function formatYear(year: number): string {
  return `${year}年`;
}
