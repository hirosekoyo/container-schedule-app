"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DailyReport, upsertDailyReport } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';
import { CRANE_OPTIONS } from '@/lib/constants';

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
  });
  const [bulkWindSpeed, setBulkWindSpeed] = useState<string>('');
  const [freeInput, setFreeInput] = useState('');

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
    if (open) {
      const initialMaintenanceUnit = report?.maintenance_unit ?? '';
      setFormData({
        report_date: report_date,
        primary_staff: report?.primary_staff ?? '',
        secondary_staff: report?.secondary_staff ?? '',
        support_staff: report?.support_staff ?? '',
        wind_speed_1: report?.wind_speed_1 ?? null, wind_speed_2: report?.wind_speed_2 ?? null,
        wind_speed_3: report?.wind_speed_3 ?? null, wind_speed_4: report?.wind_speed_4 ?? null,
        wind_speed_5: report?.wind_speed_5 ?? null, wind_speed_6: report?.wind_speed_6 ?? null,
        wind_speed_7: report?.wind_speed_7 ?? null, wind_speed_8: report?.wind_speed_8 ?? null,
        maintenance_unit: initialMaintenanceUnit,
      });
      setFreeInput(''); 
    }
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

  const handleMaintenanceUnitChange = (units: string[]) => {
    setFormData(prev => ({
      ...prev,
      // ▼▼▼ 変更点1: 結合時に ", " を使う ▼▼▼
      maintenance_unit: units.join(', '),
    }));
  };

  const toggleCraneSelection = (craneName: string) => {
    // ▼▼▼ 変更点2: 分割時に ", " を使う ▼▼▼
    const currentUnits = formData.maintenance_unit?.split(', ').filter(Boolean) ?? [];
    const newUnits = currentUnits.includes(craneName)
      ? currentUnits.filter(unit => unit !== craneName)
      : [...currentUnits, craneName];
    handleMaintenanceUnitChange(newUnits);
  };

  const handleFreeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFreeInput(e.target.value);
  };

  const addFreeInputToUnits = () => {
    if (freeInput.trim() === '') return;
    const currentUnits = formData.maintenance_unit?.split(', ').filter(Boolean) ?? [];
    if (!currentUnits.includes(freeInput.trim())) {
      const newUnits = [...currentUnits, freeInput.trim()];
      handleMaintenanceUnitChange(newUnits);
    }
    setFreeInput('');
  };

  const removeUnit = (unitToRemove: string) => {
    const currentUnits = formData.maintenance_unit?.split(', ').filter(Boolean) ?? [];
    const newUnits = currentUnits.filter(unit => unit !== unitToRemove);
    handleMaintenanceUnitChange(newUnits);
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await upsertDailyReport(formData);
      if (!error) {
        onOpenChange(false);
        router.refresh();
      } else {
        alert(`エラーが発生しました: ${error.message}`);
      }
    });
  };

  // ▼▼▼ 変更点3: 表示用の分割も ", " を使う ▼▼▼
  const selectedUnits = formData.maintenance_unit?.split(', ').filter(Boolean) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>日次レポート編集</DialogTitle>
          <DialogDescription>
            {report_date} の当直者と風速、整備情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label htmlFor="primary_staff">当直者1</Label><Input id="primary_staff" name="primary_staff" value={formData.primary_staff ?? ''} onChange={handleChange} /></div>
            <div><Label htmlFor="secondary_staff">当直者2</Label><Input id="secondary_staff" name="secondary_staff" value={formData.secondary_staff ?? ''} onChange={handleChange} /></div>
            <div><Label htmlFor="support_staff">サポート</Label><Input id="support_staff" name="support_staff" value={formData.support_staff ?? ''} onChange={handleChange} /></div>
          </div>
          <div>
            <Label>風速情報 (m/s)</Label>
            <div className="grid grid-cols-9 gap-2 mt-2 rounded-md border p-4">
              <div><Label htmlFor="bulk-wind-speed" className="text-xs">一括</Label><Input type="number" id="bulk-wind-speed" name="bulk-wind-speed" value={bulkWindSpeed} onChange={(e) => setBulkWindSpeed(e.target.value)} className="font-bold"/></div>
              <div><Label htmlFor="wind_speed_1" className="text-xs">0-3時</Label><Input type="number" id="wind_speed_1" name="wind_speed_1" value={formData.wind_speed_1 ?? ''} onChange={handleChange} /></div>
              <div><Label htmlFor="wind_speed_2" className="text-xs">3-6時</Label><Input type="number" id="wind_speed_2" name="wind_speed_2" value={formData.wind_speed_2 ?? ''} onChange={handleChange} /></div>
              <div><Label htmlFor="wind_speed_3" className="text-xs">6-9時</Label><Input type="number" id="wind_speed_3" name="wind_speed_3" value={formData.wind_speed_3 ?? ''} onChange={handleChange} /></div>
              <div><Label htmlFor="wind_speed_4" className="text-xs">9-12時</Label><Input type="number" id="wind_speed_4" name="wind_speed_4" value={formData.wind_speed_4 ?? ''} onChange={handleChange} /></div>
              <div><Label htmlFor="wind_speed_5" className="text-xs">12-15時</Label><Input type="number" id="wind_speed_5" name="wind_speed_5" value={formData.wind_speed_5 ?? ''} onChange={handleChange} /></div>
              <div><Label htmlFor="wind_speed_6" className="text-xs">15-18時</Label><Input type="number" id="wind_speed_6" name="wind_speed_6" value={formData.wind_speed_6 ?? ''} onChange={handleChange} /></div>
              <div><Label htmlFor="wind_speed_7" className="text-xs">18-21時</Label><Input type="number" id="wind_speed_7" name="wind_speed_7" value={formData.wind_speed_7 ?? ''} onChange={handleChange} /></div>
              <div><Label htmlFor="wind_speed_8" className="text-xs">21-24時</Label><Input type="number" id="wind_speed_8" name="wind_speed_8" value={formData.wind_speed_8 ?? ''} onChange={handleChange} /></div>
            </div>
          </div>
          <div>
            <Label>点検予定</Label>
            <div className="mt-2 rounded-md border p-4 space-y-4">
              <div className="flex flex-wrap gap-2 items-center min-h-[40px] bg-gray-50 p-2 rounded-md">
                {selectedUnits.length > 0 ? (
                  selectedUnits.map(unit => (
                    <div key={unit} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm font-semibold px-2 py-1 rounded-full">
                      <span>{unit}</span>
                      <button type="button" onClick={() => removeUnit(unit)} className="text-blue-500 hover:text-blue-700">
                        &times;
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">ボタンまたは入力欄からユニットを追加してください。</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {CRANE_OPTIONS.map(crane => (
                  <Button
                    type="button"
                    key={crane}
                    variant={selectedUnits.includes(crane) ? "default" : "outline"}
                    onClick={() => toggleCraneSelection(crane)}
                  >
                    {crane}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="その他ユニット名..."
                  value={freeInput}
                  onChange={handleFreeInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFreeInputToUnits();
                    }
                  }}
                />
                <Button type="button" onClick={addFreeInputToUnits}>追加</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}