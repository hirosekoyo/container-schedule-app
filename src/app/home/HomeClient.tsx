"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, CalendarPlus, Upload, Ship, BookUser } from 'lucide-react';
import { PostsBoard } from '@/components/PostsBoard';
import type { Post } from '@/lib/supabase/actions';

interface HomeClientProps {
  initialPosts: Post[];
}

/**
 * Dateオブジェクトを 'YYYY-MM-DD' 形式の文字列に変換するヘルパー関数
 */
const formatDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export function HomeClient({ initialPosts }: HomeClientProps) {
  const router = useRouter();

  const handleGoToTomorrow = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowDateString = formatDate(tomorrow);
    router.push(`/dashboard/${tomorrowDateString}`);
  };

  const cardBaseClass = "transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1.5";

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-sky-100 to-gray-50 p-8">
      {/* ▼▼▼ 変更点1: ここのmax-wを基準にする ▼▼▼ */}
      <div className="w-full max-w-4xl space-y-12">
        <header className="text-center">
          <Ship className="mx-auto h-12 w-12 text-blue-500" strokeWidth={1.5} />
          <h1 className="mt-4 text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-sky-400 bg-clip-text text-transparent sm:text-5xl">
            動静表作成ツール
          </h1>
        </header>

        <main className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          <Card className={cardBaseClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <CalendarPlus className="h-6 w-6 text-blue-500" />
                明日の動静表 (IC)
              </CardTitle>
              <CardDescription>
                スケジュールをガントチャートとテーブルで確認・編集します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full" onClick={handleGoToTomorrow}>
                動静表を開く
              </Button>
            </CardContent>
          </Card>

          <Card className={cardBaseClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <Upload className="h-6 w-6 text-blue-500" />
                船舶予定のインポート (IC)
              </CardTitle>
              <CardDescription>
                テキストデータを貼り付けて、予定を一括で登録・更新します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/dashboard/import">インポート画面へ</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className={cardBaseClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <ExternalLink className="h-6 w-6 text-blue-500" />
                PORT OF HAKATA
              </CardTitle>
              <CardDescription>
                最新の船舶動静を公式サイトで確認します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a 
                href="https://www.hktport.city.fukuoka.lg.jp/hpplsql/senpaku00" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="secondary" className="w-full">PORT OF HAKATAへ</Button>
              </a>
            </CardContent>
          </Card>

          <Card className={cardBaseClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <BookUser className="h-6 w-6 text-blue-500" />
                使い方ガイド
              </CardTitle>
              <CardDescription>
                ツールの操作方法や便利な機能を確認します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href="/pdf/how_to_use.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="secondary" className="w-full">使い方を見る</Button>
              </a>
            </CardContent>
          </Card>
        </main>
        
        <section id="board" className="pt-8 border-t scroll-mt-20">
          <PostsBoard initialPosts={initialPosts} />
        </section>
      </div>
    </div>
  );
}