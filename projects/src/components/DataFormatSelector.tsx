'use client';

import React, { useState } from 'react';
import { Settings, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// 支持的列类型
export type ColumnType = 
  | 'date'           // 日期
  | 'nav'            // 组合净值
  | 'benchmark'       // 基准净值
  | 'cumulativeReturn' // 累计收益率
  | 'benchmarkReturn'  // 基准累计收益率
  | 'dailyReturn'      // 日收益率
  | 'benchmarkDailyReturn' // 基准日收益率
  | 'drawdown'        // 回撤
  | 'ignore';         // 忽略

// 列配置
export interface ColumnConfig {
  index: number;
  type: ColumnType;
  name?: string;
}

// 数据格式配置
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

// 预设格式
export const PRESET_FORMATS = [
  {
    id: 'standard',
    name: '标准格式',
    description: '日期、组合累计收益、基准累计收益、回撤、年化收益',
    config: {
      dateColumn: 0,
      cumulativeReturnColumn: 1,
      benchmarkReturnColumn: 2,
      drawdownColumn: 3,
      hasHeader: true,
    } as DataFormatConfig,
  },
  {
    id: 'nav',
    name: '净值格式',
    description: '日期、组合净值、基准净值',
    config: {
      dateColumn: 0,
      navColumn: 1,
      benchmarkColumn: 2,
      hasHeader: true,
    } as DataFormatConfig,
  },
  {
    id: 'daily',
    name: '日收益格式',
    description: '日期、日收益率、日累计收益',
    config: {
      dateColumn: 0,
      dailyReturnColumn: 1,
      hasHeader: true,
    } as DataFormatConfig,
  },
];

// 从文本说明解析列配置
export function parseFormatFromText(text: string): ColumnConfig[] | null {
  const configs: ColumnConfig[] = [];
  const lines = text.trim().split('\n');
  
  // 匹配模式：(第X列|列X|Column X|第X个): 日期|净值|基准...
  const patterns = [
    /(?:第\s*)?([一二三四五六七八九十百千万\d]+)\s*[列个]?:?\s*(.+)/i,
    /(?:Column\s*)?(\d+)\s*[:\-]?\s*(.+)/i,
    /^(.+?)\s*[:\-]\s*(.+)$/,
  ];
  
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        let colIndex = -1;
        const secondPart = match[2] || match[1];
        
        // 解析列号
        const colMatch = match[1].match(/(\d+)/);
        if (colMatch) {
          colIndex = parseInt(colMatch[1]) - 1; // 转换为0索引
        } else {
          // 尝试从数字中文转换
          const chineseNum = {
            '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
            '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
          };
          const numMatch = match[1].match(/([一二三四五六七八九十]+)/);
          if (numMatch && chineseNum[numMatch[1] as keyof typeof chineseNum]) {
            colIndex = chineseNum[numMatch[1] as keyof typeof chineseNum] - 1;
          }
        }
        
        if (colIndex >= 0) {
          const colType = detectColumnType(secondPart);
          if (colType) {
            configs.push({ index: colIndex, type: colType, name: secondPart.trim() });
          }
        }
        break;
      }
    }
  }
  
  return configs.length > 0 ? configs : null;
}

// 从列名检测列类型
function detectColumnType(name: string): ColumnType | null {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('日期') || lowerName.includes('date') || lowerName.includes('时间')) {
    return 'date';
  }
  if (lowerName.includes('组合净值') || lowerName === '净值' || lowerName.includes('nav')) {
    return 'nav';
  }
  if (lowerName.includes('基准净值') || lowerName.includes('benchmark') && (lowerName.includes('净值') || lowerName === 'benchmark')) {
    return 'benchmark';
  }
  if (lowerName.includes('累计收益') || lowerName.includes('累计收益率') || lowerName.includes('cumulative') || lowerName.includes('收益')) {
    if (lowerName.includes('基准')) {
      return 'benchmarkReturn';
    }
    return 'cumulativeReturn';
  }
  if (lowerName.includes('日涨跌') || lowerName.includes('日收益') || lowerName.includes('daily') || lowerName.includes('涨跌')) {
    if (lowerName.includes('基准')) {
      return 'benchmarkDailyReturn';
    }
    return 'dailyReturn';
  }
  if (lowerName.includes('回撤') || lowerName.includes('drawdown')) {
    return 'drawdown';
  }
  
  return null;
}

// 根据列配置生成数据格式配置
export function generateDataFormatConfig(columns: ColumnConfig[]): DataFormatConfig | null {
  const dateCol = columns.find(c => c.type === 'date');
  if (!dateCol) return null;
  
  const config: DataFormatConfig = {
    dateColumn: dateCol.index,
    hasHeader: true,
  };
  
  const navCol = columns.find(c => c.type === 'nav');
  if (navCol) config.navColumn = navCol.index;
  
  const benchmarkCol = columns.find(c => c.type === 'benchmark');
  if (benchmarkCol) config.benchmarkColumn = benchmarkCol.index;
  
  const cumReturnCol = columns.find(c => c.type === 'cumulativeReturn');
  if (cumReturnCol) config.cumulativeReturnColumn = cumReturnCol.index;
  
  const benchReturnCol = columns.find(c => c.type === 'benchmarkReturn');
  if (benchReturnCol) config.benchmarkReturnColumn = benchReturnCol.index;
  
  const dailyReturnCol = columns.find(c => c.type === 'dailyReturn');
  if (dailyReturnCol) config.dailyReturnColumn = dailyReturnCol.index;
  
  const drawdownCol = columns.find(c => c.type === 'drawdown');
  if (drawdownCol) config.drawdownColumn = drawdownCol.index;
  
  return config;
}

