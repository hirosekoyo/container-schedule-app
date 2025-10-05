"use server";

import { revalidatePath } from "next/cache";
import { Database } from "@/types/database.types";
import { createSupabaseServerClient } from "./server";

// Post用の型エイリアス
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];

export type ScheduleWithOperations = Database["public"]["Tables"]["schedules"]["Row"] & {
  cargo_operations: Database["public"]["Tables"]["cargo_operations"]["Row"][];
};
export type ScheduleInsert = Database["public"]["Tables"]["schedules"]["Insert"];
export type OperationInsert = Database["public"]["Tables"]["cargo_operations"]["Insert"];
export type DailyReport = Database["public"]["Tables"]["ic_daily"]["Row"];
export type DailyReportInsert = Database["public"]["Tables"]["ic_daily"]["Insert"];

// parser.tsから渡されるデータの型を明示的に定義
type ScheduleDataForDB = Omit<ScheduleInsert, 'id' | 'created_at'>;

/**
 * 1. 指定された日付の日次レポートを取得する
 */
export async function getDailyReportByDate(date: string): Promise<DailyReport | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ic_daily")
    .select("*")
    .eq("report_date", date)
    .maybeSingle(); // .single() から .maybeSingle() に変更

  // .maybeSingle() は、結果が0件でもエラーを返さないため、
  // 他の予期せぬDBエラーのみをチェックすればよい
  if (error) {
    console.error("Error fetching daily report:", error.message);
    return null;
  }
  
  // dataは、結果が0件の場合は `null`、1件の場合はオブジェクトになる
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
  const { error } = await supabase.from("ic_daily").upsert(reportData, { onConflict: 'report_date' });
  if (error) { console.error("Error upserting daily report:", error.message); return { error }; }
  revalidatePath("/dashboard", "layout");
  return { error: null };
}

/**
 * 4. 複数の船舶スケジュールを一括でインポート（高度なUPSERT）する
 */
export async function importMultipleSchedules(
  // 引数の型を ScheduleInsert のサブセットにすることで、型の安全性を高める
  schedulesData: Omit<ScheduleInsert, 'id' | 'created_at'>[]
) {
  if (!schedulesData || schedulesData.length === 0) {
    return { data: null, error: { message: "登録するデータがありません。" } };
  }
  
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .rpc('upsert_schedules_with_check', {
      schedules_data: schedulesData // 型定義が更新されたため、すべてのフィールドが正しく渡される
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
  scheduleData: Omit<ScheduleInsert, "id" | "created_at" | "schedule_date" | "last_import_id" | "data_hash" >,
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
 * - ic_dailyテーブルの昨日以前のデータを削除
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

  // 2. ic_dailyの過去データを削除
  // 'YYYY-MM-DD'形式で今日の日付を取得
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  
  const { error: deleteError } = await supabase
    .from('ic_daily')
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
 * @param maintenance_unit - 　
 */
export async function updateDailyReportMemo(report_date: string, maintenance_unit: string) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('ic_daily')
    .upsert(
      { report_date: report_date, maintenance_unit: maintenance_unit },
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

/**
 * 指定されたスケジュールの変更確認フラグ（changed_fields）をリセットする
 * @param scheduleId 対象のスケジュールID
 */
export async function acknowledgeScheduleChange(scheduleId: number) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('schedules')
    .update({ changed_fields: null })
    .eq('id', scheduleId);

  if (error) {
    console.error("Error acknowledging schedule change:", error.message);
    return { error };
  }

  revalidatePath("/dashboard", "layout");
  return { error: null };
}

/**
 * 最新の日付のtenkenkubunを取得する
 * tenkenkubunがnullでないレコードの中で、最もreport_dateが新しいものを探す
 */
export async function getLatestTenkenkubun(): Promise<{ date: string, tenkenkubun: number } | null> {
  const supabase = createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('ic_daily')
    .select('report_date, tenkenkubun')
    .not('tenkenkubun', 'is', null) // tenkenkubunが設定されているもののみ対象
    .order('report_date', { ascending: false }) // 日付の降順でソート
    .limit(1) // 最初の1件を取得
    .maybeSingle(); // 結果がなくてもエラーにしない

  if (error) {
    console.error("Error fetching latest tenkenkubun:", error.message);
    return null;
  }
  
  if (!data) {
    return null; // データがない場合はnullを返す
  }

  // tenkenkubunがnumber型であることを保証する
  const tenkenkubunNumber = Number(data.tenkenkubun);
  if (isNaN(tenkenkubunNumber)) {
    return null;
  }

  return { date: data.report_date, tenkenkubun: tenkenkubunNumber };
}

/**
 * 掲載期限内のすべての掲示を取得する
 */
export async function getPosts(): Promise<Post[]> {
  const supabase = createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false }); // 作成日時の降順（新しいものが上）

  if (error) {
    console.error("Error fetching posts:", error.message);
    return [];
  }
  return data || [];
}

/**
 * 掲示を一件追加または更新する
 */
export async function upsertPost(postData: PostInsert) {
  const supabase = createSupabaseServerClient();
  
  const { error } = await supabase
    .from('posts')
    .upsert(postData)
    .select();

  if (error) {
    console.error("Error upserting post:", error.message);
    return { error };
  }

  revalidatePath('/home'); // ホーム画面のキャッシュをクリア
  return { error: null };
}

/**
 * 指定されたIDの掲示を削除する
 */
export async function deletePost(postId: number) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);
  
  if (error) {
    console.error("Error deleting post:", error.message);
    return { error };
  }

  revalidatePath('/home'); // ホーム画面のキャッシュをクリア
  return { error: null };
}

/**
 * is_attentionがtrueの掲示が存在するかどうかをチェックする
 */
export async function checkAttentionPosts(): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  // ▼▼▼ ここからが修正箇所です ▼▼▼
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true }) 
    .eq('is_attention', true)

  if (error) {
    console.error("Error checking attention posts:", error.message);
    return false;
  }

  return (count ?? 0) > 0;
  // ▲▲▲ ここまで修正 ▲▲▲
}