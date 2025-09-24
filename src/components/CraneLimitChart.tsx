"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DailyReport } from '@/lib/supabase/actions';

interface CraneLimitChartProps {
    isPrintView?: boolean;
    printWidth?: number;
    report: DailyReport | null;
}

const CHART_START_BIT = 33;
const CHART_END_BIT = 64;

const CraneLimitChart: React.FC<CraneLimitChartProps> = ({ isPrintView = false, printWidth, report }) => {

    const yAxisLabels = ['CB'];
    const numberOfRows = yAxisLabels.length;

    const bitLabels = Array.from({ length: CHART_END_BIT - CHART_START_BIT + 1 }, (_, i) => CHART_START_BIT + i);

    const graphAreaRef = useRef<HTMLDivElement>(null);
    const [graphAreaWidth, setGraphAreaWidth] = useState(0);

    useEffect(() => {
        if (isPrintView && printWidth && printWidth > 0) {
            setGraphAreaWidth(printWidth);
            return;
        }
        const graphElement = graphAreaRef.current;
        if (!graphElement) return;
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) setGraphAreaWidth(entries[0].contentRect.width);
        });
        resizeObserver.observe(graphElement);
        return () => resizeObserver.unobserve(graphElement);
    }, [isPrintView, printWidth]);

    const numberOfBitIntervals = CHART_END_BIT - CHART_START_BIT;
    const dynamicBitWidth = graphAreaWidth > 0 ? graphAreaWidth / numberOfBitIntervals : 0;

    const obstacles = [
        { name: 'BUSBAR', start: 35.4, end: 43.0, row: 0 },
        { name: 'BUSBAR', start: 44.4, end: 56.0, row: 0 },
        { name: 'BUSBAR', start: 57.0, end: 63.2, row: 0 },
        { name: 'CB', start: 34.6, end: 35.0, row: 0 },
        { name: 'CB', start: 44.6, end: 45.0, row: 0 },
        { name: 'CB', start: 56.9, end: 57.3, row: 0 },
    ];

    const limitData = [
        { crane: 'IC-1', right: '40ft:35+1\n20ft:35+4', left: '?' },
        { crane: 'IC-2', right: '40ft:36+1\n20ft:36+4', left: '?' },
        { crane: 'IC-3', right: 'IC-2横', left: '右脚56±00' },
        { crane: 'IC-4', right: '左脚38±00', left: '右脚61±00' },
        { crane: 'IC-5', right: '左脚45±00', left: '40ft:63-9\n20ft:63-6' },
        { crane: 'IC-6', right: '左脚47-15', left: '40ft:64-7\n20ft:64-10' },
    ];

    const windSpeeds = [
        { label: '0〜', value: report?.wind_speed_1 }, { label: '3〜', value: report?.wind_speed_2 },
        { label: '6〜', value: report?.wind_speed_3 }, { label: '9〜', value: report?.wind_speed_4 },
        { label: '12〜', value: report?.wind_speed_5 }, { label: '15〜', value: report?.wind_speed_6 },
        { label: '18〜', value: report?.wind_speed_7 }, { label: '21〜', value: report?.wind_speed_8 },
    ];

    const getWindColorClass = (speed: number | null | undefined): string => {
        if (speed == null) return '';
        if (speed >= 20) return 'bg-red-200/50';
        if (speed >= 16) return 'bg-orange-200/50';
        if (speed >= 10) return 'bg-yellow-200/50';
        return '';
    };

    // ▼▼▼ 変更点1: 強風があるかどうかを判定し、メッセージを決定するロジック ▼▼▼
    const hasStrongWind = windSpeeds.some(ws => ws.value != null && ws.value >= 10);
    const windAlertMessage = hasStrongWind ? "＊強風時間帯有り注意＊" : "＊強風予報無し＊";

    return (
        <div className="border border-gray-200 rounded-lg pt-2 px-2 flex flex-col gap-2 pb-1">
            {/* --- チャート部分 --- */}
            <div style={{ height: '0.7cm' }}>
                <div className="grid h-full w-full font-sans" style={{ gridTemplateColumns: '2rem 1fr 3.5rem', gridTemplateRows: '1rem 1fr' }}>
                    <div></div>
                    <div className="relative">
                        {bitLabels.map((l, i) => (<div key={l} className="absolute bottom-0 -translate-x-1/2 text-[10px] font-semibold text-gray-700" style={{ left: i * dynamicBitWidth }}>{l}</div>))}
                    </div>
                    <div></div>
                    <div className="relative border-r border-gray-300">
                        {yAxisLabels.map((l, i) => (<div key={l} className="absolute flex h-full w-full items-center justify-center text-[10px] font-semibold text-gray-700" style={{ top: `${(i / numberOfRows) * 100}%`, height: `${(1 / numberOfRows) * 100}%` }}>{l}</div>))}
                    </div>
                    <div ref={graphAreaRef} className="relative h-full w-full overflow-hidden">
                        <div className="absolute inset-0">
                            {yAxisLabels.map((_, i) => (<div key={`h-${i}`} className="absolute w-full border-t border-gray-300" style={{ top: `${(i / numberOfRows) * 100}%` }} />))}
                            <div className="absolute bottom-0 w-full border-t border-gray-300" />
                            {bitLabels.map((_, i) => (<div key={`v-${i}`} className="absolute h-full border-l border-gray-200" style={{ left: i * dynamicBitWidth }} />))}
                        </div>
                        {graphAreaWidth > 0 && (obstacles.map((obstacle, i) => {
                            const left = (obstacle.start - CHART_START_BIT) * dynamicBitWidth;
                            const width = (obstacle.end - obstacle.start) * dynamicBitWidth;
                            const top = (obstacle.row / numberOfRows) * 100;
                            let styleClass = 'absolute flex items-center justify-center text-[8px] font-bold';
                            let heightPercent = (1 / numberOfRows) * 100;

                            if (obstacle.name === 'BUSBAR') {
                                styleClass += ' bg-gray-500 text-white';
                                heightPercent *= 0.65;
                            } else if (obstacle.name === 'CB') {
                                styleClass += ' bg-white text-black border border-black';
                            } else {
                                styleClass += ' bg-red-400 border border-red-700 text-white';
                            }

                            return (
                                <div 
                                    key={`o-${i}`} 
                                    className={styleClass} 
                                    style={{ 
                                        left: `${left}px`, 
                                        width: `${width}px`, 
                                        top: `calc(${top}% + ${(100 - heightPercent) / 2}%)`,
                                        height: `${heightPercent}%` 
                                    }}
                                >
                                    {obstacle.name}
                                </div>
                            );
                        }))}
                    </div>
                    <div></div>
                </div>
            </div>

            {/* --- テーブル部分 --- */}
            <div className="flex gap-2 items-start">
                <div className="w-[40%] flex flex-col h-full">
                    <Table className="border text-[10pt] h-full" style={{ tableLayout: 'fixed' }}>
                        {/* ▼▼▼ 変更点2: 新しい「情報」行をTableHeaderに追加 ▼▼▼ */}
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center h-5 px-1 py-0 border-r font-semibold" style={{ width: '12%' }}>
                                    注意
                                </TableHead>
                                <TableHead colSpan={8} className="text-center h-5 px-1 py-0 font-semibold border-r">
                                    {windAlertMessage}
                                </TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead className="text-center h-5 px-1 py-0 border-r" style={{ width: '12%' }}>時間</TableHead>
                                {windSpeeds.map(ws => <TableHead key={ws.label} className="text-center h-5 px-1 py-0 border-r" style={{ width: '11%' }}>{ws.label}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="h-full">
                                <TableHead className="text-center h-5 px-1 py-0 border-r font-semibold" style={{ width: '12%' }}>風速</TableHead>
                                {windSpeeds.map(ws => (
                                    <TableCell
                                        key={ws.label}
                                        className={`text-center h-5 px-1 py-0 font-semibold border-r ${getWindColorClass(ws.value)}`}
                                        style={{ width: '11%' }}
                                    >
                                        {ws.value ?? '-'}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                <div className="flex-1 flex flex-col">
                    <Table className="border text-[7pt] h-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[15%] px-1 py-0 h-4 text-center"></TableHead>
                                {limitData.map(col => (
                                    <TableHead key={col.crane} className="text-center px-1 py-0 h-4">{col.crane}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-semibold text-center px-1 py-0 h-4">左極限</TableCell>
                                {limitData.map(col => (
                                    <TableCell key={`${col.crane}-right`} className="text-center px-1 py-0 h-4 whitespace-pre-wrap">{col.right}</TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-semibold text-center px-1 py-0 h-4">右極限</TableCell>
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