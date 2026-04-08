'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Trash2, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { parseExcelFile, extractStrategyName, parseBenchmarkExcel } from '@/utils/excelParser';
import { parseExcelFileWithConfig } from '@/utils/customParser';
import { calculateAllMetrics } from '@/utils/calculator';
import { StrategyData, CustomBenchmark, DataFormatConfig } from '@/types/strategy';
import { PerformanceDashboard } from '@/components/PerformanceDashboard';
import { HistoricalPerformance } from '@/components/HistoricalPerformance';
import { HoldingExperience } from '@/components/HoldingExperience';
import { DataFormatSelector } from '@/components/DataFormatSelector';
import { exportToPNG, exportToPDF } from '@/utils/export';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [strategies, setStrategies] = useState<StrategyData[]>([]);
  const [selectedStrategies, setSelectedStrategies] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBenchmark, setIsUploadingBenchmark] = useState(false);
  const [customBenchmark, setCustomBenchmark] = useState<CustomBenchmark | null>(null);
  const [showFormatSelector, setShowFormatSelector] = useState(false);
  const [customConfig, setCustomConfig] = useState<DataFormatConfig | null>(null);
  const [showParseError, setShowParseError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('开始上传文件，数量:', files.length);

    setIsUploading(true);
    let hasParseError = false;

    try {
      const newStrategies: StrategyData[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const strategyName = extractStrategyName(file.name);

        console.log(`解析文件 ${i + 1}/${files.length}:`, file.name, '策略名称:', strategyName);

        toast.loading(`正在解析 ${strategyName}...`);

        try {
          let dailyData;
          if (customConfig) {
            // 使用自定义格式解析
            dailyData = await parseExcelFileWithConfig(file, customConfig);
          } else {
            // 使用标准格式解析
            dailyData = await parseExcelFile(file);
          }
          console.log(`${strategyName} 解析结果:`, {
            dailyDataLength: dailyData.length,
            firstData: dailyData[0],
            lastData: dailyData[dailyData.length - 1]
          });

          // 检查是否解析出数据
          if (!dailyData || dailyData.length === 0) {
            hasParseError = true;
            toast.error(`${strategyName} 解析失败：未获取到有效数据`);
            continue;
          }

          const strategy = calculateAllMetrics(
            dailyData,
            strategyName,
            `strategy-${Date.now()}-${i}`
          );

          console.log(`${strategyName} 计算指标完成:`, {
            metrics: strategy.metrics,
            periodReturns: strategy.periodReturns
          });

          newStrategies.push(strategy);
          toast.success(`${strategyName} 解析成功`);
        } catch (error) {
          hasParseError = true;
          console.error(`解析 ${strategyName} 失败:`, error);
          toast.error(`${strategyName} 解析失败`);
        }
      }

      if (newStrategies.length > 0) {
        console.log('所有策略解析完成，准备添加到状态:', newStrategies.length);
        setStrategies(prev => {
          const updated = [...prev, ...newStrategies];
          console.log('更新后的策略总数:', updated.length);
          return updated;
        });
        // 自动选中新上传的策略
        setSelectedStrategies(prev => {
          const newSet = new Set(prev);
          newStrategies.forEach(s => newSet.add(s.id));
          console.log('选中的策略数量:', newSet.size);
          return newSet;
        });
      }

      // 如果所有文件都解析失败，显示弹窗
      if (hasParseError && newStrategies.length === 0) {
        setShowParseError(true);
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      toast.error('文件上传失败');
      setShowParseError(true);
    } finally {
      setIsUploading(false);
      // 清空文件输入
      e.target.value = '';
      setCustomConfig(null);
    }
  }, [customConfig]);

  // 切换策略选择
  const toggleStrategy = useCallback((strategyId: string) => {
    setSelectedStrategies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(strategyId)) {
        newSet.delete(strategyId);
      } else {
        newSet.add(strategyId);
      }
      return newSet;
    });
  }, []);

  // 全选/取消全选
  const toggleAllStrategies = useCallback(() => {
    if (selectedStrategies.size === strategies.length) {
      setSelectedStrategies(new Set());
    } else {
      setSelectedStrategies(new Set(strategies.map(s => s.id)));
    }
  }, [selectedStrategies, strategies]);

  // 删除策略
  const removeStrategy = useCallback((strategyId: string) => {
    setStrategies(prev => prev.filter(s => s.id !== strategyId));
    setSelectedStrategies(prev => {
      const newSet = new Set(prev);
      newSet.delete(strategyId);
      return newSet;
    });
    toast.success('策略已删除');
  }, []);

  // 清空所有策略
  const clearAllStrategies = useCallback(() => {
    setStrategies([]);
    setSelectedStrategies(new Set());
    toast.success('所有策略已清空');
  }, []);

  // 处理基准文件上传
  const handleBenchmarkUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBenchmark(true);
    toast.loading(`正在上传基准: ${file.name}...`);

    try {
      const benchmarkData = await parseBenchmarkExcel(file);
      const benchmarkName = file.name.replace(/\.[^/.]+$/, '');
      
      setCustomBenchmark({
        id: `benchmark-${Date.now()}`,
        name: benchmarkName,
        data: benchmarkData,
      });
      
      toast.success(`基准 "${benchmarkName}" 上传成功`);
    } catch (error) {
      console.error('基准上传失败:', error);
      toast.error('基准上传失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsUploadingBenchmark(false);
      e.target.value = '';
    }
  }, []);

  // 删除自定义基准
  const removeCustomBenchmark = useCallback(() => {
    setCustomBenchmark(null);
    toast.success('自定义基准已删除');
  }, []);

  // 导出为PNG
  const handleExportPNG = useCallback(async () => {
    try {
      toast.loading('正在生成PNG...');
      await exportToPNG('dashboard-content', `投顾策略跟踪报表-${new Date().toISOString().slice(0, 10)}.png`);
      toast.success('PNG导出成功');
    } catch (error) {
      console.error('导出PNG失败:', error);
      toast.error('导出PNG失败');
    }
  }, []);

  // 导出为PDF
  const handleExportPDF = useCallback(async () => {
    try {
      toast.loading('正在生成PDF...');
      await exportToPDF('dashboard-content', `投顾策略跟踪报表-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF导出成功');
    } catch (error) {
      console.error('导出PDF失败:', error);
      toast.error('导出PDF失败');
    }
  }, []);

  // 获取选中的策略数据
  const selectedStrategiesData = strategies.filter(s => selectedStrategies.has(s.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-slate-50">
      {/* 导航栏 */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-2 rounded-lg shadow-lg">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">投顾策略跟踪报表</h1>
                <p className="text-xs text-slate-500">Portfolio Strategy Tracking Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportPNG}
                variant="outline"
                disabled={strategies.length === 0}
                className="shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                PNG
              </Button>
              <Button
                onClick={handleExportPDF}
                variant="outline"
                disabled={strategies.length === 0}
                className="shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 自定义格式选择器 */}
        {showFormatSelector && (
          <DataFormatSelector
            onConfigSelect={(config) => {
              setCustomConfig(config);
              setShowFormatSelector(false);
              // 触发文件选择
              fileInputRef.current?.click();
            }}
            onClose={() => setShowFormatSelector(false)}
          />
        )}

        {/* 上传和策略管理 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 上传卡片 */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">上传数据</CardTitle>
              <CardDescription className="text-xs">Excel文件（日期+组合收益%+基准收益%）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className="block">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  asChild
                  className="w-full"
                  disabled={isUploading}
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? '上传中...' : '选择文件'}
                  </span>
                </Button>
              </label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowFormatSelector(true)}
                disabled={isUploading}
              >
                <Settings className="w-4 h-4 mr-2" />
                其他格式请点这里
              </Button>
              {customConfig && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
                  已配置自定义格式（日期列: {customConfig.dateColumn + 1}）
                </div>
              )}
            </CardContent>
          </Card>

          {/* 上传基准卡片 */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">上传基准</CardTitle>
              <CardDescription className="text-xs">Excel文件（日期+累计收益率）</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="block">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleBenchmarkUpload}
                  disabled={isUploadingBenchmark}
                  className="hidden"
                  id="benchmark-upload"
                />
                <Button
                  asChild
                  className="w-full"
                  disabled={isUploadingBenchmark}
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploadingBenchmark ? '上传中...' : '选择基准'}
                  </span>
                </Button>
              </label>
              {customBenchmark && (
                <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-green-700 truncate flex-1">
                      {customBenchmark.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeCustomBenchmark}
                      className="text-green-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 策略列表 */}
          <Card className="lg:col-span-3 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">策略列表</CardTitle>
                  <CardDescription className="text-xs">已加载 {strategies.length} 个策略</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllStrategies}
                    disabled={strategies.length === 0}
                  >
                    {selectedStrategies.size === strategies.length ? '取消全选' : '全选'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllStrategies}
                    disabled={strategies.length === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    清空
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {strategies.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无数据，请上传Excel文件</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {strategies.map((strategy) => (
                    <div
                      key={strategy.id}
                      className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-blue-50/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedStrategies.has(strategy.id)}
                          onChange={() => toggleStrategy(strategy.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-slate-900">{strategy.strategyName}</div>
                          <div className="text-xs text-slate-500">
                            {strategy.startDate.toLocaleDateString('zh-CN')} - {strategy.endDate.toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStrategy(strategy.id)}
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区域 */}
        {selectedStrategiesData.length > 0 && (
          <div id="dashboard-content" className="space-y-6">
            {/* 合并的收益走势与核心指标模块 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <PerformanceDashboard strategies={selectedStrategiesData} customBenchmark={customBenchmark} />
            </div>

            {/* 持有体验模块 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">持有体验</h3>
              <HoldingExperience strategies={selectedStrategiesData} />
            </div>

            {/* 历史业绩列表 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <HistoricalPerformance strategies={selectedStrategiesData} />
            </div>
          </div>
        )}

        {strategies.length > 0 && selectedStrategiesData.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">请选择要对比的策略</h3>
            <p className="text-slate-500">在上方策略列表中勾选需要对比的策略</p>
          </div>
        )}
      </div>

      {/* 解析失败弹窗 */}
      <AlertDialog open={showParseError} onOpenChange={setShowParseError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>解析未成功</AlertDialogTitle>
            <AlertDialogDescription>
              请选择其他格式上传，或检查上传的文件，如有问题请联系韩泽普
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>我知道了</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
