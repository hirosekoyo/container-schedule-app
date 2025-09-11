"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { updateDailyReportMemo } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';

interface MemoEditProps {
  initialMemo: string | null;
  reportDate: string;
}

export function MemoEdit({ initialMemo, reportDate }: MemoEditProps) {
  const [memo, setMemo] = useState(initialMemo || '');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // 親から渡される初期値が変更されたら、stateにも反映
  useEffect(() => {
    setMemo(initialMemo || '');
  }, [initialMemo]);

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await updateDailyReportMemo(reportDate, memo);
      if (error) {
        alert(`メモの保存中にエラーが発生しました: ${error.message}`);
      } else {
        alert('メモが保存されました。');
        // router.refresh(); // revalidatePathがサーバー側で実行されるので不要な場合が多い
      }
    });
  };

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