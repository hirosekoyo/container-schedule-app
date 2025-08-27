"use client";

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseMultipleSchedules } from '@/lib/parser';
import { createMultipleSchedules } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';

export default function ImportPage() {
  const [textInput, setTextInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const router = useRouter();
  
  const handleSubmit = () => {
    setMessage('');
    
    // 現在の年を基準年としてパーサーに渡す
    const currentYear = new Date().getFullYear();
    
    // 1. テキストを解析
    const parsedData = parseMultipleSchedules(textInput, currentYear);

    if (parsedData.length === 0) {
      setMessage('解析できるデータがありませんでした。テキストの形式を確認してください。');
      return;
    }

    // 2. 解析データをサーバーアクションに渡して一括登録
    startTransition(async () => {
      const { data, error } = await createMultipleSchedules(parsedData);
      
      if (error) {
        setMessage(`エラーが発生しました: ${error.message}`);
      } else {
        setMessage(`登録が完了しました。${data?.length || 0}件の予定が作成されました。`);
        setTextInput(''); // テキストエリアをクリア
        // 成功したらメインのダッシュボードに遷移
        router.push(`/dashboard/${new Date().toISOString().split('T')[0]}`);
      }
    });
  };

  return (
    <div className="container mx-auto max-w-4xl p-8 space-y-6">
      <h1 className="text-3xl font-bold">船舶予定 一括インポート</h1>
      <p className="text-muted-foreground">
        複数日（10日分など）の船舶予定テキストをまとめて貼り付けて、一度にデータベースへ登録します。<br />
        船の情報は、空行で区切ってください。
      </p>

      <div className="space-y-2">
        <Label htmlFor="import-text" className="text-lg">
          貼り付けエリア
        </Label>
        <Textarea
          id="import-text"
          className="h-96 min-h-[300px] font-mono text-sm"
          placeholder="SITC MOJI&#10;08/25 07:30 ～ 08/25 20:00&#10;全長 143.20 m&#10;...&#10;&#10;（空行）&#10;&#10;HANSA MAGDEBURG&#10;08/26 08:00 ～ 08/26 17:00&#10;..."
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