import { DailyReport } from '@/lib/supabase/actions';
import React from 'react';

interface DashboardHeaderProps {
  date: string;
  report: DailyReport | null;
}

// speedプロパティの型に `| undefined` を追加
const WindInfo: React.FC<{ label: string; speed: number | null | undefined }> = ({ label, speed }) => (
  <div className="flex flex-col items-center">
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-lg font-semibold">{speed ?? '-'}</span>
  </div>
);

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ date, report }) => {
  const displayDate = new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 日付と当直者 */}
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold">{displayDate}</h1>
          <div>
            <span className="text-sm text-gray-500">当直者</span>
            <p className="text-lg">
              {report?.primary_staff || '未設定'}, {report?.secondary_staff || '未設定'}
            </p>
          </div>
        </div>
        {/* 風速情報 */}
        <div className="grid grid-cols-4 gap-4 rounded-md border p-2 md:grid-cols-8">
          {/* report?.wind_speed_X は number | null | undefined を返すため、エラーが解消される */}
          <WindInfo label="0~3" speed={report?.wind_speed_1} />
          <WindInfo label="3~6" speed={report?.wind_speed_2} />
          <WindInfo label="6~9" speed={report?.wind_speed_3} />
          <WindInfo label="9~12" speed={report?.wind_speed_4} />
          <WindInfo label="12~15" speed={report?.wind_speed_5} />
          <WindInfo label="15~18" speed={report?.wind_speed_6} />
          <WindInfo label="18~21" speed={report?.wind_speed_7} />
          <WindInfo label="21~24" speed={report?.wind_speed_8} />
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;