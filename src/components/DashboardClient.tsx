"use client";

import React, { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import GanttChart from '@/components/GanttChart';
import ScheduleTable from '@/components/ScheduleTable';
import { DateNavigator } from '@/components/DateNavigator';
import type { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EditScheduleDialog } from '@/components/EditScheduleDialog';
// ▼▼▼ BellRing アイコンをインポート ▼▼▼
import { Printer, Home, BellRing } from 'lucide-react';

interface DashboardClientProps {
  initialReport: DailyReport | null;
  initialSchedules: ScheduleWithOperations[];
  initialLatestImportId: string | null;
  date: string;
  currentImportId?: string;
  isPrintView?: boolean;
  hasAttentionPosts: boolean; // 新しいpropを受け取る
}

export function DashboardClient({
    initialReport,
  initialSchedules,
  initialLatestImportId,
  date,
  currentImportId,
  isPrintView = false,
  hasAttentionPosts, // 新しいpropを受け取る
}: DashboardClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithOperations | null>(null);

  const handleScheduleClick = (schedule: ScheduleWithOperations | null) => {
    // 印刷時はクリックしても何もしない
    if (isPrintView) return;
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  return (
    <div className={`flex flex-1 flex-col gap-4 md:gap-8 ${isPrintView ? 'print-content' : ''}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">船舶動静表-IC</h1>
        {!isPrintView && (
          <div className="flex items-center gap-4">
            {/* ▼▼▼ お知らせボタンを条件付きで表示 ▼▼▼ */}
            {hasAttentionPosts && (
              <Button asChild variant="destructive" className="animate-pulse">
                <Link href="/home#board" target="_blank" rel="noopener noreferrer">
                  <BellRing className="mr-2 h-4 w-4" />
                  お知らせがあります
                </Link>
              </Button>
            )}

            <Button asChild variant="outline" size="icon">
              <Link href="/home" aria-label="ホームに戻る">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
            
            <DateNavigator 
             currentDate={date} 
             importId={currentImportId} 
             basePath="/dashboard"
            />
            <Button variant="outline" onClick={() => window.open(`/print/${date}`, '_blank')}>
              <Printer className="mr-2 h-4 w-4" /> 印刷
            </Button>
            <Button asChild><Link href="/dashboard/import">船舶予定のインポート</Link></Button>
          </div>
        )}
      </div>

      <DashboardHeader date={date} report={initialReport} isPrintView={isPrintView} />

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">船舶図</h2>
        <div className="relative" style={{ height: isPrintView ? '11cm' : '80vh' }}>
          <GanttChart
            schedules={initialSchedules}
            baseDate={date}
            latestImportId={initialLatestImportId}
            onScheduleClick={handleScheduleClick}
            isPrintView={isPrintView}
            report={initialReport}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">荷役予定詳細</h2>
        <ScheduleTable
          schedules={initialSchedules}
          latestImportId={initialLatestImportId}
          onScheduleClick={handleScheduleClick}
          isPrintView={isPrintView}
        />
      </div>
      
      {!isPrintView && (
        <EditScheduleDialog
          schedule={selectedSchedule}
          scheduleDateForNew={date}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          latestImportId={initialLatestImportId}
        />
      )}
    </div>
  );
}