"use client";

import DashboardHeader from '@/components/DashboardHeader';
import GanttChart from '@/components/GanttChart';
import ScheduleTable from '@/components/ScheduleTable';
import CraneLimitChart from '@/components/CraneLimitChart';
import { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useEffect } from 'react';

interface PrintPageClientProps {
  date: string;
  report: DailyReport | null;
  schedules: ScheduleWithOperations[];
  viewMode: 'print' | 'share'; // viewModeをpropとして受け取る
}

export function PrintPageClient({ date, report, schedules, viewMode }: PrintPageClientProps) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 1000);
    const handleAfterPrint = () => window.close();
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // A4横幅(297mm) - 左右マージン(20mm) = 277mm
  // 277mm * 3.78px/mm = 印刷領域のピクセル幅
  // そこから、左ラベル(2rem=32px)と右ラベル(3.5rem=56px)の合計88pxを引く
  const GANTT_PRINT_WIDTH = (297 - 20) * 3.78 - 88;

  return (
    <div className="print-preview-background">
      <div className="print-outer-container">
        <div className="print-content-wrapper font-sans">

          {/* 1. ヘッダー (gridの1行目) */}
          <header className="print-header">
            <DashboardHeader
              date={date}
              report={report}
              isPrintView={true}
              viewMode={viewMode} // viewModeを渡す
            />
          </header>

          {/* 2. 船舶図 (gridの2行目) */}
          <div className="print-gantt-card">
            <div style={{ height: '100%', position: 'relative' }}>
              <GanttChart
                schedules={schedules}
                baseDate={date}
                latestImportId={null}
                onScheduleClick={() => { }}
                isPrintView={true}
                printWidth={GANTT_PRINT_WIDTH}
                report={report}
                viewMode={viewMode} // viewModeを渡す
              />
            </div>
          </div>

          <CraneLimitChart 
            isPrintView={true}
            printWidth={GANTT_PRINT_WIDTH} 
            report={report}
            // CraneLimitChartはviewModeに依存しないので渡さなくてもOK
          />

          <div className="print-table-card">
            {/* <h2 className="text-xl font-semibold">荷役予定詳細</h2> */}
            <div className="print-table">
              <ScheduleTable
                schedules={schedules}
                latestImportId={null}
                onScheduleClick={() => { }}
                isPrintView={true}
                viewMode={viewMode} // viewModeを渡す
              />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}