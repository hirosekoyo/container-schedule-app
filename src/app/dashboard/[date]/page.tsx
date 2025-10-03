import { DashboardClient } from "@/components/DashboardClient";
import { getDailyReportByDate, getSchedulesByDate, getLatestImportId, checkAttentionPosts } from "@/lib/supabase/actions"; // checkAttentionPosts をインポート
import { Suspense } from "react";

// pageコンポーネントを async に変更
export default async function DashboardPage({
  params: { date },
  searchParams,
}: {
  params: { date: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // 3つのデータ取得を並列で実行
  const [report, schedules, latestImportId, hasAttentionPosts] = await Promise.all([
    getDailyReportByDate(date),
    getSchedulesByDate(date),
    getLatestImportId(date),
    checkAttentionPosts(), // 新しいアクションを呼び出し
  ]);
  
  const currentImportId = typeof searchParams.importId === 'string' ? searchParams.importId : undefined;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Suspense fallback={<p>Loading...</p>}>
        <DashboardClient
          initialReport={report}
          initialSchedules={schedules}
          initialLatestImportId={latestImportId}
          date={date}
          currentImportId={currentImportId}
          hasAttentionPosts={hasAttentionPosts} // 新しいpropを渡す
        />
      </Suspense>
    </div>
  );
}