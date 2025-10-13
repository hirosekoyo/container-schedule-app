"use client";

import { EditDailyReportDialog } from './EditDailyReportDialog';
import { DailyReport } from '@/lib/supabase/actions';
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { tenkenkubun,getWindColorClass } from '@/lib/constants';

interface DashboardHeaderProps {
  date: string;
  report: DailyReport | null;
  isPrintView?: boolean;
  viewMode?: 'print' | 'share'; // viewMode propを追加
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ date, report, isPrintView = false, viewMode = 'print' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- 表示用データ準備 (変更なし) ---
  const displayDate = new Date(date).toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const windSpeeds = [
    { label: '0〜', value: report?.wind_speed_1 }, { label: '3〜', value: report?.wind_speed_2 },
    { label: '6〜', value: report?.wind_speed_3 }, { label: '9〜', value: report?.wind_speed_4 },
    { label: '12〜', value: report?.wind_speed_5 }, { label: '15〜', value: report?.wind_speed_6 },
    { label: '18〜', value: report?.wind_speed_7 }, { label: '21〜', value: report?.wind_speed_8 },
  ];
  const tenkenData = report?.tenkenkubun ? tenkenkubun[report.tenkenkubun.toString()] : null;
  const tenkenDisplayValue = tenkenData ? `区画: ${tenkenData[0]} / RTG: ${tenkenData[1]}` : '-';
  const meetingDisplayValue = report?.meeting_time ? report.meeting_time.slice(0, 5) : '-';
  const kawasiDisplayValue = report?.kawasi_time 
    ? `${report.kawasi_time.slice(0, 5)}${report.company ? ` (${report.company})` : ''}` 
    : 'なし';
  
  const fontSizeClass = isPrintView ? 'text-[8pt]' : 'text-xl';
  const windFontSizeClass = isPrintView ? 'text-[8pt]' : 'text-[15px]';
  const singleRowPadding = isPrintView ? 'p-1' : 'px-2 py-2'; 
  const multiRowPadding = isPrintView ? 'p-0 h-[0.5rem]' : 'p-0.5 h-4'; 

