"use client";

import React, { useState, useEffect } from 'react'; // useEffectをインポート
import { DateNavigator } from '@/components/DateNavigator';
import type { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import { MobileGanttChart } from './MobileGanttChart';
import { useRouter } from 'next/navigation'; // useRouterをインポート

interface MobileViewClientProps {
  initialReport: DailyReport | null;
  initialSchedules: ScheduleWithOperations[];
  date: string;
}

export function MobileViewClient({
  initialReport,
  initialSchedules,
  date,
}: MobileViewClientProps) {
  const router = useRouter();

  // --- 【ここからが新設箇所】 ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      // ページが非表示から表示に切り替わったとき
      if (document.visibilityState === 'visible') {
        console.log("Tab is active again, refreshing data...");
        // サーバーから最新のデータを再取得してページを再レンダリングする
        router.refresh();
      }
    };

    // イベントリスナーを登録
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // コンポーネントがアンマウントされるときにイベントリスナーを解除
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]); // 依存配列にrouterを追加
  // --- 【ここまで】 ---


  const displayDate = new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  return (
    <>
      <header className="p-4 border-b">
        {/* <h1 className="text-xl font-bold text-center">{displayDate}</h1>
        <p className="text-sm text-center text-gray-600">
          当直: {initialReport?.primary_staff || '-'}, {initialReport?.secondary_staff || '-'}
        </p> */}
        <div className="mt-4">
          <DateNavigator 
            currentDate={date} 
            basePath="/mobile"
          />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <MobileGanttChart 
          schedules={initialSchedules}
          baseDate={date}
        />
      </main>
    </>
  );
}