import { ScheduleInsert } from "./supabase/actions";
import { PLANNER_TO_STEVEDORE_MAP } from './constants';
import { bitNotationToMeters } from './coordinateConverter';

// ScheduleDataForDBの型定義は変更なし
type ScheduleDataForDB = Omit<ScheduleInsert, 'id' | 'created_at' | 'updated_at'>; // updated_atも除外

const MIN_BIT_NUMBER_TO_PROCESS = 22;

const REGEX_MAP = {
  shipName: /^(.*?)(\r\n|\n|$)/,
  loa: /(?:全長|LOA)\s*:?\s*([\d.]+)\s*m/i,
  mooring: /綱位置.*\((\d+)\s*(?:-|～)\s*(\d+)\)/,
  sternBit: /船尾ビット\s*:?\s*(\d+)(?:([+-±])(\d+)m?)?/,
  agent: /荷役会社\s*:?\s*(.*)/,
  dateTime: /(\d{2})\/(\d{2})\s(\d{2}):(\d{2})\s*～\s*(\d{2})\/(\d{2})\s(\d{2}):(\d{2})/,
  remarks: /備考\s*:?\s*(.*)/, // 正規表現を正しく設定
};

const determineBerthNumber = (bow_m: number, stern_m: number): number => {
  const midpoint_m = (bow_m + stern_m) / 2;
  const BERTH_5_END_M = bitNotationToMeters('35-10')!;
  const BERTH_6_END_M = bitNotationToMeters('45+15')!;
  const BERTH_7_END_M = bitNotationToMeters('57+15')!;

  if (midpoint_m < BERTH_5_END_M) {
    return 5;
  } else if (midpoint_m >= BERTH_5_END_M && midpoint_m < BERTH_6_END_M) {
    return 6;
  } else if (midpoint_m >= BERTH_6_END_M && midpoint_m < BERTH_7_END_M) {
    return 7;
  } else {
    return 8;
  }
};

const parseScheduleBlock = (
  textBlock: string,
  referenceYear: number,
  importId: string,
  location: string // locationを受け取る
): ScheduleDataForDB[] => {
  const cleanedBlock = textBlock.trim();
  if (!cleanedBlock) return [];

  const shipNameMatch = cleanedBlock.match(REGEX_MAP.shipName);
  const loaMatch = cleanedBlock.match(REGEX_MAP.loa);
  const mooringMatch = cleanedBlock.match(REGEX_MAP.mooring);
  const sternBitMatch = cleanedBlock.match(REGEX_MAP.sternBit);
  const agentMatch = cleanedBlock.match(REGEX_MAP.agent);
  const dateTimeMatch = cleanedBlock.match(REGEX_MAP.dateTime);
  const remarksMatch = cleanedBlock.match(REGEX_MAP.remarks);

  if (!shipNameMatch || !loaMatch || !mooringMatch || !sternBitMatch || !dateTimeMatch) {
    return [];
  }

  try {
    const rawShipName = shipNameMatch[1].trim();
    const nameWithoutNumber = rawShipName.replace(/^\d+\s*/, '');
    const ship_name = nameWithoutNumber.replace(/◆\s*/, '').trim();
    
    const sternMainBit = parseInt(sternBitMatch[1], 10);
    if (sternMainBit < MIN_BIT_NUMBER_TO_PROCESS) { return []; }

    let stern_position_m_float = bitNotationToMeters(`${sternMainBit}`)!;
    const sign = sternBitMatch[2];
    const remainder = sternBitMatch[3] ? parseInt(sternBitMatch[3], 10) : 0;
    if (sign === '+') { stern_position_m_float += remainder; } 
    else if (sign === '-') { stern_position_m_float -= remainder; }
    
    const corrected_stern_m_float = sternMainBit < 35 
      ? stern_position_m_float 
      : stern_position_m_float - 1;

    const loa_m_float = parseFloat(loaMatch[1]);
    const loa_m_integer = Math.floor(loa_m_float);
    const mooringBowBit = parseInt(mooringMatch[1], 10);
    const mooringSternBit = parseInt(mooringMatch[2], 10);
    const arrival_side = mooringBowBit < mooringSternBit ? '左舷' : '右舷';
    let bow_position_m_float = arrival_side === '右舷' 
      ? corrected_stern_m_float + loa_m_integer 
      : corrected_stern_m_float - loa_m_integer;
    
    const min_position_m_to_skip = bitNotationToMeters(`${MIN_BIT_NUMBER_TO_PROCESS}`)!;
    if (bow_position_m_float < min_position_m_to_skip && corrected_stern_m_float < min_position_m_to_skip) {
      return [];
    }
    
    const berth_number = determineBerthNumber(bow_position_m_float, corrected_stern_m_float);
    
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

    const importRemarks = remarksMatch ? remarksMatch[1].trim() : undefined;

    const baseScheduleData = {
      location, // locationをオブジェクトに含める
      ship_name,
      berth_number,
      arrival_time: formatForDB(arrivalDate),
      departure_time: formatForDB(departureDate),
      arrival_side,
      bow_position_m: Math.round(bow_position_m_float),
      stern_position_m: Math.round(corrected_stern_m_float),
      planner_company,
    };
    
    const data_hash = [
      baseScheduleData.location, // 1. location を先頭に追加
      baseScheduleData.ship_name,
      baseScheduleData.berth_number,
      baseScheduleData.arrival_time,
      baseScheduleData.departure_time,
      baseScheduleData.arrival_side,
      baseScheduleData.bow_position_m,
      baseScheduleData.stern_position_m,
      baseScheduleData.planner_company // planner_companyもhashの対象に含める
    ].join('|');

    let finalRemarks: string | null = importRemarks || null;
    let finalChangedFields: string[] | null = null;

    if (berth_number === 5) {
      finalRemarks = "5岸の船は位置を正確に計算できないため手動で着岸位置を入力してください。\nIC-1と十分に距離が離れている場合、この予定行は削除してください。";
      finalChangedFields = ["bow_position_m", "stern_position_m"];
    }

    const schedules: ScheduleDataForDB[] = [];
    let currentDate = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate());

    while (currentDate <= departureDate) {
      const pad = (n: number) => String(n).padStart(2, '0');
      schedules.push({
        ...baseScheduleData, // ここでlocationも一緒に展開される
        schedule_date: `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`,
        data_hash,
        last_import_id: importId,
        remarks: finalRemarks,
        changed_fields: finalChangedFields,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return schedules;
    
  } catch (error) {
    console.error("解析中にエラーが発生しました:", error, { textBlock });
    return [];
  }
};

// ▼▼▼ 変更点2: 引数に location を追加 ▼▼▼
export const parseMultipleSchedules = (
  fullText: string,
  referenceYear: number,
  importId: string,
  location: string // locationを受け取る
) => {
  const trimmedText = fullText.trim();
  if (!trimmedText) return [];
  const processedText = trimmedText.replace(/(^連絡先.*$)/gm, '$1\n__BLOCK_SEPARATOR__');
  const blocks = processedText.split('__BLOCK_SEPARATOR__').filter(block => block.trim().length > 0);
  // parseScheduleBlockに関数にlocationを渡す
  return blocks.flatMap(block => parseScheduleBlock(block, referenceYear, importId, location));
};
