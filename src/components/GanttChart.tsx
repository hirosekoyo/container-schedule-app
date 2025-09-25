"use client";

import type { DailyReport, ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useState, useEffect, useRef } from 'react';
import { metersToBitPosition, bitNotationToMeters } from '@/lib/coordinateConverter';

interface GanttChartProps {
  schedules: ScheduleWithOperations[];
  baseDate: string;
  latestImportId: string | null;
  onScheduleClick: (schedule: ScheduleWithOperations) => void;
  isPrintView?: boolean;
  printWidth?: number;
  report: DailyReport | null;
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

const GanttChart: React.FC<GanttChartProps> = ({ schedules, baseDate, latestImportId, onScheduleClick, isPrintView = false, printWidth, report }) => {
  const hourLines = Array.from({ length: TOTAL_CHART_HOURS + 1 }, (_, i) => CHART_START_HOUR + i);

  const timeLabels = Array.from({ length: Math.floor(TOTAL_CHART_HOURS / 3) + 1 }, (_, i) => {
    const hour = CHART_START_HOUR + i * 3;
    const label = hour === 24 ? '24' : hour > 24 ? hour - 24 : hour;
    return { hour, label };
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
  
  // 描画エリアの幅をビットの「区間」の数 (31) で割る
  const numberOfBitIntervals = CHART_END_BIT - CHART_START_BIT;
  const dynamicBitWidth = graphAreaWidth > 0 ? graphAreaWidth / numberOfBitIntervals : 0;

  const craneStops = [
    { id: 1, text: '1', position: 35.5 }, { id: 2, text: '2', position: 39.0 },
    { id: 3, text: '3', position: 40.0 }, { id: 4, text: '4', position: 44.5 },
    { id: 5, text: '5', position: 48.5 }, { id: 6, text: '6', position: 51.5 },
    { id: 7, text: '7', position: 52.5 }, { id: 8, text: '8', position: 55.5 },
    { id: 9, text: '9', position: 60.2 }, { id: 10, text: '10', position: 63.2 },
  ];

  const getWindColorClass = (speed: number | null | undefined): string => {
    if (speed == null) return '';
    if (speed >= 20) return 'bg-red-200/50';
    if (speed >= 16) return 'bg-orange-200/50';
    if (speed >= 10) return 'bg-yellow-200/50';
    return '';
  };
  
  const windData = report ? [
    { start: 0,  end: 3,  speed: report.wind_speed_1 },
    { start: 3,  end: 6,  speed: report.wind_speed_2 },
    { start: 6,  end: 9,  speed: report.wind_speed_3 },
    { start: 9,  end: 12, speed: report.wind_speed_4 },
    { start: 12, end: 15, speed: report.wind_speed_5 },
    { start: 15, end: 18, speed: report.wind_speed_6 },
    { start: 18, end: 21, speed: report.wind_speed_7 },
    { start: 21, end: 24, speed: report.wind_speed_8 },
  ] : [];

  return (
    <div className="grid h-full w-full font-sans" style={{ gridTemplateColumns: '2rem 1fr 3.5rem', gridTemplateRows: '3rem 1fr' }}>
      <div></div>
      <div className="relative">
        {/* ▼▼▼ 修正点1: ラベルと線の位置を統一 ▼▼▼ */}
        {bitLabels.map((label, i) => (
          <div key={`bit-label-${label}`} className="absolute bottom-0 -translate-x-1/2 text-sm font-semibold text-gray-700" style={{ left: i * dynamicBitWidth }}>
            {label}
          </div>
        ))}
        {graphAreaWidth > 0 && craneStops.map((stop) => {
            const leftPosition = (stop.position - CHART_START_BIT) * dynamicBitWidth;
            const boxWidth = dynamicBitWidth; // ボックス幅を1ビット分に
            return (
              <div key={`crane-${stop.id}`} className="absolute top-0 flex items-center justify-center border-2 border-gray-500 bg-white text-sm font-semibold text-gray-700" style={{ left: `calc(${leftPosition}px - ${boxWidth / 2}px)`, width: `${boxWidth}px`, height: '1.5rem', }} > {stop.text} </div>
            );
        })}
      </div>

      {isPrintView ? (
        <div className="flex items-center justify-center text-sm font-semibold text-gray-700">
          風速
        </div>
      ) : (
        <div></div>
      )}

      <div className="relative">
        {timeLabels.map(({ hour, label }) => (
          <div key={`time-label-left-${hour}`} className="absolute w-full -translate-y-1/2 pr-2 text-right text-xs text-gray-500" style={{ top: `${(hour / TOTAL_CHART_HOURS) * 100}%` }}>{label}</div>
        ))}
      </div>
      
      <div ref={graphAreaRef} className="relative h-full w-full overflow-hidden">
        <div className="absolute inset-0">
          {isPrintView && windData.map((data, index) => {
            const colorClass = getWindColorClass(data.speed);
            if (!colorClass) return null;
            const topPercent = (data.start / TOTAL_CHART_HOURS) * 100;
            const heightPercent = ((data.end - data.start) / TOTAL_CHART_HOURS) * 100;
            return (
              <div key={`wind-bg-${index}`} className={`absolute w-full ${colorClass}`} style={{ top: `${topPercent}%`, height: `${heightPercent}%` }} />
            );
          })}
          {hourLines.map((hour) => ( 
            <div 
              key={`h-line-${hour}`} 
              className={`absolute w-full border-t ${hour % 3 === 0 ? 'border-gray-400' : 'border-gray-200'}`} 
              style={{ top: `${(hour / TOTAL_CHART_HOURS) * 100}%` }} 
            /> 
          ))}
          {bitLabels.map((_, i) => ( 
            <div key={`v-line-${i}`} className="absolute h-full border-l border-gray-200" style={{ left: i * dynamicBitWidth }} /> 
          ))}
        </div>
        {graphAreaWidth > 0 && schedules.map((schedule) => {
          const { startHour, endHour } = calculateBarRange(schedule, baseDate);
          if (endHour <= startHour) return null;
          const topPercent = (startHour / TOTAL_CHART_HOURS) * 100;
          const heightPercent = ((endHour - startHour) / TOTAL_CHART_HOURS) * 100;
          const bow_m = Number(schedule.bow_position_m);
          const stern_m = Number(schedule.stern_position_m);
          const chartStart_m = bitNotationToMeters(`${CHART_START_BIT}`)!;
          const chartEnd_m = bitNotationToMeters(`${CHART_END_BIT}`)!; // 64ビットの終端まで
          if (Math.max(bow_m, stern_m) < chartStart_m) { return null; }
          let left_m = Math.min(bow_m, stern_m);
          if (left_m < chartStart_m) { left_m = chartStart_m; }
          let right_m = Math.max(bow_m, stern_m);
          if (right_m > chartEnd_m) { right_m = chartEnd_m; }
          const width_m = right_m - left_m;
          if (width_m <= 0) return null;
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
              style={{ top: `${topPercent}%`, height: `${heightPercent}%`, left: `${left}px`, width: `${width}px`, zIndex: 10 }}
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
      
      {isPrintView && (
        <div className="relative h-full w-full">
          {timeLabels.map(({ hour }) => (
            <div
              key={`extended-hline-${hour}`}
              className="absolute w-full border-t border-gray-400"
              style={{ top: `${(hour / TOTAL_CHART_HOURS) * 100}%` }}
            />
          ))}

          {report && windData.map((data) => {
            const speed = data.speed;
            if (speed == null) return null;
            const midPointHour = data.start + 1.5;
            const topPercent = (midPointHour / TOTAL_CHART_HOURS) * 100;

            return (
              <div 
                key={`wind-label-right-${data.start}`} 
                className="absolute z-10 w-full -translate-y-1/2 text-center text-xs font-semibold text-blue-600" 
                style={{ top: `${topPercent}%` }}
              >
                <span className="bg-white px-1">{speed}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GanttChart;