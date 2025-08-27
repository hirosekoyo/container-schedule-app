"use client";

import React, { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createScheduleWithOperations, OperationInsert, ScheduleInsert } from '@/lib/supabase/actions';
import { Separator } from './ui/separator';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Textarea } from './ui/textarea'; // Textareaをインポート
import { parseScheduleText } from '@/lib/parser'; // 解析関数をインポート

interface AddScheduleDialogProps {
  schedule_date: string;
}

const initialScheduleState: Omit<ScheduleInsert, 'id' | 'created_at'> = {
  schedule_date: '',
  berth_number: 6,
  ship_name: '',
  arrival_time: '',
  departure_time: '',
  arrival_side: '左舷',
  bow_position_m: 0,
  stern_position_m: 0,
  planner_company: '',
};

export function AddScheduleDialog({ schedule_date }: AddScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // フォームとテキスト入力の状態
  const [schedule, setSchedule] = useState({ ...initialScheduleState, schedule_date });
  const [operations, setOperations] = useState<Omit<OperationInsert, 'id'|'schedule_id'|'created_at'>[]>([]);
  const [textInput, setTextInput] = useState('');

  // テキストを解析してフォームのstateを更新する関数
  const handleParseText = () => {
    const result = parseScheduleText(textInput);
    if (result) {
      setSchedule(prev => ({
        ...prev,
        ship_name: result.ship_name,
        bow_position_m: result.bow_position_m,
        stern_position_m: result.stern_position_m,
        arrival_side: result.arrival_side,
        planner_company: result.planner_company || '',
      }));
      alert('テキストの解析に成功しました。フォームの内容を確認してください。');
    } else {
      alert('テキストの解析に失敗しました。フォーマットを確認してください。');
    }
  };

  // フォームの各要素のハンドラ
  const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSchedule(prev => ({ ...prev, [name]: value }));
  };
  const handleSideChange = (value: '右舷' | '左舷') => {
    setSchedule(prev => ({...prev, arrival_side: value}));
  };
  const addOperation = () => setOperations(prev => [...prev, {}]);
  const removeOperation = (index: number) => setOperations(prev => prev.filter((_, i) => i !== index));
  const handleOperationChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOperations(prev => prev.map((op, i) => i === index ? { ...op, [name]: value } : op));
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await createScheduleWithOperations(schedule, operations);
      if (!error) {
        alert("予定が正常に作成されました。");
        setOpen(false);
        router.refresh();
      } else {
        alert(`エラーが発生しました: ${error.message}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>新規予定を追加</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>新規船舶予定の作成</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6">
          {/* 左側: テキスト解析エリア */}
          <div className="space-y-2">
            <Label htmlFor="text-input">データ貼り付けエリア</Label>
            <Textarea
              id="text-input"
              className="h-64 font-mono text-sm"
              placeholder="ここにテキストデータを貼り付け..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
            <Button type="button" className="w-full" onClick={handleParseText}>
              解析してフォームに反映
            </Button>
          </div>
          {/* 右側: 入力フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="ship_name">船名</Label><Input id="ship_name" name="ship_name" value={schedule.ship_name} required onChange={handleScheduleChange} /></div>
              <div><Label htmlFor="berth_number">岸壁</Label><Input id="berth_number" name="berth_number" type="number" value={schedule.berth_number || ''} onChange={handleScheduleChange} /></div>
              <div><Label htmlFor="arrival_time">着岸時間</Label><Input id="arrival_time" name="arrival_time" type="time" value={schedule.arrival_time || ''} required onChange={handleScheduleChange} /></div>
              <div><Label htmlFor="departure_time">離岸時間</Label><Input id="departure_time" name="departure_time" type="time" value={schedule.departure_time || ''} required onChange={handleScheduleChange} /></div>
              <div><Label htmlFor="stern_position_m">とも位置(m)</Label><Input id="stern_position_m" name="stern_position_m" type="number" step="0.01" value={schedule.stern_position_m || ''} required onChange={handleScheduleChange} /></div>
              <div><Label htmlFor="bow_position_m">おもて位置(m)</Label><Input id="bow_position_m" name="bow_position_m" type="number" step="0.01" value={schedule.bow_position_m || ''} required onChange={handleScheduleChange} /></div>
              <div>
                <Label htmlFor="arrival_side">舷付け</Label>
                <Select name="arrival_side" value={schedule.arrival_side || '左舷'} onValueChange={handleSideChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="左舷">左舷</SelectItem>
                    <SelectItem value="右舷">右舷</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="planner_company">プランナ</Label><Input id="planner_company" name="planner_company" value={schedule.planner_company || ''} onChange={handleScheduleChange} /></div>
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">荷役作業</h3><Button type="button" variant="outline" size="sm" onClick={addOperation}>作業を追加</Button></div>
              {operations.map((op, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 border p-4 rounded-md relative">
                  <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeOperation(index)}><Trash2 className="h-4 w-4" /></Button>
                  <div><Label>荷役開始</Label><Input name="start_time" type="time" onChange={e => handleOperationChange(index, e)} /></div>
                  <div><Label>使用GC</Label><Input name="crane_names" placeholder="IC-2, IC-3" onChange={e => handleOperationChange(index, e)} /></div>
                  <div><Label>本数</Label><Input name="container_count" type="number" onChange={e => handleOperationChange(index, e)} /></div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>{isPending ? "保存中..." : "保存"}</Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}