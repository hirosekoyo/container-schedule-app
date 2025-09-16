import { getDailyReportByDate, getSchedulesByDate } from '@/lib/supabase/actions';
import { MobileViewClient } from '@/components/MobileViewClient';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

interface MobilePageProps {
  params: { date: string };
}

export default async function MobilePage({ params }: MobilePageProps) {
  const { date } = params;
  
  const [report, schedules] = await Promise.all([
    getDailyReportByDate(date),
    getSchedulesByDate(date),
  ]);

  return (
    <div className="flex h-screen flex-col">
      <Suspense fallback={<div className="flex h-full items-center justify-center">読み込み中...</div>}>
        <MobileViewClient
          initialReport={report}
          initialSchedules={schedules}
          date={date}
        />
      </Suspense>
    </div>
  );
}