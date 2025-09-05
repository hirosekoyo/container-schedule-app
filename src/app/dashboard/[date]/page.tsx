import DashboardHeader from '@/components/DashboardHeader';
import GanttChart from '@/components/GanttChart';
import ScheduleTable from '@/components/ScheduleTable';
import { DateNavigator } from '@/components/DateNavigator'; // 1. DateNavigatorをインポート
import { getDailyReportByDate, getSchedulesByDate, getLatestImportId } from '@/lib/supabase/actions';
import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface DashboardPageProps {
  params: { date: string };
  searchParams: { importId?: string };
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { date } = params;
  const currentImportId = searchParams.importId;
  
  const [report, schedules, latestImportIdFromDB] = await Promise.all([
    getDailyReportByDate(date),
    getSchedulesByDate(date),
    getLatestImportId(date),
  ]);

  const finalImportId = currentImportId || latestImportIdFromDB;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">コンテナ船荷役予定管理</h1>
          <div className="flex items-center gap-4">
            {/* 2. DateNavigatorをここに配置 */}
            <DateNavigator currentDate={date} importId={currentImportId} />
            {/* 3. インポートページへのリンクボタンを追加 */}
            <Button asChild>
              <Link href="/dashboard/import">データインポート</Link>
            </Button>
          </div>
        </div>
        
        <DashboardHeader date={date} report={report} />
        
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">船舶図</h2>
          <div>
            <div className="relative" style={{ height: `80vh` }}>
              <Suspense fallback={<div>ガントチャートを読み込み中...</div>}>
                <GanttChart 
                  schedules={schedules} 
                  baseDate={date} 
                  latestImportId={finalImportId}
                />
              </Suspense>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">荷役予定詳細</h2>
          <Suspense fallback={<div>テーブルを読み込み中...</div>}>
            <ScheduleTable schedules={schedules} latestImportId={finalImportId} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}