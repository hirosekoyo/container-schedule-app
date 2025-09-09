import { getSchedulesByDate, getDailyReportByDate } from '@/lib/supabase/actions';
import { PrintPageClient } from './PrintPageClient';
import { Suspense } from 'react';

interface PrintPageProps {
  params: { date: string };
}

export default async function PrintPage({ params }: PrintPageProps) {
  const { date } = params;
  
  const [report, schedules] = await Promise.all([
    getDailyReportByDate(date),
    getSchedulesByDate(date),
  ]);

  return (
    <Suspense fallback={<div>印刷データを読み込み中...</div>}>
      <PrintPageClient 
        date={date}
        report={report}
        schedules={schedules} 
      />
    </Suspense>
  );
}