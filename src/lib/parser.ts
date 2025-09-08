import { createHash } from 'crypto';
import { ScheduleInsert } from "./supabase/actions";

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
    const arrivalMonth = parseInt(dateTimeMatch[1], 10);
    const arrivalDay = parseInt(dateTimeMatch[2], 10);
    const arrivalHour = parseInt(dateTimeMatch[3], 10);
    const arrivalMinute = parseInt(dateTimeMatch[4], 10);
    const departureMonth = parseInt(dateTimeMatch[5], 10);
    const departureDay = parseInt(dateTimeMatch[6], 10);
    const departureHour = parseInt(dateTimeMatch[7], 10);
    const departureMinute = parseInt(dateTimeMatch[8], 10);

    // 1. Dateオブジェクトを、タイムゾーンを意識しない単純な日付・時刻の入れ物として使う
    const arrivalDate = new Date(referenceYear, arrivalMonth - 1, arrivalDay, arrivalHour, arrivalMinute);
    const departureDate = new Date(referenceYear, departureMonth - 1, departureDay, departureHour, departureMinute);
    if (departureDate < arrivalDate) departureDate.setFullYear(departureDate.getFullYear() + 1);

    // 2. 'YYYY-MM-DD HH:mm:ss' 形式のタイムゾーンなし文字列を自前で生成する
    const formatForDB = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const yyyy = date.getFullYear();
        const MM = pad(date.getMonth() + 1);
        const dd = pad(date.getDate());
        const HH = pad(date.getHours());
        const mm = pad(date.getMinutes());
        const ss = pad(date.getSeconds());
        return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
    };

    const baseScheduleData = {
      ship_name,
      berth_number: 6,
      arrival_time: formatForDB(arrivalDate), // 3. 生成した文字列をセット
      departure_time: formatForDB(departureDate), // 3. 生成した文字列をセット
      arrival_side,
      bow_position_m: Math.round(bow_position_m_float),
      stern_position_m: Math.round(stern_position_m_float),
      planner_company: agentMatch ? agentMatch[1].trim() : undefined,
    };
    // --- 【ここまで修正】 ---

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