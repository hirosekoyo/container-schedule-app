"use client"; // 1. クリックイベントとstateを持つためClient Componentに変換

import { EditDailyReportDialog } from './EditDailyReportDialog';
import { DailyReport } from '@/lib/supabase/actions';
import React, { useState } from 'react'; // 2. useStateをインポート
import { Separator } from './ui/separator';

interface DashboardHeaderProps {
  date: string;
  report: DailyReport | null;
  isPrintView?: boolean;
}

const WindInfo: React.FC<{ label: string; speed: number | null | undefined }> = ({ label, speed }) => (
  <div className="flex flex-col items-center">
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-lg font-semibold">{speed ?? '-'}</span>
  </div>
);

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ date, report, isPrintView = false }) => {
  // 3. モーダルの開閉を管理するstate
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayDate = new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

   // 印刷モードと通常モードでクラスを切り替える
  if (isPrintView) {
    return (
      // 印刷用のコンパクトなレイアウト
      <div className="border-b pb-2 mb-2 text-sm">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-lg font-bold">{displayDate}</h1>
            <p>当直者: {report?.primary_staff || '未設定'}, {report?.secondary_staff || '未設定'}</p>
          </div>
          <div className="grid grid-cols-8 gap-x-2">
            <WindInfo label="0-3" speed={report?.wind_speed_1} />
            <WindInfo label="3-6" speed={report?.wind_speed_2} />
            <WindInfo label="6-9" speed={report?.wind_speed_3} />
            <WindInfo label="9-12" speed={report?.wind_speed_4} />
            <WindInfo label="12-15" speed={report?.wind_speed_5} />
            <WindInfo label="15-18" speed={report?.wind_speed_6} />
            <WindInfo label="18-21" speed={report?.wind_speed_7} />
            <WindInfo label="21-24" speed={report?.wind_speed_8} />
          </div>
        </div>
        {report?.memo && (
          <div className="mt-1">
            <p className="text-xs whitespace-pre-wrap">メモ: {report.memo}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* 4. クリック可能なカード要素 */}
      <div 
        className="rounded-lg border bg-white p-4 shadow-sm hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setIsModalOpen(true)} // 5. クリックでモーダルを開く
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          
          {/* 日付と当直者 */}
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">{displayDate}</h1>
            <div>
              <span className="text-sm text-gray-500">当直者</span>
              <p className="text-lg">
                {report?.primary_staff || '未設定'}, {report?.secondary_staff || '未設定'}
              </p>
              {report?.support_staff && <p className="text-sm text-muted-foreground">サポート: {report.support_staff}</p>}
            </div>
          </div>
          
          {/* 6. メモ (当直者と風速の間) */}
          {report?.memo && (
            <>
              <Separator orientation="vertical" className="h-10 hidden md:block" />
              <div className="flex-1 min-w-[200px]">
                <span className="text-sm text-gray-500">メモ</span>
                <p className="text-sm whitespace-pre-wrap text-gray-800 truncate">
                  {report.memo}
                </p>
              </div>
            </>
          )}

          {/* 風速情報 */}
          <div className="grid grid-cols-4 gap-4 rounded-md border p-2 md:grid-cols-8 ml-auto">
            {/* ... (風速情報の部分は変更なし) ... */}
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

      {/* 7. モーダル本体 (表示/非表示はstateで制御) */}
      <EditDailyReportDialog 
        report={report} 
        report_date={date} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </>
  );
};

export default DashboardHeader;