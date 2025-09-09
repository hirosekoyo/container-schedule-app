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
  value: string; // 'YYYY-MM-DDTHH:mm'
  onChange: (value: string) => void;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const date = value ? new Date(value) : new Date();
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const handleDateChange = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    const newDate = new Date(date);
    newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleTimeChange = (type: 'hour' | 'minute', timeValue: string) => {
    const newDate = new Date(date);
    if (type === 'hour') newDate.setHours(parseInt(timeValue, 10));
    if (type === 'minute') newDate.setMinutes(parseInt(timeValue, 10));
    onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };
  
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>{format(date, 'yyyy-MM-dd')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={handleDateChange} initialFocus />
        </PopoverContent>
      </Popover>
      
      <Select value={String(date.getHours()).padStart(2, '0')} onValueChange={(h) => handleTimeChange('hour', h)}>
        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <span>:</span>
      <Select value={String(date.getMinutes()).padStart(2, '0')} onValueChange={(m) => handleTimeChange('minute', m)}>
        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}