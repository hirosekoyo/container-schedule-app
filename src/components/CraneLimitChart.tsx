"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DailyReport } from '@/lib/supabase/actions';
// ▼▼▼ 変更点1: tenkenkubunをインポート ▼▼▼
import { tenkenkubun } from '@/lib/constants';

interface CraneLimitChartProps {
    isPrintView?: boolean;
    printWidth?: number;
    report: DailyReport | null;
}

const CraneLimitChart: React.FC<CraneLimitChartProps> = ({ isPrintView = false, printWidth, report }) => {

    // ▼▼▼ 変更点2: Headerから表示用データの準備ロジックを移植 ▼▼▼
    const tenkenData = report?.tenkenkubun ? tenkenkubun[report.tenkenkubun.toString()] : null;
    const tenkenDisplayValue = tenkenData ? `区画: ${tenkenData[0]} / RTG: ${tenkenData[1]}` : '-';
    const meetingDisplayValue = report?.meeting_time ? report.meeting_time.slice(0, 5) : '-';
    const kawasiDisplayValue = report?.kawasi_time 
        ? `${report.kawasi_time.slice(0, 5)}${report.company ? ` (${report.company})` : ''}` 
        : 'なし';

    const limitData = [
        { crane: 'IC-1', right: '40ft:35+01\n20ft:35+04', left: '右脚54+00' },
        { crane: 'IC-2', right: '40ft:36+01\n20ft:36+04', left: '右脚55+00' },
        { crane: 'IC-3', right: 'IC-2横', left: '右脚56+00' },
        { crane: 'IC-4', right: '左脚38+00', left: '右脚61+00' },
        { crane: 'IC-5', right: '左脚45+00', left: '40ft:63-09\n20ft:63-06' },
        { crane: 'IC-6', right: '左脚47-15', left: '40ft:64-07\n20ft:64-10' },
    ];

    return (
        <div>
            {/* --- テーブル部分 --- */}
            <div className="flex gap-2 items-stretch">
                {/* --- 左側カラム --- */}
                <div className="w-[40%] flex flex-col gap-4">
                    {/* 上段: ミーティング/かわし */}
                    <div className="flex-1">
                        <Table className="border text-[8pt] h-full" style={{tableLayout: 'fixed'}}>
                            <TableBody>
                                <TableRow>
                                    <TableHead className={`text-center font-semibold border-r p-1 bg-gray-50 w-1/4`}>ミーティング</TableHead>
                                    <TableCell className={`font-semibold border-r px-2 py-1 w-1/4`}>{meetingDisplayValue}</TableCell>
                                    <TableHead className={`text-center font-semibold border-r p-1 bg-gray-50 w-1/4`}>早出かわし</TableHead>
                                    <TableCell className={`font-semibold px-2 py-1 w-1/4`}>{kawasiDisplayValue}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    {/* 下段: 終了点検 */}
                    <div className="flex-1">
                        <Table className="border text-[8pt] h-full">
                            <TableBody>
                                <TableRow>
                                    <TableHead className={`text-center font-semibold border-r w-[25%] p-1 bg-gray-50`}>終了点検</TableHead>
                                    <TableCell className={`px-2 font-semibold`}>{tenkenDisplayValue}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
                {/* --- 右側カラム --- */}
                <div className="flex-1">
                    <Table className="border text-[7pt] h-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[15%] px-1 py-0 h-4 text-center bg-gray-50"></TableHead>
                                {limitData.map(col => (
                                    <TableHead key={col.crane} className="text-center px-1 py-0 h-4 bg-gray-50">{col.crane}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-semibold text-center px-1 py-0 h-4 bg-gray-50">左極限</TableCell>
                                {limitData.map(col => (
                                    <TableCell key={`${col.crane}-right`} className="text-center px-1 py-0 h-4 whitespace-pre-wrap">{col.right}</TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-semibold text-center px-1 py-0 h-4 bg-gray-50">右極限</TableCell>
                                {limitData.map(col => (
                                    <TableCell key={`${col.crane}-left`} className="text-center px-1 py-0 h-4 whitespace-pre-wrap">{col.left}</TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default CraneLimitChart;