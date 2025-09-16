"use client";

import React, { useState } from 'react';
import { DateNavigator } from '@/components/DateNavigator';
import type { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import { MobileGanttChart } from './MobileGanttChart';
import { ScheduleDetailModal } from './ScheduleDetailModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithOperations | null>(null);

  const handleScheduleClick = (schedule: ScheduleWithOperations) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

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
        <MobileGanttChart 
          schedules={initialSchedules}
          baseDate={date}
          onScheduleClick={handleScheduleClick}
        />
      </main>
      
      <ScheduleDetailModal
        schedule={selectedSchedule}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}