"use client";

import React, { useState, useEffect, useRef } from 'react';
import { DateNavigator } from '@/components/DateNavigator';
import type { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import { MobileGanttChart } from './MobileGanttChart';
import { useRouter } from 'next/navigation';
import { AnchorInfoModal } from './AnchorInfoModal';
import { Button } from './ui/button';
import { Anchor } from 'lucide-react';

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
  
  const mainAreaRef = useRef<HTMLElement>(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const mainElement = mainAreaRef.current;
    if (!mainElement) return;

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


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [router]);

  return (
    <>
      <header className="p-4 border-b">
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-grow"><DateNavigator currentDate={date} basePath="/mobile" /></div>
          <Button variant="outline" size="icon" onClick={() => setIsAnchorModalOpen(true)} className="flex-shrink-0"><Anchor className="h-4 w-4" /></Button>
        </div>
      </header>

      <main ref={mainAreaRef} className="flex-1 overflow-hidden">
        {viewSize.width > 0 && (
          <MobileGanttChart 
            schedules={initialSchedules}
            baseDate={date}
            viewSize={viewSize}
          />
        )}
      </main>
      
      <AnchorInfoModal open={isAnchorModalOpen} onOpenChange={setIsAnchorModalOpen} />
    </>
  );
}