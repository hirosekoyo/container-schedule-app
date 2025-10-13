"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface DateTimePickerProps {
  // ▼▼▼ 変更点1: valueとonChangeの型を修正 ▼▼▼
  value: string | null; // 'YYYY-MM-DDTHH:mm' または null
  onChange: (value: string | null) => void;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  // valueがnullなら現在時刻を、そうでなければvalueの時刻を基準にする
  const date = value ? new Date(value) : new Date();
  const isUndetermined = !value; // valueがnullか空文字なら「※」状態

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const handleDateChange = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    // 日付が変更された時、時刻が未選択ならデフォルトで00:00を設定
    const newDate = new Date(date);
    newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    if (isUndetermined) {
      newDate.setHours(0, 0, 0, 0); // ※から日付選択されたら00:00にする
    }
    onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleTimeChange = (type: 'hour' | 'minute', timeValue: string) => {
    // ▼▼▼ 変更点2: 「※」が選択された場合の処理を追加 ▼▼▼
    if (timeValue === 'undetermined') {
      onChange(null);
      return;
    }

    const newDate = new Date(date);
    if (type === 'hour') newDate.setHours(parseInt(timeValue, 10));
    if (type === 'minute') newDate.setMinutes(parseInt(timeValue, 10));
    onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };
  
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isUndetermined}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {/* ▼▼▼ 変更点3: ※状態での表示を調整 ▼▼▼ */}
            <span>{isUndetermined ? '日付未選択' : format(date, 'yyyy-MM-dd')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={handleDateChange} initialFocus locale={ja} />
        </PopoverContent>
      </Popover>
      
      {/* ▼▼▼ 変更点4: 時刻Selectコンポーネントを修正 ▼▼▼ */}
      <Select 
        value={isUndetermined ? 'undetermined' : String(date.getHours()).padStart(2, '0')} 
        onValueChange={(h) => handleTimeChange('hour', h)}
      >
        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="undetermined">--</SelectItem>
          {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <span>:</span>
      <Select 
        value={isUndetermined ? 'undetermined' : String(date.getMinutes()).padStart(2, '0')} 
        onValueChange={(m) => handleTimeChange('minute', m)}
        disabled={isUndetermined} // 時が※なら分も無効化
      >
        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="undetermined">--</SelectItem>
          {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}