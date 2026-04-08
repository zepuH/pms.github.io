import * as XLSX from 'xlsx';
import { DailyData, DataFormatConfig } from '@/types/strategy';
import { excelDateToJSDate, parseDateString } from './excelParser';

// 解析数字（处理百分比格式）
function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const isPercentage = value.includes('%');
    let cleaned = value.trim().replace('%', '');
    cleaned = cleaned.replace(/,/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) {
      return null;
    }
    // 如果是百分比格式，除以100转换为小数
    return isPercentage ? num / 100 : num;
  }

  return null;
}

// 根据自定义配置解析Excel文件
export async function parseExcelFileWithConfig(
  file: File, 
  config: DataFormatConfig
): Promise<DailyData[]> {
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
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

        if (rows.length < 2) {
          reject(new Error('Excel文件数据不足'));
          return;
        }

        // 确定数据起始行
        const dataStartIndex = config.hasHeader ? 2 : 1;
        const dataRows = rows.slice(dataStartIndex);

        const dailyData: DailyData[] = [];
        let prevNav = 1;
        let prevBenchmark = 1;

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          if (!row || row.length === 0) continue;

          // 解析日期
          let date: Date | null = null;
          const dateValue = row[config.dateColumn];
          if (dateValue !== null && dateValue !== undefined) {
            if (typeof dateValue === 'number') {
              date = excelDateToJSDate(dateValue);
            } else if (typeof dateValue === 'string') {
              try {
                date = parseDateString(dateValue);
              } catch {
                continue;
              }
            }
          }
          if (!date) continue;

          let nav = 1;
          let benchmark = 1;
          let dailyReturn = 0;
          let benchmarkReturn = 0;
          let dailyDrawdown = 0;

          // 解析净值列
          if (config.navColumn !== undefined) {
            const navValue = parseNumber(row[config.navColumn]);
            if (navValue !== null) {
              nav = navValue;
              // 从净值计算日收益率
              if (prevNav !== 0) {
                dailyReturn = (nav / prevNav) - 1;
              }
              prevNav = nav;
            }
          }

          // 解析基准净值列
          if (config.benchmarkColumn !== undefined) {
            const benchValue = parseNumber(row[config.benchmarkColumn]);
            if (benchValue !== null) {
              benchmark = benchValue;
              if (prevBenchmark !== 0) {
                benchmarkReturn = (benchmark / prevBenchmark) - 1;
              }
              prevBenchmark = benchmark;
            }
          }

          // 解析累计收益率列
          if (config.cumulativeReturnColumn !== undefined) {
            const cumReturn = parseNumber(row[config.cumulativeReturnColumn]);
            if (cumReturn !== null) {
              // 如果是百分比形式，转换为小数
              nav = 1 + cumReturn;
              // 从累计收益计算日收益率
              if (prevNav !== 0) {
                dailyReturn = (nav / prevNav) - 1;
              }
              prevNav = nav;
            }
          }

          // 解析基准累计收益率列
          if (config.benchmarkReturnColumn !== undefined) {
            const benchCumReturn = parseNumber(row[config.benchmarkReturnColumn]);
            if (benchCumReturn !== null) {
              benchmark = 1 + benchCumReturn;
              if (prevBenchmark !== 0) {
                benchmarkReturn = (benchmark / prevBenchmark) - 1;
              }
              prevBenchmark = benchmark;
            }
          }

          // 解析日收益率列
          if (config.dailyReturnColumn !== undefined) {
            const dailyValue = parseNumber(row[config.dailyReturnColumn]);
            if (dailyValue !== null) {
              dailyReturn = dailyValue;
            }
          }

          // 解析回撤列
          if (config.drawdownColumn !== undefined) {
            const drawdownValue = parseNumber(row[config.drawdownColumn]);
            if (drawdownValue !== null) {
              dailyDrawdown = drawdownValue;
            }
          }

          // 如果只有日收益率，从累计日收益率计算净值
          if (config.navColumn === undefined && config.cumulativeReturnColumn === undefined && config.dailyReturnColumn !== undefined) {
            nav = dailyData.length > 0 
              ? dailyData[dailyData.length - 1].nav * (1 + dailyReturn)
              : 1 + dailyReturn;
          }

          // 如果只有基准日收益率，计算基准净值
          // 基准日收益率在config里可能没设置，这里跳过

          dailyData.push({
            date,
            nav,
            benchmark,
            dailyDrawdown,
            dailyReturn,
            annualizedReturn: 0,
            benchmarkReturn,
          });
        }

        // 按日期排序
        dailyData.sort((a, b) => a.date.getTime() - b.date.getTime());

        // 归一化净值
        if (dailyData.length > 0) {
          const firstNav = dailyData[0].nav;
          const firstBenchmark = dailyData[0].benchmark;

          if (firstNav !== 1) {
            dailyData.forEach(d => {
              d.nav = d.nav / firstNav;
            });
          }

          if (firstBenchmark !== 1) {
            dailyData.forEach(d => {
              d.benchmark = d.benchmark / firstBenchmark;
            });
          }
        }

        if (dailyData.length === 0) {
          reject(new Error('未能解析出有效数据'));
          return;
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
