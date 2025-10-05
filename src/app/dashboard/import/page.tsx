"use client";

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { parseMultipleSchedules } from '@/lib/parser';
import { importMultipleSchedules, resetScheduleData } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { AlertCircle, ClipboardPaste, Upload, ChevronRight, CheckCircle2, ArrowLeft } from "lucide-react";

/**
 * Dateオブジェクトを 'YYYY-MM-DD' 形式の文字列に変換するヘルパー関数
 */
const formatDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function ImportPage() {
  const [textInput, setTextInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();

  const tomorrow = new Date();
  tomorrow.setDate(new Date().getDate() + 1);
  const tomorrowDateString = formatDate(tomorrow);

  const handleSubmit = () => {
    setMessage(null);
    const importId = `imp-${Date.now()}`;
    const currentYear = new Date().getFullYear();
    
    // ▼▼▼ ここを修正 ▼▼▼
    const parsedData = parseMultipleSchedules(textInput, currentYear, importId, 'IC');
    // ▲▲▲ ここまで修正 ▲▲▲

    if (parsedData.length === 0) {
      setMessage({ type: 'error', text: '解析できるデータがありませんでした。テキストの形式を確認してください。' });
      return;
    }

    startTransition(async () => {
      const { data, error } = await importMultipleSchedules(parsedData);
      if (error) {
        setMessage({ type: 'error', text: `エラーが発生しました: ${error.message}` });
      } else {
        // @ts-ignore
        const { updated_count = 0, inserted_count = 0 } = data?.[0] || {};
        setMessage({ type: 'success', text: `登録が完了しました。新規: ${inserted_count}件, 更新: ${updated_count}件` });
        setTextInput('');
        router.push(`/dashboard/${tomorrowDateString}?importId=${importId}`);
      }
    });
  };

  const handleReset = () => {
    setMessage(null);
    if (window.confirm("本当にすべてのスケジュールデータと、昨日以前の当直データを削除しますか？\nこの操作は元に戻すことができません。")) {
      startResetTransition(async () => {
        const { error } = await resetScheduleData();
        if (error) {
          setMessage({ type: 'error', text: `リセット処理中にエラーが発生しました: ${error.message}` });
        } else {
          setMessage({ type: 'success', text: 'すべてのスケジュールデータが正常にリセットされました。' });
        }
      });
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTextInput(text);
        setMessage({ type: 'success', text: 'クリップボードからテキストを貼り付けました。' });
      } else {
        setMessage({ type: 'error', text: 'クリップボードにテキストがありません。' });
      }
    } catch (err) {
      console.error('クリップボードの読み取りに失敗しました: ', err);
      setMessage({ type: 'error', text: 'クリップボードへのアクセスに失敗しました。ブラウザの権限設定を確認してください。' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl space-y-8">
        <header className="flex justify-between items-center">
          <div className="text-center flex-grow">
            <Upload className="mx-auto h-12 w-12 text-blue-500" strokeWidth={1.5} />
            <h1 className="mt-4 text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-sky-400 bg-clip-text text-transparent sm:text-4xl">
              船舶予定 一括インポート
            </h1>
            <p className="mt-2 text-muted-foreground">
              テキストデータを貼り付けて、予定を一括で登録・更新します。
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </header>

        <Collapsible className="rounded-lg border border-destructive/50 bg-destructive/10 px-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between py-3 font-semibold text-destructive">
            <span>データリセット : 新規作成時のみ実行してください。（土日や連休中は行わない！）</span>
            <ChevronRight className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pb-4">
            <p className="text-sm text-destructive/90 mb-4">
              すべての船舶予定と、昨日以前の当直データを完全に削除します。この操作は元に戻せません。
            </p>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleReset}
              disabled={isPending || isResetting}
            >
              {isResetting ? 'リセット中...' : 'リセット実行'}
            </Button>
          </CollapsibleContent>
        </Collapsible>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>貼り付けエリア</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handlePasteFromClipboard}>
                <ClipboardPaste className="mr-2 h-4 w-4" />
                クリップボードから貼り付け
              </Button>
            </div>
            <CardDescription>
              手動で貼り付けるか、ボタンを使用してクリップボードの内容を挿入してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="import-text"
              className="h-96 min-h-[300px] font-mono text-sm focus-visible:ring-blue-400"
              placeholder={"貼り付け例" +
                "\n" +
                "\n45MSC RICCARDA II入港予定09/26 03:45" +
                "\n09/29 04:45～09/29 15:00" +
                "\n全長180.35　m" +
                "\n綱位置(首-尾)(48～56)" +
                "\n船尾ビット55+5m" +
                "\n代理店ホームリンガ商会" +
                "\n荷役会社上組" +
                "\n揚荷G.C." +
                "\n積荷G.C...."
              }
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <Button
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={isPending || isResetting || !textInput.trim()}
            >
              {isPending ? '登録処理中...' : `一括登録を実行する`}
            </Button>
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'border-green-300 bg-green-50' : ''}>
                {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle className={message.type === 'success' ? 'text-green-800' : ''}>
                  {message.type === 'error' ? 'エラー' : '情報'}
                </AlertTitle>
                <AlertDescription className={message.type === 'success' ? 'text-green-700' : ''}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}