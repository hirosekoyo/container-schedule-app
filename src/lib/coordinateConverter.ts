const BIT_POSITION_MAP: { [bit: number]: number } = {
  22: 0, 23: 15, 24: 30, 25: 45, 26: 60, 27: 75, 28: 90, 29: 105, 30: 120, 31: 135, 32: 150,
  33: 162.5, 34: 176.5, 35: 197.5,
};
for (let i = 36; i <= 65; i++) {
  BIT_POSITION_MAP[i] = BIT_POSITION_MAP[i - 1] + 30;
}
const BITS = Object.keys(BIT_POSITION_MAP).map(Number).sort((a, b) => a - b);

export const bitNotationToMeters = (notation: string | null | undefined): number | null => {
  if (!notation) return null;
  const match = notation.match(/^(\d+)(?:([+-])(\d+))?$/);
  if (!match) return null;
  const mainBit = parseInt(match[1], 10);
  const sign = match[2];
  const remainder = match[3] ? parseInt(match[3], 10) : 0;
  const basePositionM = BIT_POSITION_MAP[mainBit];
  if (basePositionM === undefined) return null;
  if (sign === '+') return basePositionM + remainder;
  if (sign === '-') return basePositionM - remainder;
  return basePositionM;
};

export const metersToBitPosition = (meters: number): number => {
  let baseBit = 0;
  for (const bit of BITS) {
    if (BIT_POSITION_MAP[bit] <= meters) {
      baseBit = bit;
    } else {
      break;
    }
  }
  const remainderMeters = meters - BIT_POSITION_MAP[baseBit];
  const distanceToNextBit = BIT_POSITION_MAP[baseBit + 1] - BIT_POSITION_MAP[baseBit];
  if (distanceToNextBit === 0) return baseBit;
  const fractionalBit = remainderMeters / distanceToNextBit;
  return baseBit + fractionalBit;
};

export const metersToBitNotation = (meters: number | null | undefined): string => {
  if (meters === null || meters === undefined || isNaN(meters)) return '-';
  let baseBit = 0;
  for (const bit of BITS) {
    if (BIT_POSITION_MAP[bit] <= meters) {
      baseBit = bit;
    } else {
      break;
    }
  }
  let remainderMeters = Math.round(meters - BIT_POSITION_MAP[baseBit]);
  const distanceToNextBit = BIT_POSITION_MAP[baseBit + 1] - BIT_POSITION_MAP[baseBit];
  if (distanceToNextBit && remainderMeters > distanceToNextBit / 2 && baseBit < 64) {
      baseBit += 1;
      remainderMeters = Math.round(meters - BIT_POSITION_MAP[baseBit]);
  }
  const sign = remainderMeters >= 0 ? '+' : '-';
  const absRemainder = Math.abs(remainderMeters);
  return `${baseBit}${sign}${String(absRemainder).padStart(2, '0')}`;
};