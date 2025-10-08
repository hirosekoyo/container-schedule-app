import { getOverallLatestUpdate } from "@/lib/supabase/actions";
import { ImportClient } from "./ImportClient"; // 新しく作成したクライアントコンポーネント

export default async function ImportPage() {
  // サーバーサイドで最新の更新日時を取得
  const latestUpdateTime = await getOverallLatestUpdate();

  return (
    <ImportClient latestUpdateTime={latestUpdateTime} />
  );
}