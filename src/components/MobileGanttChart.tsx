"use client";

import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useState } from 'react'; // useStateをインポート
import { bitNotationToMeters, metersToBitNotation } from '@/lib/coordinateConverter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

interface MobileGanttChartProps {
  schedules: ScheduleWithOperations[];
  baseDate: string;
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
// --- 吹き出しの中身を描画する新しいコンポーネント ---
const ScheduleDetailPopoverContent: React.FC<{ schedule: ScheduleWithOperations }> = ({ schedule }) => (
  <div className="p-2 space-y-2">
    <h3 className="font-bold text-md border-b pb-1">{schedule.ship_name}</h3>
    <Table>
      <TableBody>
        <TableRow><TableCell className="font-medium text-muted-foreground w-1/3">着岸</TableCell><TableCell>{new Date(schedule.arrival_time.replace(' ','T')).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell></TableRow>
        <TableRow><TableCell className="font-medium text-muted-foreground">離岸</TableCell><TableCell>{new Date(schedule.departure_time.replace(' ','T')).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell></TableRow>
        <TableRow><TableCell className="font-medium text-muted-foreground">おもて</TableCell><TableCell>{metersToBitNotation(Number(schedule.bow_position_m))}</TableCell></TableRow>
        <TableRow><TableCell className="font-medium text-muted-foreground">とも</TableCell><TableCell>{metersToBitNotation(Number(schedule.stern_position_m))}</TableCell></TableRow>
        <TableRow><TableCell className="font-medium text-muted-foreground">備考</TableCell><TableCell className="whitespace-pre-wrap">{schedule.remarks || '-'}</TableCell></TableRow>
      </TableBody>
    </Table>
  </div>
);

export function MobileGanttChart({ schedules, baseDate }: MobileGanttChartProps) {
  // どの船のPopoverが開いているかを管理するstate
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null);

  const timeLabels = Array.from({ length: 14 }, (_, i) => (i * 2) % 24);
  const bitLabels = Array.from({ length: 32 }, (_, i) => 33 + i);
  const HOUR_HEIGHT_PX = 40;
  const BIT_WIDTH_PX = 56;
  const totalChartWidth = (bitLabels.length) * BIT_WIDTH_PX;
  const totalChartHeight = (timeLabels.length - 1) * 2 * HOUR_HEIGHT_PX;

  return (
    <div className="relative w-full h-full overflow-auto">
      {/* --- コンテンツエリア (スクロールする部分) --- */}
      <div className="relative" style={{ width: totalChartWidth, height: totalChartHeight }}>

        {/* --- 背景グリッド (スクロールに追従) --- */}
        <div className="absolute inset-0">
          {timeLabels.map((_, i) => <div key={`h-${i}`} className="absolute w-full border-t border-gray-100" style={{ top: i * 2 * HOUR_HEIGHT_PX }} />)}
          {bitLabels.map((_, i) => <div key={`v-${i}`} className="absolute h-full border-l border-gray-100" style={{ left: i * BIT_WIDTH_PX }} />)}
        </div>
        
        {/* --- 船舶ブロックとPopover --- */}
        {schedules.map((schedule) => {
          const { startHour, endHour } = calculateBarRange(schedule, baseDate);
          if (endHour <= startHour) return null;
          
          const top = startHour * HOUR_HEIGHT_PX;
          const height = (endHour - startHour) * HOUR_HEIGHT_PX;

          const chartStart_m = bitNotationToMeters(`${33}`)!;
          const totalMetersInRange = bitNotationToMeters(`${65}`)! - chartStart_m;
          let left_m = Math.min(Number(schedule.bow_position_m), Number(schedule.stern_position_m));
          if (left_m < chartStart_m) left_m = chartStart_m;
          const width_m = Math.max(Number(schedule.bow_position_m), Number(schedule.stern_position_m)) - left_m;
          
          const left = ((left_m - chartStart_m) / totalMetersInRange) * totalChartWidth;
          const width = (width_m / totalMetersInRange) * totalChartWidth;

          return (
            <Popover key={schedule.id} open={openPopoverId === schedule.id} onOpenChange={(isOpen) => setOpenPopoverId(isOpen ? schedule.id : null)}>
              <PopoverTrigger asChild>
                <div
                  className="absolute flex items-center justify-center rounded border bg-sky-100/80 p-1 text-sky-800 cursor-pointer"
                  style={{ top, height, left, width, minWidth: BIT_WIDTH_PX }}
                >
                  <div className="flex items-center gap-1 text-[10px] font-bold break-words text-center">
                    <span>{schedule.arrival_side === '左舷' ? '←' : ''}</span>
                    <span>{schedule.ship_name}</span>
                    <span>{schedule.arrival_side === '右舷' ? '→' : ''}</span>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80" side="top" align="center">
                <ScheduleDetailPopoverContent schedule={schedule} />
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
      
      {/* --- 固定表示エリア (スクロールしない部分) --- */}
      {/* 横軸ラベル (上部に固定) */}
      <div className="sticky top-0 left-0 bg-white/80 backdrop-blur-sm z-10" style={{ width: totalChartWidth, marginLeft: '2rem', height: '1.75rem' }}>
        {bitLabels.map((label, i) => (
          <div key={`bl-${i}`} className="absolute top-0 -translate-x-1/2 text-sm text-gray-700" style={{ left: i * BIT_WIDTH_PX }}>{label}</div>
        ))}
      </div>
      {/* 縦軸ラベル (左側に固定) */}
      <div className="sticky top-0 left-0 bg-white/80 backdrop-blur-sm z-10" style={{ height: totalChartHeight, marginTop: '1.75rem', width: '2rem' }}>
        {timeLabels.map((label, i) => (
          <div key={`tl-${i}`} className="absolute text-xs text-gray-500" style={{ top: i * 2 * HOUR_HEIGHT_PX - 8, right: 4 }}>{label}</div>
        ))}
      </div>
    </div>
  );
}