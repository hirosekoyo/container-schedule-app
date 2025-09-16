"use client";

import React from 'react';
import { DateNavigator } from '@/components/DateNavigator';
import type { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import { MobileGanttChart } from './MobileGanttChart';
// ScheduleDetailModal は不要になったので削除

interface MobileViewClientProps {
  initialReport: DailyReport | null;
  initialSchedules: ScheduleWithOperations[];
  date: string;
}

export function MobileViewClient({ initialReport, initialSchedules, date }: MobileViewClientProps) {
  // モーダル関連のstateとハンドラはすべて不要になるので削除
  
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
        <div className="mt-4">
          <DateNavigator currentDate={date} />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {/* onScheduleClickは不要になったので削除 */}
        <MobileGanttChart 
          schedules={initialSchedules}
          baseDate={date}
        />
      </main>
      {/* ScheduleDetailModal の呼び出しを削除 */}
    </>
  );
}