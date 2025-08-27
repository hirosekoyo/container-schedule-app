import type { ScheduleWithOperations } from '@/lib/supabase/actions';
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

// --- 型定義 ---
interface ScheduleTableProps {
  schedules: ScheduleWithOperations[];
}

// --- 定数 ---
const BIT_LENGTH_M = 30; // 1ビットあたりのメートル

// --- ヘルパー関数 (最終完成版) ---
/**
 * メートル単位の位置を、港湾業務の慣習に合わせたビット表記に変換する。
 * ルール:
 * - 基準となるビット番号は常に小数点以下を切り捨てて計算 (floor)。
 * - 基準ビットからの差分(プラス)が15mを超える場合は、次のビットからのマイナス表記に変換する。
 *   例: 57+27m -> 58-03m
 *
 * @param meters - メートル単位の数値
 * @returns ビット表記文字列 (例: "58-03")
 */
const metersToBitNotation = (meters: number | null | undefined): string => {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return '-';
  }

  const BIT_LENGTH_M = 30;

  // 1. 基準となるビット番号を常に切り捨てで計算
  let baseBit = Math.floor(meters / BIT_LENGTH_M);
  
  // 2. 基準ビットからの差分（メートル）を計算
  let remainderMeters = Math.round(meters - (baseBit * BIT_LENGTH_M));

  // 3. 【新ロジック】差分が16m以上の場合の繰り上げ処理
  if (remainderMeters >= 16) {
    // ビット番号を1つ進める
    baseBit += 1;
    // 新しいビット番号からのマイナス差分を再計算
    remainderMeters = remainderMeters - BIT_LENGTH_M; // 例: 27 - 30 = -3
  }
  
  // 4. 符号と2桁の数値でフォーマット
  const sign = remainderMeters >= 0 ? '+' : '-';
  const absRemainder = Math.abs(remainderMeters);
  
  return `${baseBit}${sign}${String(absRemainder).padStart(2, '0')}`;
};

/**
 * 荷役予定の詳細情報をテーブル形式で表示するコンポーネント
 */
const ScheduleTable: React.FC<ScheduleTableProps> = ({ schedules }) => {
  return (
    <div className="w-full overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="w-[80px]">岸壁</TableHead>
            <TableHead className="min-w-[200px]">船名</TableHead>
            <TableHead>着岸時間</TableHead>
            <TableHead>離岸時間</TableHead>
            <TableHead>方向</TableHead>
            <TableHead>おもて</TableHead>
            <TableHead>とも</TableHead>
            <TableHead>荷役開始</TableHead>
            <TableHead>G</TableHead>
            <TableHead>使用GC</TableHead>
            <TableHead>本数</TableHead>
            <TableHead>GC運転</TableHead>
            <TableHead>プランナ</TableHead>
            <TableHead className="min-w-[200px]">備考</TableHead>
            <TableHead className="w-[180px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => {
            // 複数の荷役作業情報を改行区切りで結合する
            const operations = schedule.cargo_operations || [];
            const startTimes = operations.map(op => op.start_time?.substring(0, 5) ?? '-').join('\n');
            const craneNames = operations.map(op => op.crane_names ?? '-').join('\n');
            const containerCounts = operations.map(op => op.container_count ?? '-').join('\n');
            const stevedoreCompanies = operations.map(op => op.stevedore_company ?? '-').join('\n');
            const remarks = operations.map(op => op.remarks ?? '').join('\n');

            return (
              <TableRow key={schedule.id}>
                <TableCell>{schedule.berth_number}岸</TableCell>
                <TableCell className="font-medium">{schedule.ship_name}</TableCell>
                <TableCell>{schedule.arrival_time.substring(0, 5)}</TableCell>
                <TableCell>{schedule.departure_time.substring(0, 5)}</TableCell>
                <TableCell>入</TableCell>
                <TableCell>{metersToBitNotation(Number(schedule.bow_position_m))}</TableCell>
                <TableCell>{metersToBitNotation(Number(schedule.stern_position_m))}</TableCell>
                {/* 複数行になる可能性のあるセルには whitespace-pre-line を適用 */}
                <TableCell className="whitespace-pre-line">{startTimes}</TableCell>
                <TableCell>{operations.length > 0 ? operations.length : '-'}</TableCell>
                <TableCell className="whitespace-pre-line">{craneNames}</TableCell>
                <TableCell className="whitespace-pre-line">{containerCounts}</TableCell>
                <TableCell className="whitespace-pre-line">{stevedoreCompanies}</TableCell>
                <TableCell>{schedule.planner_company || '-'}</TableCell>
                <TableCell className="whitespace-pre-line">{remarks}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      編集
                    </Button>
                    <Button variant="destructive" size="sm">
                      削除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ScheduleTable;