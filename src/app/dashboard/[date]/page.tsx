import DashboardHeader from '@/components/DashboardHeader';
import GanttChart from '@/components/GanttChart';
import ScheduleTable from '@/components/ScheduleTable';
import { AddScheduleDialog } from '@/components/AddScheduleDialog';
import { getDailyReportByDate, getSchedulesByDate } from '@/lib/supabase/actions';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

interface DashboardPageProps {
  params: { date: string };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { date } = params;
  const [report, schedules] = await Promise.all([
    getDailyReportByDate(date),
    getSchedulesByDate(date),
  ]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">コンテナ船荷役予定管理</h1>
            <AddScheduleDialog schedule_date={date} />
        </div>
        
        <DashboardHeader date={date} report={report} />
        
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">船舶図</h2>
          {/* overflow-x-auto を削除！ */}
          <div>
            {/* コンテナに高さを指定 */}
            <div className="relative" style={{ height: `80vh` }}>
              <Suspense fallback={<div>ガントチャートを読み込み中...</div>}>
                {/* GanttChartを呼び出すだけ */}
                <GanttChart schedules={schedules} baseDate={date} />
              </Suspense>
            </div>
          </div>
        </div>
        
        {/* 詳細テーブル */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">荷役予定詳細</h2>
          <Suspense fallback={<div>テーブルを読み込み中...</div>}>
        <ScheduleTable schedules={schedules} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}