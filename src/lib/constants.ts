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
  'NEC',
  'GEN',
  'SOG',
  'KAM',
  'MIT', // プランナ変換表に含まれているので追加
  'ふ頭', // プランナ変換表に含まれているので追加
];

/**
 * プランナ名 (代理店名) から荷役会社コードへの変換マップ
 */
export const PLANNER_TO_STEVEDORE_MAP: { [key: string]: string } = {
  'ジェネック福岡香椎': 'GEN',
  '相互運輸株式会社': 'SOG',
  '山九福岡支店': 'HKK',
  '㈱シーゲート': 'HKK',
  '博多港運香椎ターミナ': 'HKK',
  '日通ターミナル事業所': 'NEC',
  '博多港ふ頭㈱バース': 'ふ頭',
  'ホームリンガ商会': 'KAM',
  '上組福岡支店': 'KAM',
  'ベンライン': 'KAM',
  '三菱倉庫福岡支店': 'MIT',
};