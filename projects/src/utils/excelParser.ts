import * as XLSX from 'xlsx';
import { DailyData } from '@/types/strategy';

// 智能检测表头行索引
function detectHeaderRowIndex(rows: (string | number)[][]): number {
  // 表头关键词列表
  const headerKeywords = ['日期', '净值', '投资组合', '业绩基准', '累计收益', '收益率', 'NAV', 'Date'];

  // 从前10行中查找表头
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    // 检查这一行是否包含表头关键词
    const rowText = row.map(cell => String(cell || '')).join(' ');
    const matchCount = headerKeywords.filter(keyword => rowText.includes(keyword)).length;

    // 如果匹配到2个或以上关键词，认为是表头
    if (matchCount >= 2) {
      console.log(`检测到表头在第 ${i} 行:`, row);
      return i;
    }
  }

  // 默认返回第1行（索引1）
  console.log('未检测到表头，默认使用第1行作为表头');
  return 1;
}

// 解析Excel文件
export async function parseExcelFile(file: File): Promise<DailyData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('文件读取失败'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });

        // 获取第一个Sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 读取所有行数据
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

        if (rows.length < 2) {
          reject(new Error('Excel文件数据不足'));
          return;
        }

        // 智能检测表头行索引
        const headerIndex = detectHeaderRowIndex(rows);
        const header = rows[headerIndex] as string[];
        const dataRows = rows.slice(headerIndex + 1);

        // 查找列索引
        console.log('Excel header:', header);

        const dateIndex = header.findIndex(col => col && String(col).includes('日期'));
        const navReturnIndex = header.findIndex(col => col && String(col).includes('投资组合')); // B列：组合累计收益率
        const benchmarkReturnIndex = header.findIndex(col => col && String(col).includes('业绩基准')); // C列：基准累计收益率
        const drawdownIndex = header.findIndex(col => col && String(col).includes('回撤'));
        const dailyReturnIndex = header.findIndex(col => col && String(col).includes('每日收益')); // E列：组合日涨跌
        const benchmarkDailyReturnIndex = header.findIndex(col => col && String(col).includes('基准日涨跌')); // G列：基准日涨跌

        console.log('列索引查找结果:', {
          dateIndex,
          navReturnIndex,
          benchmarkReturnIndex,
          drawdownIndex,
          dailyReturnIndex,
          benchmarkDailyReturnIndex
        });

        if (dateIndex === -1 || navReturnIndex === -1) {
          reject(new Error('Excel文件缺少必要的列（日期或组合收益率）'));
          return;
        }

        // 解析每一行数据
        const dailyData: DailyData[] = [];

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];

          if (!row || row.length === 0) continue;

          // 解析日期
          let date: Date;
          const dateValue = row[dateIndex];
          if (typeof dateValue === 'number') {
            date = excelDateToJSDate(dateValue);
          } else if (typeof dateValue === 'string') {
            date = parseDateString(dateValue);
          } else {
            continue;
          }

          // 解析组合累计收益率（B列）
          const navReturnPercent = parseNumber(row[navReturnIndex]);
          if (navReturnPercent === null) continue;

          // 将累计收益率转换为净值：净值 = 1 + 累计收益率（小数形式）
          // 例如：累计收益 27.0014%（parseNumber返回0.270014）→ 净值 1.270014
          const nav = 1 + navReturnPercent;

          // 解析基准累计收益率（C列）
          const benchmarkReturnPercent = benchmarkReturnIndex !== -1 ? parseNumber(row[benchmarkReturnIndex]) : null;
          const benchmark = benchmarkReturnPercent !== null ? 1 + benchmarkReturnPercent : 1;

          // 解析组合日涨跌（E列）
          const dailyReturn = dailyReturnIndex !== -1 ? parseNumber(row[dailyReturnIndex]) : 0;

          // 解析基准日涨跌（G列）
          const benchmarkDailyReturn = benchmarkDailyReturnIndex !== -1 ? parseNumber(row[benchmarkDailyReturnIndex]) : 0;

          // 解析每日回撤
          const dailyDrawdown = drawdownIndex !== -1 ? parseNumber(row[drawdownIndex]) : 0;

          dailyData.push({
            date,
            nav,
            benchmark,
            dailyDrawdown: dailyDrawdown || 0,
            dailyReturn: dailyReturn || 0,
            annualizedReturn: 0,
            benchmarkReturn: benchmarkDailyReturn || 0,
          });
        }

        // 按日期排序
        dailyData.sort((a, b) => a.date.getTime() - b.date.getTime());

        // 确保第一个值是1（应该已经是1了，但为了保险）
        if (dailyData.length > 0) {
          const firstNav = dailyData[0].nav;
          const firstBenchmark = dailyData[0].benchmark;

          if (firstNav !== 1) {
            console.warn(`第一个净值不是1: ${firstNav}，正在归一化`);
            dailyData.forEach(d => {
              d.nav = d.nav / firstNav;
            });
          }

          if (firstBenchmark !== 1) {
            console.warn(`第一个基准净值不是1: ${firstBenchmark}，正在归一化`);
            dailyData.forEach(d => {
              d.benchmark = d.benchmark / firstBenchmark;
            });
          }
        }

        resolve(dailyData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsBinaryString(file);
  });
}

