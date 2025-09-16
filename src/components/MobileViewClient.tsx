"use client";

import React, { useState, useEffect } from 'react';
import { DateNavigator } from '@/components/DateNavigator';
import type { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import { MobileGanttChart } from './MobileGanttChart';
import { useRouter } from 'next/navigation';
import { AnchorInfoModal } from './AnchorInfoModal'; // 1. 新しいモーダルをインポート
import { Button } from './ui/button'; // Buttonをインポート
import { Anchor } from 'lucide-react'; // 錨アイコンをインポート

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
  // 2. 新しいモーダル用のstateを追加
  const [isAnchorModalOpen, setIsAnchorModalOpen] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  const displayDate = new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  return (
    <>
      <header className="p-4 border-b">
        {/* <h1 className="text-xl font-bold text-center">{displayDate}</h1>
        <p className="text-sm text-center text-gray-600">
          当直: {initialReport?.primary_staff || '-'}, {initialReport?.secondary_staff || '-'}
        </p> */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-grow">
            <DateNavigator 
              currentDate={date} 
              basePath="/mobile"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsAnchorModalOpen(true)}
            className="flex-shrink-0"
          >
            <Anchor className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <MobileGanttChart 
          schedules={initialSchedules}
          baseDate={date}
        />
      </main>
      
      <AnchorInfoModal 
        open={isAnchorModalOpen}
        onOpenChange={setIsAnchorModalOpen}
      />
    </>
  );
}