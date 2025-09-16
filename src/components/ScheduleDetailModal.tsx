"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import { metersToBitNotation } from '@/lib/coordinateConverter';

interface ScheduleDetailModalProps {
  schedule: ScheduleWithOperations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-2 border-b py-2">
    <dt className="text-sm text-gray-500">{label}</dt>
    <dd className="col-span-2 text-sm font-medium">{value}</dd>
  </div>
);

export function ScheduleDetailModal({ schedule, open, onOpenChange }: ScheduleDetailModalProps) {
  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{schedule.ship_name}</DialogTitle>
          <DialogDescription>
            {schedule.schedule_date} の予定詳細
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[70vh] overflow-y-auto">
          <dl>
            <DetailRow label="岸壁" value={`${schedule.berth_number}岸`} />
            <DetailRow label="着岸時間" value={new Date(schedule.arrival_time.replace(' ','T')).toLocaleString('ja-JP')} />
            <DetailRow label="離岸時間" value={new Date(schedule.departure_time.replace(' ','T')).toLocaleString('ja-JP')} />
            <DetailRow label="方向" value={schedule.arrival_side === '左舷' ? '入' : '出'} />
            <DetailRow label="おもて" value={metersToBitNotation(Number(schedule.bow_position_m))} />
            <DetailRow label="とも" value={metersToBitNotation(Number(schedule.stern_position_m))} />
            <DetailRow label="プランナ" value={schedule.planner_company || '-'} />
            <DetailRow label="備考" value={schedule.remarks || '-'} />
          </dl>

          {schedule.cargo_operations.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold border-b pb-2">荷役作業</h3>
              <div className="mt-2 space-y-2">
                {schedule.cargo_operations.map(op => (
                  <div key={op.id} className="text-sm p-2 border rounded-md">
                    <p><strong>荷役開始:</strong> {op.start_time ? new Date(op.start_time.replace(' ','T')).toLocaleTimeString('ja-JP') : '-'}</p>
                    <p><strong>使用GC:</strong> {op.crane_names || '-'}</p>
                    <p><strong>本数:</strong> {op.container_count || '-'}</p>
                    <p><strong>GC運転:</strong> {op.stevedore_company || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}