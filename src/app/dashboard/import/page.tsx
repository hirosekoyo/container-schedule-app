"use client";

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseMultipleSchedules } from '@/lib/parser';
import { importMultipleSchedules, resetScheduleData } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ClipboardPaste } from "lucide-react"; // ClipboardPasteアイコンをインポート

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
    if (window.confirm("本当にすべてのスケジュールデータと、昨日以前の当直データ等を削除しますか？\nこの操作は元に戻すことができません。")) {
      startResetTransition(async () => {
        const { error } = await resetScheduleData();
        if (error) {
          setMessage(`リセット処理中にエラーが発生しました: ${error.message}`);
        } else {
          setMessage('すべてのスケジュールデータが正常にリセットされました。');
        }
      });
    }
  };

  // --- 【ここからが新設箇所】 ---
  /**
   * クリップボードからテキストを読み取り、Textareaに貼り付ける
   */
  const handlePasteFromClipboard = async () => {
    try {
      // ブラウザのクリップボードAPIを呼び出す
      const text = await navigator.clipboard.readText();
      if (text) {
        setTextInput(text);
        setMessage('クリップボードからテキストを貼り付けました。');
      } else {
        setMessage('クリップボードにテキストがありません。');
      }
    } catch (err) {
      console.error('クリップボードの読み取りに失敗しました: ', err);
      setMessage('クリップボードへのアクセスに失敗しました。ブラウザの権限設定を確認してください。');
    }
  };
  // --- 【ここまで】 ---
  
  const todayDateString = formatDate(new Date());

  return (
    <div className="container mx-auto max-w-4xl p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">船舶予定 一括インポート</h1>
          <p className="text-muted-foreground mt-2">
            船舶予定テキストを貼り付けて、データベースへ一括登録します。
          </p>
        </div>
        {/* --- 【ここからが修正箇所】 --- */}
        <Button onClick={() => router.push(`/dashboard/${tomorrowDateString}`)}>
          明日の動静表を確認する
        </Button>
        {/* --- 【ここまで】 --- */}
      </div>
      
      <div className="border-t pt-6 mt-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>データのリセット</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <div>
              <p>予定を新規作成するときに実行してください。<br />
              ※土日や連休期間中で複数日作成しているときは実行注意！<br />
              すべての船舶予定と、昨日以前の当直データ等を完全に削除します。<br />
              この操作は元に戻すことができませんので、ご注意ください。</p>
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

      <div className="space-y-2">
        {/* --- 【ここからが修正箇所】 --- */}
        <div className="flex justify-between items-end">
          <Label htmlFor="import-text" className="text-lg">
            貼り付けエリア
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={handlePasteFromClipboard}>
            <ClipboardPaste className="mr-2 h-4 w-4" />
            クリップボードから貼り付け
          </Button>
        </div>
        {/* --- 【ここまで】 --- */}
        <Textarea
          id="import-text"
          className="h-96 min-h-[300px] font-mono text-sm"
          placeholder="ここにテキストデータを手動で貼り付けるか、上のボタンを使用してください。"
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

    </div>
  );
}