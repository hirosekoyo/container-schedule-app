"use client"; // useRouter を使うためクライアントコンポーネントにします

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, CalendarPlus, Upload } from 'lucide-react';

/**
 * Dateオブジェクトを 'YYYY-MM-DD' 形式の文字列に変換するヘルパー関数
 */
const formatDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function HomePage() {
  const router = useRouter();

  const handleGoToTomorrow = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowDateString = formatDate(tomorrow);
    router.push(`/dashboard/${tomorrowDateString}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            コンテナ船荷役予定管理システム
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            日々の船舶動静と荷役予定を効率的に管理します。
          </p>
        </header>

        <main className="grid grid-cols-1 gap-6">
          {/* 1. PORT OF HAKATA への外部リンク */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                PORT OF HAKATA
              </CardTitle>
              <CardDescription>
                博多港の公式サイトで最新の船舶動静を確認します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a 
                href="https://www.hktport.city.fukuoka.lg.jp/hpplsql/senpaku00" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button className="w-full">公式サイトへ移動</Button>
              </a>
            </CardContent>
          </Card>

          {/* 2. 明日の動静表へ移動 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarPlus className="h-5 w-5" />
                明日の動静表 (IC)
              </CardTitle>
              <CardDescription>
                明日のスケジュールをガントチャートとテーブルで確認・編集します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={handleGoToTomorrow}>
                明日の動静表へ
              </Button>
            </CardContent>
          </Card>

          {/* 3. 船舶予定のインポートへ移動 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                船舶予定のインポート (IC)
              </CardTitle>
              <CardDescription>
                複数日分のテキストデータを貼り付けて、予定を一括で登録・更新します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/dashboard/import">インポート画面へ</Link>
              </Button>
            </CardContent>
          </Card>

          {/* 4. 使い方のキャンばへのリンク */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                使い方
              </CardTitle>
              <CardDescription>
                使い方ガイドを確認します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a 
                href="https://www.hktport.city.fukuoka.lg.jp/hpplsql/senpaku00" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button className="w-full">公式サイトへ移動</Button>
              </a>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}