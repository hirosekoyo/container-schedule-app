"use client";

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseMultipleSchedules } from '@/lib/parser';
import { importMultipleSchedules, resetScheduleData } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// --- 【ここからが新設箇所】 ---
/**
 * Dateオブジェクトを 'YYYY-MM-DD' 形式の文字列に変換するヘルパー関数
 * @param date - 変換対象のDateオブジェクト
 * @returns 'YYYY-MM-DD' 形式の文字列
 */
const formatDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

// 新しいヘルパー関数を使って、明日の日付を'YYYY-MM-DD'形式に変換
const tomorrowDateString = formatDate(tomorrow);

export default function ImportPage() {
  const [textInput, setTextInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();
  const [message, setMessage] = useState('');
  const router = useRouter();
  
  const handleSubmit = () => {
    setMessage('');
    
    const importId = `imp-${Date.now()}`;
    const currentYear = new Date().getFullYear();
    
    const parsedData = parseMultipleSchedules(textInput, currentYear, importId);

    if (parsedData.length === 0) {
      setMessage('解析できるデータがありませんでした。テキストの形式を確認してください。');
      return;
    }

    startTransition(async () => {
      const { data, error } = await importMultipleSchedules(parsedData);
      
      if (error) {
        setMessage(`エラーが発生しました: ${error.message}`);
      } else {
        // @ts-ignore
        const { updated_count = 0, inserted_count = 0 } = data?.[0] || {};
        setMessage(`登録が完了しました。新規: ${inserted_count}件, 更新: ${updated_count}件`);
        setTextInput('');
        
        router.push(`/dashboard/${tomorrowDateString}?importId=${importId}`);
      }
    });
  };

  const handleReset = () => {
    setMessage('');
    if (window.confirm("本当にすべてのスケジュールデータと、昨日以前の日次レポートを削除しますか？\nこの操作は元に戻すことができません。")) {
      startResetTransition(async () => {
        const { error } = await resetScheduleData();
        if (error) {
          setMessage(`リセット処理中にエラーが発生しました: ${error.message}`);
        } else {
          setMessage('すべてのスケジュールデータと過去の日次レポートが正常にリセットされました。');
        }
      });
    }
  };


  return (
    <div className="container mx-auto max-w-4xl p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">船舶予定 一括インポート</h1>
          <p className="text-muted-foreground mt-2">
            複数日の船舶予定テキストを貼り付けて、データベースへ一括登録します。
          </p>
        </div>
        {/* --- 【ここからが修正箇所】 --- */}
        <Button onClick={() => router.push(`/dashboard/${tomorrowDateString}`)}>
          ダッシュボードに戻る
        </Button>
        {/* --- 【ここまで】 --- */}
      </div>

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
        disabled={isPending || isResetting}
      >
        {isPending ? '登録処理中...' : `一括登録を実行する`}
      </Button>
      
      {message && (
        <div className={`p-4 rounded-md ${message.includes('エラー') ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'}`}>
          {message}
        </div>
      )}

      <div className="border-t pt-6 mt-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>データのリセット</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <div>
              <p>すべての船舶予定と、昨日以前の日次レポートを完全に削除します。<br />この操作は元に戻すことができませんので、ご注意ください。</p>
            </div>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isPending || isResetting}
            >
              {isResetting ? 'リセット中...' : 'リセット実行'}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}