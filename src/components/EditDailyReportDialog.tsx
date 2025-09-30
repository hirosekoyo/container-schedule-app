"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DailyReport, upsertDailyReport, getLatestTenkenkubun } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';
import { CRANE_OPTIONS, tenkenkubun, STEVEDORE_OPTIONS, TIME_OPTIONS_30_MINUTES } from '@/lib/constants';
import { Combobox } from './ui/Combobox';
import { TimePicker } from './ui/TimePicker';
import { X } from 'lucide-react';

interface EditDailyReportDialogProps {
  report: DailyReport | null;
  report_date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
type DailyReportFormData = Omit<DailyReport, 'id' | 'created_at'>;


export function EditDailyReportDialog({ report, report_date, open, onOpenChange }: EditDailyReportDialogProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [formData, setFormData] = useState<DailyReportFormData>({
    report_date: report_date,
    primary_staff: '',
    secondary_staff: '',
    support_staff: '',
    wind_speed_1: null, wind_speed_2: null, wind_speed_3: null, wind_speed_4: null,
    wind_speed_5: null, wind_speed_6: null, wind_speed_7: null, wind_speed_8: null,
    maintenance_unit: null,
    tenkenkubun: null,
    meeting_time: null,
    kawasi_time: null,
    company: null,
  });

  const [bulkWindSpeed, setBulkWindSpeed] = useState<string>('');
  const [freeInput, setFreeInput] = useState('');
  const [previousTenken, setPreviousTenken] = useState<{ date: string, tenkenkubun: number } | null>(null);

  useEffect(() => {
    if (bulkWindSpeed === '') return;
    const speed = Number(bulkWindSpeed);
    if (!isNaN(speed)) {
      setFormData(prev => ({
        ...prev,
        wind_speed_1: speed, wind_speed_2: speed, wind_speed_3: speed, wind_speed_4: speed,
        wind_speed_5: speed, wind_speed_6: speed, wind_speed_7: speed, wind_speed_8: speed,
      }));
    }
  }, [bulkWindSpeed]);

  useEffect(() => {
    const initializeForm = async () => {
      if (!open) return;
      const prevData = await getLatestTenkenkubun();
      setPreviousTenken(prevData);
      let nextTenkenkubun: number | null = null;
      if (report?.tenkenkubun) {
        nextTenkenkubun = report.tenkenkubun;
      } else if (prevData?.tenkenkubun) {
        nextTenkenkubun = (prevData.tenkenkubun % 3) + 1;
      } else {
        nextTenkenkubun = 1;
      }
      setFormData({
        report_date: report_date,
        primary_staff: report?.primary_staff ?? '',
        secondary_staff: report?.secondary_staff ?? '',
        support_staff: report?.support_staff ?? '',
        wind_speed_1: report?.wind_speed_1 ?? null,
        wind_speed_2: report?.wind_speed_2 ?? null,
        wind_speed_3: report?.wind_speed_3 ?? null,
        wind_speed_4: report?.wind_speed_4 ?? null,
        wind_speed_5: report?.wind_speed_5 ?? null,
        wind_speed_6: report?.wind_speed_6 ?? null,
        wind_speed_7: report?.wind_speed_7 ?? null,
        wind_speed_8: report?.wind_speed_8 ?? null,
        maintenance_unit: report?.maintenance_unit ?? '',
        tenkenkubun: nextTenkenkubun,
        meeting_time: report?.meeting_time ? report.meeting_time.slice(0, 5) : null,
        kawasi_time: report?.kawasi_time ? report.kawasi_time.slice(0, 5) : null,
        company: report?.company ?? null,
      });
      setFreeInput('');
    };
    initializeForm();
  }, [report, report_date, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? null : Number(value)) : value,
    }));
    if (name.startsWith('wind_speed_')) {
      setBulkWindSpeed('');
    }
  };
  const handleTimeChange = (name: 'meeting_time' | 'kawasi_time', value: string) => {
    setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
  };
  const handleComboboxChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value,
    }));
  };
  const handleMaintenanceUnitChange = (units: string[]) => { setFormData(p => ({ ...p, maintenance_unit: units.join(', ') })) };
  const toggleCraneSelection = (craneName: string) => { const c = formData.maintenance_unit?.split(', ').filter(Boolean)??[]; const n = c.includes(craneName)?c.filter(u=>u!==craneName):[...c,craneName]; handleMaintenanceUnitChange(n) };
  const handleFreeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFreeInput(e.target.value) };
  const addFreeInputToUnits = () => { if(freeInput.trim()==='')return; const c = formData.maintenance_unit?.split(', ').filter(Boolean)??[]; if(!c.includes(freeInput.trim())){const n=[...c, freeInput.trim()];handleMaintenanceUnitChange(n);} setFreeInput('') };
  const removeUnit = (unitToRemove: string) => { const c = formData.maintenance_unit?.split(', ').filter(Boolean)??[]; const n = c.filter(u=>u!==unitToRemove); handleMaintenanceUnitChange(n) };
  const handleChangeTenkenkubun = () => { setFormData(prev => { const current = prev.tenkenkubun ?? 3; const next = (current % 3) + 1; return { ...prev, tenkenkubun: next }; }); };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); startTransition(async () => { const { error } = await upsertDailyReport(formData); if (!error) { onOpenChange(false); router.refresh(); } else { alert(`エラーが発生しました: ${error.message}`); } }); };
  const selectedUnits = formData.maintenance_unit?.split(', ').filter(Boolean) ?? [];
  const prevTenkenData = previousTenken ? tenkenkubun[previousTenken.tenkenkubun.toString()] : null;
  const currentTenkenData = formData.tenkenkubun ? tenkenkubun[formData.tenkenkubun.toString()] : null;

  // ▼▼▼ 変更点: ボタン表示用のテキストを生成するロジックを追加 ▼▼▼
  const currentTenkenKey = formData.tenkenkubun?.toString() ?? '3';
  const nextTenkenKey = ((formData.tenkenkubun ?? 3) % 3 + 1).toString();
  
  const currentKukaku = tenkenkubun[currentTenkenKey] ? tenkenkubun[currentTenkenKey][0] : '-';
  const nextKukaku = tenkenkubun[nextTenkenKey] ? tenkenkubun[nextTenkenKey][0] : '-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>日次レポート編集</DialogTitle>
          <DialogDescription>
            {report_date} の当直者と風速、整備情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form id="edit-report-form" onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-6 flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><Label htmlFor="primary_staff">当直者1</Label><Input id="primary_staff" name="primary_staff" value={formData.primary_staff??''} onChange={handleChange} /></div><div><Label htmlFor="secondary_staff">当直者2</Label><Input id="secondary_staff" name="secondary_staff" value={formData.secondary_staff??''} onChange={handleChange} /></div><div><Label htmlFor="support_staff">サポート</Label><Input id="support_staff" name="support_staff" value={formData.support_staff??''} onChange={handleChange} /></div></div>
          <div><Label>風速情報 (m/s)</Label><div className="grid grid-cols-9 gap-2 mt-2 rounded-md border p-4"><div><Label htmlFor="bulk-wind-speed" className="text-xs">一括</Label><Input type="number" id="bulk-wind-speed" name="bulk-wind-speed" value={bulkWindSpeed} onChange={(e)=>setBulkWindSpeed(e.target.value)} className="font-bold"/></div><div><Label htmlFor="wind_speed_1" className="text-xs">0-3時</Label><Input type="number" id="wind_speed_1" name="wind_speed_1" value={formData.wind_speed_1??''} onChange={handleChange} /></div><div><Label htmlFor="wind_speed_2" className="text-xs">3-6時</Label><Input type="number" id="wind_speed_2" name="wind_speed_2" value={formData.wind_speed_2??''} onChange={handleChange} /></div><div><Label htmlFor="wind_speed_3" className="text-xs">6-9時</Label><Input type="number" id="wind_speed_3" name="wind_speed_3" value={formData.wind_speed_3??''} onChange={handleChange} /></div><div><Label htmlFor="wind_speed_4" className="text-xs">9-12時</Label><Input type="number" id="wind_speed_4" name="wind_speed_4" value={formData.wind_speed_4??''} onChange={handleChange} /></div><div><Label htmlFor="wind_speed_5" className="text-xs">12-15時</Label><Input type="number" id="wind_speed_5" name="wind_speed_5" value={formData.wind_speed_5??''} onChange={handleChange} /></div><div><Label htmlFor="wind_speed_6" className="text-xs">15-18時</Label><Input type="number" id="wind_speed_6" name="wind_speed_6" value={formData.wind_speed_6??''} onChange={handleChange} /></div><div><Label htmlFor="wind_speed_7" className="text-xs">18-21時</Label><Input type="number" id="wind_speed_7" name="wind_speed_7" value={formData.wind_speed_7??''} onChange={handleChange} /></div><div><Label htmlFor="wind_speed_8" className="text-xs">21-24時</Label><Input type="number" id="wind_speed_8" name="wind_speed_8" value={formData.wind_speed_8??''} onChange={handleChange} /></div></div></div>
          {/* ▼▼▼ 変更点4: UIをTimePickerに置き換え ▼▼▼ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="meeting_time">ミーティング時間</Label>
              <div className="flex items-center gap-1">
                <TimePicker
                  value={formData.meeting_time || ''}
                  onChange={(value) => handleTimeChange('meeting_time', value)}
                  options={TIME_OPTIONS_30_MINUTES}
                />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleTimeChange('meeting_time', '')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="kawasi_time">かわし早出時間</Label>
              <div className="flex items-center gap-1">
                <TimePicker
                  value={formData.kawasi_time || ''}
                  onChange={(value) => handleTimeChange('kawasi_time', value)}
                  options={TIME_OPTIONS_30_MINUTES}
                />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleTimeChange('kawasi_time', '')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="company">かわし会社</Label>
              <div className="flex items-center gap-1">
                <Combobox
                  options={STEVEDORE_OPTIONS.map(val => ({ value: val, label: val }))}
                  value={formData.company || ''}
                  onChange={(value) => handleComboboxChange('company', value)}
                  placeholder="会社を選択..."
                />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleComboboxChange('company', '')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {/* ▲▲▲ ここまで変更 ▲▲▲ */}

          <div><Label>点検予定</Label><div className="mt-2 rounded-md border p-4 space-y-4"><div className="flex flex-wrap gap-2 items-center min-h-[40px] bg-gray-50 p-2 rounded-md">{selectedUnits.length>0?selectedUnits.map(u=>(<div key={u} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm font-semibold px-2 py-1 rounded-full"><span>{u}</span><button type="button" onClick={()=>removeUnit(u)} className="text-blue-500 hover:text-blue-700">&times;</button></div>)):<p className="text-sm text-gray-500">ボタンまたは入力欄からユニットを追加してください。</p>}</div><div className="flex flex-wrap gap-2">{CRANE_OPTIONS.map(c=>(<Button type="button" key={c} variant={selectedUnits.includes(c)?"default":"outline"} onClick={()=>toggleCraneSelection(c)}>{c}</Button>))}</div><div className="flex gap-2"><Input type="text" placeholder="その他ユニット名..." value={freeInput} onChange={handleFreeInputChange} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();addFreeInputToUnits();}}} /><Button type="button" onClick={addFreeInputToUnits}>追加</Button></div></div></div>
          <div>
            <Label>終了点検</Label>
            <div className="mt-2 rounded-md border p-4 space-y-2 text-sm">
              <div className="grid grid-cols-4 items-center">
                <span className="font-semibold">前回</span>
                <span className="text-gray-600">{previousTenken ? new Date(previousTenken.date).toLocaleDateString('ja-JP') : '-'}</span>
                <div className="col-span-2 grid grid-cols-2">
                  <span>区画: <span className="font-bold">{prevTenkenData ? prevTenkenData[0] : '-'}</span></span>
                  <span>RTG: <span className="font-bold">{prevTenkenData ? prevTenkenData[1] : '-'}</span></span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center">
                <span className="font-semibold">今回</span>
                <span className="text-gray-600">{new Date(report_date).toLocaleDateString('ja-JP')}</span>
                <div className="col-span-2 grid grid-cols-2">
                  <span>区画: <span className="font-bold text-blue-600">{currentTenkenData ? currentTenkenData[0] : '-'}</span></span>
                  <span>RTG: <span className="font-bold text-blue-600">{currentTenkenData ? currentTenkenData[1] : '-'}</span></span>
                </div>
              </div>
              <div className="pt-2">
                {/* ▼▼▼ 変更点: ボタン内のテキスト表示を修正 ▼▼▼ */}
                <Button type="button" variant="outline" onClick={handleChangeTenkenkubun}>
                  点検区分を変更 ( {currentKukaku} → {nextKukaku} )
                </Button>
              </div>
            </div>
          </div>
        </form>
        <DialogFooter className="pt-4 flex-shrink-0">
          <Button type="submit" form="edit-report-form" disabled={isPending}>
            {isPending ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}