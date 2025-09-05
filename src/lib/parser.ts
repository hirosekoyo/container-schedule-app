import { createHash } from 'crypto';
import { ScheduleInsert } from "./supabase/actions";

// DB登録用の型定義。新しいカラムもすべて含みます。
type ScheduleDataForDB = Omit<ScheduleInsert, 'id' | 'created_at'>;

const BIT_LENGTH_M = 30;
const MIN_BIT_NUMBER = 33;

const REGEX_MAP = {
  shipName: /^(.*?)\s*$/m,
  loa: /(?:全長|LOA)\s*:?\s*([\d.]+)\s*m/i,
  mooring: /綱位置.*\((\d+)\s*(?:-|～)\s*(\d+)\)/,
  sternBit: /船尾ビット\s*:?\s*(\d+)(?:([+-])(\d+)m)?/,
  agent: /代理店\s*:?\s*(.*)/,
  dateTime: /(\d{2})\/(\d{2})\s(\d{2}):(\d{2})\s*～\s*(\d{2})\/(\d{2})\s(\d{2}):(\d{2})/,
};

/**
 * 1件のテキストブロックを解析し、滞在日数分のデータ配列を生成する
 * @param textBlock - 1件の船舶情報を含むテキスト
 * @param referenceYear - 基準となる年 (例: 2024)
 * @param importId - 今回のインポート処理を識別するユニークID
 * @returns 解析されたスケジュールデータの配列
 */
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
    
    const arrivalMonth = parseInt(dateTimeMatch[1], 10);
    const arrivalDay = parseInt(dateTimeMatch[2], 10);
    const arrivalHour = parseInt(dateTimeMatch[3], 10);
    const arrivalMinute = parseInt(dateTimeMatch[4], 10);
    const departureMonth = parseInt(dateTimeMatch[5], 10);
    const departureDay = parseInt(dateTimeMatch[6], 10);
    const departureHour = parseInt(dateTimeMatch[7], 10);
    const departureMinute = parseInt(dateTimeMatch[8], 10);

    const arrivalDate = new Date(Date.UTC(referenceYear, arrivalMonth - 1, arrivalDay, arrivalHour, arrivalMinute));
    const departureDate = new Date(Date.UTC(referenceYear, departureMonth - 1, departureDay, departureHour, departureMinute));
    if (departureDate < arrivalDate) departureDate.setUTCFullYear(departureDate.getUTCFullYear() + 1);

    // ハッシュ計算の元になるベースデータを作成
    const baseScheduleData = {
      ship_name,
      berth_number: 6,
      arrival_time: arrivalDate.toISOString(),
      departure_time: departureDate.toISOString(),
      arrival_side,
      bow_position_m: Math.round(bow_position_m_float),
      stern_position_m: Math.round(stern_position_m_float),
      planner_company: agentMatch ? agentMatch[1].trim() : undefined,
    };

    // 重要なフィールドを結合してハッシュの元になる文字列を作成
    const hashSource = Object.values(baseScheduleData).join('|');
    const data_hash = createHash('sha256').update(hashSource).digest('hex');

    const schedules: ScheduleDataForDB[] = [];
    let currentDate = new Date(arrivalDate);
    currentDate.setUTCHours(0, 0, 0, 0);

    while (currentDate <= departureDate) {
      schedules.push({
        ...baseScheduleData,
        schedule_date: currentDate.toISOString().split('T')[0],
        data_hash,
        last_import_id: importId,
        update_flg: false, // 初期値は常にfalse
      });
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    return schedules;

  } catch (error) {
    console.error("解析中にエラーが発生しました:", error, { textBlock });
    return [];
  }
};

/**
 * 複数件の船舶情報が含まれるテキスト全体を解析する
 * @param fullText - テキストデータ
 * @param referenceYear - 基準となる年
 * @param importId - 今回のインポート処理を識別するユニークID
 * @returns 解析されたスケジュールデータの配列
 */
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