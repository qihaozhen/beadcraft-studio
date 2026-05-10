import type { BeadCell, MaterialItem, PatternResult } from "../types/bead";

interface MaterialAccumulator {
  code: string;
  name: string;
  hex: string;
  count: number;
  totalDistance: number;
  brand: string;
  finish?: MaterialItem["finish"];
  isTransparent?: boolean;
}

export interface PatternSummary {
  width: number;
  height: number;
  totalCells: number;
  totalBeads: number;
  usedColors: number;
  transparentCells: number;
  ignoredTransparentCells: number;
  emptyCells: number;
  beadCoverage: number;
}

/**
 * 判断一个格子是否是真正需要拼豆的格子。
 *
 * color === null 表示透明空格，不进入材料清单。
 */
export function isActiveBeadCell(
  cell: BeadCell
): cell is BeadCell & { color: NonNullable<BeadCell["color"]> } {
  return cell.color !== null;
}

/**
 * 统计材料消耗清单。
 *
 * 统计内容：
 * 1. 色号；
 * 2. 颜色名称；
 * 3. HEX 色块；
 * 4. 数量；
 * 5. 占比；
 * 6. 平均匹配误差。
 */
export function countMaterials(pattern: PatternResult): MaterialItem[] {
  const activeCells = pattern.cells.filter(isActiveBeadCell);
  const totalActiveBeads = activeCells.length;

  const materialMap = new Map<string, MaterialAccumulator>();

  for (const cell of activeCells) {
    const color = cell.color;
    const code = cell.matchedCode ?? color.code;
    const brand = cell.matchedBrand ?? color.brand;
    const key = `${brand}:${code}`;

    const existing = materialMap.get(key);

    if (!existing) {
      materialMap.set(key, {
        code,
        name: color.name,
        hex: color.hex,
        count: 1,
        totalDistance: cell.match?.distance ?? 0,
        brand,
        finish: color.finish,
        isTransparent: color.isTransparent,
      });

      continue;
    }

    existing.count += 1;
    existing.totalDistance += cell.match?.distance ?? 0;
  }

  return Array.from(materialMap.values())
    .map((item) => ({
      code: item.code,
      name: item.name,
      hex: item.hex,
      count: item.count,
      percentage:
        totalActiveBeads === 0
          ? 0
          : Number(((item.count / totalActiveBeads) * 100).toFixed(2)),
      avgDistance:
        item.count === 0
          ? 0
          : Number((item.totalDistance / item.count).toFixed(2)),
      brand: item.brand,
      finish: item.finish,
      isTransparent: item.isTransparent,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 汇总图纸统计信息。
 *
 * 实际拼豆数 = 排除透明空格后的格子数。
 */
export function summarizePattern(pattern: PatternResult): PatternSummary {
  const totalCells = pattern.width * pattern.height;
  const emptyCells = pattern.cells.filter((cell) => cell.color === null).length;

  return {
    width: pattern.width,
    height: pattern.height,
    totalCells,
    totalBeads: pattern.totalBeads,
    usedColors: pattern.usedColors,
    transparentCells: pattern.transparentCells,
    ignoredTransparentCells: pattern.ignoredTransparentCells,
    emptyCells,
    beadCoverage:
      totalCells === 0
        ? 0
        : Number(((pattern.totalBeads / totalCells) * 100).toFixed(2)),
  };
}

/**
 * 单独统计透明空格数量。
 */
export function countIgnoredTransparentCells(pattern: PatternResult): number {
  return pattern.cells.filter((cell) => cell.color === null).length;
}