// Excel日期转JS日期
export function excelDateToJSDate(excelDate: number): Date {
  // Excel日期从1900年1月1日开始，但有个bug：Excel认为1900是闰年（其实不是）
  // 所以需要减去2天
  // 使用UTC避免时区问题导致日期偏移
  const excelEpoch = Date.UTC(1900, 0, 1);
  const daysSinceEpoch = excelDate - 2; // 减去2天修正Excel的bug
  return new Date(excelEpoch + daysSinceEpoch * 24 * 60 * 60 * 1000);
}

// 解析日期字符串 - 使用本地日期解析避免时区问题
export function parseDateString(dateStr: string): Date {
  // 尝试解析常见格式
  const date = new Date(dateStr);

  if (!isNaN(date.getTime())) {
    return date;
  }

  // 尝试解析 "2022/4/27" 或 "2022/04/27" 格式
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    // 使用本地日期构造函数，避免时区偏移
    return new Date(year, month, day);
  }

  // 尝试解析 "2022-4-27" 或 "2022-04-27" 格式
  const dashParts = dateStr.split('-');
  if (dashParts.length === 3) {
    const year = parseInt(dashParts[0]);
    const month = parseInt(dashParts[1]) - 1;
    const day = parseInt(dashParts[2]);
    return new Date(year, month, day);
  }

  throw new Error(`无法解析日期: ${dateStr}`);
}

// 解析数字（处理百分比格式）
function parseNumber(value: string | number | null | undefined): number | null {
  console.log('parseNumber input:', value, 'type:', typeof value);

  if (value === null || value === value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    console.log('parseNumber is number, return:', value);
    return value;
  }

  if (typeof value === 'string') {
    // 检查是否是百分比格式
    const isPercentage = value.includes('%');

    // 移除百分号和千位分隔符
    let cleaned = value.trim().replace('%', '');
    cleaned = cleaned.replace(/,/g, '');

    const num = parseFloat(cleaned);
    if (isNaN(num)) {
      console.log('parseNumber NaN, return null');
      return null;
    }

    // 如果是百分比格式，除以100转换为小数
    // 例如："27.0014%" → 0.270014
    const result = isPercentage ? num / 100 : num;
    console.log('parseNumber string, isPercentage:', isPercentage, 'result:', result);
    return result;
  }

  return null;
}

// 从文件名提取策略名称
export function extractStrategyName(fileName: string): string {
  // 移除文件扩展名
  let name = fileName.replace(/\.[^/.]+$/, '');

  // 移除 "-数据视图-*" 后缀
  name = name.replace(/-数据视图-[^-]*$/, '');

  // 移除其他常见后缀
  name = name.replace(/-\d{8}$/, ''); // 移除日期后缀，如 -20260331

  return name.trim();
}

// 解析自定义基准Excel文件（包含日期和累计收益率）
export async function parseBenchmarkExcel(file: File): Promise<Array<{ date: Date; cumulativeReturn: number }>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('文件读取失败'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });

        // 获取第一个Sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 读取所有行数据
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

        if (rows.length < 2) {
          reject(new Error('Excel文件数据不足，至少需要包含表头和一行数据'));
          return;
        }

        // 智能检测表头行索引
        const headerIndex = detectHeaderRowIndex(rows);
        const header = rows[headerIndex] as string[];
        console.log('Benchmark Excel header:', header);

        // 默认使用第一列作为日期，第二列作为累计收益率
        let dateIndex = 0;
        let returnIndex = 1;

        // 尝试从表头识别列
        if (header && header.length >= 2) {
          // 查找日期列
          const dateColIndex = header.findIndex(col => 
            col && (String(col).includes('日期') || String(col).includes('date') || String(col).includes('时间'))
          );
          if (dateColIndex !== -1) dateIndex = dateColIndex;

          // 查找收益率列
          const returnColIndex = header.findIndex(col => 
            col && (String(col).includes('收益') || String(col).includes('return') || String(col).includes('净值'))
          );
          if (returnColIndex !== -1) returnIndex = returnColIndex;
        }

        console.log('基准文件列索引:', { dateIndex, returnIndex });

        // 解析数据行
        const dataRows = rows.slice(headerIndex + 1);

        const benchmarkData: Array<{ date: Date; cumulativeReturn: number }> = [];

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];

          if (!row || row.length < 2) continue;

          // 解析日期
          let date: Date;
          const dateValue = row[dateIndex];
          if (typeof dateValue === 'number') {
            date = excelDateToJSDate(dateValue);
          } else if (typeof dateValue === 'string') {
            date = parseDateString(dateValue);
          } else {
            continue;
          }

          // 解析累计收益率
          const returnValue = row[returnIndex];
          let cumulativeReturn: number;
          
          if (typeof returnValue === 'number') {
            // 如果值大于10，假设是百分比形式（如27表示27%）
            cumulativeReturn = returnValue > 10 ? returnValue / 100 : returnValue;
          } else if (typeof returnValue === 'string') {
            const parsed = parseNumber(returnValue);
            if (parsed === null) continue;
            cumulativeReturn = parsed;
          } else {
            continue;
          }

          benchmarkData.push({ date, cumulativeReturn });
        }

        // 按日期排序
        benchmarkData.sort((a, b) => a.date.getTime() - b.date.getTime());

        if (benchmarkData.length === 0) {
          reject(new Error('未能从Excel中解析出有效的基准数据'));
          return;
        }

        console.log('基准数据解析完成:', { count: benchmarkData.length, first: benchmarkData[0], last: benchmarkData[benchmarkData.length - 1] });

        resolve(benchmarkData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsBinaryString(file);
  });
}
