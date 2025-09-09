"use client";

import DashboardHeader from '@/components/DashboardHeader';
import GanttChart from '@/components/GanttChart';
import ScheduleTable from '@/components/ScheduleTable';
import { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useEffect } from 'react';

interface PrintPageClientProps {
  date: string;
  report: DailyReport | null;
  schedules: ScheduleWithOperations[];
}

export function PrintPageClient({ date, report, schedules }: PrintPageClientProps) {
  
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500);
    const handleAfterPrint = () => window.close();
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const GANTT_PRINT_WIDTH = (210 - 20) * 3.78 - 32;

  return (
    <div className="print-container">
      {/* --- 【ここからが修正箇所】 --- */}
      {/* ヘッダー: 高さは成り行き (flex-shrink-0) */}
      <header className="flex-shrink-0">
        <DashboardHeader 
          date={date}
          report={report}
          isPrintView={true} // 印刷モードを有効化
        />
      </header>
      
      {/* 上半分: 船舶図 (flex-growで利用可能なスペースの45%を占める) */}
      <section className="mt-2 border" style={{ flex: '0.45 1 0%' }}>
        <GanttChart 
          schedules={schedules} 
          baseDate={date} 
          latestImportId={null}
          onScheduleClick={() => {}}
          isPrintView={true}
          printWidth={GANTT_PRINT_WIDTH}
        />
      </section>

      {/* 下半分: 荷役予定詳細 (flex-growで残りのスペースをすべて占める) */}
      <section className="mt-2 flex-grow overflow-hidden">
        <ScheduleTable 
          schedules={schedules} 
          latestImportId={null}
          onScheduleClick={() => {}}
          isPrintView={true}
        />
      </section>
      {/* --- 【ここまで】 --- */}
    </div>
  );
}