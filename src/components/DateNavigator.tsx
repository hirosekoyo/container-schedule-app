"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useState } from 'react'; // useStateをインポート

interface DateNavigatorProps {
  currentDate: string;
  importId?: string;
  basePath: '/dashboard' | '/mobile'; // 1. basePath propsを追加
}

export function DateNavigator({ currentDate, importId, basePath }: DateNavigatorProps) {
  const router = useRouter();
  const dateObj = new Date(currentDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // Popoverの開閉を制御

  const navigateToDate = (newDate: Date) => {
    const dateString = format(newDate, 'yyyy-MM-dd');
    // 2. propsで受け取ったbasePathを使ってURLを組み立てる
    const url = `${basePath}/${dateString}${importId ? `?importId=${importId}` : ''}`;
    router.push(url);
    setIsCalendarOpen(false); // カレンダーを閉じる
  };

  const handlePreviousDay = () => {
    navigateToDate(addDays(dateObj, -1));
  };

  const handleNextDay = () => {
    navigateToDate(addDays(dateObj, 1));
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button variant="outline" size="icon" onClick={handlePreviousDay}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full sm:w-[200px] justify-center text-center font-normal">
            <span>{format(dateObj, 'yyyy年 M月 d日 (E)', { locale: ja })}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={dateObj}
            onSelect={(day: Date | undefined) => day && navigateToDate(day)}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="icon" onClick={handleNextDay}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}