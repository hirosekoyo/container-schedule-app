/**
 * 使用GC (ガントリークレーン) の選択肢
 */
export const CRANE_OPTIONS = [
  'IC-1',
  'IC-2',
  'IC-3',
  'IC-4',
  'IC-5',
  'IC-6',
];

/**
 * GC運転 (荷役会社) の選択肢
 */
export const STEVEDORE_OPTIONS = [
  'HKK',
  'NX',
  'SOG',
  'KAM',
  'GEN',
  'TYO',
  'MIT', // プランナ変換表に含まれているので追加
  'ふ頭', // プランナ変換表に含まれているので追加
];

/**
 * 荷役会社からプランナコードへの変換マップ
 */
export const PLANNER_TO_STEVEDORE_MAP: { [key: string]: string } = {
  'ジェネック': 'GEN',
  '相互運輸': 'SOG',
  '博多港運': 'HKK',
  '日本通運': 'NX',
  '上組': 'KAM',
  '三菱倉庫': 'MIT',
};

/**
 * バスバーと集電装置の点検区分の変換マップ
 */
export const tenkenkubun: { [key: string]: string[] } = {
  '1': ['C1', 'T01-T09'],
  '2': ['C2', 'T10-T18'],
  '3': ['D ', 'T19-T26'],
};

// 3:00から9:00までの30分刻みの時刻オプションを生成
export const TIME_OPTIONS_30_MINUTES = Array.from({ length: 12 }, (_, i) => {
  // 開始時間(5:00)の総分数 + インデックス * 30分
  const totalMinutes = (3 * 60) + (i * 30);
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  const time = `${hours}:${minutes}`;
  return { value: time, label: time };
});

export const getWindColorClass = (speed: number | null | undefined): string => {
  if (speed == null) return '';
  // if (speed >= 20) return 'bg-red-300/30';
  if (speed >= 16) return 'bg-red-300/60';
  if (speed >= 10) return 'bg-yellow-300/50';
  return '';
};

