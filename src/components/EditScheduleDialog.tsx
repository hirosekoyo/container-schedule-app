"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScheduleWithOperations, OperationInsert, ScheduleInsert, updateScheduleWithOperations, createScheduleWithOperations } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';
import { PlusCircle, Trash2, ChevronDown } from 'lucide-react'; // ChevronDownをインポート
import { Textarea } from './ui/textarea';
import { DateTimePicker } from './ui/DateTimePicker';
import { CRANE_OPTIONS, STEVEDORE_OPTIONS } from '@/lib/constants'; 
import { Combobox } from './ui/Combobox';
import { metersToBitNotation, bitNotationToMeters } from '@/lib/coordinateConverter';
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
// ▼▼▼ 変更点1: Accordionコンポーネントをインポート ▼▼▼
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


interface EditScheduleDialogProps {
  schedule: ScheduleWithOperations | null;
  scheduleDateForNew: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latestImportId: string | null;
}

const toDatetimeLocalString = (dbTimestamp: string | null | undefined): string => {
  if (!dbTimestamp) return '';
  return dbTimestamp.replace(' ', 'T').substring(0, 16);
};

type ScheduleFormData = Pick<ScheduleInsert, 'ship_name' | 'arrival_side' | 'planner_company' | 'berth_number' | 'remarks' | 'pilot' | 'tug' | 'crane_count'> & {
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
      if (schedule) {
        setScheduleData({
          ship_name: schedule.ship_name,
          arrival_side: schedule.arrival_side,
          planner_company: schedule.planner_company,
          berth_number: schedule.berth_number,
          remarks: schedule.remarks,
          pilot: schedule.pilot ?? false,
          tug: schedule.tug ?? false,
          // DBの値があればそれを優先、なければ荷役作業の行数を初期値とする
          crane_count: schedule.crane_count ?? schedule.cargo_operations.length,
          arrival_time_local: toDatetimeLocalString(schedule.arrival_time),
          departure_time_local: toDatetimeLocalString(schedule.departure_time),
          bow_position_notation: metersToBitNotation(Number(schedule.bow_position_m)),
          stern_position_notation: metersToBitNotation(Number(schedule.stern_position_m)),
        });
        setOperationsData(schedule.cargo_operations.map(op => ({ ...op, start_time_local: toDatetimeLocalString(op.start_time) })));
      } else {
        const initialTime = `${scheduleDateForNew}T08:00`;
        setScheduleData({
          ship_name: '',
          arrival_side: '左舷',
          planner_company: '',
          berth_number: 6,
          remarks: '',
          pilot: false,
          tug: false,
          crane_count: 0,
          arrival_time_local: initialTime,
          departure_time_local: initialTime,
          bow_position_notation: '',
          stern_position_notation: '',
        });
        setOperationsData([]);
      }
    }
  }, [schedule, open, scheduleDateForNew]);

  const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumberField = name === 'berth_number' || name === 'crane_count';
    setScheduleData(prev => prev ? { ...prev, [name]: isNumberField ? (value === '' ? null : parseInt(value, 10)) : value } : null);
  };
  const handleScheduleCheckboxChange = (name: 'pilot' | 'tug', checked: CheckedState) => {
    setScheduleData(prev => prev ? { ...prev, [name]: !!checked } : null);
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
  
  // ▼▼▼ ここからが修正箇所です ▼▼▼
  const addOperationRow = () => {
    const newOperations = [
      ...operationsData, 
      { 
        start_time_local: scheduleData?.arrival_time_local,
        stevedore_company: scheduleData?.planner_company
      }
    ];
    setOperationsData(newOperations);
    // 状態更新後の新しい行数をセットする
    setScheduleData(prev => prev ? { ...prev, crane_count: newOperations.length } : null);
  };
  
  const removeOperationRow = (index: number) => {
    const newOperations = operationsData.filter((_, i) => i !== index);
    setOperationsData(newOperations);
    // 状態更新後の新しい行数をセットする
    setScheduleData(prev => prev ? { ...prev, crane_count: newOperations.length } : null);
  };
  // ▲▲▲ ここまで修正 ▲▲▲

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!scheduleData) return;

    const bow_m_float = bitNotationToMeters(scheduleData.bow_position_notation);
    const stern_m_float = bitNotationToMeters(scheduleData.stern_position_notation);
    if (bow_m_float === null || stern_m_float === null) { alert('位置の形式が不正です'); return; }
    if (!scheduleData.arrival_time_local || !scheduleData.departure_time_local) { alert('時間は必須です'); return; }

    const bow_m = Math.floor(bow_m_float);
    const stern_m = Math.floor(stern_m_float);

    const formatForDB = (localString: string): string => {
      // この関数はnullを返さないことを保証する (呼び出し元でnullチェック済みのため)
      return `${localString.replace('T', ' ')}:00`;
    };

    // ▼▼▼ ここからが最終的な修正箇所です ▼▼▼

 // 1. data_hashの元となるデータを定義
    const dataForHash = {
      location: schedule?.location || 'IC',
      ship_name: scheduleData.ship_name,
      berth_number: scheduleData.berth_number,
      arrival_time: formatForDB(scheduleData.arrival_time_local),
      departure_time: formatForDB(scheduleData.departure_time_local),
      arrival_side: scheduleData.arrival_side,
      bow_position_m: bow_m,
      stern_position_m: stern_m,
      planner_company: scheduleData.planner_company,
    };
    const newDataHash = Object.values(dataForHash).join('|');
    
    // 2. 最終的に保存するオブジェクトを構築
    const dataToSave = {
      ...dataForHash,
      remarks: scheduleData.remarks,
      pilot: scheduleData.pilot,
      tug: scheduleData.tug,
      crane_count: scheduleData.crane_count,
      data_hash: newDataHash,
      last_import_id: latestImportId,
      changed_fields: null,
    };
    
    const opsToSave = operationsData.map(op => ({
      start_time: op.start_time_local || null,
      crane_names: op.crane_names,
      container_count: op.container_count ? Number(op.container_count) : null,
      stevedore_company: op.stevedore_company,
    }));

    if (schedule) {
      // --- 編集モード ---
      startTransition(async () => {
        // 更新時には不要な schedule_date を除外
        const { schedule_date, ...updateData } = { ...dataToSave, schedule_date: schedule.schedule_date };
        const { error } = await updateScheduleWithOperations(schedule.id, updateData, opsToSave);
        if (!error) { onOpenChange(false); router.refresh(); }
        else { alert(`更新中にエラーが発生しました: ${error.message}`); }
      });
    } else { 
      // --- 新規作成モード ---
      const createDataToSave = {
        ...dataToSave,
        schedule_date: scheduleDateForNew,
        // ここで location が絶対に null/undefined にならないことを保証する
        location: dataToSave.location || 'IC' 
      };
      startTransition(async () => {
        const { error } = await createScheduleWithOperations(createDataToSave, opsToSave);
        if (!error) { alert("新しい予定が作成されました。"); onOpenChange(false); router.refresh(); }
        else { 
          alert(`作成中にエラーが発生しました: ${error.message}`); 
        }
      });
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{schedule ? `予定編集: ${schedule.ship_name}` : '新規予定作成'}</DialogTitle>
          <DialogDescription>
            {schedule ? `${schedule.schedule_date}の予定を編集します。` : `${scheduleDateForNew}の予定を新規作成します。`}
          </DialogDescription>
        </DialogHeader>

        <form id="edit-schedule-form" onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-6 flex-grow">
          
          {/* ▼▼▼ 変更点2: 船舶情報をAccordionでラップ ▼▼▼ */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <h3 className="text-lg font-semibold">船舶情報</h3>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {/* 1行目: 船名 と 岸壁 */}
                  <div className="grid grid-cols-10 gap-4">
                    <div className="col-span-8"><Label>船名</Label><Input name="ship_name" value={scheduleData?.ship_name || ''} onChange={handleScheduleChange} /></div>
                    <div className="col-span-2"><Label>岸壁</Label><Input name="berth_number" type="number" value={scheduleData?.berth_number || ''} onChange={handleScheduleChange} /></div>
                  </div>
                  {/* 2行目: 着岸時間 と 離岸時間 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>着岸時間</Label><DateTimePicker value={scheduleData?.arrival_time_local || ''} onChange={(v) => handleScheduleDateTimeChange('arrival_time_local', v)} /></div>
                    <div><Label>離岸時間</Label><DateTimePicker value={scheduleData?.departure_time_local || ''} onChange={(v) => handleScheduleDateTimeChange('departure_time_local', v)} /></div>
                  </div>
                  {/* 3行目: おもて, とも, 舷付け, プランナ */}
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
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* === 荷役作業 === */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold">荷役作業</h3>
              <Button type="button" size="sm" variant="outline" onClick={addOperationRow}><PlusCircle className="mr-2 h-4 w-4" />作業を追加</Button>
            </div>
            <div className="space-y-4">
              {operationsData.map((op, index) => (
                <div key={index} className="space-y-2 rounded-md border p-4">
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

          {/* ▼▼▼ 変更点3: G数、備考、Pilot/Tugを新しい行に移動 ▼▼▼ */}
          <div className="grid grid-cols-10 gap-4 items-start pt-4">
            <div className="col-span-1">
              <Label>G数</Label>
              <Input name="crane_count" type="number" value={scheduleData?.crane_count ?? ''} onChange={handleScheduleChange} />
            </div>
            <div className="col-span-7">
              <Label>備考</Label>
              <Textarea name="remarks" value={scheduleData?.remarks || ''} onChange={handleScheduleChange as any} />
            </div>
            <div className="col-span-2 pt-6">
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox id="pilot" checked={scheduleData?.pilot} onCheckedChange={(checked) => handleScheduleCheckboxChange('pilot', checked)} />
                <Label htmlFor="pilot" className="font-medium">PILOT</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="tug" checked={scheduleData?.tug} onCheckedChange={(checked) => handleScheduleCheckboxChange('tug', checked)} />
                <Label htmlFor="tug" className="font-medium">TUG</Label>
              </div>
            </div>
          </div>

        </form>

        <DialogFooter className="pt-4 flex-shrink-0">
          <Button type="submit" form="edit-schedule-form" disabled={isPending}>
            {isPending ? "更新中..." : "更新"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}