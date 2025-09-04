"use client"; // 1. Client Component に変換

import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useState, useEffect, useRef } from 'react'; // 2. 必要なフックをインポート

// --- 型定義と定数は変更なし ---
interface GanttChartProps {
  schedules: ScheduleWithOperations[];
  baseDate: string;
}
const CHART_START_HOUR = 0;
const CHART_END_HOUR = 26;
const TOTAL_CHART_HOURS = CHART_END_HOUR - CHART_START_HOUR;
const CHART_START_BIT = 33;
const CHART_END_BIT = 64;
const BIT_LENGTH_M = 30;
// const BIT_WIDTH_PX = 56; // ← 固定値は不要になるので削除

// calculateBarRange関数は変更なし
const calculateBarRange = (schedule: ScheduleWithOperations, baseDateStr: string) => {
  const arrival = new Date(schedule.arrival_time);
  const departure = new Date(schedule.departure_time);
  const baseDate = new Date(`${baseDateStr}T00:00:00Z`);
  const isArrivalDay = arrival.getUTCFullYear() === baseDate.getUTCFullYear() && arrival.getUTCMonth() === baseDate.getUTCMonth() && arrival.getUTCDate() === baseDate.getUTCDate();
  const nextDay = new Date(baseDate);
  nextDay.setUTCDate(baseDate.getUTCDate() + 1);
  const isDepartureNextDay = departure.getUTCFullYear() === nextDay.getUTCFullYear() && departure.getUTCMonth() === nextDay.getUTCMonth() && departure.getUTCDate() === nextDay.getUTCDate();
  const startHour = isArrivalDay ? (arrival.getUTCHours() + arrival.getUTCMinutes() / 60) : 0;
  let endHour: number;
  if (isDepartureNextDay) {
    endHour = 24 + (departure.getUTCHours() + departure.getUTCMinutes() / 60);
  } else if (departure > nextDay) {
    endHour = CHART_END_HOUR;
  } else {
    endHour = departure.getUTCHours() + departure.getUTCMinutes() / 60;
  }
  return { startHour, endHour: Math.min(endHour, CHART_END_HOUR) };
};

const GanttChart: React.FC<GanttChartProps> = ({ schedules, baseDate }) => {
  const timeLabels = Array.from({ length: TOTAL_CHART_HOURS / 2 + 1 }, (_, i) => {
    const hour = CHART_START_HOUR + i * 2;
    if (hour >= 26) return hour - 24;
    return hour;
  });
  const bitLabels = Array.from({ length: CHART_END_BIT - CHART_START_BIT + 1 }, (_, i) => CHART_START_BIT + i);
  
  // --- 【ここからが新設/修正箇所】 ---
  const graphAreaRef = useRef<HTMLDivElement>(null);
  const [graphAreaWidth, setGraphAreaWidth] = useState(0);

  useEffect(() => {
    const graphElement = graphAreaRef.current;
    if (!graphElement) return;

    // ResizeObserverで要素の幅を監視
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        setGraphAreaWidth(entries[0].contentRect.width);
      }
    });
    resizeObserver.observe(graphElement);
    return () => resizeObserver.unobserve(graphElement); // クリーンアップ
  }, []);

  // 動的なビット幅を計算
  const numberOfBits = CHART_END_BIT - CHART_START_BIT + 1;
  const dynamicBitWidth = graphAreaWidth > 0 ? graphAreaWidth / numberOfBits : 0;

  return (
    // CSS Gridレイアウトはそのまま活用
    <div
      className="grid h-full w-full font-sans"
      style={{
        gridTemplateColumns: '2rem 1fr',
        gridTemplateRows: '2rem 1fr',
      }}
    >
      <div></div>
      {/* 横軸ラベル */}
      <div className="relative">
        {bitLabels.map((label, i) => (
          <div
            key={`bit-label-${i}`}
            className="absolute -translate-x-1/2 text-sm font-semibold text-gray-700"
            style={{ left: i * dynamicBitWidth }} // ← 動的な幅を使用
          >
            {label}
          </div>
        ))}
      </div>
      {/* 縦軸ラベル */}
      <div className="relative">
        {timeLabels.map((label, i) => (
          <div
            key={`time-label-${i}`}
            className="absolute w-full -translate-y-1/2 pr-2 text-right text-xs text-gray-500"
            style={{ top: `${(i * 2 / TOTAL_CHART_HOURS) * 100}%` }}
          >
            {label}
          </div>
        ))}
      </div>
      {/* グラフ本体 */}
      <div ref={graphAreaRef} className="relative h-full w-full">
        {/* 背景グリッド */}
        <div className="absolute inset-0">
          {timeLabels.map((_, i) => ( <div key={`h-line-${i}`} className="absolute w-full border-t border-gray-200" style={{ top: `${(i * 2 / TOTAL_CHART_HOURS) * 100}%` }} /> ))}
          {bitLabels.map((_, i) => ( <div key={`v-line-${i}`} className="absolute h-full border-l border-gray-200" style={{ left: i * dynamicBitWidth }} /> ))}
        </div>
        
        {/* 船舶ブロック */}
        {graphAreaWidth > 0 && schedules.map((schedule) => {
          const { startHour, endHour } = calculateBarRange(schedule, baseDate);
          if (endHour <= startHour) return null;
          const topPercent = (startHour / TOTAL_CHART_HOURS) * 100;
          const heightPercent = ((endHour - startHour) / TOTAL_CHART_HOURS) * 100;
          const left_m = Math.min(Number(schedule.bow_position_m), Number(schedule.stern_position_m));
          const width_m = Math.abs(Number(schedule.bow_position_m) - Number(schedule.stern_position_m));
          
          // 位置と幅も動的なビット幅で計算
          const left = ((left_m / BIT_LENGTH_M) - CHART_START_BIT) * dynamicBitWidth;
          const width = (width_m / BIT_LENGTH_M) * dynamicBitWidth;

          return (
            <div key={`${schedule.id}-${schedule.schedule_date}`} className="absolute flex items-center justify-center rounded-md border bg-sky-100 p-1 text-sky-800 shadow-sm" style={{ top: `${topPercent}%`, height: `${heightPercent}%`, left: `${left}px`, width: `${width}px` }}>
              <div className="flex w-full items-center justify-between gap-1 text-xs font-bold md:text-sm">
                {schedule.arrival_side === '左舷' ? ( <><span>←</span><span className="truncate">{schedule.ship_name}</span></> ) : 
                 schedule.arrival_side === '右舷' ? ( <><span className="truncate">{schedule.ship_name}</span><span>→</span></> ) : 
                 ( <span className="truncate">{schedule.ship_name}</span> )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GanttChart;