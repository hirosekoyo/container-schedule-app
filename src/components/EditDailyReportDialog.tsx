"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DailyReport, upsertDailyReport } from '@/lib/supabase/actions';
import { useRouter } from 'next/navigation';
import { Textarea } from './ui/textarea';

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
    memo: '',
  });
  const [bulkWindSpeed, setBulkWindSpeed] = useState<string>('');

  useEffect(() => {
    if (bulkWindSpeed === '') return; // 空文字の場合は何もしない
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
      if (report) {
        setFormData({
          report_date: report.report_date,
          primary_staff: report.primary_staff ?? '',
          secondary_staff: report.secondary_staff ?? '',
          support_staff: report.support_staff ?? '',
          wind_speed_1: report.wind_speed_1, wind_speed_2: report.wind_speed_2,
          wind_speed_3: report.wind_speed_3, wind_speed_4: report.wind_speed_4,
          wind_speed_5: report.wind_speed_5, wind_speed_6: report.wind_speed_6,
          wind_speed_7: report.wind_speed_7, wind_speed_8: report.wind_speed_8,
          memo: report.memo ?? '',
        });
      } else {
        setFormData({
            report_date: report_date,
            primary_staff: '', secondary_staff: '', support_staff: '',
            wind_speed_1: null, wind_speed_2: null, wind_speed_3: null, wind_speed_4: null,
            wind_speed_5: null, wind_speed_6: null, wind_speed_7: null, wind_speed_8: null,
            memo: '',
        });
      }
    }
  }, [report, report_date, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? null : Number(value)) : value,
    }));
    // 個別の風速が変更されたら、一括入力欄の値をリセットする
    if (name.startsWith('wind_speed_')) {
      setBulkWindSpeed('');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await upsertDailyReport(formData);
      if (!error) {
        onOpenChange(false); // 親にモーダルを閉じるよう通知
        router.refresh();
      } else {
        alert(`エラーが発生しました: ${error.message}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>日次レポート編集</DialogTitle>
          <DialogDescription>
            {report_date} の当直者と風速情報、メモを入力してください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ... (フォームの中身は変更なし) ... */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label htmlFor="primary_staff">当直者1</Label><Input id="primary_staff" name="primary_staff" value={formData.primary_staff ?? ''} onChange={handleChange} /></div>
            <div><Label htmlFor="secondary_staff">当直者2</Label><Input id="secondary_staff" name="secondary_staff" value={formData.secondary_staff ?? ''} onChange={handleChange} /></div>
            <div><Label htmlFor="support_staff">サポート</Label><Input id="support_staff" name="support_staff" value={formData.support_staff ?? ''} onChange={handleChange} /></div>
          </div>
          <div>
            <Label>風速情報 (m/s)</Label>
            <div className="grid grid-cols-9 gap-2 mt-2 rounded-md border p-4">
              {/* 一括入力 */}
              <div>
                <Label htmlFor="bulk-wind-speed" className="text-xs">一括</Label>
                <Input 
                  type="number" 
                  id="bulk-wind-speed" 
                  name="bulk-wind-speed" 
                  value={bulkWindSpeed}
                  onChange={(e) => setBulkWindSpeed(e.target.value)}
                  className="font-bold" // 視覚的な区別
                />
              </div>
              {/* 個別入力 */}
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
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}