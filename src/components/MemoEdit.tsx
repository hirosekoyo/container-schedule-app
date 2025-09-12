"use client";

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { updateDailyReportMemo } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

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
  
  // 印刷用の表データを定義
  const limitData = [
    { crane: 'IC-1', right: '40ft:35+1\n20ft:35+4', left: '?' },
    { crane: 'IC-2', right: '40ft:36+1\n20ft:36+4', left: '?' },
    { crane: 'IC-3', right: 'IC-2横', left: '右脚56±00' },
    { crane: 'IC-4', right: '左脚38±00', left: '右脚61±00' },
    { crane: 'IC-5', right: '左脚45±00', left: '40ft:63-9\n20ft:63-6' },
    { crane: 'IC-6', right: '左脚47-15', left: '40ft:64-7\n20ft:64-10' },
  ];

  if (isPrintView) {
    // --- 【ここからが修正箇所】 ---
    return (
      <div className="flex flex-col h-full">
        {/* 上段: メモ */}
        <div className="flex-grow overflow-hidden">
          <h3 className="text-lg font-semibold border-b mb-1 flex-shrink-0">メモ</h3>
          <p className="text-sm whitespace-pre-wrap">{initialMemo || ''}</p>
        </div>
        {/* 下段: 新しい横長の表 */}
        <div className="flex-shrink-0 mt-2">
          <Table className="border text-[7pt]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[15%] px-1 py-0 h-4 text-center"></TableHead>
                {limitData.map(col => (
                  <TableHead key={col.crane} className="text-center px-1 py-0 h-4">{col.crane}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold text-center px-1 py-0 h-4">左極限</TableCell>
                {limitData.map(col => (
                  <TableCell key={`${col.crane}-right`} className="text-center px-1 py-0 h-4 whitespace-pre-wrap">{col.right}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold text-center px-1 py-0 h-4">右極限</TableCell>
                {limitData.map(col => (
                  <TableCell key={`${col.crane}-left`} className="text-center px-1 py-0 h-4 whitespace-pre-wrap">{col.left}</TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
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