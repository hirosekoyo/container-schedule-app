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

const obstacles = [
    { name: 'BUSBAR', start: 35.4, end: 43.0, row: 0 },
    { name: 'BUSBAR', start: 44.4, end: 56.0, row: 0 },
    { name: 'BUSBAR', start: 57.0, end: 63.2, row: 0 },
    { name: 'CB', start: 34.5, end: 35.0, row: 0 },
    { name: 'CB', start: 44.5, end: 45.0, row: 0 },
    { name: 'CB', start: 56.8, end: 57.3, row: 0 },
];

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
    if (printWidth && printWidth > 0) {
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
  }, [printWidth]);
  
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
    if (speed >= 20) return 'bg-red-300/30';
    if (speed >= 16) return 'bg-orange-300/30';
    if (speed >= 10) return 'bg-yellow-300/30';
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
    // ▼▼▼ 修正点1: 印刷時用の親クラスを追加 ▼▼▼
    <div className={`h-full w-full flex flex-col font-sans ${isPrintView ? 'print-gantt-chart' : ''}`}>
      {/* --- 上部ガントチャートエリア --- */}
      <div className="flex-grow grid" style={{ gridTemplateColumns: '2rem 1fr 3.5rem', gridTemplateRows: '3rem 1fr' }}>
        <div></div>
        <div className="relative">
          {bitLabels.map((label, i) => (
            <div key={`bit-label-${label}`} className="absolute bottom-0 -translate-x-1/2 text-sm font-semibold text-gray-700" style={{ left: i * dynamicBitWidth }}>
              {label}
            </div>
          ))}
          {graphAreaWidth > 0 && craneStops.map((stop) => {
              const leftPosition = (stop.position - CHART_START_BIT) * dynamicBitWidth;
              const boxWidth = dynamicBitWidth;
              return (
                <div key={`crane-${stop.id}`} className="absolute top-0 flex items-center justify-center border-2 border-gray-500 bg-white text-sm font-semibold text-gray-700" style={{ left: `calc(${leftPosition}px - ${boxWidth / 2}px)`, width: `${boxWidth}px`, height: '1.5rem', }} > {stop.text} </div>
              );
          })}
        </div>
        <div></div> {/* 右上スペーサー */}
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
              return ( <div key={`wind-bg-${index}`} className={`absolute w-full ${colorClass}`} style={{ top: `${topPercent}%`, height: `${heightPercent}%` }} /> );
            })}
            {/* ▼▼▼ 変更点1: 水平線に print: モディファイアを追加 ▼▼▼ */}
            {hourLines.map((hour) => ( 
              <div 
                key={`h-line-${hour}`} 
                className={`hour-line absolute w-full border-t ${
                  hour % 3 === 0 
                  ? 'border-gray-400 hour-line-major' 
                  : 'border-gray-200 hour-line-minor'
                }`} 
                style={{ top: `${(hour / TOTAL_CHART_HOURS) * 100}%` }} 
              /> 
            ))}
            {/* ▼▼▼ 修正点3: 垂直線からprint:を削除し、識別用クラスを追加 ▼▼▼ */}
            {bitLabels.map((_, i) => ( 
              <div 
                key={`v-line-${i}`} 
                className="bit-line absolute h-full border-l border-gray-200" 
                style={{ left: i * dynamicBitWidth }} 
              /> 
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
            const chartEnd_m = bitNotationToMeters(`${CHART_END_BIT}`)!;
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
              if (schedule.last_import_id !== latestImportId) { blockClassName = 'bg-red-200/80 text-red-900 ring-1 ring-red-500'; } 
              else if (changedFields.length > 0) { blockClassName = 'bg-yellow-200/80 text-yellow-900 ring-1 ring-yellow-500'; }
            }
            const interactivityClasses = isPrintView ? '' : 'cursor-pointer hover:ring-2 hover:ring-blue-500';
            return (
              <div key={`${schedule.id}-${schedule.schedule_date}`} className={`absolute flex items-center justify-center rounded-md border p-1 shadow-sm transition-colors ${interactivityClasses} ${blockClassName}`} style={{ top: `${topPercent}%`, height: `${heightPercent}%`, left: `${left}px`, width: `${width}px`, zIndex: 10 }} onClick={() => !isPrintView && onScheduleClick(schedule)} >
                <div className="flex w-full items-center justify-between gap-1 text-xs font-bold md:text-sm break-words px-1">
                  {schedule.arrival_side === '左舷' ? ( <><span>←</span><span className="text-center">{schedule.ship_name}</span></> ) : 
                   schedule.arrival_side === '右舷' ? ( <><span className="text-center">{schedule.ship_name}</span><span>→</span></> ) : 
                   ( <span className="text-center">{schedule.ship_name}</span> )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="relative h-full w-full">
          {isPrintView && (
            <>
              <div className="flex items-center justify-center text-sm font-semibold text-gray-700 h-[3rem] absolute -top-[3rem] w-full">風速</div>
              {/* ▼▼▼ 修正点4: 右側風速エリアの水平線からprint:を削除し、識別用クラスを追加 ▼▼▼ */}
              {timeLabels.map(({ hour }) => ( 
                <div 
                  key={`extended-hline-${hour}`} 
                  className="wind-hour-line absolute w-full border-t border-gray-400" 
                  style={{ top: `${(hour / TOTAL_CHART_HOURS) * 100}%` }} 
                /> 
              ))}
              {report && windData.map((data) => {
                const speed = data.speed;
                if (speed == null) return null;
                const midPointHour = data.start + 1.5;
                const topPercent = (midPointHour / TOTAL_CHART_HOURS) * 100;
                return (
                  <div key={`wind-label-right-${data.start}`} className="absolute z-10 w-full -translate-y-1/2 text-center text-xs font-semibold text-blue-600" style={{ top: `${topPercent}%` }} >
                    <span className="bg-white px-1">{speed}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* --- 下部チャートエリア --- */}
      {isPrintView && (
        <div className="flex-shrink-0 mt-1.5" style={{ height: '0.7cm' }}>
          <div className="grid h-full w-full" style={{ gridTemplateColumns: '2rem 1fr 3.5rem', gridTemplateRows: '1rem 1fr' }}>
            {/* --- 上部ビット番号エリア --- */}
            <div></div>
            <div className="relative">
              {bitLabels.map((label, i) => (
                <div key={`bit-label-bottom-${label}`} className="absolute bottom-0 -translate-x-1/2 text-sm font-semibold text-gray-700" style={{ left: i * dynamicBitWidth }}>
                  {label}
                </div>
              ))}
            </div>
            <div></div>

            {/* --- チャート描画エリア --- */}
            <div></div>
            <div className="relative h-full w-full overflow-hidden">
                <div className="absolute inset-0">
                  {/* ▼▼▼ 修正点5: 下部チャートの垂直線にも識別用クラスを追加 ▼▼▼ */}
                  {bitLabels.map((_, i) => (
                    <div 
                      key={`v-line-bottom-${i}`} 
                      className="bit-line absolute h-full border-l border-gray-200" 
                      style={{ left: i * dynamicBitWidth }} 
                    />
                  ))}
                </div>
                {graphAreaWidth > 0 && (obstacles.map((obstacle, i) => {
                    const left = (obstacle.start - CHART_START_BIT) * dynamicBitWidth;
                    const width = (obstacle.end - obstacle.start) * dynamicBitWidth;
                    let styleClass = 'absolute flex items-center justify-center text-[6px] font-bold';
                    let heightPercent = 100;

                    if (obstacle.name === 'BUSBAR') {
                        styleClass += ' bg-gray-500 text-white';
                        heightPercent *= 0.65;
                    } else if (obstacle.name === 'CB') {
                        styleClass += ' bg-white text-black border border-black';
                    }
                    return (
                        <div key={`o-${i}`} className={styleClass} style={{ left: `${left}px`, width: `${width}px`, top: `${(100 - heightPercent) / 2}%`, height: `${heightPercent}%` }}>
                            {obstacle.name}
                        </div>
                    );
                }))}
            </div>
            <div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;