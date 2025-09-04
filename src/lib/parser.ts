import { ScheduleInsert } from "./supabase/actions";

type ScheduleDataForDB = Omit<ScheduleInsert, 'id' | 'created_at'>;

const BIT_LENGTH_M = 30;
const MIN_BIT_NUMBER = 33;

const REGEX_MAP = {
  shipName: /^(.*?)\s*$/m,
  loa: /(?:全長|LOA)\s*:?\s*([\d.]+)\s*m/i,
  mooring: /綱位置.*\((\d+)\s*(?:-|～)\s*(\d+)\)/,
  sternBit: /船尾ビット\s*:?\s*(\d+)(?:([+-])(\d+)m)?/,
  agent: /代理店\s*:?\s*(.*)/,
  // --- 【ここからが修正箇所】 ---
  // 日時の正規表現を、着岸と離岸の両方で MM/DD HH:mm 形式を必須とするように修正
  // [1]=着月, [2]=着日, [3]=着時, [4]=着分
  // [5]=離月, [6]=離日, [7]=離時, [8]=離分
  dateTime: /(\d{2})\/(\d{2})\s(\d{2}):(\d{2})\s*～\s*(\d{2})\/(\d{2})\s(\d{2}):(\d{2})/,
  // --- 【ここまで修正】 ---
};

const parseScheduleBlock = (
  textBlock: string,
  referenceYear: number
): ScheduleDataForDB[] => {

  // 1. 各ブロックの先頭にある余分な改行や空白をトリムする
  const cleanedBlock = textBlock.trim();
  if (!cleanedBlock) {
    return [];
  }

  // 2. トリムしたブロックに対して正規表現をかける
  const shipNameMatch = cleanedBlock.match(REGEX_MAP.shipName);
  const loaMatch = cleanedBlock.match(REGEX_MAP.loa);
  const mooringMatch = cleanedBlock.match(REGEX_MAP.mooring);
  const sternBitMatch = cleanedBlock.match(REGEX_MAP.sternBit);
  const agentMatch = cleanedBlock.match(REGEX_MAP.agent);
  const dateTimeMatch = cleanedBlock.match(REGEX_MAP.dateTime);

  if (!shipNameMatch || !loaMatch || !mooringMatch || !sternBitMatch || !dateTimeMatch) return [];

  try {
    const rawShipName = shipNameMatch[1].trim();
    const ship_name = rawShipName.replace(/◆\s*/, '').trim();

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
      ship_name,
      berth_number: 6,
      arrival_side,
      bow_position_m: Math.round(bow_position_m_float),
      stern_position_m: Math.round(stern_position_m_float),
      planner_company: agentMatch ? agentMatch[1].trim() : undefined,
    };

    // --- 【ここからが修正箇所】 ---
    // 新しい正規表現に合わせて、キャプチャグループのインデックスを修正
    const arrivalMonth = parseInt(dateTimeMatch[1], 10);
    const arrivalDay = parseInt(dateTimeMatch[2], 10);
    const arrivalHour = parseInt(dateTimeMatch[3], 10);
    const arrivalMinute = parseInt(dateTimeMatch[4], 10);
    
    const departureMonth = parseInt(dateTimeMatch[5], 10);
    const departureDay = parseInt(dateTimeMatch[6], 10);
    const departureHour = parseInt(dateTimeMatch[7], 10);
    const departureMinute = parseInt(dateTimeMatch[8], 10);
    // --- 【ここまで修正】 ---

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
        arrival_time: arrivalDate.toISOString(),
        departure_time: departureDate.toISOString(),
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
  // 1. テキスト全体の先頭と末尾の空白を削除
  const trimmedText = fullText.trim();
  if (!trimmedText) {
    return [];
  }

  // 2. 「連絡先」で始まる行の「後」に、信頼できる区切り文字を挿入する
  //    正規表現 /(^連絡先.*$)/gm は、
  //    - ^ : 行の先頭
  //    - 連絡先.* : 「連絡先」で始まる行の全体
  //    - $ : 行の末尾
  //    - g : グローバル（ファイル全体で検索）
  //    - m : マルチラインモード（^と$が各行で機能する）
  //    置換後の '$1\n__BLOCK_SEPARATOR__' は、
  //    - $1 : マッチした行全体（例: "連絡先 Y.OGOMORI...")
  //    - \n__BLOCK_SEPARATOR__ : その直後に改行と我々だけの区切り文字を追加
  const processedText = trimmedText.replace(/(^連絡先.*$)/gm, '$1\n__BLOCK_SEPARATOR__');

  // 3. 挿入した区切り文字でテキストを分割する
  //    これにより、空行がなくても確実にブロックが分割される
  const blocks = processedText.split('__BLOCK_SEPARATOR__')
    // 分割によって生まれた可能性のある空のブロックをフィルタリング
    .filter(block => block.trim().length > 0);

  // 4. 各ブロックを解析する
  return blocks.flatMap(block => parseScheduleBlock(block, referenceYear));
};