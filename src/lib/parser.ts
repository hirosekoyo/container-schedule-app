import { ScheduleInsert } from "./supabase/actions";

type ScheduleDataForDB = Omit<ScheduleInsert, 'id' | 'created_at'>;

const BIT_LENGTH_M = 30;
const MIN_BIT_NUMBER = 33;

const REGEX_MAP = {
  shipName: /^(?:\d+\s+)?(?:◆\s*)?(.*?)\s*$/m,
  loa: /(?:全長|LOA)\s*:?\s*([\d.]+)\s*m/i,
  mooring: /綱位置.*\((\d+)\s*(?:-|～)\s*(\d+)\)/,
  sternBit: /船尾ビット\s*:?\s*(\d+)(?:([+-])(\d+)m)?/,
  agent: /代理店\s*:?\s*(.*)/,
  dateTime: /(\d{2})\/(\d{2})\s(\d{2}):(\d{2})\s*～\s*(?:(\d{2})\/(\d{2})\s)?(\d{2}):(\d{2})/,
};

const parseScheduleBlock = (
  textBlock: string,
  referenceYear: number
): ScheduleDataForDB[] => {
  const shipNameMatch = textBlock.match(REGEX_MAP.shipName);
  const loaMatch = textBlock.match(REGEX_MAP.loa);
  const mooringMatch = textBlock.match(REGEX_MAP.mooring);
  const sternBitMatch = textBlock.match(REGEX_MAP.sternBit);
  const agentMatch = textBlock.match(REGEX_MAP.agent);
  const dateTimeMatch = textBlock.match(REGEX_MAP.dateTime);

  if (!shipNameMatch || !loaMatch || !mooringMatch || !sternBitMatch || !dateTimeMatch) return [];

  try {
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
    
    const baseScheduleData = {
      ship_name: shipNameMatch[1].trim(),
      berth_number: 6,
      arrival_side,
      bow_position_m: Math.round(bow_position_m_float),
      stern_position_m: Math.round(stern_position_m_float),
      planner_company: agentMatch ? agentMatch[1].trim() : undefined,
    };

    const arrivalMonth = parseInt(dateTimeMatch[1], 10);
    const arrivalDay = parseInt(dateTimeMatch[2], 10);
    const arrivalHour = parseInt(dateTimeMatch[3], 10);
    const arrivalMinute = parseInt(dateTimeMatch[4], 10);
    const departureMonth = dateTimeMatch[5] ? parseInt(dateTimeMatch[5], 10) : arrivalMonth;
    const departureDay = dateTimeMatch[6] ? parseInt(dateTimeMatch[6], 10) : arrivalDay;
    const departureHour = parseInt(dateTimeMatch[7], 10);
    const departureMinute = parseInt(dateTimeMatch[8], 10);

    const arrivalDate = new Date(Date.UTC(referenceYear, arrivalMonth - 1, arrivalDay, arrivalHour, arrivalMinute));
    const departureDate = new Date(Date.UTC(referenceYear, departureMonth - 1, departureDay, departureHour, departureMinute));
    if (departureDate < arrivalDate) departureDate.setUTCFullYear(departureDate.getUTCFullYear() + 1);

    const schedules: ScheduleDataForDB[] = [];
    let currentDate = new Date(arrivalDate);
    currentDate.setUTCHours(0, 0, 0, 0);

    while (currentDate <= departureDate) {
      schedules.push({
        ...baseScheduleData,
        schedule_date: currentDate.toISOString().split('T')[0],
        arrival_time: arrivalDate.toISOString(), // 完全な日時を生成
        departure_time: departureDate.toISOString(), // 完全な日時を生成
      });
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    return schedules;

  } catch (error) {
    console.error("解析中にエラーが発生しました:", error, { textBlock });
    return [];
  }
};

export const parseMultipleSchedules = (fullText: string, referenceYear: number) => {
  return fullText.split(/\n\s*\n/).filter(block => block.trim().length > 0).flatMap(block => parseScheduleBlock(block, referenceYear));
};