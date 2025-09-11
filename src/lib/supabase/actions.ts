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
  const { data, error } = await supabase
    .from("schedules")
    .select(`*, cargo_operations (*)`)
    .eq("schedule_date", date)
    // --- 【ここからが修正箇所】 ---
    // .order() を複数回チェイン（つなげる）することで、複合キーによるソートが実現できる
    .order("berth_number", { ascending: true }) // 第1キー: 岸壁番号を昇順で
    .order("arrival_time", { ascending: true }); // 第2キー: 着岸時間を昇順で
    // --- 【ここまで修正】 ---

  if (error) {
    console.error("Error fetching schedules:", error.message);
    return [];
  }
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
 * 新規スケジュールと関連する荷役作業をトランザクションで作成する
 */
export async function createScheduleWithOperations(
  scheduleData: Omit<ScheduleInsert, "id" | "created_at">,
  operationsData: Omit<OperationInsert, "id" | "created_at" | "schedule_id">[]
) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_schedule_with_operations", {
    schedule_data: scheduleData,
    operations_data: operationsData,
  });

  if (error) {
    console.error("Error creating schedule:", error.message);
    return { data: null, error };
  }
  
  revalidatePath("/dashboard", "layout");
  return { data, error: null };
}

/**
 * 指定IDのスケジュールを削除する
 * ON DELETE CASCADE制約により、関連するcargo_operationsも自動的に削除される
 */
export async function deleteSchedule(scheduleId: number) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    console.error("Error deleting schedule:", error.message);
    return { error };
  }

  // 変更を反映させるため、ダッシュボード全体のキャッシュをクリア
  revalidatePath("/dashboard", "layout");
  return { error: null };
}

/**
 * 7. 既存のスケジュールと関連する荷役作業をトランザクションで更新する
 * @param scheduleId 更新対象のスケジュールID
 * @param scheduleData 更新後のスケジュールデータ
 * @param operationsData 更新後の荷役作業データの配列
 */
export async function updateScheduleWithOperations(
  scheduleId: number,
  scheduleData: Omit<ScheduleInsert, "id" | "created_at" | "schedule_date" | "last_import_id" | "data_hash" | "update_flg" >,
  operationsData: Omit<OperationInsert, "id" | "created_at" | "schedule_id">[]
) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("update_schedule_with_operations", {
    p_schedule_id: scheduleId,
    schedule_data: scheduleData,
    operations_data: operationsData,
  });

  if (error) {
    console.error("Error updating schedule with operations:", error.message);
    return { error };
  }
  
  // このスケジュールが表示されている可能性のある日付のキャッシュをクリア
  // schedule_date も更新される可能性があるため、広範囲にクリア
  revalidatePath("/dashboard", "layout");
  return { error: null };
}

/**
 * データベースのスケジュール関連データをリセットする
 * - schedulesテーブルを全件削除
 * - daily_reportsテーブルの昨日以前のデータを削除
 */
export async function resetScheduleData() {
  const supabase = createSupabaseServerClient();

  // 1. schedulesテーブルを全件削除 (TRUNCATE)
  // TRUNCATEは高速で、関連するcargo_operationsもCASCADEで削除される
  const { error: truncateError } = await supabase
    .rpc('truncate_schedules_and_dependencies');
  
  if (truncateError) {
    console.error("Error truncating schedules table:", truncateError.message);
    return { error: truncateError };
  }

  // 2. daily_reportsの過去データを削除
  // 'YYYY-MM-DD'形式で今日の日付を取得
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  
  const { error: deleteError } = await supabase
    .from('daily_reports')
    .delete()
    .lt('report_date', today); // report_dateが今日より前のものを削除

  if (deleteError) {
    console.error("Error deleting old daily reports:", deleteError.message);
    return { error: deleteError };
  }

  // キャッシュをクリアして変更を反映
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/import");

  return { error: null };
}

/**
 * 指定された日付の日次レポートのメモだけを更新（UPSERT）する
 * @param report_date - 対象の日付 'YYYY-MM-DD'
 * @param memo - 更新後のメモの内容
 */
export async function updateDailyReportMemo(report_date: string, memo: string) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('daily_reports')
    .upsert(
      { report_date: report_date, memo: memo },
      { onConflict: 'report_date' } // report_dateが競合したらUPDATE
    );

  if (error) {
    console.error("Error updating daily report memo:", error.message);
    return { error };
  }

  // 変更をヘッダーと新しいメモコンポーネントに反映させる
  revalidatePath("/dashboard/[date]", "page");
  return { error: null };
}