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
import { Printer } from 'lucide-react'; // Printerアイコンをインポート

interface DashboardClientProps {
  initialReport: DailyReport | null;
  initialSchedules: ScheduleWithOperations[];
  initialLatestImportId: string | null;
  date: string;
  currentImportId?: string;
}

export function DashboardClient({
  initialReport,
  initialSchedules,
  initialLatestImportId,
  date,
  currentImportId,
}: DashboardClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithOperations | null>(null);

  const handleScheduleClick = (schedule: ScheduleWithOperations | null) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">コンテナ船荷役予定管理</h1>
        <div className="flex items-center gap-4">
          <DateNavigator currentDate={date} importId={currentImportId} />
          <Button 
            variant="outline" 
            onClick={() => window.open(`/print/${date}`, '_blank')}
          >
            <Printer className="mr-2 h-4 w-4" />
            印刷
          </Button>
          <Button asChild><Link href="/dashboard/import">データインポート</Link></Button>
        </div>
      </div>

      <DashboardHeader date={date} report={initialReport} />

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">船舶図</h2>
        <div className="relative" style={{ height: `80vh` }}>
          <GanttChart
            schedules={initialSchedules}
            baseDate={date}
            latestImportId={initialLatestImportId}
            onScheduleClick={handleScheduleClick}
            // isPrintViewは渡さない（デフォルトのfalseが使われる）
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">荷役予定詳細</h2>
        <ScheduleTable
          schedules={initialSchedules}
          latestImportId={initialLatestImportId}
          onScheduleClick={handleScheduleClick}
          // isPrintViewは渡さない（デフォルトのfalseが使われる）
        />
      </div>
      
      <EditScheduleDialog
        schedule={selectedSchedule}
        scheduleDateForNew={date}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        latestImportId={initialLatestImportId}
      />
    </>
  );
}