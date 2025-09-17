"use client";

import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useState, useRef, useEffect } from 'react';
import { bitNotationToMeters, metersToBitPosition, metersToBitNotation } from '@/lib/coordinateConverter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
// 【変更点2】Radix UI から直接 Popover, PopoverAnchor, PopoverPortal をインポート
import * as PopoverPrimitive from "@radix-ui/react-popover";


// --- Propsの定義 ---
interface MobileGanttChartProps {
  schedules: ScheduleWithOperations[];
  baseDate: string;
  isZoomedIn: boolean;
  onToggleZoom: () => void;
  viewSize: { width: number, height: number };
}

// --- ヘルパー関数 ---
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
    endHour = 26;
  } else {
    endHour = departure.getHours() + departure.getMinutes() / 60;
  }
  return { startHour, endHour: Math.min(endHour, 26) };
};
const ScheduleDetailPopoverContent: React.FC<{ schedule: ScheduleWithOperations }> = ({ schedule }) => (
  <div className="p-2 space-y-2 text-xs">
    <h3 className="font-bold text-sm border-b pb-1">{schedule.ship_name}</h3>
    <Table>
      <TableBody>
        <TableRow><TableCell className="font-medium text-muted-foreground w-1/3 p-1 h-auto">着岸</TableCell><TableCell className="p-1 h-auto">{new Date(schedule.arrival_time.replace(' ','T')).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell></TableRow>
        <TableRow><TableCell className="font-medium text-muted-foreground p-1 h-auto">離岸</TableCell><TableCell className="p-1 h-auto">{new Date(schedule.departure_time.replace(' ','T')).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell></TableRow>
        <TableRow><TableCell className="font-medium text-muted-foreground p-1 h-auto">おもて</TableCell><TableCell className="p-1 h-auto">{metersToBitNotation(Number(schedule.bow_position_m))}</TableCell></TableRow>
        <TableRow><TableCell className="font-medium text-muted-foreground p-1 h-auto">とも</TableCell><TableCell className="p-1 h-auto">{metersToBitNotation(Number(schedule.stern_position_m))}</TableCell></TableRow>
        <TableRow><TableCell className="font-medium text-muted-foreground p-1 h-auto">備考</TableCell><TableCell className="whitespace-pre-wrap p-1 h-auto">{schedule.remarks || '-'}</TableCell></TableRow>
      </TableBody>
    </Table>
    {schedule.cargo_operations.length > 0 && (
      <div className="mt-2">
        <h4 className="font-semibold border-b">荷役作業</h4>
        {schedule.cargo_operations.map(op => (
          <div key={op.id} className="text-xs mt-1">
            <p><strong>開始:</strong> {op.start_time ? new Date(op.start_time.replace(' ','T')).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-'} | <strong>GC:</strong> {op.crane_names || '-'} | <strong>本数:</strong> {op.container_count || '-'}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

export function MobileGanttChart({ schedules, baseDate, isZoomedIn, onToggleZoom, viewSize }: MobileGanttChartProps) {
  const [openPopoverIds, setOpenPopoverIds] = useState<number[]>([]);
    const togglePopover = (scheduleId: number) => {
    setOpenPopoverIds(prev => prev.includes(scheduleId) ? prev.filter(id => id !== scheduleId) : [...prev, scheduleId]);
  };

  const timeLabels = Array.from({ length: 14 }, (_, i) => i * 2);
  const bitLabels = Array.from({ length: 33 }, (_, i) => 33 + i);
  const CHART_START_BIT = 33;
  
  const AXIS_LABEL_WIDTH = 32;
  const AXIS_LABEL_HEIGHT = 28;
  const scrollModeBitWidth = 56;
  const scrollModeHourHeight = 40;
  const fullViewBitWidth = (viewSize.width - AXIS_LABEL_WIDTH) / bitLabels.length;
  const fullViewHourHeight = (viewSize.height - AXIS_LABEL_HEIGHT) / (timeLabels.length * 2 - 2);
  const BIT_WIDTH_PX = isZoomedIn ? scrollModeBitWidth : fullViewBitWidth;
  const HOUR_HEIGHT_PX = isZoomedIn ? scrollModeHourHeight : fullViewHourHeight;
  const totalChartWidth = bitLabels.length * BIT_WIDTH_PX;
  const totalChartHeight = (timeLabels.length - 1) * 2 * HOUR_HEIGHT_PX;

  const topAxisRef = useRef<HTMLDivElement>(null);
  const leftAxisRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
    const contentArea = contentAreaRef.current;
    if (!contentArea || !isZoomedIn) return; // ズームイン時のみスクロール同期
    const handleScroll = () => {
      if (topAxisRef.current) topAxisRef.current.scrollLeft = contentArea.scrollLeft;
      if (leftAxisRef.current) leftAxisRef.current.scrollTop = contentArea.scrollTop;
    };
    contentArea.addEventListener('scroll', handleScroll);
    return () => contentArea.removeEventListener('scroll', handleScroll);
  }, [isZoomedIn]);
  
  // --- 【ここからが新設箇所】 ---
  // 全体表示モードで表示する横軸ラベルのリスト
  const fullViewBitLabels = [35, 40, 45, 50, 55, 60, 65];
  // --- 【ここまで】 ---


  return (
    <div className="grid h-full w-full" style={{ gridTemplateColumns: `${AXIS_LABEL_WIDTH}px 1fr`, gridTemplateRows: `${AXIS_LABEL_HEIGHT}px 1fr` }}>
      <div className="bg-white z-20 border-b border-r border-gray-200"></div>
      <div ref={topAxisRef} className="overflow-hidden bg-white z-10 border-b border-gray-200">
        <div className="relative" style={{ width: totalChartWidth, height: '100%' }}>
          {/* --- 【ここからが修正箇所】 --- */}
          {(isZoomedIn ? bitLabels : fullViewBitLabels).map((label) => (
            <div key={`bl-${label}`} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-sm text-gray-700 transition-opacity" 
                 style={{ left: (label - CHART_START_BIT) * BIT_WIDTH_PX }}>
              {label}
            </div>
          ))}
          {/* --- 【ここまで】 --- */}
        </div>
      </div>
      <div ref={leftAxisRef} className="overflow-hidden bg-white z-10 border-r border-gray-200">
        <div className="relative" style={{ width: '100%', height: totalChartHeight }}>
          {/* 縦軸ラベルは常にすべて表示 */}
          {timeLabels.map((label, i) => (
            <div key={`tl-${i}`} className="absolute -translate-y-1/2 text-xs text-gray-500 transition-opacity" style={{ top: i * 2 * HOUR_HEIGHT_PX, right: 4 }}>{label}</div>
          ))}
        </div>
      </div>
      <div ref={contentAreaRef} 
           className={`${isZoomedIn ? 'overflow-auto' : 'overflow-hidden'} overscroll-behavior-none`}
           onDoubleClick={onToggleZoom}
      >
        <div className="relative transition-all duration-300" style={{ width: totalChartWidth, height: totalChartHeight }}>
          <div className="absolute inset-0">
            {timeLabels.map((_, i) => <div key={`h-${i}`} className="absolute w-full border-t border-gray-100" style={{ top: i * 2 * HOUR_HEIGHT_PX }} />)}
            {bitLabels.map((_, i) => <div key={`v-${i}`} className="absolute h-full border-l border-gray-100" style={{ left: i * BIT_WIDTH_PX }} />)}
          </div>
          
          {schedules.map((schedule) => {
            const { startHour, endHour } = calculateBarRange(schedule, baseDate);
            if (endHour <= startHour) return null;
            const top = startHour * HOUR_HEIGHT_PX;
            const height = (endHour - startHour) * HOUR_HEIGHT_PX;
            const bow_m = Number(schedule.bow_position_m);
            const stern_m = Number(schedule.stern_position_m);
            const chartStart_m = bitNotationToMeters(`${33}`)!;
            let left_m = Math.min(bow_m, stern_m);
            if (left_m < chartStart_m) left_m = chartStart_m;
            const width_m = Math.max(bow_m, stern_m) - left_m;
            const left_bit = metersToBitPosition(left_m);
            const right_bit = metersToBitPosition(left_m + width_m);
            const left = (left_bit - CHART_START_BIT) * BIT_WIDTH_PX;
            const width = (right_bit - left_bit) * BIT_WIDTH_PX;

            return (
              <Popover key={schedule.id} open={openPopoverIds.includes(schedule.id)} onOpenChange={() => togglePopover(schedule.id)}>
                <PopoverTrigger asChild>
                  <div className="absolute flex items-center justify-center rounded border bg-sky-100/80 p-1 text-sky-800 cursor-pointer" style={{ top, height, left, width, minWidth: isZoomedIn ? 28 : 0 }}>
                    <div className={`flex items-center gap-1 font-bold break-words text-center ${!isZoomedIn ? 'text-[8px] leading-tight' : 'text-[10px]'}`}>
                      <span>{schedule.arrival_side === '左舷' ? '←' : ''}</span>
                      <span>{schedule.ship_name}</span>
                      <span>{schedule.arrival_side === '右舷' ? '→' : ''}</span>
                    </div>
                  </div>
                </PopoverTrigger>

                <PopoverPrimitive.Anchor
                  className="absolute"
                  style={{
                    top: top + height / 2, // バーの垂直方向の中央
                    left: left + width / 2   // バーの水平方向の中央
                  }}
                />
                <PopoverPrimitive.Portal container={contentAreaRef.current}>
                  <PopoverContent
                    // collisionBoundary は不要になるか、あっても良い
                    className="w-full max-w-xs sm:w-72"
                    side="left"
                    align="center"
                    collisionPadding={8}
                    sideOffset={1}
                  >
                    <ScheduleDetailPopoverContent schedule={schedule} />
                  </PopoverContent>
                </PopoverPrimitive.Portal>
              </Popover>
            );
          })}
        </div>
      </div>
    </div>
  );
}