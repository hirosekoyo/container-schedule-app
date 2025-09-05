"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';

interface DateNavigatorProps {
  currentDate: string; // 'YYYY-MM-DD'
  importId?: string;
}

export function DateNavigator({ currentDate, importId }: DateNavigatorProps) {
  const router = useRouter();
  const dateObj = new Date(currentDate);

  const navigateToDate = (newDate: Date) => {
    const dateString = format(newDate, 'yyyy-MM-dd');
    const url = `/dashboard/${dateString}${importId ? `?importId=${importId}` : ''}`;
    router.push(url);
  };

  const handlePreviousDay = () => {
    navigateToDate(addDays(dateObj, -1));
  };

  const handleNextDay = () => {
    navigateToDate(addDays(dateObj, 1));
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={handlePreviousDay}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-center text-center font-normal">
            <span>{format(dateObj, 'yyyy年 M月 d日 (E)', { locale: ja })}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={dateObj}
            // --- 【ここからが修正箇所】 ---
            // onSelectの引数 `day` に明示的に Date | undefined 型を指定
            onSelect={(day: Date | undefined) => day && navigateToDate(day)}
            // --- 【ここまで修正】 ---
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