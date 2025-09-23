"use client";

import DashboardHeader from '@/components/DashboardHeader';
import GanttChart from '@/components/GanttChart';
import ScheduleTable from '@/components/ScheduleTable';
import { MemoEdit } from '@/components/MemoEdit';
import { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  // 変更点: A4横 (297mm) を基準に幅を再計算 (左右マージン各1cm=20mm)
  const GANTT_PRINT_WIDTH = (297 - 20) * 3.78 - 32;

    // 印刷用の表データを定義
  const limitData = [
    { crane: 'IC-1', right: '40ft:35+1\n20ft:35+4', left: '?' },
    { crane: 'IC-2', right: '40ft:36+1\n20ft:36+4', left: '?' },
    { crane: 'IC-3', right: 'IC-2横', left: '右脚56±00' },
    { crane: 'IC-4', right: '左脚38±00', left: '右脚61±00' },
    { crane: 'IC-5', right: '左脚45±00', left: '40ft:63-9\n20ft:63-6' },
    { crane: 'IC-6', right: '左脚47-15', left: '40ft:64-7\n20ft:64-10' },
  ];

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
            />
          </header>
          
          {/* 2. 船舶図 (gridの2行目) */}
          <div className="print-gantt-card">
            {/* <h2 style={{ fontSize: '12pt', fontWeight: '600', marginBottom: '0.25rem' }}>船舶図</h2> */}
            <div style={{ height: '100%', position: 'relative' }}>
              <GanttChart 
                schedules={schedules} 
                baseDate={date} 
                latestImportId={null}
                onScheduleClick={() => {}}
                isPrintView={true}
                printWidth={GANTT_PRINT_WIDTH}
              />
            </div>
          </div>

          {/* 3. 極限位置 (gridの3行目) */}
          <div className="table-container">
            <Table className="border text-[7pt]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[15%] px-1 py-0 h-4 text-center"></TableHead>
                  {limitData.map(col => (
                    <TableHead key={col.crane} className="text-center px-1 py-0 h-4">{col.crane}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold text-center px-1 py-0 h-4">左極限</TableCell>
                  {limitData.map(col => (
                    <TableCell key={`${col.crane}-right`} className="text-center px-1 py-0 h-4 whitespace-pre-wrap">{col.right}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold text-center px-1 py-0 h-4">右極限</TableCell>
                  {limitData.map(col => (
                    <TableCell key={`${col.crane}-left`} className="text-center px-1 py-0 h-4 whitespace-pre-wrap">{col.left}</TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* 4. 荷役予定詳細 (gridの4行目) */}
          <div className="print-table-card">
            {/* <h2 className="text-xl font-semibold">荷役予定詳細</h2> */}
            <div className="print-table">
              <ScheduleTable 
                schedules={schedules} 
                latestImportId={null}
                onScheduleClick={() => {}}
                isPrintView={true}
              />
            </div>
          </div>
          
          {/* 5. メモ (gridの5行目) */}
          <div className="print-memo-card">
            <MemoEdit
              initialMemo={report?.memo || null}
              reportDate={date}
              isPrintView={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}