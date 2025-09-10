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
    const timer = setTimeout(() => window.print(), 1000);
    const handleAfterPrint = () => window.close();
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // 印刷時のガントチャートの固定幅
  // A4横幅(約19cm)からラベル幅(2rem)を引いたサイズ
  const GANTT_PRINT_WIDTH = 19 * 37.8 - 32; 

  return (
    <div className="print-preview-background">
      <div className="print-outer-container">
        <div className="print-content-wrapper font-sans">
          
          {/* 1. ヘッダー */}
          <header style={{ flexShrink: 0 }}>
            <DashboardHeader 
              date={date}
              report={report}
              isPrintView={true}
            />
          </header>
          
          {/* 2. 船舶図 */}
          <section style={{ height: '12cm', border: '1px solid #e5e7eb', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '0.5rem', overflow: 'hidden' }}>
             {/* <h2 style={{ fontSize: '12pt', fontWeight: '600', marginBottom: '0.25rem' }}>船舶図</h2> */}
            <div style={{ height: 'calc(100% - 24px)', position: 'relative' }}>
              <GanttChart 
                schedules={schedules} 
                baseDate={date} 
                latestImportId={null}
                onScheduleClick={() => {}}
                isPrintView={true}
                printWidth={GANTT_PRINT_WIDTH}
              />
            </div>
          </section>

          {/* 3. 荷役予定詳細 */}
          <section style={{ flexGrow: 1, marginTop: '0.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* <h2 style={{ fontSize: '12pt', fontWeight: '600', marginBottom: '0.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '2px' }}>荷役予定詳細</h2> */}
            <div style={{ flexGrow: 1, overflow: 'auto' }}> {/* 横スクロールが必要な場合はここがスクロールする */}
              <ScheduleTable 
                schedules={schedules} 
                latestImportId={null}
                onScheduleClick={() => {}}
                isPrintView={true}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}