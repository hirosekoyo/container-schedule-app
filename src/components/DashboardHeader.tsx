"use client";

import { EditDailyReportDialog } from './EditDailyReportDialog';
import { DailyReport } from '@/lib/supabase/actions';
import React, { useState } from 'react';
import { Separator } from './ui/separator';

interface DashboardHeaderProps {
  date: string;
  report: DailyReport | null;
  isPrintView?: boolean;
}

const WindInfo: React.FC<{ label: string; speed: number | null | undefined }> = ({ label, speed }) => (
  <div className="flex flex-col items-center">
    <span className="text-[8pt] text-gray-500">{label}</span>
    <span className="text-sm font-semibold">{speed ?? '-'}</span>
  </div>
);

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ date, report, isPrintView = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayDate = new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  if (isPrintView) {
    return (
      <div className="text-xs font-sans"> 
        <div className="flex justify-between items-center gap-4"> {/* items-start -> items-center */}
          
          {/* --- 【ここからが修正箇所】 --- */}
          {/* 日付と当直者をflexで囲む */}
          <div className="flex items-center gap-4">
            <h1 className="text-base font-bold">{displayDate}</h1>
            <div>
              <span className="text-[9pt] text-gray-500">当直者</span>
              <p className="font-semibold">{report?.primary_staff || '-'}, {report?.secondary_staff || '-'}</p>
              {report?.support_staff && <p className="text-xs text-gray-600">サポート: {report.support_staff}</p>}
            </div>
          </div>
          {/* --- 【ここまで】 --- */}

          <div className="grid grid-cols-8 gap-x-1 flex-shrink-0 border rounded-md p-1">
            <WindInfo label="0〜" speed={report?.wind_speed_1} />
            <WindInfo label="3〜" speed={report?.wind_speed_2} />
            <WindInfo label="6〜" speed={report?.wind_speed_3} />
            <WindInfo label="9〜" speed={report?.wind_speed_4} />
            <WindInfo label="12〜" speed={report?.wind_speed_5} />
            <WindInfo label="15〜" speed={report?.wind_speed_6} />
            <WindInfo label="18〜" speed={report?.wind_speed_7} />
            <WindInfo label="21〜" speed={report?.wind_speed_8} />
          </div>
        </div>
      </div>
    );
  }

  // --- 通常表示のレイアウト (変更なし) ---
  return (
    <>
      <div 
        className="rounded-lg border bg-white p-4 shadow-sm hover:bg-gray-50 cursor-pointer transition-colors font-sans"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">{displayDate}</h1>
            <div>
              <span className="text-sm text-gray-500">当直者</span>
              <p className="text-lg">{report?.primary_staff || '未設定'}, {report?.secondary_staff || '未設定'}</p>
              {report?.support_staff && <p className="text-sm text-muted-foreground">サポート: {report.support_staff}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 rounded-md border p-2 md:grid-cols-8 ml-auto">
            <WindInfo label="0〜" speed={report?.wind_speed_1} />
            <WindInfo label="3〜" speed={report?.wind_speed_2} />
            <WindInfo label="6〜" speed={report?.wind_speed_3} />
            <WindInfo label="9〜" speed={report?.wind_speed_4} />
            <WindInfo label="12〜" speed={report?.wind_speed_5} />
            <WindInfo label="15〜" speed={report?.wind_speed_6} />
            <WindInfo label="18〜" speed={report?.wind_speed_7} />
            <WindInfo label="21〜" speed={report?.wind_speed_8} />
          </div>
        </div>
      </div>
      <EditDailyReportDialog report={report} report_date={date} open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
};

export default DashboardHeader;