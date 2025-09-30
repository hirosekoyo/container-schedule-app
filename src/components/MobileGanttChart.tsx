"use client";

import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useState, useRef, useEffect } from 'react';
import { bitNotationToMeters, metersToBitPosition, metersToBitNotation } from '@/lib/coordinateConverter';
import { PopoverContent } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from './ui/button';

interface MobileGanttChartProps {
  schedules: ScheduleWithOperations[];
  baseDate: string;
  viewSize: { width: number, height: number };
}

// --- ヘルパー関数 (変更なし) ---
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
// --- ヘルパー関数ここまで ---


export function MobileGanttChart({ schedules, baseDate, viewSize }: MobileGanttChartProps) {
  const [openPopoverIds, setOpenPopoverIds] = useState<number[]>([]);
  const [anchorPosition, setAnchorPosition] = useState({ top: 0, left: 0 });
  
  // ▼▼▼ 変更点1: ズームレベルを任意の値に設定可能 ▼▼▼
  const ZOOM_LEVELS = [1, 1.5, 2, 3];
  const [zoomIndex, setZoomIndex] = useState(0);

  const isZoomedIn = zoomIndex > 0;
  
  // ▼▼▼ 変更点2: 既存のハンドラ関数を正しく維持 ▼▼▼
  const togglePopover = (scheduleId: number) => {
    setOpenPopoverIds(prev => prev.includes(scheduleId) ? prev.filter(id => id !== scheduleId) : [scheduleId]); // 一度に一つだけ開く
  };
  
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!contentAreaRef.current) return;
    const contentAreaRect = contentAreaRef.current.getBoundingClientRect();
    const top = event.clientY - contentAreaRect.top + contentAreaRef.current.scrollTop;
    const left = event.clientX - contentAreaRect.left + contentAreaRef.current.scrollLeft;
    setAnchorPosition({ top, left });
  };

  const timeLabels = Array.from({ length: 14 }, (_, i) => i * 2);
  const bitLabels = Array.from({ length: 33 }, (_, i) => 33 + i);
  const CHART_START_BIT = 33;
  
  const AXIS_LABEL_WIDTH = 32;
  const AXIS_LABEL_HEIGHT = 28;
  
  // ▼▼▼ 変更点2: サイズ計算のロジックを全面的に修正 ▼▼▼
  const currentZoomLevel = ZOOM_LEVELS[zoomIndex];
  
  // 1. まず、ズームレベル1倍（全画面表示）のときの基本サイズを常に計算する
  const fullViewBitWidth = (viewSize.width - AXIS_LABEL_WIDTH) / bitLabels.length;
  const fullViewHourHeight = (viewSize.height - AXIS_LABEL_HEIGHT) / (timeLabels.length * 2 - 2);

  // 2. その基本サイズに、現在のズーム倍率を掛けるだけのシンプルな計算に変更
  const BIT_WIDTH_PX = fullViewBitWidth * currentZoomLevel;
  const HOUR_HEIGHT_PX = fullViewHourHeight * currentZoomLevel;
  
  const totalChartWidth = bitLabels.length * BIT_WIDTH_PX;
  const totalChartHeight = (timeLabels.length - 1) * 2 * HOUR_HEIGHT_PX;
  // ▲▲▲ ここまで修正 ▲▲▲

  const topAxisRef = useRef<HTMLDivElement>(null);
  const leftAxisRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const lastDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    const contentArea = contentAreaRef.current;
    if (!contentArea || !isZoomedIn) return;
    const handleScroll = () => {
      if (topAxisRef.current) topAxisRef.current.scrollLeft = contentArea.scrollLeft;
      if (leftAxisRef.current) leftAxisRef.current.scrollTop = contentArea.scrollTop;
    };
    contentArea.addEventListener('scroll', handleScroll);
    return () => contentArea.removeEventListener('scroll', handleScroll);
  }, [isZoomedIn]);
  
  // ▼▼▼ 変更点4: ピンチ操作用のuseEffect ▼▼▼
  useEffect(() => {
    const contentArea = contentAreaRef.current;
    if (!contentArea) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastDistanceRef.current !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        const diff = currentDistance - lastDistanceRef.current;
        if (Math.abs(diff) > 20) {
          if (diff > 0) {
            setZoomIndex(prev => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
          } else {
            setZoomIndex(prev => Math.max(prev - 1, 0));
          }
          lastDistanceRef.current = currentDistance;
        }
      }
    };
    const handleTouchEnd = () => { lastDistanceRef.current = null; };
    contentArea.addEventListener('touchstart', handleTouchStart);
    contentArea.addEventListener('touchmove', handleTouchMove, { passive: false });
    contentArea.addEventListener('touchend', handleTouchEnd);
    contentArea.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      contentArea.removeEventListener('touchstart', handleTouchStart);
      contentArea.removeEventListener('touchmove', handleTouchMove);
      contentArea.removeEventListener('touchend', handleTouchEnd);
      contentArea.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [ZOOM_LEVELS]);

  const fullViewBitLabels = [35, 40, 45, 50, 55, 60, 65];

  return (
    <div className="relative h-full w-full">
      <div className="grid h-full w-full" style={{ gridTemplateColumns: `${AXIS_LABEL_WIDTH}px 1fr`, gridTemplateRows: `${AXIS_LABEL_HEIGHT}px 1fr` }}>
        <div className="bg-white z-20 border-b border-r border-gray-200"></div>
        <div ref={topAxisRef} className="overflow-hidden bg-white z-10 border-b border-gray-200">
          <div className="relative" style={{ width: totalChartWidth, height: '100%' }}>
            {(isZoomedIn ? bitLabels : fullViewBitLabels).map((label) => (
              <div key={`bl-${label}`} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-sm text-gray-700 transition-opacity" 
                   style={{ left: (label - CHART_START_BIT) * BIT_WIDTH_PX }}>
                {label}
              </div>
            ))}
          </div>
        </div>
        <div ref={leftAxisRef} className="overflow-hidden bg-white z-10 border-r border-gray-200">
          <div className="relative" style={{ width: '100%', height: totalChartHeight }}>
            {timeLabels.map((label, i) => (
              <div key={`tl-${i}`} className="absolute -translate-y-1/2 text-xs text-gray-500 transition-opacity" style={{ top: i * 2 * HOUR_HEIGHT_PX, right: 4 }}>{label}</div>
            ))}
          </div>
        </div>
        {/* ▼▼▼ 変更点5: onDoubleClickを削除 ▼▼▼ */}
        <div ref={contentAreaRef} className={`${isZoomedIn ? 'overflow-auto' : 'overflow-hidden'} overscroll-behavior-none`}>
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
            const chartEnd_m = bitNotationToMeters(`${65}`)!;
            if (Math.max(bow_m, stern_m) < chartStart_m) {
              return null;
            }
            const left_m = Math.max(Math.min(bow_m, stern_m), chartStart_m);
            const right_m = Math.min(Math.max(bow_m, stern_m), chartEnd_m);
            const width_m = right_m - left_m;
            if (width_m <= 0) return null;
            const left_bit = metersToBitPosition(left_m);
            const right_bit = metersToBitPosition(left_m + width_m);
            const left = (left_bit - CHART_START_BIT) * BIT_WIDTH_PX;
            const width = (right_bit - left_bit) * BIT_WIDTH_PX;

              return (
                <PopoverPrimitive.Root 
                  key={schedule.id}
                  open={openPopoverIds.includes(schedule.id)}
                  onOpenChange={() => togglePopover(schedule.id)}
                >
                  <PopoverPrimitive.Trigger asChild>
                    <div 
                      className="absolute flex items-center justify-center rounded border bg-sky-100/80 p-1 text-sky-800 cursor-pointer" 
                      style={{ top, height, left, width, minWidth: isZoomedIn ? 28 : 0 }}
                      onPointerDown={handlePointerDown}
                    >
                    <div className={`flex items-center gap-1 font-bold break-words text-center ${!isZoomedIn ? 'text-[8px] leading-tight' : 'text-[10px]'}`}>
                      <span>{schedule.arrival_side === '左舷' ? '←' : ''}</span>
                      <span className={isZoomedIn ? 'text-xs' : ''}>
                        {schedule.ship_name}
                      </span>
                      <span>{schedule.arrival_side === '右舷' ? '→' : ''}</span>
                    </div>
                    </div>
                  </PopoverPrimitive.Trigger>
                  
                  <PopoverPrimitive.Anchor 
                    className="absolute" 
                    style={{ top: anchorPosition.top, left: anchorPosition.left }} 
                  />
                  <PopoverPrimitive.Portal container={contentAreaRef.current}>
                    <PopoverContent 
                      className="w-full max-w-xs sm:w-72"
                      side="top" align="end" collisionPadding={8} sideOffset={12} 
                    >
                      <ScheduleDetailPopoverContent schedule={schedule} />
                    </PopoverContent>
                  </PopoverPrimitive.Portal>
                </PopoverPrimitive.Root>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-2">
        <Button size="icon" onClick={() => setZoomIndex(prev => Math.min(prev + 1, ZOOM_LEVELS.length - 1))}>
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button size="icon" onClick={() => setZoomIndex(prev => Math.max(prev - 1, 0))}>
          <ZoomOut className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="outline" onClick={() => setZoomIndex(0)}>
          <Maximize className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}