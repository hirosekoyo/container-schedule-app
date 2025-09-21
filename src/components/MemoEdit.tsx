"use client";

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { updateDailyReportMemo } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';


interface MemoEditProps {
  initialMemo: string | null;
  reportDate: string;
  isPrintView?: boolean;
}

export function MemoEdit({ initialMemo, reportDate, isPrintView = false }: MemoEditProps) {
  const [memo, setMemo] = useState(initialMemo || '');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const handleSave = () => {
    startTransition(async () => {
      const { error } = await updateDailyReportMemo(reportDate, memo);
      if (error) {
        alert(`メモの保存中にエラーが発生しました: ${error.message}`);
      }
    });
  };
  

  if (isPrintView) {
    // --- 【ここからが修正箇所】 ---
    return (
      <div className="flex flex-col h-full">
        {/* 上段: メモ */}
        <div className="flex-grow overflow-hidden">
          <h3 className="text-lg font-semibold border-b mb-1 flex-shrink-0">メモ</h3>
          <p className="text-sm whitespace-pre-wrap">{initialMemo || ''}</p>
        </div>
      </div>
    );
    // --- 【ここまで】 ---
  }

  // --- 通常表示のレイアウト (変更なし) ---
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="daily-memo" className="text-lg font-semibold">
          メモ
        </Label>
        <Textarea
          id="daily-memo"
          placeholder="この日の特記事項などを入力..."
          rows={5}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? '保存中...' : 'メモを保存'}
        </Button>
      </div>
    </div>
  );
}