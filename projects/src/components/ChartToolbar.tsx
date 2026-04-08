'use client';

import { Maximize2, Minimize2, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface ChartToolbarProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  showBenchmark: boolean;
  onToggleBenchmark: () => void;
  className?: string;
}

export function ChartToolbar({
  isFullscreen,
  onToggleFullscreen,
  showBenchmark,
  onToggleBenchmark,
  className,
}: ChartToolbarProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleBenchmark}
          className={cn(
            'gap-2',
            showBenchmark ? 'bg-blue-50 border-blue-200 text-blue-600' : ''
          )}
        >
          <TrendingUp className="w-4 h-4" />
          基准对比
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onToggleFullscreen}
        className="gap-2"
      >
        {isFullscreen ? (
          <>
            <Minimize2 className="w-4 h-4" />
            退出全屏
          </>
        ) : (
          <>
            <Maximize2 className="w-4 h-4" />
            全屏
          </>
        )}
      </Button>
    </div>
  );
}
