"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScheduleWithOperations, OperationInsert, ScheduleInsert, updateScheduleWithOperations, createScheduleWithOperations } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { createHash } from 'crypto';
import { DateTimePicker } from './DateTimePicker';
import { CRANE_OPTIONS, STEVEDORE_OPTIONS } from '@/lib/constants'; 
import { Combobox } from './ui/Combobox';

interface EditScheduleDialogProps {
  schedule: ScheduleWithOperations | null;
  scheduleDateForNew: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latestImportId: string | null;
}

// --- 【ここからが修正箇所】 ---
// ヘルパー関数に、前回のコードから省略されていた本体を正しく記述
const bitNotationToMeters = (notation: string): number | null => {
  const match = notation.match(/^(\d+)([+-])(\d+)$/);
  if (!match) return null;
  const mainBit = parseInt(match[1], 10), sign = match[2], remainder = parseInt(match[3], 10);
  const BIT_LENGTH_M = 30;
  let meters = mainBit * BIT_LENGTH_M;
  if (sign === '+') meters += remainder; else if (sign === '-') meters -= remainder;
  return meters;
};

const metersToBitNotation = (meters: number | null | undefined): string => {
  if (meters === null || meters === undefined || isNaN(meters)) return '';
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
// --- 【ここまで】 ---

const toDatetimeLocalString = (dbTimestamp: string | null | undefined): string => {
  if (!dbTimestamp) return '';
  return dbTimestamp.replace(' ', 'T').substring(0, 16);
};

type ScheduleFormData = Pick<ScheduleInsert, 'ship_name' | 'arrival_side' | 'planner_company' | 'berth_number' | 'remarks'> & {
  arrival_time_local: string;
  departure_time_local: string;
  bow_position_notation: string;
  stern_position_notation: string;
};
type OperationFormData = Omit<OperationInsert, 'id' | 'created_at' | 'schedule_id'> & { start_time_local?: string };

export function EditScheduleDialog({ schedule, scheduleDateForNew, open, onOpenChange, latestImportId }: EditScheduleDialogProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [scheduleData, setScheduleData] = useState<ScheduleFormData | null>(null);
  const [operationsData, setOperationsData] = useState<OperationFormData[]>([]);

  useEffect(() => {
    if (open) {
      if (schedule) { // --- 編集モード ---
        setScheduleData({
          ship_name: schedule.ship_name,
          arrival_side: schedule.arrival_side,
          planner_company: schedule.planner_company,
          berth_number: schedule.berth_number,
          arrival_time_local: toDatetimeLocalString(schedule.arrival_time),
          departure_time_local: toDatetimeLocalString(schedule.departure_time),
          bow_position_notation: metersToBitNotation(Number(schedule.bow_position_m)),
          stern_position_notation: metersToBitNotation(Number(schedule.stern_position_m)),
          remarks: schedule.remarks,
        });
        setOperationsData(schedule.cargo_operations.map(op => ({ ...op, start_time_local: toDatetimeLocalString(op.start_time) })));
      } else { // --- 新規作成モード ---
        const initialTime = `${scheduleDateForNew}T08:00`;
        setScheduleData({
          ship_name: '',
          arrival_side: '左舷',
          planner_company: '',
          berth_number: 6, // 新規作成時のデフォルト岸壁
          arrival_time_local: initialTime,
          departure_time_local: initialTime,
          bow_position_notation: '',
          stern_position_notation: '',
          remarks: '',
        });
        setOperationsData([]);
      }
    }
  }, [schedule, open, scheduleDateForNew]);
  
  const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // berth_number は数値として state に保存
    const isNumberField = name === 'berth_number';
    setScheduleData(prev => prev ? { ...prev, [name]: isNumberField ? parseInt(value, 10) : value } : null);
  };
  const handleScheduleDateTimeChange = (name: 'arrival_time_local' | 'departure_time_local', value: string) => {
    setScheduleData(prev => prev ? { ...prev, [name]: value } : null);
  };
  const handleOperationChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOperationsData(prev => prev.map((op, i) => i === index ? { ...op, [name]: value } : op));
  };
  const handleOperationDateTimeChange = (index: number, value: string) => {
    setOperationsData(prev => prev.map((op, i) => i === index ? { ...op, start_time_local: value } : op));
  };
  const handleScheduleSideChange = (value: '右舷' | '左舷') => {
    setScheduleData(prev => prev ? { ...prev, arrival_side: value } : null);
  };
  const addOperationRow = () => {
    setOperationsData(prev => [...prev, { start_time_local: scheduleData?.arrival_time_local }]);
  };
  const removeOperationRow = (index: number) => {
    setOperationsData(prev => prev.filter((_, i) => i !== index));
  };

   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scheduleData) return;
    const bow_m = bitNotationToMeters(scheduleData.bow_position_notation);
    const stern_m = bitNotationToMeters(scheduleData.stern_position_notation);
    if (bow_m === null || stern_m === null) { alert('位置の形式が不正です'); return; }
    if (!scheduleData.arrival_time_local || !scheduleData.departure_time_local) { alert('時間は必須です'); return; }

    const dataForHash = {
      ship_name: scheduleData.ship_name,
      berth_number: scheduleData.berth_number,
      arrival_time: scheduleData.arrival_time_local,
      departure_time: scheduleData.departure_time_local,
      arrival_side: scheduleData.arrival_side,
      bow_position_m: bow_m,
      stern_position_m: stern_m,
      planner_company: scheduleData.planner_company,
      remarks: scheduleData.remarks,
    };
    const hashSource = Object.values(dataForHash).join('|');
    const newDataHash = createHash('sha256').update(hashSource).digest('hex');
    
    const opsToSave = operationsData.map(op => ({
      start_time: op.start_time_local || null,
      crane_names: op.crane_names,
      container_count: op.container_count ? Number(op.container_count) : null,
      stevedore_company: op.stevedore_company,
    }));

    if (schedule) { // --- 編集モード ---
      const dataToSave = { ...dataForHash, data_hash: newDataHash, last_import_id: latestImportId };
      startTransition(async () => {
        // @ts-ignore
        const { error } = await updateScheduleWithOperations(schedule.id, dataToSave, opsToSave);
        if (!error) { alert("予定が更新されました。"); onOpenChange(false); router.refresh(); }
        else { alert(`更新中にエラーが発生しました: ${error.message}`); }
      });
    } else { // --- 新規作成モード ---
      const dataToSave = {
        ...dataForHash,
        schedule_date: scheduleDateForNew,
        data_hash: newDataHash,
        last_import_id: latestImportId,
        update_flg: false,
      };
      startTransition(async () => {
        // @ts-ignore
        const { error } = await createScheduleWithOperations(dataToSave, opsToSave);
        if (!error) { alert("新しい予定が作成されました。"); onOpenChange(false); router.refresh(); }
        else { alert(`作成中にエラーが発生しました: ${error.message}`); }
      });
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{schedule ? `予定編集: ${schedule.ship_name}` : '新規予定作成'}</DialogTitle>
          <DialogDescription>
            {schedule ? `${schedule.schedule_date}の予定を編集します。` : `${scheduleDateForNew}の予定を新規作成します。`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-6">
          
          {/* --- 【ここからが修正箇所】 --- */}

          {/* === 船舶情報 === */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">船舶情報</h3>
            {/* 1行目: 船名(8割) 岸壁(2割) */}
            <div className="grid grid-cols-10 gap-4">
              <div className="col-span-8"><Label>船名</Label><Input name="ship_name" value={scheduleData?.ship_name || ''} onChange={handleScheduleChange} /></div>
              <div className="col-span-2"><Label>岸壁</Label><Input name="berth_number" type="number" value={scheduleData?.berth_number || ''} onChange={handleScheduleChange} /></div>
            </div>
            {/* 2行目: 着岸時間(5割) 離岸時間(5割) */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>着岸時間</Label><DateTimePicker value={scheduleData?.arrival_time_local || ''} onChange={(v) => handleScheduleDateTimeChange('arrival_time_local', v)} /></div>
              <div><Label>離岸時間</Label><DateTimePicker value={scheduleData?.departure_time_local || ''} onChange={(v) => handleScheduleDateTimeChange('departure_time_local', v)} /></div>
            </div>
            {/* 3行目: 4項目を均等配置 */}
            <div className="grid grid-cols-4 gap-4">
              <div><Label>おもて</Label><Input name="bow_position_notation" placeholder="例: 33+15" value={scheduleData?.bow_position_notation || ''} onChange={handleScheduleChange} /></div>
              <div><Label>とも</Label><Input name="stern_position_notation" placeholder="例: 40-05" value={scheduleData?.stern_position_notation || ''} onChange={handleScheduleChange} /></div>
              <div>
                  <Label>舷付け</Label>
                  <Select name="arrival_side" value={scheduleData?.arrival_side || '左舷'} onValueChange={handleScheduleSideChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="左舷">左舷</SelectItem>
                      <SelectItem value="右舷">右舷</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
              <div><Label>プランナ</Label><Input name="planner_company" value={scheduleData?.planner_company || ''} onChange={handleScheduleChange} /></div>
              <div className="md:col-span-4">
              <Label>備考</Label>
              <Textarea name="remarks" value={scheduleData?.remarks || ''} onChange={handleScheduleChange as any} />
            </div>
            </div>
          </div>

          {/* === 荷役作業 === */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold">荷役作業</h3>
              <Button type="button" size="sm" variant="outline" onClick={addOperationRow}><PlusCircle className="mr-2 h-4 w-4" />作業行を追加</Button>
            </div>
            <div className="space-y-4">
              {operationsData.map((op, index) => (
                <div key={index} className="space-y-2 rounded-md border p-4">
                  {/* 1行目 */}
                  <div className="grid grid-cols-10 gap-4 items-end">
                    <div className="col-span-4"><Label>荷役開始</Label><DateTimePicker value={op.start_time_local || ''} onChange={(v) => handleOperationDateTimeChange(index, v)} /></div>
                    <div className="col-span-2"><Label>使用GC</Label><Combobox options={CRANE_OPTIONS.map(val => ({ value: val, label: val }))} value={op.crane_names || ''} onChange={(value) => handleOperationChange(index, { target: { name: 'crane_names', value } } as any)} placeholder="GCを選択..." /></div>
                    <div className="col-span-1"><Label>本数</Label><Input name="container_count" type="number" value={op.container_count || ''} onChange={(e) => handleOperationChange(index, e)} /></div>
                    <div className="col-span-2"><Label>GC運転</Label><Combobox options={STEVEDORE_OPTIONS.map(val => ({ value: val, label: val }))} value={op.stevedore_company || ''} onChange={(value) => handleOperationChange(index, { target: { name: 'stevedore_company', value } } as any)} placeholder="会社を選択..." /></div>
                    <div className="col-span-1"><Button type="button" variant="ghost" size="icon" onClick={() => removeOperationRow(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- 【ここまで修正】 --- */}
          
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "保存中..." : "更新"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}