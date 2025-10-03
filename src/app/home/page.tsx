import { getPosts } from '@/lib/supabase/actions';
import { HomeClient } from './HomeClient'; // 新しく作成したクライアントコンポーネントをインポート

export default async function HomePage() {
  // サーバーサイドで掲示データを取得
  const posts = await getPosts();

  return (
    <HomeClient initialPosts={posts} />
  );
}