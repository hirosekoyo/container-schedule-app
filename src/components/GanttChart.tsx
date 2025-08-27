import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React from 'react';

// --- 型定義 ---
interface GanttChartProps {
  schedules: ScheduleWithOperations[];
}

// --- 定数定義 (高さに関する固定ピクセル値を削除) ---
const CHART_START_HOUR = 0;
const CHART_END_HOUR = 26; // 翌2時まで描画するため26時間分
const TOTAL_CHART_HOURS = CHART_END_HOUR - CHART_START_HOUR; // グラフ全体の時間範囲

const CHART_START_BIT = 33;
const CHART_END_BIT = 64;
const BIT_WIDTH_PX = 56;
const BIT_LENGTH_M = 30;

const parseTimeToHours = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

const GanttChart: React.FC<GanttChartProps> = ({ schedules }) => {
  const timeLabels = Array.from(
    { length: TOTAL_CHART_HOURS / 2 + 1 },
    (_, i) => (CHART_START_HOUR + i * 2) % 24
  );

  const bitLabels = Array.from(
    { length: CHART_END_BIT - CHART_START_BIT + 1 },
    (_, i) => CHART_START_BIT + i
  );

  return (
    // 親要素の高さに追従するように h-full を追加
    <div className="relative h-full w-full font-sans">
      {/* グラフエリア (padding等を削除し、描画エリアを最大化) */}
      <div className="relative h-full w-full pl-8 pt-8">
        {/* --- 背景グリッド --- */}
        <div className="absolute inset-0">
          {/* 横線 (時間軸) - 高さを%で計算 */}
          {timeLabels.map((_, i) => (
            <div
              key={`h-line-${i}`}
              className="absolute w-full border-t border-gray-200"
              style={{ top: `${(i * 2 / TOTAL_CHART_HOURS) * 100}%` }}
            />
          ))}
          {/* 縦線 (ビット軸) */}
          {bitLabels.map((_, i) => (
            <div
              key={`v-line-${i}`}
              className="absolute h-full border-l border-gray-200"
              style={{ left: i * BIT_WIDTH_PX }}
            />
          ))}
        </div>
        
        {/* --- 船舶ブロックの描画 --- */}
        {schedules.map((schedule) => {
          // --- Y軸 (時間) の位置と高さを「パーセンテージ」で計算 ---
          const arrivalHours = parseTimeToHours(schedule.arrival_time);
          let departureHours = parseTimeToHours(schedule.departure_time);
          if (departureHours < arrivalHours) {
            departureHours += 24;
          }

          const topPercent = (arrivalHours / TOTAL_CHART_HOURS) * 100;
          const heightPercent = ((departureHours - arrivalHours) / TOTAL_CHART_HOURS) * 100;

          // X軸 (ビット) の計算は変更なし
          const position1_m = Number(schedule.bow_position_m);
          const position2_m = Number(schedule.stern_position_m);
          const left_m = Math.min(position1_m, position2_m);
          const width_m = Math.abs(position1_m - position2_m);
          const left = ((left_m / BIT_LENGTH_M) - CHART_START_BIT) * BIT_WIDTH_PX;
          const width = (width_m / BIT_LENGTH_M) * BIT_WIDTH_PX;

          return (
            <div
              key={schedule.id}
              className="absolute flex items-center justify-center rounded-md border bg-sky-100 p-1 text-sky-800 shadow-sm"
              style={{
                top: `${topPercent}%`,
                height: `${heightPercent}%`, // 高さを%で指定
                left: `${left}px`,
                width: `${width}px`,
              }}
            >
              <div className="flex w-full items-center justify-between gap-1 text-xs font-bold md:text-sm">
                {schedule.arrival_side === '左舷' ? (
                  <><span>←</span><span className="truncate">{schedule.ship_name}</span></>
                ) : schedule.arrival_side === '右舷' ? (
                  <><span className="truncate">{schedule.ship_name}</span><span>→</span></>
                ) : (
                  <span className="truncate">{schedule.ship_name}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* --- 軸ラベル --- */}
        {/* 時間軸ラベル (縦) - 位置を%で計算 */}
        <div className="absolute -left-8 top-0 h-full">
          {timeLabels.map((label, i) => (
            <div
              key={`time-label-${i}`}
              className="absolute -translate-y-1/2 text-xs text-gray-500"
              style={{ top: `${(i * 2 / TOTAL_CHART_HOURS) * 100}%` }}
            >
              {label}
            </div>
          ))}
        </div>
        {/* ビット軸ラベル (横) */}
        <div className="absolute -top-6 left-0 w-full">
          {bitLabels.map((label, i) => (
            <div
              key={`bit-label-${i}`}
              className="absolute -translate-x-1/2 text-sm font-semibold text-gray-700"
              style={{ left: i * BIT_WIDTH_PX }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GanttChart;