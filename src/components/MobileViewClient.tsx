"use client";

import React, { useState, useEffect, useRef } from 'react';
import { DateNavigator } from '@/components/DateNavigator';
import type { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import { MobileGanttChart } from './MobileGanttChart';
import { useRouter } from 'next/navigation';
import { AnchorInfoModal } from './AnchorInfoModal';
import { Button } from './ui/button';
import { Anchor, ZoomIn, ZoomOut } from 'lucide-react';

interface MobileViewClientProps {
  initialReport: DailyReport | null;
  initialSchedules: ScheduleWithOperations[];
  date: string;
}

export function MobileViewClient({
  initialReport,
  initialSchedules,
  date,
}: MobileViewClientProps) {
  const router = useRouter();
  const [isAnchorModalOpen, setIsAnchorModalOpen] = useState(false);
  
  // --- 【ここからが新設箇所】 ---
  const [isZoomedIn, setIsZoomedIn] = useState(false); // モード管理を親に移動
  const toggleZoom = () => setIsZoomedIn(prev => !prev);
  
  const mainAreaRef = useRef<HTMLElement>(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const mainElement = mainAreaRef.current;
    if (!mainElement) return;

    // ResizeObserverで要素のサイズを監視
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        setViewSize({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    resizeObserver.observe(mainElement);
    return () => resizeObserver.unobserve(mainElement);
  }, []);
  // --- 【ここまで】 ---


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [router]);

    const displayDate = new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  return (
    <>
      <header className="p-4 border-b">
        <h1 className="text-xl font-bold text-center">{displayDate}</h1>
        <p className="text-sm text-center text-gray-600">
          当直: {initialReport?.primary_staff || '-'}, {initialReport?.secondary_staff || '-'}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-grow"><DateNavigator currentDate={date} basePath="/mobile" /></div>
          <Button variant="outline" size="icon" onClick={toggleZoom} className="flex-shrink-0">
            {isZoomedIn ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsAnchorModalOpen(true)} className="flex-shrink-0"><Anchor className="h-4 w-4" /></Button>
        </div>
      </header>

      <main ref={mainAreaRef} className="flex-1 overflow-hidden">
        {/* viewSizeが計算されてからGanttChartを描画 */}
        {viewSize.width > 0 && (
          <MobileGanttChart 
            schedules={initialSchedules}
            baseDate={date}
            isZoomedIn={isZoomedIn}
            onToggleZoom={toggleZoom}
            viewSize={viewSize} // 計測したサイズを渡す
          />
        )}
      </main>
      
      <AnchorInfoModal open={isAnchorModalOpen} onOpenChange={setIsAnchorModalOpen} />
    </>
  );
}