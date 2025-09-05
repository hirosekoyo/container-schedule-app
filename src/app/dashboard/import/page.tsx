"use client";

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseMultipleSchedules } from '@/lib/parser';
import { importMultipleSchedules } from '@/lib/supabase/actions'; // 1. 呼び出す関数を変更
import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';

export default function ImportPage() {
  const [textInput, setTextInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const router = useRouter();
  
  const handleSubmit = () => {
    setMessage('');
    
    // 2. ユニークなインポートIDを生成
    const importId = `imp-${Date.now()}`;
    const currentYear = new Date().getFullYear();
    
    // 3. テキストを解析 (importIdを渡す)
    const parsedData = parseMultipleSchedules(textInput, currentYear, importId);

    if (parsedData.length === 0) {
      setMessage('解析できるデータがありませんでした。テキストの形式を確認してください。');
      return;
    }

    startTransition(async () => {
      // 4. 新しいサーバーアクションを呼び出す
      const { data, error } = await importMultipleSchedules(parsedData);
      
      if (error) {
        setMessage(`エラーが発生しました: ${error.message}`);
      } else {
        // 5. 処理結果のメッセージをDB関数の戻り値から生成
        // @ts-ignore: rpcの戻り値の型が複雑なため一時的にignore
        const { updated_count = 0, inserted_count = 0 } = data?.[0] || {};
        setMessage(`登録が完了しました。新規: ${inserted_count}件, 更新: ${updated_count}件`);
        setTextInput('');
        
        // 1. 今日の日付を取得
        const today = new Date();
        // 2. 明日の日付を計算
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        // 3. 'YYYY-MM-DD' 形式の文字列に変換
        const tomorrowDateString = tomorrow.toISOString().split('T')[0];
        
        // 4. 明日の日付のダッシュボードに、importIdを付けてリダイレクト
        router.push(`/dashboard/${tomorrowDateString}?importId=${importId}`);
      }
    });
  };

  return (
    <div className="container mx-auto max-w-4xl p-8 space-y-6">
      <h1 className="text-3xl font-bold">船舶予定 一括インポート</h1>
      <p className="text-muted-foreground">
        複数日（10日分など）の船舶予定テキストをまとめて貼り付けて、一度にデータベースへ登録します。<br />
        船の情報は、「連絡先」の行で区切られます。
      </p>

      <div className="space-y-2">
        <Label htmlFor="import-text" className="text-lg">
          貼り付けエリア
        </Label>
        <Textarea
          id="import-text"
          className="h-96 min-h-[300px] font-mono text-sm"
          placeholder="22	DONGJIN FIDES&#10;入港予定	09/06 05:00&#10;09/06 06:00	～	09/06 16:30&#10;...&#10;連絡先	沖、橋本　663-3210&#10;23	◆　WAN HAI 289&#10;..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={isPending}
      >
        {isPending ? '登録処理中...' : `一括登録を実行する`}
      </Button>
      
      {message && (
        <div className={`p-4 rounded-md ${message.includes('エラー') ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'}`}>
          {message}
        </div>
      )}
    </div>
  );
}