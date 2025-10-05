"use client";

import React, { useState, useEffect, useRef } from 'react';
import { DateNavigator } from '@/components/DateNavigator';
import type { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import { MobileGanttChart } from './MobileGanttChart';
import { useRouter } from 'next/navigation';
import { AnchorInfoModal } from './AnchorInfoModal';
import { Button } from './ui/button';
// ▼▼▼ 変更点1: Rulerアイコンをインポート ▼▼▼
import { Anchor, Ruler } from 'lucide-react';
import { format, toDate } from 'date-fns-tz';

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
  const [isAnchorModalOpen, setIsAnchorModalOpen] = useState(false);
  
  // ▼▼▼ 変更点2: モード管理用のstateを追加 ▼▼▼
  const [mode, setMode] = useState<'info' | 'distance'>('info');

  const mainAreaRef = useRef<HTMLElement>(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const mainElement = mainAreaRef.current;
    if (!mainElement) return;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        setViewSize({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    resizeObserver.observe(mainElement);
    return () => resizeObserver.unobserve(mainElement);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [router]);

  // ▼▼▼ 変更点2: 最新の更新時刻を計算・フォーマットするロジックを追加 ▼▼▼
  const getLatestUpdateTime = () => {
    if (!initialSchedules || initialSchedules.length === 0) {
      return null;
    }

    // すべてのupdated_atをDateオブジェクトに変換して比較し、最新のものを探す
    const latestUpdate = initialSchedules.reduce((latest, current) => {
      // updated_atがnullでないものだけを対象にする
      if (!current.updated_at) return latest;
      const latestDate = latest ? new Date(latest) : new Date(0);
      const currentDate = new Date(current.updated_at);
      return currentDate > latestDate ? current.updated_at : latest;
    }, null as string | null);

    if (!latestUpdate) {
      return null;
    }
    
    // UTCのタイムスタンプを日本時間のDateオブジェクトに変換
    const dateInTokyo = toDate(latestUpdate, { timeZone: 'Asia/Tokyo' });
    // 指定のフォーマットに変換
    return format(dateInTokyo, 'MM/dd HH:mm');
  };

  const latestUpdateTime = getLatestUpdateTime();

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b flex-shrink-0">
        {/* ▼▼▼ 変更点: ヘッダーのレイアウト構造を修正 ▼▼▼ */}
        <div className="mt-4 flex flex-col gap-2">
          {/* 1行目: 最終更新時刻 */}
          {latestUpdateTime && (
            <p className="text-left text-[10px] text-gray-500">
              最終更新: {latestUpdateTime}
            </p>
          )}
          {/* 2行目: ナビゲーターとボタン */}
          <div className="flex items-center gap-2">
            <div className="flex-grow"><DateNavigator currentDate={date} basePath="/mobile" /></div>
            <Button 
              variant={mode === 'distance' ? 'default' : 'outline'} 
              size="icon" 
              onClick={() => setMode(prev => prev === 'info' ? 'distance' : 'info')}
              className="flex-shrink-0"
            >
              <Ruler className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsAnchorModalOpen(true)} className="flex-shrink-0"><Anchor className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main ref={mainAreaRef} className="flex-1 overflow-hidden">
        {viewSize.width > 0 && (
          <MobileGanttChart 
            schedules={initialSchedules}
            baseDate={date}
            viewSize={viewSize}
            mode={mode} // modeをpropとして渡す
          />
        )}
      </main>
      
      <AnchorInfoModal open={isAnchorModalOpen} onOpenChange={setIsAnchorModalOpen} />
    </div>
  );
}