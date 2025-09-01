import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface ScheduleTableProps {
  schedules: ScheduleWithOperations[];
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
 * 日付と時刻を表示するためのヘルパーコンポーネント
 */
const TimeDisplay: React.FC<{ scheduleDateStr: string | null; eventTimeStr: string }> = ({
  scheduleDateStr,
  eventTimeStr,
}) => {
  if (!scheduleDateStr) return null;

  const eventDateObj = new Date(eventTimeStr);
  const scheduleDateObj = new Date(`${scheduleDateStr}T00:00:00Z`);

  const eventDay = eventDateObj.getUTCDate();
  const scheduleDay = scheduleDateObj.getUTCDate();

  const timeString = eventDateObj.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  if (eventDay !== scheduleDay) {
    const dateString = `${String(eventDateObj.getUTCDate()).padStart(2, '0')}日`;
    return (
      // div と text-center をやめて、spanとbrだけで構成する
      <span className="leading-tight">
        <span className="text-xs text-muted-foreground">{dateString}</span>
        <br />
        {timeString}
      </span>
    );
  }

  return <span>{timeString}</span>;
};

const ScheduleTable: React.FC<ScheduleTableProps> = ({ schedules }) => {
  return (
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
            <TableHead className="w-[180px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => {
            const operations = schedule.cargo_operations || [];
            const startTimes = operations.map(op => 
              op.start_time 
                ? new Date(op.start_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) 
                : '-'
            ).join('\n');
            const craneNames = operations.map(op => op.crane_names ?? '-').join('\n');
            const containerCounts = operations.map(op => op.container_count ?? '-').join('\n');
            const stevedoreCompanies = operations.map(op => op.stevedore_company ?? '-').join('\n');
            const remarks = operations.map(op => op.remarks ?? '').join('\n');

            return (
              <TableRow key={`${schedule.id}-${schedule.schedule_date}`}>
                <TableCell>{schedule.berth_number}岸</TableCell>
                <TableCell className="font-medium">{schedule.ship_name}</TableCell>
                <TableCell>
                  <TimeDisplay scheduleDateStr={schedule.schedule_date} eventTimeStr={schedule.arrival_time} />
                </TableCell>
                <TableCell>
                  <TimeDisplay scheduleDateStr={schedule.schedule_date} eventTimeStr={schedule.departure_time} />
                </TableCell>
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      編集
                    </Button>
                    <Button variant="destructive" size="sm">
                      削除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ScheduleTable;