"use client";

import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React from 'react';
import { bitNotationToMeters } from '@/lib/coordinateConverter';

interface MobileGanttChartProps {
  schedules: ScheduleWithOperations[];
  baseDate: string;
  onScheduleClick: (schedule: ScheduleWithOperations) => void;
}

// モバイル用に定数を調整
const CHART_START_HOUR = 0;
const CHART_END_HOUR = 26;
const TOTAL_CHART_HOURS = CHART_END_HOUR - CHART_START_HOUR;
const CHART_START_BIT = 33;
const CHART_END_BIT = 64;
const BIT_WIDTH_PX = 48; // PC版より少し狭くする
const HOUR_HEIGHT_PX = 40; // PC版より少し低くする

const calculateBarRange = (schedule: ScheduleWithOperations, baseDateStr: string) => {
  const arrival = new Date(schedule.arrival_time.replace(' ', 'T'));
  const departure = new Date(schedule.departure_time.replace(' ', 'T'));
  const baseDate = new Date(baseDateStr);
  const isArrivalDay = arrival.getFullYear() === baseDate.getFullYear() && arrival.getMonth() === baseDate.getMonth() && arrival.getDate() === baseDate.getDate();
  const nextDay = new Date(baseDate);
  nextDay.setDate(baseDate.getDate() + 1);
  const isDepartureNextDay = departure.getFullYear() === nextDay.getFullYear() && departure.getMonth() === nextDay.getMonth() && departure.getDate() === nextDay.getDate();
  const startHour = isArrivalDay ? (arrival.getHours() + arrival.getMinutes() / 60) : 0;
  let endHour: number;
  if (isDepartureNextDay) {
    endHour = 24 + (departure.getHours() + departure.getMinutes() / 60);
  } else if (departure > nextDay) {
    endHour = CHART_END_HOUR;
  } else {
    endHour = departure.getHours() + departure.getMinutes() / 60;
  }
  return { startHour, endHour: Math.min(endHour, CHART_END_HOUR) };
};

export function MobileGanttChart({ schedules, baseDate, onScheduleClick }: MobileGanttChartProps) {
  const timeLabels = Array.from({ length: TOTAL_CHART_HOURS / 2 + 1 }, (_, i) => (CHART_START_HOUR + i * 2) % 24);
  const bitLabels = Array.from({ length: CHART_END_BIT - CHART_START_BIT + 1 }, (_, i) => CHART_START_BIT + i);
  const totalChartWidth = (CHART_END_BIT - CHART_START_BIT + 1) * BIT_WIDTH_PX;
  const totalChartHeight = TOTAL_CHART_HOURS * HOUR_HEIGHT_PX;

  return (
    <div className="relative w-full h-full font-sans pl-8 pt-4">
      {/* 縦軸ラベル */}
      <div className="absolute left-0 top-0 h-full pt-4">
        {timeLabels.map((label, i) => (
          <div key={`time-label-${i}`} className="absolute text-xs text-gray-500" style={{ top: i * 2 * HOUR_HEIGHT_PX - 8 }}>{label}</div>
        ))}
      </div>
      
      {/* 横スクロール可能なグラフエリア */}
      <div className="h-full w-full overflow-x-auto">
        <div className="relative" style={{ width: totalChartWidth, height: totalChartHeight }}>
          {/* 背景グリッド */}
          <div className="absolute inset-0">
            {timeLabels.map((_, i) => <div key={`h-line-${i}`} className="absolute w-full border-t border-gray-100" style={{ top: i * 2 * HOUR_HEIGHT_PX }} />)}
            {bitLabels.map((_, i) => <div key={`v-line-${i}`} className="absolute h-full border-l border-gray-100" style={{ left: i * BIT_WIDTH_PX }} />)}
          </div>
          
          {/* 横軸ラベル */}
          {bitLabels.map((label, i) => (
            <div key={`bit-label-${i}`} className="absolute top-0 -translate-x-1/2 text-sm text-gray-700" style={{ left: i * BIT_WIDTH_PX }}>{label}</div>
          ))}

          {/* 船舶ブロック */}
          {schedules.map((schedule) => {
            const { startHour, endHour } = calculateBarRange(schedule, baseDate);
            if (endHour <= startHour) return null;
            const top = startHour * HOUR_HEIGHT_PX;
            const height = (endHour - startHour) * HOUR_HEIGHT_PX;

            const bow_m = Number(schedule.bow_position_m);
            const stern_m = Number(schedule.stern_position_m);
            const chartStart_m = bitNotationToMeters(`${CHART_START_BIT}`)!;
            let left_m = Math.min(bow_m, stern_m);
            if (left_m < chartStart_m) { left_m = chartStart_m; }

            const width_m = Math.max(bow_m, stern_m) - left_m;
            const totalMetersInRange = bitNotationToMeters(`${CHART_END_BIT + 1}`)! - chartStart_m;
            const left = ((left_m - chartStart_m) / totalMetersInRange) * totalChartWidth;
            const width = (width_m / totalMetersInRange) * totalChartWidth;

            return (
              <div key={schedule.id}
                className="absolute flex items-center justify-center rounded border bg-sky-100/80 p-1 text-sky-800"
                style={{ top, height, left, width }}
                onClick={() => onScheduleClick(schedule)}
              >
                <div className="flex items-center gap-1 text-[10px] font-bold break-words text-center">
                  <span>{schedule.arrival_side === '左舷' ? '←' : ''}</span>
                  <span>{schedule.ship_name}</span>
                  <span>{schedule.arrival_side === '右舷' ? '→' : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}