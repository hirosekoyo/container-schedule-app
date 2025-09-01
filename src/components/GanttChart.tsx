import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React from 'react';

// --- 型定義 ---
interface GanttChartProps {
  schedules: ScheduleWithOperations[];
  baseDate: string; // 表示対象の基準日 'YYYY-MM-DD'
}

// --- 定数 ---
const CHART_START_HOUR = 0;
const CHART_END_HOUR = 26;
const TOTAL_CHART_HOURS = CHART_END_HOUR - CHART_START_HOUR;
const CHART_START_BIT = 33;
const CHART_END_BIT = 64; // 描画するビットの終点
const BIT_LENGTH_M = 30;
const BIT_WIDTH_PX = 56;

const calculateBarRange = (schedule: ScheduleWithOperations, baseDateStr: string) => {
  const arrival = new Date(schedule.arrival_time);
  const departure = new Date(schedule.departure_time);
  const baseDate = new Date(`${baseDateStr}T00:00:00Z`);

  const isArrivalDay = arrival.getUTCFullYear() === baseDate.getUTCFullYear() &&
                       arrival.getUTCMonth() === baseDate.getUTCMonth() &&
                       arrival.getUTCDate() === baseDate.getUTCDate();
                       
  const isDepartureDay = departure.getUTCFullYear() === baseDate.getUTCFullYear() &&
                         departure.getUTCMonth() === baseDate.getUTCMonth() &&
                         departure.getUTCDate() === baseDate.getUTCDate();
                         
  const startHour = isArrivalDay ? (arrival.getUTCHours() + arrival.getUTCMinutes() / 60) : 0;
  const endHour = isDepartureDay ? (departure.getUTCHours() + departure.getUTCMinutes() / 60) : 24;

  return { startHour, endHour };
};

const GanttChart: React.FC<GanttChartProps> = ({ schedules, baseDate }) => {
  // --- 軸ラベルの生成 ---
  const timeLabels = Array.from({ length: TOTAL_CHART_HOURS / 2 + 1 }, (_, i) => {
    const hour = CHART_START_HOUR + i * 2;
    if (hour >= 26) return hour - 24;
    return hour;
  });
  const bitLabels = Array.from({ length: CHART_END_BIT - CHART_START_BIT + 1 }, (_, i) => CHART_START_BIT + i);

  return (
    <div className="relative h-full w-full pl-8 pt-8 font-sans">
      {/* --- 背景グリッド --- */}
      <div className="absolute inset-0">
        {/* 横線 (時間軸) */}
        {timeLabels.map((_, i) => (
          <div key={`h-line-${i}`} className="absolute w-full border-t border-gray-200" style={{ top: `${(i * 2 / TOTAL_CHART_HOURS) * 100}%` }} />
        ))}
        {/* 縦線 (ビット軸) */}
        {bitLabels.map((_, i) => (
          <div key={`v-line-${i}`} className="absolute h-full border-l border-gray-200" style={{ left: i * BIT_WIDTH_PX }} />
        ))}
      </div>
      
      {/* --- 船舶ブロック --- */}
      {schedules.map((schedule) => {
        const { startHour, endHour } = calculateBarRange(schedule, baseDate);
        if (endHour <= startHour) return null;

        const topPercent = (startHour / TOTAL_CHART_HOURS) * 100;
        const heightPercent = ((endHour - startHour) / TOTAL_CHART_HOURS) * 100;

        const left_m = Math.min(Number(schedule.bow_position_m), Number(schedule.stern_position_m));
        const width_m = Math.abs(Number(schedule.bow_position_m) - Number(schedule.stern_position_m));
        const left = ((left_m / BIT_LENGTH_M) - CHART_START_BIT) * BIT_WIDTH_PX;
        const width = (width_m / BIT_LENGTH_M) * BIT_WIDTH_PX;

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

      {/* --- 軸ラベル --- */}
      <div className="absolute -left-8 top-0 h-full pt-8">
        {timeLabels.map((label, i) => (
          <div key={`time-label-${i}`} className="absolute -translate-y-1/2 text-xs text-gray-500" style={{ top: `${(i * 2 / TOTAL_CHART_HOURS) * 100}%` }}>{label}</div>
        ))}
      </div>
      <div className="absolute -top-6 left-0 w-full pl-8">
        {bitLabels.map((label, i) => (
          <div key={`bit-label-${i}`} className="absolute -translate-x-1/2 text-sm font-semibold text-gray-700" style={{ left: i * BIT_WIDTH_PX }}>{label}</div>
        ))}
      </div>
    </div>
  );
};

export default GanttChart;