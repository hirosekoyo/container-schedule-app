"use client";

import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useState, useEffect, useRef } from 'react';

interface GanttChartProps {
  schedules: ScheduleWithOperations[];
  baseDate: string;
  latestImportId: string | null;
}
const CHART_START_HOUR = 0;
const CHART_END_HOUR = 26;
const TOTAL_CHART_HOURS = CHART_END_HOUR - CHART_START_HOUR;
const CHART_START_BIT = 33;
const CHART_END_BIT = 64;
const BIT_LENGTH_M = 30;

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

const GanttChart: React.FC<GanttChartProps> = ({ schedules, baseDate, latestImportId }) => {
  const timeLabels = Array.from({ length: TOTAL_CHART_HOURS / 2 + 1 }, (_, i) => {
    const hour = CHART_START_HOUR + i * 2;
    if (hour >= 26) return hour - 24;
    return hour;
  });
  const bitLabels = Array.from({ length: CHART_END_BIT - CHART_START_BIT + 1 }, (_, i) => CHART_START_BIT + i);
  
  const graphAreaRef = useRef<HTMLDivElement>(null);
  const [graphAreaWidth, setGraphAreaWidth] = useState(0);

  useEffect(() => {
    const graphElement = graphAreaRef.current;
    if (!graphElement) return;
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) setGraphAreaWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(graphElement);
    return () => resizeObserver.unobserve(graphElement);
  }, []);

  const numberOfBits = CHART_END_BIT - CHART_START_BIT + 1;
  const dynamicBitWidth = graphAreaWidth > 0 ? graphAreaWidth / numberOfBits : 0;

  const craneStops = [
    { id: 1, text: '1', position: 35.5 }, { id: 2, text: '2', position: 39.0 },
    { id: 3, text: '3', position: 40.0 }, { id: 4, text: '4', position: 44.5 },
    { id: 5, text: '5', position: 48.5 }, { id: 6, text: '6', position: 51.5 },
    { id: 7, text: '7', position: 52.5 }, { id: 8, text: '8', position: 55.5 },
    { id: 9, text: '9', position: 60.5 }, { id: 10, text: '10', position: 63.5 },
  ];

  return (
    <div className="grid h-full w-full font-sans" style={{ gridTemplateColumns: '2rem 1fr', gridTemplateRows: '2rem 1fr' }}>
      <div></div>
      <div className="relative">
        {bitLabels.map((label, i) => (
          <div key={`bit-label-${i}`} className="absolute -translate-x-1/2 text-sm font-semibold text-gray-700" style={{ left: i * dynamicBitWidth }}>{label}</div>
        ))}
       {/* クレーン止め位置の描画 */}
        {graphAreaWidth > 0 && craneStops.map((stop) => { // dynamicBitWidthが計算されてから描画
            const leftPosition = (stop.position - CHART_START_BIT) * dynamicBitWidth;
            
            // 1. ボックスの幅を動的に計算 (1ビット分の幅と同じにする)
            const boxWidth = dynamicBitWidth;
            // 2. 連続するボックス(2と3, 6と7)を区別するためのIDを追加
            const boxKey = `crane-${stop.id}`;

            return (
              <div
                key={boxKey}
                className="absolute flex items-center justify-center border-2 border-gray-500 bg-white text-sm font-semibold text-gray-700"
                style={{
                  left: leftPosition,
                  // 3. transformで中央揃え (x座標)
                  transform: 'translateX(-50%)', 
                  bottom: '2.5rem',
                  // 4. 計算した動的な幅を適用
                  width: `${boxWidth}px`,
                  height: '1.5rem', // 高さは固定 (h-6)
                }}
              >
                {/* 
                  5. グループ化の処理
                  IDが2,3または6,7の場合、border-right/leftを調整して
                  隣接するボックス間の線を1本に見せる
                */}
                {stop.id === 2 && <div className="absolute right-0 top-0 h-full w-px bg-gray-500" />}
                {stop.id === 7 && <div className="absolute left-0 top-0 h-full w-px bg-gray-500" />}

                {stop.text}
              </div>
            );
        })}
      </div>
      <div className="relative">
        {timeLabels.map((label, i) => (
          <div key={`time-label-${i}`} className="absolute w-full -translate-y-1/2 pr-2 text-right text-xs text-gray-500" style={{ top: `${(i * 2 / TOTAL_CHART_HOURS) * 100}%` }}>{label}</div>
        ))}
      </div>
      <div ref={graphAreaRef} className="relative h-full w-full">
        <div className="absolute inset-0">
          {timeLabels.map((_, i) => ( <div key={`h-line-${i}`} className="absolute w-full border-t border-gray-200" style={{ top: `${(i * 2 / TOTAL_CHART_HOURS) * 100}%` }} /> ))}
          {bitLabels.map((_, i) => ( <div key={`v-line-${i}`} className="absolute h-full border-l border-gray-200" style={{ left: i * dynamicBitWidth }} /> ))}
        </div>
        {graphAreaWidth > 0 && schedules.map((schedule) => {
          const { startHour, endHour } = calculateBarRange(schedule, baseDate);
          if (endHour <= startHour) return null;

          const topPercent = (startHour / TOTAL_CHART_HOURS) * 100;
          const heightPercent = ((endHour - startHour) / TOTAL_CHART_HOURS) * 100;
          
          // --- 【修正点2】描画範囲の制限 ---
          const bow_m = Number(schedule.bow_position_m);
          const stern_m = Number(schedule.stern_position_m);
          const chartStart_m = CHART_START_BIT * BIT_LENGTH_M;

          // 船の左端と右端の位置を計算
          let left_m = Math.min(bow_m, stern_m);
          let right_m = Math.max(bow_m, stern_m);
          
          // もし船の左端がグラフの開始位置(33bit)より小さい場合
          if (left_m < chartStart_m) {
            left_m = chartStart_m; // 左端を強制的に33bitの位置にする
          }
          const width_m = right_m - left_m;
          // --- ここまで ---

          const left = ((left_m / BIT_LENGTH_M) - CHART_START_BIT) * dynamicBitWidth;
          const width = (width_m / BIT_LENGTH_M) * dynamicBitWidth;

          let blockClassName = 'bg-sky-100 text-sky-800';
          if (latestImportId) {
            if (schedule.last_import_id !== latestImportId) {
              blockClassName = 'bg-red-200/80 text-red-900 ring-1 ring-red-500';
            } else if (schedule.update_flg) {
              blockClassName = 'bg-yellow-200/80 text-yellow-900 ring-1 ring-yellow-500';
            }
          }
          return (
            <div key={`${schedule.id}-${schedule.schedule_date}`} className={`absolute flex items-center justify-center rounded-md border p-1 shadow-sm transition-colors ${blockClassName}`} style={{ top: `${topPercent}%`, height: `${heightPercent}%`, left: `${left}px`, width: `${width}px` }}>
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