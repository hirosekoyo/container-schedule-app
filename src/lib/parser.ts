import { createHash } from 'crypto';
import { ScheduleInsert } from "./supabase/actions";
import { PLANNER_TO_STEVEDORE_MAP } from './constants';

type ScheduleDataForDB = Omit<ScheduleInsert, 'id' | 'created_at'>;

const BIT_LENGTH_M = 30;
const MIN_BIT_NUMBER = 33;

const REGEX_MAP = {
  shipName: /^(.*?)(\r\n|\n|$)/,
  loa: /(?:全長|LOA)\s*:?\s*([\d.]+)\s*m/i,
  mooring: /綱位置.*\((\d+)\s*(?:-|～)\s*(\d+)\)/,
  sternBit: /船尾ビット\s*:?\s*(\d+)(?:([+-])(\d+)m)?/,
  agent: /代理店\s*:?\s*(.*)/,
  dateTime: /(\d{2})\/(\d{2})\s(\d{2}):(\d{2})\s*～\s*(\d{2})\/(\d{2})\s(\d{2}):(\d{2})/,
};

// --- 【ここからが新設箇所】 ---
/**
 * 船の中心点のビット位置から、岸壁番号を決定する
 * @param bow_m - おもて位置 (メートル)
 * @param stern_m - とも位置 (メートル)
 * @returns 岸壁番号 (6, 7, or 8)
 */
const determineBerthNumber = (bow_m: number, stern_m: number): number => {
  const midpoint_m = (bow_m + stern_m) / 2;
  const midpoint_bit = midpoint_m / BIT_LENGTH_M;

if (midpoint_bit < 35.5) {
  return 5;
} else if (midpoint_bit >= 35.5 && midpoint_bit < 45.5) {
  return 6;
} else if (midpoint_bit >= 45.5 && midpoint_bit < 57.5) {
  return 7;
} else { // 57.5以上
  return 8;
}
};
// --- 【ここまで】 ---


const parseScheduleBlock = (
  textBlock: string,
  referenceYear: number,
  importId: string
): ScheduleDataForDB[] => {
  const cleanedBlock = textBlock.trim();
  if (!cleanedBlock) return [];

  const shipNameMatch = cleanedBlock.match(REGEX_MAP.shipName);
  const loaMatch = cleanedBlock.match(REGEX_MAP.loa);
  const mooringMatch = cleanedBlock.match(REGEX_MAP.mooring);
  const sternBitMatch = cleanedBlock.match(REGEX_MAP.sternBit);
  const agentMatch = cleanedBlock.match(REGEX_MAP.agent);
  const dateTimeMatch = cleanedBlock.match(REGEX_MAP.dateTime);

  if (!shipNameMatch || !loaMatch || !mooringMatch || !sternBitMatch || !dateTimeMatch) {
    console.warn("解析スキップ: 必須項目が不足しているブロックがありました。", { textBlock });
    return [];
  }

  try {
    const rawShipName = shipNameMatch[1].trim();
    const nameWithoutNumber = rawShipName.replace(/^\d+\s*/, '');
    const ship_name = nameWithoutNumber.replace(/◆\s*/, '').trim();
    
    const sternMainBit = parseInt(sternBitMatch[1], 10);
    if (sternMainBit < MIN_BIT_NUMBER) return [];
    
    const sign = sternBitMatch[2];
    const remainder = sternBitMatch[3] ? parseInt(sternBitMatch[3], 10) : 0;
    let stern_position_m_float = sternMainBit * BIT_LENGTH_M;
    if (sign === '+') stern_position_m_float += remainder;
    else if (sign === '-') stern_position_m_float -= remainder;
    
    const mooringBowBit = parseInt(mooringMatch[1], 10);
    const mooringSternBit = parseInt(mooringMatch[2], 10);
    const arrival_side = mooringBowBit < mooringSternBit ? '左舷' : '右舷';
    
    const loa_m = parseFloat(loaMatch[1]);
    const bow_position_m_float = arrival_side === '右舷' ? stern_position_m_float + loa_m : stern_position_m_float - loa_m;
    
    // --- 【ここからが修正箇所】 ---
    // 新しいヘルパー関数を呼び出して、berth_numberを動的に決定
    const berth_number = determineBerthNumber(bow_position_m_float, stern_position_m_float);
    // --- 【ここまで】 ---
    
    const arrivalMonth = parseInt(dateTimeMatch[1], 10);
    const arrivalDay = parseInt(dateTimeMatch[2], 10);
    const arrivalHour = parseInt(dateTimeMatch[3], 10);
    const arrivalMinute = parseInt(dateTimeMatch[4], 10);
    const departureMonth = parseInt(dateTimeMatch[5], 10);
    const departureDay = parseInt(dateTimeMatch[6], 10);
    const departureHour = parseInt(dateTimeMatch[7], 10);
    const departureMinute = parseInt(dateTimeMatch[8], 10);

    const arrivalDate = new Date(referenceYear, arrivalMonth - 1, arrivalDay, arrivalHour, arrivalMinute);
    const departureDate = new Date(referenceYear, departureMonth - 1, departureDay, departureHour, departureMinute);
    if (departureDate < arrivalDate) departureDate.setFullYear(departureDate.getFullYear() + 1);

    const formatForDB = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const agentName = agentMatch ? agentMatch[1].trim() : undefined;
    const planner_company = agentName ? (PLANNER_TO_STEVEDORE_MAP[agentName] || agentName) : undefined;

    const baseScheduleData = {
      ship_name,
      berth_number: berth_number, // 動的に決定した値を使用
      arrival_time: formatForDB(arrivalDate),
      departure_time: formatForDB(departureDate),
      arrival_side,
      bow_position_m: Math.round(bow_position_m_float),
      stern_position_m: Math.round(stern_position_m_float),
      planner_company: planner_company,
    };

    const hashSource = Object.values(baseScheduleData).join('|');
    const data_hash = createHash('sha256').update(hashSource).digest('hex');

    const schedules: ScheduleDataForDB[] = [];
    let currentDate = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate());

    while (currentDate <= departureDate) {
      const pad = (n: number) => String(n).padStart(2, '0');
      schedules.push({
        ...baseScheduleData,
        schedule_date: `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`,
        data_hash,
        last_import_id: importId,
        update_flg: false,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return schedules;

  } catch (error) {
    console.error("解析中にエラーが発生しました:", error, { textBlock });
    return [];
  }
};

export const parseMultipleSchedules = (
  fullText: string,
  referenceYear: number,
  importId: string
) => {
  const trimmedText = fullText.trim();
  if (!trimmedText) return [];
  const processedText = trimmedText.replace(/(^連絡先.*$)/gm, '$1\n__BLOCK_SEPARATOR__');
  const blocks = processedText.split('__BLOCK_SEPARATOR__').filter(block => block.trim().length > 0);
  return blocks.flatMap(block => parseScheduleBlock(block, referenceYear, importId));
};