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
  // --- 【ここからが変更点】 ---
  // 親コンポーネントからモーダルの開閉状態を受け取る
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // --- 【ここまで】 ---
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

  useEffect(() => {
    if (open) { // モーダルが開いた瞬間にデータをセット
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
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await upsertDailyReport(formData);
      if (!error) {
        alert("日次レポートが保存されました。");
        onOpenChange(false); // 親にモーダルを閉じるよう通知
        router.refresh();
      } else {
        alert(`エラーが発生しました: ${error.message}`);
      }
    });
  };

  return (
    // DialogTriggerを削除し、openとonOpenChangeを直接Dialogに渡す
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
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mt-2 rounded-md border p-4">
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