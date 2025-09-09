import { getDailyReportByDate, getSchedulesByDate, getLatestImportId } from '@/lib/supabase/actions';
import { DashboardClient } from '@/components/DashboardClient'; // 新しいクライアントコンポーネントをインポート
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

interface DashboardPageProps {
  params: { date: string };
  searchParams: { importId?: string };
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { date } = params;
  const currentImportId = searchParams.importId;

  // 1. データ取得はサーバーサイドで実行
  const [report, schedules, latestImportIdFromDB] = await Promise.all([
    getDailyReportByDate(date),
    getSchedulesByDate(date),
    getLatestImportId(date),
  ]);

  const finalImportId = currentImportId || latestImportIdFromDB;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Suspense fallback={<div>Loading...</div>}>
          {/* 2. 取得したデータをpropsとしてクライアントコンポーネントに渡す */}
          <DashboardClient
            initialReport={report}
            initialSchedules={schedules}
            initialLatestImportId={finalImportId}
            date={date}
            currentImportId={currentImportId}
          />
        </Suspense>
      </main>
    </div>
  );
}