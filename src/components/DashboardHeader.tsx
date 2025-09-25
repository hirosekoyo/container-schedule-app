"use client";

import { EditDailyReportDialog } from './EditDailyReportDialog';
import { DailyReport } from '@/lib/supabase/actions';
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
// ▼▼▼ 変更点1: tenkenkubunの定義をインポート ▼▼▼
import { tenkenkubun } from '@/lib/constants';

interface DashboardHeaderProps {
  date: string;
  report: DailyReport | null;
  isPrintView?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ date, report, isPrintView = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayDate = new Date(date).toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
  
  const windSpeeds = [
    { label: '0〜', value: report?.wind_speed_1 }, { label: '3〜', value: report?.wind_speed_2 },
    { label: '6〜', value: report?.wind_speed_3 }, { label: '9〜', value: report?.wind_speed_4 },
    { label: '12〜', value: report?.wind_speed_5 }, { label: '15〜', value: report?.wind_speed_6 },
    { label: '18〜', value: report?.wind_speed_7 }, { label: '21〜', value: report?.wind_speed_8 },
  ];

  const tenkenData = report?.tenkenkubun ? tenkenkubun[report.tenkenkubun.toString()] : null;
  const tenkenDisplayValue = tenkenData ? `区画: ${tenkenData[0]} / RTG: ${tenkenData[1]}` : '-';

  // ▼▼▼ 変更点1: 表示用データの整形ロジックを修正 ▼▼▼
  // meeting_time から秒を削除 (例: "08:00:00" -> "08:00")
  const meetingDisplayValue = report?.meeting_time ? report.meeting_time.slice(0, 5) : '-';

  // kawasi_time から秒を削除し、companyがあれば追加。なければ「なし」と表示
  const kawasiDisplayValue = report?.kawasi_time 
    ? `${report.kawasi_time.slice(0, 5)}${report.company ? ` (${report.company})` : ''}` 
    : 'なし';
  // ▲▲▲ ここまで修正 ▲▲▲

  if (isPrintView) {
    // --- 印刷表示のレイアウト ---
    return (
      <div className="flex justify-between items-center gap-4 text-xs font-sans">
        <div className="flex items-end gap-4">
          <h1 className="text-lg font-bold">{displayDate}</h1>
          <div>
            <span className="text-[9pt] text-gray-500">当直</span>
            <p className="font-semibold text-sm">{report?.primary_staff || '-'}  {report?.secondary_staff || '-'}</p>
          </div>
          {report?.support_staff && (
            <div>
              <span className="text-[9pt] text-gray-500">S</span>
              <p className="font-semibold text-sm">{report.support_staff}</p>
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0">
          <Table className="border text-[8pt]">
            <TableBody>
              <TableRow>
                <TableHead className="text-center h-5 px-2 py-0 border-r font-semibold">ミーティング</TableHead>
                {/* ▼▼▼ 変更点2: 新しい表示用変数を使用 ▼▼▼ */}
                <TableCell className="px-2 h-5 py-0 font-semibold">{meetingDisplayValue}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead className="text-center h-5 px-2 py-0 border-r font-semibold">早出かわし</TableHead>
                <TableCell className="px-2 h-5 py-0 font-semibold">{kawasiDisplayValue}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        <div className="w-1/2 flex-shrink-0 flex flex-col gap-1">
          {/* 点検予定テーブル */}
          <Table className="border text-[8pt]" style={{ tableLayout: 'fixed' }}>
            <TableBody>
              <TableRow>
                <TableHead className="text-center h-5 px-1 py-0 border-r font-semibold" style={{ width: '20%' }}>
                  点検予定
                </TableHead>
                <TableCell className="px-2 h-5 py-0 font-semibold">
                  {report?.maintenance_unit || '-'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* 終了点検テーブル */}
          <Table className="border text-[8pt]" style={{ tableLayout: 'fixed' }}>
            <TableBody>
              <TableRow>
                <TableHead className="text-center h-5 px-1 py-0 border-r font-semibold" style={{ width: '20%' }}>
                  終了点検
                </TableHead>
                <TableCell className="px-2 h-5 py-0 font-semibold">
                  {tenkenDisplayValue}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // --- 通常表示のレイアウト ---
  return (
    <>
      <div 
        className="rounded-lg border bg-white p-4 shadow-sm hover:bg-gray-50 cursor-pointer transition-colors font-sans"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1 flex items-end gap-6">
            <h1 className="text-3xl font-bold">{displayDate}</h1>
            <div>
              <span className="text-sm text-gray-500">当直</span>
              <p className="text-xl font-semibold">{report?.primary_staff || '未設定'}  {report?.secondary_staff || '未設定'}</p>
            </div>
            {report?.support_staff && (
              <div>
                <span className="text-sm text-gray-500">S</span>
                <p className="text-xl font-semibold">{report.support_staff}</p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            <Table className="border rounded-md text-sm">
              <TableBody>
                <TableRow>
                  <TableHead className="px-3 font-semibold border-r">ミーティング</TableHead>
                  {/* ▼▼▼ 変更点3: 新しい表示用変数を使用 ▼▼▼ */}
                  <TableCell className="px-3 text-xl font-bold">{meetingDisplayValue}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHead className="px-3 font-semibold border-r">早出かわし</TableHead>
                  <TableCell className="px-3 text-lg font-bold">{kawasiDisplayValue}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="w-1/2 flex flex-col gap-2">
            {/* 風速テーブル */}
            <Table className="border rounded-md" style={{ tableLayout: 'fixed' }}>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center text-xs h-6 border-r" style={{ width: '12%' }}>時間</TableHead>
                  {windSpeeds.map(ws => (
                    <TableHead key={ws.label} className="text-center text-xs h-6 border-r" style={{ width: '11%' }}>
                      {ws.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableHead className="text-center font-semibold border-r">風速</TableHead>
                  {windSpeeds.map(ws => (
                    <TableCell key={ws.label} className="text-center text-xl font-semibold border-r">
                      {ws.value ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
            
            {/* 点検予定テーブル */}
            <Table className="border rounded-md" style={{ tableLayout: 'fixed' }}>
              <TableBody>
                <TableRow>
                  <TableHead className="text-center font-semibold border-r" style={{ width: '12%' }}>
                    点検予定
                  </TableHead>
                  <TableCell className="px-4 text-lg font-semibold">
                    {report?.maintenance_unit || '-'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* ▼▼▼ 変更点4: 通常表示にも終了点検テーブルを追加 ▼▼▼ */}
            <Table className="border rounded-md" style={{ tableLayout: 'fixed' }}>
              <TableBody>
                <TableRow>
                  <TableHead className="text-center font-semibold border-r" style={{ width: '12%' }}>
                    終了点検
                  </TableHead>
                  <TableCell className="px-4 text-lg font-semibold">
                    {tenkenDisplayValue}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

          </div>
        </div>
      </div>
      <EditDailyReportDialog report={report} report_date={date} open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
};

export default DashboardHeader;