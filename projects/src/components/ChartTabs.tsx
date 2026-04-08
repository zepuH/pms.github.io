'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ReturnChart } from './ReturnChart';
import { UnitNavChart } from './UnitNavChart';
import { StrategyData } from '@/types/strategy';

interface ChartTabsProps {
  strategies: StrategyData[];
  className?: string;
}

export function ChartTabs({ strategies, className }: ChartTabsProps) {
  return (
    <div className={className}>
      <Tabs defaultValue="return" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 h-auto">
          <TabsTrigger value="return">收益走势</TabsTrigger>
          <TabsTrigger value="unit">单位净值</TabsTrigger>
        </TabsList>

        <TabsContent value="return" className="mt-0">
          <ReturnChart strategies={strategies} />
        </TabsContent>

        <TabsContent value="unit" className="mt-0">
          <UnitNavChart strategies={strategies} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
