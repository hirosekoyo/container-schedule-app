"use client";

import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useState, useEffect, useRef } from 'react';
import { metersToBitPosition, bitNotationToMeters } from '@/lib/coordinateConverter';

interface GanttChartProps {
  schedules: ScheduleWithOperations[];
  baseDate: string;
  latestImportId: string | null;
  onScheduleClick: (schedule: ScheduleWithOperations) => void;
  isPrintView?: boolean;
  printWidth?: number;
}
const CHART_START_HOUR = 0;
const CHART_END_HOUR = 26;
const TOTAL_CHART_HOURS = CHART_END_HOUR - CHART_START_HOUR;
const CHART_START_BIT = 33;
const CHART_END_BIT = 64;

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

const GanttChart: React.FC<GanttChartProps> = ({ schedules, baseDate, latestImportId, onScheduleClick, isPrintView = false, printWidth }) => {
  const timeLabels = Array.from({ length: TOTAL_CHART_HOURS / 2 + 1 }, (_, i) => {
    const hour = CHART_START_HOUR + i * 2;
    if (hour >= 26) return hour - 24;
    return hour;
  });
  const bitLabels = Array.from({ length: CHART_END_BIT - CHART_START_BIT + 1 }, (_, i) => CHART_START_BIT + i);
  
  const graphAreaRef = useRef<HTMLDivElement>(null);
  const [graphAreaWidth, setGraphAreaWidth] = useState(0);

  useEffect(() => {
    if (isPrintView && printWidth && printWidth > 0) {
      setGraphAreaWidth(printWidth);
      return;
    }
    const graphElement = graphAreaRef.current;
    if (!graphElement) return;
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) setGraphAreaWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(graphElement);
    return () => resizeObserver.unobserve(graphElement);
  }, [isPrintView, printWidth]);

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
    <div className="grid h-full w-full font-sans" style={{ gridTemplateColumns: '2rem 1fr', gridTemplateRows: '3rem 1fr' }}>
      <div></div>
      <div className="relative">
        {bitLabels.map((label, i) => (
          <div key={`bit-label-${i}`} className="absolute bottom-0 -translate-x-1/2 text-sm font-semibold text-gray-700" style={{ left: i * dynamicBitWidth }}>
            {label}
          </div>
        ))}
        {graphAreaWidth > 0 && craneStops.map((stop) => {
            const leftPosition = (stop.position - CHART_START_BIT) * dynamicBitWidth;
            const boxWidth = dynamicBitWidth * 0.8;
            return (
              <div
                key={`crane-${stop.id}`}
                className="absolute top-0 flex items-center justify-center border-2 border-gray-500 bg-white text-sm font-semibold text-gray-700"
                style={{
                  left: `calc(${leftPosition}px - ${boxWidth / 2}px)`,
                  width: `${boxWidth}px`,
                  height: '1.5rem',
                }}
              >
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
          
          const bow_m = Number(schedule.bow_position_m);
          const stern_m = Number(schedule.stern_position_m);
          
          const chartStart_m = bitNotationToMeters(`${CHART_START_BIT}`)!; // 33bitのメートル位置
          const chartEnd_m = bitNotationToMeters(`${CHART_END_BIT + 1}`)!; // 65bitのメートル位置

          // 船の右端がグラフの開始位置より左にある場合は、描画をスキップ
          if (Math.max(bow_m, stern_m) < chartStart_m) {
            return null;
          }
          
          // 船の左端を描画範囲内に補正
          let left_m = Math.min(bow_m, stern_m);
          if (left_m < chartStart_m) {
            left_m = chartStart_m;
          }
          // 船の右端も描画範囲内に補正
          let right_m = Math.max(bow_m, stern_m);
          if (right_m > chartEnd_m) {
            right_m = chartEnd_m;
          }

          const width_m = right_m - left_m;
          if (width_m <= 0) return null; // 幅がなければ描画しない
          
          const left_bit = metersToBitPosition(left_m);
          const right_bit = metersToBitPosition(right_m);
          
          const left = (left_bit - CHART_START_BIT) * dynamicBitWidth;
          const width = (right_bit - left_bit) * dynamicBitWidth;

          const changedFields = (schedule.changed_fields as string[] | null) || [];
          let blockClassName = 'bg-sky-100 text-sky-800';
          if (latestImportId) {
            if (schedule.last_import_id !== latestImportId) {
              blockClassName = 'bg-red-200/80 text-red-900 ring-1 ring-red-500';
            } else if (changedFields.length > 0) {
              blockClassName = 'bg-yellow-200/80 text-yellow-900 ring-1 ring-yellow-500';
            }
          }
          const interactivityClasses = isPrintView ? '' : 'cursor-pointer hover:ring-2 hover:ring-blue-500';

          return (
            <div 
              key={`${schedule.id}-${schedule.schedule_date}`} 
              className={`absolute flex items-center justify-center rounded-md border p-1 shadow-sm transition-colors ${interactivityClasses} ${blockClassName}`}
              style={{ top: `${topPercent}%`, height: `${heightPercent}%`, left: `${left}px`, width: `${width}px` }}
              onClick={() => !isPrintView && onScheduleClick(schedule)}
            >
              <div className="flex w-full items-center justify-between gap-1 text-xs font-bold md:text-sm break-words px-1">
                {schedule.arrival_side === '左舷' ? ( <><span>←</span><span className="text-center">{schedule.ship_name}</span></> ) : 
                 schedule.arrival_side === '右舷' ? ( <><span className="text-center">{schedule.ship_name}</span><span>→</span></> ) : 
                 ( <span className="text-center">{schedule.ship_name}</span> )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GanttChart;