"use server";

import { revalidatePath } from "next/cache";
import { Database } from "@/types/database.types";
import { createSupabaseServerClient } from "./server";

// 型エイリアスを定義
export type ScheduleWithOperations = Database["public"]["Tables"]["schedules"]["Row"] & {
  cargo_operations: Database["public"]["Tables"]["cargo_operations"]["Row"][];
};
export type ScheduleInsert = Database["public"]["Tables"]["schedules"]["Insert"];
export type OperationInsert = Database["public"]["Tables"]["cargo_operations"]["Insert"];
export type DailyReport = Database["public"]["Tables"]["daily_reports"]["Row"];
export type DailyReportInsert = Database["public"]["Tables"]["daily_reports"]["Insert"];


/**
 * 1. 指定された日付の日次レポートを取得する
 * @param date 'YYYY-MM-DD' 形式の日付文字列
 * @returns DailyReport | null
 */
export async function getDailyReportByDate(date: string): Promise<DailyReport | null> {
  // 変更なし: createSupabaseServerClientは同期的に呼び出せる
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("report_date", date)
    .single();

  if (error) {
    console.error("Error fetching daily report:", error.message);
    return null;
  }
  return data;
}

/**
 * 2. 指定された日付の全スケジュールと関連する荷役作業を取得する
 * @param date 'YYYY-MM-DD' 形式の日付文字列
 * @returns ScheduleWithOperations[]
 */
export async function getSchedulesByDate(date: string): Promise<ScheduleWithOperations[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedules")
    .select(`
      *,
      cargo_operations (*)
    `)
    .eq("schedule_date", date)
    .order("arrival_time", { ascending: true });

  if (error) {
    console.error("Error fetching schedules:", error.message);
    return [];
  }
  return data || [];
}

/**
 * 3. 日次レポートを新規作成または更新する
 * @param reportData 更新または作成するデータ
 */
export async function upsertDailyReport(reportData: DailyReportInsert) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("daily_reports").upsert(reportData, {
    onConflict: 'report_date', // report_dateが競合した場合に更新
  });

  if (error) {
    console.error("Error upserting daily report:", error.message);
    return { error };
  }
  
  revalidatePath("/");
  return { error: null };
}

/**
 * 4. スケジュール1件と関連する荷役作業複数件をトランザクションで作成する
 * @param scheduleData スケジュールデータ
 * @param operationsData 荷役作業データの配列
 */
export async function createScheduleWithOperations(
  scheduleData: Omit<ScheduleInsert, "id" | "created_at">,
  operationsData: Omit<OperationInsert, "id" | "created_at" | "schedule_id">[]
) {
  const supabase = createSupabaseServerClient();
  // 型定義の再生成により、以下の行のエラーが解消される
  const { data, error } = await supabase.rpc("create_schedule_with_operations", {
    schedule_data: scheduleData,
    operations_data: operationsData,
  });

  if (error) {
    console.error("Error creating schedule with operations:", error.message);
    return { data: null, error };
  }

  revalidatePath("/");
  return { data, error: null };
}

/**
 * 5. 既存のスケジュールと荷役作業をトランザクションで更新する
 * @param scheduleId 更新対象のスケジュールID
 * @param scheduleData 更新後のスケジュールデータ
 * @param operationsData 更新後の荷役作業データの配列
 */
export async function updateScheduleWithOperations(
  scheduleId: number,
  scheduleData: Omit<ScheduleInsert, "id" | "created_at">,
  operationsData: Omit<OperationInsert, "id" | "created_at" | "schedule_id">[]
) {
  const supabase = createSupabaseServerClient();
  // 型定義の再生成により、以下の行のエラーが解消される
  const { error } = await supabase.rpc("update_schedule_with_operations", {
    p_schedule_id: scheduleId,
    schedule_data: scheduleData,
    operations_data: operationsData,
  });

  if (error) {
    console.error("Error updating schedule with operations:", error.message);
    return { error };
  }
  
  revalidatePath("/");
  return { error: null };
}

/**
 * 6. 指定IDのスケジュールと、関連する全荷役作業を削除する
 * @param scheduleId 削除対象のスケジュールID
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

  revalidatePath("/");
  return { error: null };
}

/**
 * 7. 複数の船舶スケジュールを一括でDBにUPSERT(Update or Insert)する
 * @param schedulesData 解析済みのスケジュールデータの配列
 */
export async function createMultipleSchedules(
  schedulesData: Omit<ScheduleInsert, "id" | "created_at">[]
) {
  if (!schedulesData || schedulesData.length === 0) {
    return { error: { message: "登録するデータがありません。" } };
  }
  
  const supabase = createSupabaseServerClient();

  // --- 【ここからが修正箇所】 ---
  // .insert() を .upsert() に変更
  const { data, error } = await supabase
    .from("schedules")
    .upsert(schedulesData, {
      // onConflictで、どのカラムの組み合わせが重複しているかを判定するか指定
      onConflict: 'schedule_date, ship_name',
      // ignoreDuplicatesをfalseにすることで、重複した場合はUPDATEが実行される
      ignoreDuplicates: false,
    })
    .select();
  // --- 【ここまで修正】 ---

  if (error) {
    console.error("Error upserting multiple schedules:", error.message);
    return { error };
  }

  revalidatePath("/dashboard", "layout");
  return { data, error: null };
}