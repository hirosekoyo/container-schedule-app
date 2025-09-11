"use client";

import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useState, useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from './ui/button';
import { Trash2, PlusCircle } from 'lucide-react';
import { deleteSchedule } from '@/lib/supabase/actions';

interface ScheduleTableProps {
  schedules: ScheduleWithOperations[];
  latestImportId: string | null;
  onScheduleClick: (schedule: ScheduleWithOperations | null) => void;
  isPrintView?: boolean; // 印刷表示かどうかのフラグ
}

const metersToBitNotation = (meters: number | null | undefined): string => {
  if (meters === null || meters === undefined || isNaN(meters)) return '-';
  const BIT_LENGTH_M = 30;
  let baseBit = Math.floor(meters / BIT_LENGTH_M);
  let remainderMeters = Math.round(meters - (baseBit * BIT_LENGTH_M));
  if (remainderMeters >= 16) {
    baseBit += 1;
    remainderMeters -= BIT_LENGTH_M;
  }
  const sign = remainderMeters >= 0 ? '+' : '-';
  const absRemainder = Math.abs(remainderMeters);
  return `${baseBit}${sign}${String(absRemainder).padStart(2, '0')}`;
};
/**
 * 着岸・離岸時間用の2段表示コンポーネント
 */
const DateTimeDisplay: React.FC<{ scheduleDateStr: string | null; eventTimeStr: string | null }> = ({
  scheduleDateStr,
  eventTimeStr,
}) => {
  if (!scheduleDateStr || !eventTimeStr) return <span>-</span>;

  const eventDateObj = new Date(eventTimeStr.replace(' ', 'T'));
  const scheduleDateObj = new Date(scheduleDateStr);

  const eventDay = eventDateObj.getDate();
  const scheduleDay = scheduleDateObj.getDate();

  const timeString = eventDateObj.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  
  if (eventDay !== scheduleDay) {
    const dateString = `${String(eventDateObj.getDate()).padStart(2, '0')}日`;
    return (
      <span className="leading-tight">
        <span className="text-xs text-muted-foreground">{dateString}</span>
        <br />
        {timeString}
      </span>
    );
  }
  return <span>{timeString}</span>;
};

/**
 * 荷役開始時間用の1段表示コンポーネント
 */
const TimeOnlyDisplay: React.FC<{ scheduleDateStr: string | null; eventTimeStr: string | null }> = ({
  scheduleDateStr,
  eventTimeStr,
}) => {
  if (!scheduleDateStr || !eventTimeStr) return <span>-</span>;

  const eventDateObj = new Date(eventTimeStr.replace(' ', 'T'));
  const scheduleDateObj = new Date(scheduleDateStr);

  const eventDay = eventDateObj.getDate();
  const scheduleDay = scheduleDateObj.getDate();

  const timeString = eventDateObj.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  
  if (eventDay !== scheduleDay) {
    const dateString = `${String(eventDateObj.getDate()).padStart(2, '0')}日`;
    return (
      <span>
        <span className="text-xs text-muted-foreground">{dateString}</span>
        <span> {timeString}</span>
      </span>
    );
  }
  
  return <span>{timeString}</span>;
};