  return (
    <>
      {isPrintView ? (
        // --- 印刷表示用のレイアウト ---
        <div className={`print-dashboard-header grid gap-2 font-sans items-stretch grid-cols-[6%_20%_35%_1fr]`}>
          <div className="flex items-center justify-center p-2">
            <div className={`flex items-center justify-center w-full h-full rounded-md bg-gray-200`}><h1 className={`font-bold text-2xl`}>IC</h1></div>
          </div>
          <div className={`flex flex-col justify-around py-1`}>
            <div className={`font-bold text-lg`}>{displayDate}</div>
            <div className={`flex items-end gap-2 ${fontSizeClass}`}>
              <span className="text-gray-500">当直:</span>
              <p className="font-semibold">{report?.primary_staff || '-'} {report?.secondary_staff || '-'}</p>
              {report?.support_staff && (<><span className="text-gray-500 ml-2">S:</span><p className="font-semibold">{report.support_staff}</p></>)}
            </div>
          </div>
          
          {/* ▼▼▼ 変更点1: 風速テーブルを条件付きで表示 ▼▼▼ */}
          {viewMode !== 'share' ? (
            <Table className={`border h-full ${windFontSizeClass}`} style={{ tableLayout: 'fixed' }}>
              <TableHeader><TableRow><TableHead className={`text-center border-r ${multiRowPadding} bg-gray-50`} style={{ width: '12%' }}>時間</TableHead>{windSpeeds.map(ws => <TableHead key={ws.label} className={`text-center border-r ${multiRowPadding} bg-gray-50`} style={{ width: '11%' }}>{ws.label}</TableHead>)}</TableRow></TableHeader>
              <TableBody><TableRow><TableHead className={`text-center font-semibold border-r ${multiRowPadding} bg-gray-50`}>風速</TableHead>{windSpeeds.map(ws => <TableCell key={ws.label} className={`text-center font-semibold border-r ${multiRowPadding} ${getWindColorClass(ws.value)}`}>{ws.value ?? '-'}</TableCell>)}</TableRow></TableBody>
            </Table>
          ) : (
            <div></div> // shareモードの時は空のdivでスペースを埋める
          )}

          <Table className={`border h-full ${fontSizeClass}`}>
            <TableBody><TableRow><TableHead className={`text-center font-semibold border-r w-[15%] ${singleRowPadding} bg-gray-50`}>点検予定</TableHead><TableCell className={`px-2 font-semibold ${singleRowPadding}`}>{report?.maintenance_unit || '-'}</TableCell></TableRow></TableBody>
          </Table>
        </div>
      ) : (
        // --- 通常表示用のレイアウト ---
        <div 
          className={`grid gap-2 font-sans items-start grid-cols-[auto_1fr] rounded-lg border bg-white p-2 shadow-sm cursor-pointer`}
          onClick={() => setIsModalOpen(true)}
        >
          <div className={`flex flex-col justify-around py-1 pr-2`}>
            <div className={`font-bold text-3xl`}>{displayDate}</div>
            <div className={`flex items-end gap-2 ${fontSizeClass}`}>
              <span className="text-gray-500">当直:</span>
              <p className="font-semibold">{report?.primary_staff || '-'} {report?.secondary_staff || '-'}</p>
              {report?.support_staff && (<><span className="text-gray-500 ml-2">S:</span><p className="font-semibold">{report.support_staff}</p></>)}
            </div>
          </div>
          <div className="grid grid-cols-2 grid-rows-2 gap-1">
            <Table className={`border h-full ${windFontSizeClass}`} style={{ tableLayout: 'fixed' }}>
              <TableHeader><TableRow><TableHead className={`text-center border-r p-0.5 h-4 bg-gray-50`} style={{ width: '12%' }}>時間</TableHead>{windSpeeds.map(ws => <TableHead key={ws.label} className={`text-center border-r p-0.5 h-4 bg-gray-50`} style={{ width: '11%' }}>{ws.label}</TableHead>)}</TableRow></TableHeader>
              <TableBody><TableRow><TableHead className={`text-center font-semibold border-r p-0.5 h-4 bg-gray-50`}>風速</TableHead>{windSpeeds.map(ws => <TableCell key={ws.label} className={`text-center font-semibold border-r p-0.5 h-4 ${getWindColorClass(ws.value)}`}>{ws.value ?? '-'}</TableCell>)}</TableRow></TableBody>
            </Table>
            <Table className={`border h-full ${fontSizeClass}`}>
              <TableBody><TableRow><TableHead className={`text-center font-semibold border-r w-[15%] ${singleRowPadding} bg-gray-50`}>点検予定</TableHead><TableCell className={`px-2 font-semibold ${singleRowPadding}`}>{report?.maintenance_unit || '-'}</TableCell></TableRow></TableBody>
            </Table>
            <Table className={`border h-full ${fontSizeClass}`} style={{tableLayout: 'fixed'}}>
              <TableBody><TableRow><TableHead className={`text-center font-semibold border-r ${singleRowPadding} bg-gray-50 w-1/4`}>ミーティング</TableHead><TableCell className={`font-semibold border-r px-2 ${singleRowPadding} w-1/4`}>{meetingDisplayValue}</TableCell><TableHead className={`text-center font-semibold border-r ${singleRowPadding} bg-gray-50 w-1/4`}>早出かわし</TableHead><TableCell className={`font-semibold px-2 ${singleRowPadding} w-1/4`}>{kawasiDisplayValue}</TableCell></TableRow></TableBody>
            </Table>
            <Table className={`border h-full ${fontSizeClass}`}>
              <TableBody><TableRow><TableHead className={`text-center font-semibold border-r w-[15%] ${singleRowPadding} bg-gray-50`}>終了点検</TableHead><TableCell className={`px-2 font-semibold ${singleRowPadding}`}>{tenkenDisplayValue}</TableCell></TableRow></TableBody>
            </Table>
          </div>
        </div>
      )}

      {!isPrintView && (
        <EditDailyReportDialog report={report} report_date={date} open={isModalOpen} onOpenChange={setIsModalOpen} />
      )}
    </>
  );
};

export default DashboardHeader;