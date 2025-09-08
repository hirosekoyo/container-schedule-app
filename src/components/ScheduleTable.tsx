"use client";

import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useState, useTransition } from 'react'; // import文を修正
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { EditScheduleDialog } from './EditScheduleDialog';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';
import { deleteSchedule } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';

interface ScheduleTableProps {
  schedules: ScheduleWithOperations[];
  latestImportId: string | null;
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

const TimeDisplay: React.FC<{ scheduleDateStr: string | null; eventTimeStr: string | null }> = ({
  scheduleDateStr,
  eventTimeStr,
}) => {
  if (!scheduleDateStr || !eventTimeStr) return null;

  // DBの 'YYYY-MM-DD HH:mm:ss' をパース可能な 'YYYY-MM-DDTHH:mm:ss' に変換
  const eventDateObj = new Date(eventTimeStr.replace(' ', 'T'));
  const scheduleDateObj = new Date(scheduleDateStr);

  // ローカルタイムゾーンの日付で比較
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

const ScheduleTable: React.FC<ScheduleTableProps> = ({ schedules, latestImportId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithOperations | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRowClick = (schedule: ScheduleWithOperations) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, scheduleId: number, shipName: string) => {
    e.stopPropagation();
    if (window.confirm(`「${shipName}」の予定を削除しますか？この操作は元に戻せません。`)) {
      startTransition(async () => {
        const { error } = await deleteSchedule(scheduleId);
        if (error) {
          alert(`削除中にエラーが発生しました: ${error.message}`);
        } else {
          alert('予定が削除されました。');
        }
      });
    }
  };

  return (
    <>
      <div className="w-full overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[80px]">岸壁</TableHead>
              <TableHead className="min-w-[200px]">船名</TableHead>
              <TableHead>着岸時間</TableHead>
              <TableHead>離岸時間</TableHead>
              <TableHead>方向</TableHead>
              <TableHead>おもて</TableHead>
              <TableHead>とも</TableHead>
              <TableHead>荷役開始</TableHead>
              <TableHead>G</TableHead>
              <TableHead>使用GC</TableHead>
              <TableHead>本数</TableHead>
              <TableHead>GC運転</TableHead>
              <TableHead>プランナ</TableHead>
              <TableHead className="min-w-[200px]">備考</TableHead>
              <TableHead className="w-[80px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule) => {
              const operations = schedule.cargo_operations || [];
              const startTimes = operations.map(op => 
                op.start_time 
                  ? new Date(op.start_time.replace(' ', 'T')).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                  : '-'
              ).join('\n');
              const craneNames = operations.map(op => op.crane_names ?? '-').join('\n');
              const containerCounts = operations.map(op => op.container_count ?? '-').join('\n');
              const stevedoreCompanies = operations.map(op => op.stevedore_company ?? '-').join('\n');
              const remarks = operations.map(op => op.remarks ?? '').join('\n');
              let rowClassName = '';
              if (latestImportId) {
                if (schedule.last_import_id !== latestImportId) rowClassName = 'bg-red-100/60';
                else if (schedule.update_flg) rowClassName = 'bg-yellow-100/60';
              }
              
              return (
                <TableRow 
                  key={`${schedule.id}-${schedule.schedule_date}`} 
                  className={`${rowClassName} cursor-pointer hover:bg-gray-100/80 transition-colors`}
                  onClick={() => handleRowClick(schedule)}
                >
                  <TableCell>{schedule.berth_number}岸</TableCell>
                  <TableCell className="font-medium">{schedule.ship_name}</TableCell>
                  <TableCell><TimeDisplay scheduleDateStr={schedule.schedule_date} eventTimeStr={schedule.arrival_time} /></TableCell>
                  <TableCell><TimeDisplay scheduleDateStr={schedule.schedule_date} eventTimeStr={schedule.departure_time} /></TableCell>
                  <TableCell>入</TableCell>
                  <TableCell>{metersToBitNotation(Number(schedule.bow_position_m))}</TableCell>
                  <TableCell>{metersToBitNotation(Number(schedule.stern_position_m))}</TableCell>
                  <TableCell className="whitespace-pre-line">{startTimes}</TableCell>
                  <TableCell>{operations.length > 0 ? operations.length : '-'}</TableCell>
                  <TableCell className="whitespace-pre-line">{craneNames}</TableCell>
                  <TableCell className="whitespace-pre-line">{containerCounts}</TableCell>
                  <TableCell className="whitespace-pre-line">{stevedoreCompanies}</TableCell>
                  <TableCell>{schedule.planner_company || '-'}</TableCell>
                  <TableCell className="whitespace-pre-line">{remarks}</TableCell>
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      <EditScheduleDialog
        schedule={selectedSchedule}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
};

export default ScheduleTable;