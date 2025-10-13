import { getDailyReportByDate, getSchedulesByDate } from "@/lib/supabase/actions";
import { PrintPageClient } from "./PrintPageClient";

// サーバーコンポーネントは searchParams を受け取れる
export default async function PrintPage({
  params: { date },
  searchParams,
}: {
  params: { date: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const [report, schedules] = await Promise.all([
    getDailyReportByDate(date),
    getSchedulesByDate(date),
  ]);

  // ▼▼▼ 変更点: searchParamsからmodeを決定 ▼▼▼
  // modeが'share'の場合のみ'share'、それ以外はすべて'print'として扱う
  const viewMode = searchParams.mode === 'share' ? 'share' : 'print';

  return (
    <PrintPageClient
      date={date}
      report={report}
      schedules={schedules}
      viewMode={viewMode} // viewModeをpropとして渡す
    />
  );
}