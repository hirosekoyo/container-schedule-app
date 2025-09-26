"use client";

import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React, { useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from './ui/button';
import { Trash2, PlusCircle, Check } from 'lucide-react';
import { deleteSchedule, acknowledgeScheduleChange } from '@/lib/supabase/actions';
import { metersToBitNotation } from '@/lib/coordinateConverter';

interface ScheduleTableProps {
  schedules: ScheduleWithOperations[];
  latestImportId: string | null;
  onScheduleClick: (schedule: ScheduleWithOperations | null) => void;
  isPrintView?: boolean;
}

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
      });
    }
  };

  const handleAcknowledgeClick = (e: React.MouseEvent, scheduleId: number) => {
    e.stopPropagation();
    startTransition(async () => {
      const { error } = await acknowledgeScheduleChange(scheduleId);
      if (error) {
        alert(`確認処理中にエラーが発生しました: ${error.message}`);
      }
    });
  };

  return (
    <div className={`w-full h-full overflow-hidden rounded-lg border ${isPrintView ? 'print-table' : ''}`}>
      <Table>
        {/* ▼▼▼ 変更箇所: ヘッダーを2段構成に変更 ▼▼▼ */}
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '2%' : '80px' }}>岸壁</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '15%' : '200px' }}>船名</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '5%' : '' }}>着岸 時間</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '5%' : '' }}>離岸 時間</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '2%' : '' }}>方向</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '6%' : '' }}>おもて</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '6%' : '' }}>とも</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '8%' : '' }}>荷役開始</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '2%' : '' }}>G</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '7%' : '' }}>使用GC</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '4%' : '' }}>本数</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '5%' : '' }}>運転</TableHead>
            <TableHead rowSpan={2} style={{ width: isPrintView ? '4%' : '' }}>プランナ</TableHead>
            
            <TableHead colSpan={2} className="text-center">PILOT TUG</TableHead>
            {isPrintView && (
              <TableHead colSpan={3} className="text-center">強風連絡</TableHead>
            )}
            
            <TableHead rowSpan={2} style={{ width: isPrintView ? '18%' : '' }}>備考</TableHead>
            {!isPrintView && <TableHead rowSpan={2} className="w-[80px]"></TableHead>}
          </TableRow>
          <TableRow>
            <TableHead className="text-center" style={{ width: isPrintView ? '2%' : '' }}>P</TableHead>
            <TableHead className="text-center" style={{ width: isPrintView ? '2%' : '' }}>T</TableHead>
            {isPrintView && (
              <>
                <TableHead className="text-center" style={{ width: isPrintView ? '3%' : '' }}>10m</TableHead>
                <TableHead className="text-center" style={{ width: isPrintView ? '3%' : '' }}>16m</TableHead>
                <TableHead className="text-center" style={{ width: isPrintView ? '3%' : '' }}>20m</TableHead>
              </>
            )}
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
                if (schedule.last_import_id !== latestImportId) {
                  rowClassName = 'bg-red-100/60';
                }
              }
              const changedFields = (schedule.changed_fields as string[] | null) || [];
              const getCellClass = (fieldName: string) => {
                return changedFields.includes(fieldName) ? 'bg-yellow-100/80' : '';
              };

              const interactivityClasses = isPrintView 
                ? '' 
                : 'cursor-pointer hover:bg-gray-100/80 transition-colors';

            return (
              <TableRow 
                key={`${schedule.id}-${schedule.schedule_date}`} 
                className={`${rowClassName} ${interactivityClasses}`}
                onClick={() => !isPrintView && onScheduleClick(schedule)}
              >
                  <TableCell className={getCellClass('berth_number')}>{`${schedule.berth_number}${isPrintView ? '' : '岸'}`}</TableCell>
                  <TableCell className={`font-medium ${getCellClass('ship_name')}`}>{schedule.ship_name}</TableCell>
                  <TableCell className={getCellClass('arrival_time')}><DateTimeDisplay scheduleDateStr={schedule.schedule_date} eventTimeStr={schedule.arrival_time} /></TableCell>
                  <TableCell className={getCellClass('departure_time')}><DateTimeDisplay scheduleDateStr={schedule.schedule_date} eventTimeStr={schedule.departure_time} /></TableCell>
                  <TableCell className={getCellClass('arrival_side')}>{schedule.arrival_side === '左舷' ? '入' : '出'}</TableCell>
                  <TableCell className={getCellClass('bow_position_m')}>{metersToBitNotation(Number(schedule.bow_position_m))}</TableCell>
                  <TableCell className={getCellClass('stern_position_m')}>{metersToBitNotation(Number(schedule.stern_position_m))}</TableCell>
                  <TableCell className="whitespace-pre-line">
                    {operations.length > 0 ? (
                      operations.map(op => (
                        <div key={op.id}><TimeOnlyDisplay  scheduleDateStr={schedule.schedule_date} eventTimeStr={op.start_time} /></div>
                      )).reduce((prev, curr) => <>{prev}{curr}</>, <></>)
                    ) : '-'}
                  </TableCell>
                  <TableCell className="align-middle">{operations.length > 0 ? operations.length : '-'}</TableCell>
                  <TableCell className="whitespace-pre-line">{craneNames}</TableCell>
                  <TableCell className="whitespace-pre-line">{containerCounts}</TableCell>
                  <TableCell className="whitespace-pre-line">{stevedoreCompanies}</TableCell>
                  <TableCell className={getCellClass('planner_company')}>{schedule.planner_company || '-'}</TableCell>
                  
                  {/* ▼▼▼ ここからが変更箇所です ▼▼▼ */}
                  <TableCell className={getCellClass('pilot') + ' text-center'}>{schedule.pilot ? '有' : '無'}</TableCell>
                  <TableCell className={getCellClass('tug') + ' text-center'}>{schedule.tug ? '有' : '無'}</TableCell>
                  {/* ▲▲▲ ここまで変更 ▲▲▲ */}

                  {isPrintView && (
                    <>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </>
                  )}

                  <TableCell className="whitespace-pre-wrap align-middle break-words">{schedule.remarks || ''}</TableCell>
                  
                  {!isPrintView && (
                    <TableCell className="text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        {changedFields.length > 0 && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => handleAcknowledgeClick(e, schedule.id)}
                            disabled={isPending}
                            className="h-8 w-8 bg-yellow-100 hover:bg-yellow-200"
                            title="変更を確認済みにしてハイライトを消す"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon"
                          onClick={(e) => handleDeleteClick(e, schedule.id, schedule.ship_name)}
                          disabled={isPending} className="h-8 w-8 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
              </TableRow>
            );
          })}
          {!isPrintView && (
            <TableRow 
              className="cursor-pointer hover:bg-green-50"
              onClick={() => onScheduleClick(null)}
            >
              <TableCell colSpan={isPrintView ? 19 : 17} className="text-center text-green-600 font-semibold">
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