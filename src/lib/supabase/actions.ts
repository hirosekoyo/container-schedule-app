"use server";

import { revalidatePath } from "next/cache";
import { Database } from "@/types/database.types";
import { createSupabaseServerClient } from "./server";

export type ScheduleWithOperations = Database["public"]["Tables"]["schedules"]["Row"] & {
  cargo_operations: Database["public"]["Tables"]["cargo_operations"]["Row"][];
};
export type ScheduleInsert = Database["public"]["Tables"]["schedules"]["Insert"];
export type OperationInsert = Database["public"]["Tables"]["cargo_operations"]["Insert"];
export type DailyReport = Database["public"]["Tables"]["daily_reports"]["Row"];
export type DailyReportInsert = Database["public"]["Tables"]["daily_reports"]["Insert"];

// parser.tsから渡されるデータの型を明示的に定義
type ScheduleDataForDB = Omit<ScheduleInsert, 'id' | 'created_at'>;

/**
 * 1. 指定された日付の日次レポートを取得する
 */
export async function getDailyReportByDate(date: string): Promise<DailyReport | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("daily_reports").select("*").eq("report_date", date).single();
  if (error) { console.error("Error fetching daily report:", error.message); return null; }
  return data;
}

/**
 * 2. 指定された日付の全スケジュールを取得する
 */
export async function getSchedulesByDate(date: string): Promise<ScheduleWithOperations[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("schedules").select(`*, cargo_operations (*)`).eq("schedule_date", date).order("arrival_time", { ascending: true });
  if (error) { console.error("Error fetching schedules:", error.message); return []; }
  return data || [];
}

/**
 * 3. 日次レポートをUPSERTする
 */
export async function upsertDailyReport(reportData: DailyReportInsert) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("daily_reports").upsert(reportData, { onConflict: 'report_date' });
  if (error) { console.error("Error upserting daily report:", error.message); return { error }; }
  revalidatePath("/dashboard", "layout");
  return { error: null };
}

/**
 * 4. 複数の船舶スケジュールを一括でインポート（高度なUPSERT）する
 */
export async function importMultipleSchedules(
  schedulesData: ScheduleDataForDB[]
) {
  if (!schedulesData || schedulesData.length === 0) {
    return { data: null, error: { message: "登録するデータがありません。" } };
  }
  
  const supabase = createSupabaseServerClient();

  // 型定義が更新されたため、型エラーは発生しなくなる
  const { data, error } = await supabase
    .rpc('upsert_schedules_with_check', {
      schedules_data: schedulesData
    });

  if (error) {
    console.error("Error upserting multiple schedules:", error.message);
    return { data: null, error };
  }

  revalidatePath("/dashboard", "layout");
  return { data, error: null };
}

/**
 * 5. 指定された日付のデータの中で、最新のインポートIDを取得する
 */
export async function getLatestImportId(date: string): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('schedules')
    .select('last_import_id')
    .not('last_import_id', 'is', null)
    .eq('schedule_date', date)
    .order('last_import_id', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    // 存在しないのはエラーではないので、コンソールには出力しない
    return null;
  }
  return data.last_import_id;
}

/**
 * 6. 指定IDのスケジュールを削除する
 */
export async function deleteSchedule(scheduleId: number) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("schedules").delete().eq("id", scheduleId);
  if (error) { console.error("Error deleting schedule:", error.message); return { error }; }
  revalidatePath("/dashboard", "layout");
  return { error: null };
}