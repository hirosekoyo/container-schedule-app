import { ScheduleInsert } from "./supabase/actions";

// DB登録用の型をより明確に定義
type ScheduleDataForDB = Omit<ScheduleInsert, 'id' | 'created_at'>;

const BIT_LENGTH_M = 30;
const MIN_BIT_NUMBER = 33;

const REGEX_MAP = {
  shipName: /^(?:\d+)?\s*(?:◆\s*)?(.+?)\s*$/m,
  loa: /(?:全長|LOA)\s*:?\s*([\d.]+)\s*m/i,
  mooring: /綱位置.*\((\d+)\s*(?:-|～)\s*(\d+)\)/,
  sternBit: /船尾ビット\s*:?\s*(\d+)(?:([+-])(\d+)m)?/,
  agent: /代理店\s*:?\s*(.*)/,
  dateTime: /(\d{2})\/(\d{2})\s(\d{2}):(\d{2})\s*～\s*(?:\d{2}\/\d{2}\s)?(\d{2}):(\d{2})/,
};

const parseSingleSchedule = (
  textBlock: string,
  referenceYear: number
): ScheduleDataForDB | null => {
  const shipNameMatch = textBlock.match(REGEX_MAP.shipName);
  const loaMatch = textBlock.match(REGEX_MAP.loa);
  const mooringMatch = textBlock.match(REGEX_MAP.mooring);
  const sternBitMatch = textBlock.match(REGEX_MAP.sternBit);
  const agentMatch = textBlock.match(REGEX_MAP.agent);
  const dateTimeMatch = textBlock.match(REGEX_MAP.dateTime);

  if (!shipNameMatch || !loaMatch || !mooringMatch || !sternBitMatch || !dateTimeMatch) {
    return null;
  }

  try {
    const sternMainBit = parseInt(sternBitMatch[1], 10);
    if (sternMainBit < MIN_BIT_NUMBER) return null;

    const sign = sternBitMatch[2];
    const remainder = sternBitMatch[3] ? parseInt(sternBitMatch[3], 10) : 0;
    let stern_position_m_float = sternMainBit * BIT_LENGTH_M;
    if (sign === '+') {
      stern_position_m_float += remainder;
    } else if (sign === '-') {
      stern_position_m_float -= remainder;
    }

    const mooringBowBit = parseInt(mooringMatch[1], 10);
    const mooringSternBit = parseInt(mooringMatch[2], 10);
    const arrival_side = mooringBowBit < mooringSternBit ? '左舷' : '右舷';

    const loa_m = parseFloat(loaMatch[1]);
    let bow_position_m_float = arrival_side === '右舷'
      ? stern_position_m_float + loa_m
      : stern_position_m_float - loa_m;

    // --- 【ここからが修正箇所】 ---
    // 計算されたメートル値を最も近い整数に丸める
    const stern_position_m = Math.round(stern_position_m_float);
    const bow_position_m = Math.round(bow_position_m_float);
    // --- 【ここまでが修正箇所】 ---


    const arrivalMonth = parseInt(dateTimeMatch[1], 10);
    const arrivalDay = parseInt(dateTimeMatch[2], 10);
    const arrivalHour = parseInt(dateTimeMatch[3], 10);
    const arrivalMinute = parseInt(dateTimeMatch[4], 10);
    const departureHour = parseInt(dateTimeMatch[5], 10);
    const departureMinute = parseInt(dateTimeMatch[6], 10);

    const schedule_date = `${referenceYear}-${String(arrivalMonth).padStart(2, '0')}-${String(arrivalDay).padStart(2, '0')}`;
    const arrival_time = `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMinute).padStart(2, '0')}:00`;

    let departureDate = new Date(referenceYear, arrivalMonth - 1, arrivalDay, departureHour, departureMinute);
    if (departureHour * 60 + departureMinute < arrivalHour * 60 + arrivalMinute) {
      departureDate.setDate(departureDate.getDate() + 1);
    }
    const departure_time = departureDate.toTimeString().split(' ')[0];

    return {
      ship_name: shipNameMatch[1].trim(),
      berth_number: 6,
      schedule_date,
      arrival_time,
      departure_time,
      arrival_side,
      bow_position_m,     // 丸めた値をセット
      stern_position_m,   // 丸めた値をセット
      planner_company: agentMatch ? agentMatch[1].trim() : undefined,
    };

  } catch (error) {
    console.error("解析中にエラーが発生しました:", error, { textBlock });
    return null;
  }
};

export const parseMultipleSchedules = (fullText: string, referenceYear: number) => {
  const blocks = fullText.split(/\n\s*\n/).filter(block => block.trim().length > 0);
  const schedules: Omit<ScheduleInsert, 'id' | 'created_at'>[] = [];
  for (const block of blocks) {
    const schedule = parseSingleSchedule(block, referenceYear);
    if (schedule) {
      schedules.push(schedule);
    }
  }
  return schedules;
};