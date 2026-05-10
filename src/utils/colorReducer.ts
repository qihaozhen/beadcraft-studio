import type { BeadCell, BeadColor, MatchInfo, PatternResult } from "../types/bead";
import {
  analyzeColorDistance,
  getErrorLevelInfo,
  type ColorDistanceResult,
} from "./colorDistance";
import {
  getColorCodeByBrand,
  type PaletteBrand,
} from "./paletteMatcher";

/**
 * 最大颜色数选项。
 *
 * 0 表示不限制颜色数量。
 */
export const MAX_COLOR_OPTIONS = [0, 8, 12, 16, 24] as const;

export type MaxColorsOption = (typeof MAX_COLOR_OPTIONS)[number];

interface ColorUsageItem {
  key: string;
  color: BeadColor;
  code: string;
  brand: PaletteBrand;
  count: number;
}

interface NearestLimitedColorResult {
  color: BeadColor;
  code: string;
  brand: PaletteBrand;
  detail: ColorDistanceResult;
}

/**
 * 最大颜色数显示文字。
 */
export function formatMaxColorsLabel(maxColors: number): string {
  if (maxColors === 0) {
    return "不限";
  }

  return `${maxColors} 色`;
}

/**
 * 判断最大颜色数是否合法。
 */
export function isSupportedMaxColors(value: number): value is MaxColorsOption {
  return MAX_COLOR_OPTIONS.includes(value as MaxColorsOption);
}

/**
 * 获取格子的颜色 key。
 */
function getCellColorKey(cell: BeadCell, brand: PaletteBrand): string | null {
  if (!cell.color) {
    return null;
  }

  const code =
    cell.matchedCode ??
    getColorCodeByBrand(cell.color, brand) ??
    cell.color.code;

  const matchedBrand = (cell.matchedBrand as PaletteBrand | null) ?? brand;

  return `${matchedBrand}:${code}`;
}

/**
 * 获取颜色在某品牌下的 key。
 */
function getBeadColorKey(color: BeadColor, brand: PaletteBrand): string {
  const code = getColorCodeByBrand(color, brand) ?? color.code;
  return `${brand}:${code}`;
}

/**
 * 统计每种颜色的使用次数。
 */
export function countColorUsage(
  pattern: PatternResult,
  brand: PaletteBrand = "MARD"
): ColorUsageItem[] {
  const usageMap = new Map<string, ColorUsageItem>();

  for (const cell of pattern.cells) {
    if (!cell.color) {
      continue;
    }

    const code =
      cell.matchedCode ??
      getColorCodeByBrand(cell.color, brand) ??
      cell.color.code;

    const matchedBrand = (cell.matchedBrand as PaletteBrand | null) ?? brand;
    const key = `${matchedBrand}:${code}`;

    const existing = usageMap.get(key);

    if (!existing) {
      usageMap.set(key, {
        key,
        color: cell.color,
        code,
        brand: matchedBrand,
        count: 1,
      });

      continue;
    }

    existing.count += 1;
  }

  return Array.from(usageMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * 找出使用次数最多的前 N 种颜色。
 */
export function getTopUsedColors(
  pattern: PatternResult,
  maxColors: number,
  brand: PaletteBrand = "MARD"
): BeadColor[] {
  if (maxColors <= 0) {
    return countColorUsage(pattern, brand).map((item) => item.color);
  }

  return countColorUsage(pattern, brand)
    .slice(0, maxColors)
    .map((item) => item.color);
}

/**
 * 在限制后的颜色集合中，重新找最接近的颜色。
 */
function findNearestColorInLimitedPalette(
  originalHex: string,
  limitedPalette: BeadColor[],
  brand: PaletteBrand
): NearestLimitedColorResult {
  if (limitedPalette.length === 0) {
    throw new Error("限制后的色盘为空，无法重新匹配颜色。");
  }

  let nearestColor = limitedPalette[0];
  let nearestDetail = analyzeColorDistance(originalHex, nearestColor.hex);

  for (const color of limitedPalette) {
    const detail = analyzeColorDistance(originalHex, color.hex);

    if (detail.distance < nearestDetail.distance) {
      nearestColor = color;
      nearestDetail = detail;
    }
  }

  const code = getColorCodeByBrand(nearestColor, brand) ?? nearestColor.code;

  return {
    color: nearestColor,
    code,
    brand,
    detail: nearestDetail,
  };
}

/**
 * 刷新 PatternResult 的统计信息。
 *
 * 用途：
 * 最大颜色数限制后，颜色会被重新归并，
 * 所以 usedColors 需要重新计算。
 */
export function refreshPatternStatistics(pattern: PatternResult): PatternResult {
  const usedColorSet = new Set<string>();
  let totalBeads = 0;

  for (const cell of pattern.cells) {
    if (!cell.color) {
      continue;
    }

    totalBeads += 1;

    const brand = cell.matchedBrand ?? cell.color.brand;
    const code = cell.matchedCode ?? cell.color.code;

    usedColorSet.add(`${brand}:${code}`);
  }

  return {
    ...pattern,
    totalBeads,
    usedColors: usedColorSet.size,
  };
}

/**
 * 最大颜色数限制核心函数。
 *
 * 实现思路：
 * 1. 先完成全部像素匹配；
 * 2. 统计每种颜色出现次数；
 * 3. 按使用数量从高到低排序；
 * 4. 保留前 N 个颜色；
 * 5. 其他颜色重新匹配到这 N 个颜色中最近的颜色。
 */
export function limitPatternColors(
  pattern: PatternResult,
  maxColors: number,
  brand: PaletteBrand = "MARD"
): PatternResult {
  if (maxColors <= 0) {
    return refreshPatternStatistics(pattern);
  }

  const usageList = countColorUsage(pattern, brand);

  if (usageList.length <= maxColors) {
    return refreshPatternStatistics(pattern);
  }

  const topColors = usageList.slice(0, maxColors).map((item) => item.color);

  const allowedKeySet = new Set(
    topColors.map((color) => getBeadColorKey(color, brand))
  );

  const nextCells: BeadCell[] = pattern.cells.map((cell) => {
    if (!cell.color) {
      return cell;
    }

    const currentKey = getCellColorKey(cell, brand);

    if (currentKey && allowedKeySet.has(currentKey)) {
      return cell;
    }

    const nearest = findNearestColorInLimitedPalette(
      cell.originalHex,
      topColors,
      brand
    );

    const levelInfo = getErrorLevelInfo(nearest.detail.errorLevel);

    const nextMatch: MatchInfo = {
      distance: nearest.detail.roundedDistance,
      errorLevel: nearest.detail.errorLevel,
      userHint: levelInfo.userHint,
    };

    return {
      ...cell,
      color: nearest.color,
      match: nextMatch,
      matchedCode: nearest.code,
      matchedBrand: nearest.brand,
    };
  });

  return refreshPatternStatistics({
    ...pattern,
    cells: nextCells,
  });
}