// 验证配置是否足够计算指标
export function validateConfig(config: DataFormatConfig): { valid: boolean; message: string } {
  // 必须有日期列
  if (config.dateColumn === undefined) {
    return { valid: false, message: '未指定日期列' };
  }
  
  // 至少有以下组合之一：
  // 1. 净值列（可计算收益率）
  // 2. 累计收益率列
  // 3. 日收益率列（可累加计算累计）
  
  const hasNav = config.navColumn !== undefined;
  const hasCumReturn = config.cumulativeReturnColumn !== undefined;
  const hasDailyReturn = config.dailyReturnColumn !== undefined;
  
  // 方式1: 有净值列
  if (hasNav) {
    return { valid: true, message: '使用净值计算收益率' };
  }
  
  // 方式2: 有累计收益率列
  if (hasCumReturn) {
    return { valid: true, message: '使用累计收益率' };
  }
  
  // 方式3: 有日收益率列
  if (hasDailyReturn) {
    return { valid: true, message: '使用日收益率累加计算' };
  }
  
  return { valid: false, message: '缺少必要的数据列（净值、累计收益率或日收益率）' };
}

interface DataFormatSelectorProps {
  onConfigSelect: (config: DataFormatConfig) => void;
  onClose?: () => void;
}

export function DataFormatSelector({ onConfigSelect, onClose }: DataFormatSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>('standard');
  const [customText, setCustomText] = useState('');
  const [parsedConfig, setParsedConfig] = useState<DataFormatConfig | null>(null);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');

  // 处理预设选择
  const handlePresetSelect = (presetId: string) => {
    const preset = PRESET_FORMATS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setParsedConfig(preset.config);
      setValidationResult(validateConfig(preset.config));
    }
  };

  // 解析自定义说明
  const handleParseCustom = () => {
    const columns = parseFormatFromText(customText);
    if (columns) {
      const config = generateDataFormatConfig(columns);
      if (config) {
        setParsedConfig(config);
        setValidationResult(validateConfig(config));
      } else {
        setValidationResult({ valid: false, message: '无法从说明中提取有效的列配置' });
      }
    } else {
      setValidationResult({ valid: false, message: '无法解析说明文本，请使用正确的格式' });
    }
  };

  // 确认选择
  const handleConfirm = () => {
    if (parsedConfig && validationResult?.valid) {
      onConfigSelect(parsedConfig);
      onClose?.();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          数据格式配置
        </CardTitle>
        <CardDescription>
          选择或自定义Excel文件的列格式
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preset' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preset">预设格式</TabsTrigger>
            <TabsTrigger value="custom">自定义说明</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preset" className="space-y-4">
            <div className="grid gap-3">
              {PRESET_FORMATS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={cn(
                    'p-4 border rounded-lg cursor-pointer transition-all',
                    selectedPreset === preset.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{preset.name}</div>
                      <div className="text-sm text-slate-500">{preset.description}</div>
                    </div>
                    {selectedPreset === preset.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="custom" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                输入数据格式说明
              </label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={`支持以下格式：\n第1列：日期\n第2列：组合净值\n第3列：基准净值\n\n或：\nColumn 1: date\nColumn 2: nav\nColumn 3: benchmark`}
                className="w-full h-32 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                说明：可以用中文或英文描述每一列的含义，系统会自动识别日期、净值、收益率、回撤等列
              </p>
            </div>
            
            <Button onClick={handleParseCustom} variant="outline" className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              解析说明
            </Button>
          </TabsContent>
        </Tabs>

        {/* 解析结果 */}
        {parsedConfig && validationResult && (
          <div className={cn(
            'p-4 rounded-lg border',
            validationResult.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          )}>
            <div className="flex items-start gap-2">
              {validationResult.valid ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className={cn(
                  'font-medium',
                  validationResult.valid ? 'text-green-800' : 'text-red-800'
                )}>
                  {validationResult.valid ? '配置有效' : '配置无效'}
                </div>
                <div className={cn(
                  'text-sm mt-1',
                  validationResult.valid ? 'text-green-700' : 'text-red-700'
                )}>
                  {validationResult.message}
                </div>
                
                {/* 显示解析的列 */}
                {validationResult.valid && (
                  <div className="mt-2 text-xs text-slate-600">
                    <div className="grid grid-cols-2 gap-1">
                      {parsedConfig.dateColumn !== undefined && (
                        <div>日期列: 第{parsedConfig.dateColumn + 1}列</div>
                      )}
                      {parsedConfig.navColumn !== undefined && (
                        <div>组合净值: 第{parsedConfig.navColumn + 1}列</div>
                      )}
                      {parsedConfig.benchmarkColumn !== undefined && (
                        <div>基准净值: 第{parsedConfig.benchmarkColumn + 1}列</div>
                      )}
                      {parsedConfig.cumulativeReturnColumn !== undefined && (
                        <div>累计收益: 第{parsedConfig.cumulativeReturnColumn + 1}列</div>
                      )}
                      {parsedConfig.benchmarkReturnColumn !== undefined && (
                        <div>基准累计: 第{parsedConfig.benchmarkReturnColumn + 1}列</div>
                      )}
                      {parsedConfig.dailyReturnColumn !== undefined && (
                        <div>日收益: 第{parsedConfig.dailyReturnColumn + 1}列</div>
                      )}
                      {parsedConfig.drawdownColumn !== undefined && (
                        <div>回撤: 第{parsedConfig.drawdownColumn + 1}列</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 确认按钮 */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!parsedConfig || !validationResult?.valid}
            className="flex-1"
          >
            确认并上传
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default DataFormatSelector;