const ScheduleTable: React.FC<ScheduleTableProps> = ({ schedules, latestImportId, onScheduleClick, isPrintView = false }) => {
  const [isPending, startTransition] = useTransition();

  const handleDeleteClick = (e: React.MouseEvent, scheduleId: number, shipName: string) => {
    e.stopPropagation();
    if (window.confirm(`「${shipName}」の予定を削除しますか？`)) {
      startTransition(async () => {
        const { error } = await deleteSchedule(scheduleId);
        if (error) { alert(`削除中にエラーが発生しました: ${error.message}`); } 
        else { alert('予定が削除されました。'); }
      });
    }
  };

  return (
    <div className={`w-full h-full overflow-hidden rounded-lg border ${isPrintView ? 'print-table' : ''}`}>
      <Table>
        <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead style={{ width: isPrintView ? '2%' : '80px' }}>岸壁</TableHead>
              <TableHead style={{ width: isPrintView ? '18%' : '200px' }}>船名</TableHead>
              <TableHead style={{ width: isPrintView ? '4%' : '' }}>着岸時間</TableHead>
              <TableHead style={{ width: isPrintView ? '4%' : '' }}>離岸時間</TableHead>
              <TableHead style={{ width: isPrintView ? '2%' : '' }}>方向</TableHead>
              <TableHead style={{ width: isPrintView ? '5%' : '' }}>おもて</TableHead>
              <TableHead style={{ width: isPrintView ? '5%' : '' }}>とも</TableHead>
              <TableHead style={{ width: isPrintView ? '8%' : '' }}>荷役開始</TableHead>
              <TableHead style={{ width: isPrintView ? '2%' : '' }}>G</TableHead>
              <TableHead style={{ width: isPrintView ? '7%' : '' }}>使用GC</TableHead>
              <TableHead style={{ width: isPrintView ? '3%' : '' }}>本数</TableHead>
              <TableHead style={{ width: isPrintView ? '4%' : '' }}>GC 運転</TableHead>
              <TableHead style={{ width: isPrintView ? '4%' : '' }}>プラ ンナ</TableHead>
              <TableHead style={{ width: isPrintView ? '30%' : '' }}>備考</TableHead>
              {/* {!isPrintView && <TableHead className="w-[80px]">操作</TableHead>} */}
              {!isPrintView && <TableHead className="w-[80px]"></TableHead>}
            </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => {
              const operations = schedule.cargo_operations || [];
              const craneNames = operations.map(op => op.crane_names ?? '-').join('\n');
              const containerCounts = operations.map(op => op.container_count ?? '-').join('\n');
              const stevedoreCompanies = operations.map(op => op.stevedore_company ?? '-').join('\n');
              let rowClassName = '';
              if (latestImportId) {
                if (schedule.last_import_id !== latestImportId) rowClassName = 'bg-red-100/60';
                else if (schedule.update_flg) rowClassName = 'bg-yellow-100/60';
              }
              
            return (
              <TableRow 
                key={`${schedule.id}-${schedule.schedule_date}`} 
                className={`${rowClassName} cursor-pointer hover:bg-gray-100/80 transition-colors`}
                onClick={() => onScheduleClick(schedule)}
              >
                  <TableCell>{schedule.berth_number}</TableCell>
                  <TableCell >{schedule.ship_name}</TableCell>
                  <TableCell><DateTimeDisplay scheduleDateStr={schedule.schedule_date} eventTimeStr={schedule.arrival_time} /></TableCell>
                  <TableCell><DateTimeDisplay scheduleDateStr={schedule.schedule_date} eventTimeStr={schedule.departure_time} /></TableCell>
                  <TableCell>
                    {schedule.arrival_side === '左舷' ? '入' : 
                     schedule.arrival_side === '右舷' ? '出' : '-'}
                  </TableCell>
                  <TableCell>{metersToBitNotation(Number(schedule.bow_position_m))}</TableCell>
                  <TableCell>{metersToBitNotation(Number(schedule.stern_position_m))}</TableCell>
                  <TableCell className="whitespace-pre-line">
                    {operations.length > 0 ? (
                      operations.map(op => (
                        <div key={op.id}><TimeOnlyDisplay  scheduleDateStr={schedule.schedule_date} eventTimeStr={op.start_time} /></div>
                      )).reduce((prev, curr) => <>{prev}{curr}</>, <></>)
                    ) : '-'}
                  </TableCell>
                  <TableCell>{operations.length > 0 ? operations.length : '-'}</TableCell>
                  <TableCell className="whitespace-pre-line">{craneNames}</TableCell>
                  <TableCell className="whitespace-pre-line">{containerCounts}</TableCell>
                  <TableCell className="whitespace-pre-line">{stevedoreCompanies}</TableCell>
                  <TableCell>{schedule.planner_company || '-'}</TableCell>
                  <TableCell className="whitespace-pre-wrap align-middle">
                    {schedule.remarks || ''}
                  </TableCell>
                  {/* 4. isPrintViewがfalseの場合のみ「操作」セルを表示 */}
                  {!isPrintView && (
                    <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteClick(e, schedule.id, schedule.ship_name)}
                      disabled={isPending}
                      className="hover:bg-red-100"
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
              </TableRow>
            );
          })}
          {/* 5. isPrintViewがfalseの場合のみ「新規作成行」を表示 */}
          {!isPrintView && (
            <TableRow 
              className="cursor-pointer hover:bg-green-50"
              onClick={() => onScheduleClick(null)}
            >
              <TableCell colSpan={14} className="text-center text-green-600 font-semibold">
                <div className="flex items-center justify-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span>新規追加</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ScheduleTable;