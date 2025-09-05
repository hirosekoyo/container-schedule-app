import DashboardHeader from '@/components/DashboardHeader';
import GanttChart from '@/components/GanttChart';
import ScheduleTable from '@/components/ScheduleTable';
import { AddScheduleDialog } from '@/components/AddScheduleDialog';
// 1. getLatestImportId をインポート
import { getDailyReportByDate, getSchedulesByDate, getLatestImportId } from '@/lib/supabase/actions';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

// 2. searchParams を受け取れるように props の型を修正
interface DashboardPageProps {
  params: { date: string };
  searchParams: { importId?: string };
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { date } = params;
  
  // 3. 3つの非同期処理を並列で実行
  const [report, schedules, latestImportIdFromDB] = await Promise.all([
    getDailyReportByDate(date),
    getSchedulesByDate(date),
    getLatestImportId(date), // DBからこの日の最新importIdを取得
  ]);

  // 4. ハイライトの基準となるIDを決定
  // URLクエリにあればそれを使い、なければDBから取得した最新IDを使う
  const finalImportId = searchParams.importId || latestImportIdFromDB;

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
          {/* 
            GanttChartの呼び出し部分は変更なし。
            page.tsxのoverflow-x:autoも削除されたままでOK。
          */}
          <div>
            <div className="relative" style={{ height: `80vh` }}>
              <Suspense fallback={<div>ガントチャートを読み込み中...</div>}>
                  <GanttChart 
                  schedules={schedules} 
                  baseDate={date} 
                  latestImportId={finalImportId} // 1. latestImportId を渡す
                />
              </Suspense>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">荷役予定詳細</h2>
          <Suspense fallback={<div>テーブルを読み込み中...</div>}>
            {/* 5. ScheduleTableに latestImportId を渡す */}
            <ScheduleTable schedules={schedules} latestImportId={finalImportId} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}