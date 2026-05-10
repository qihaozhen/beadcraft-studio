import type { BeadCell, PatternResult } from "../types/bead";

/**
 * 图纸变换工具。
 *
 * horizontal mirror：水平镜像
 * miroir horizontal：法语，水平镜像
 */

/**
 * 水平镜像图纸。
 *
 * 原理：
 * 原来的 x 坐标变成：
 * newX = width - 1 - oldX
 *
 * 例如 32 × 32：
 * x = 0 会变成 x = 31
 * x = 1 会变成 x = 30
 */
export function createHorizontalMirroredPattern(
  pattern: PatternResult
): PatternResult {
  const mirroredCells: BeadCell[] = pattern.cells
    .map((cell) => ({
      ...cell,
      x: pattern.width - 1 - cell.x,
    }))
    .sort((a, b) => {
      if (a.y !== b.y) {
        return a.y - b.y;
      }

      return a.x - b.x;
    });

  return {
    ...pattern,
    cells: mirroredCells,
  };
}