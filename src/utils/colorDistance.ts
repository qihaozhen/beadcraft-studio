import type { BeadColor } from "../types/bead";

export type ErrorLevel = "low" | "medium" | "high";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export type ColorInput = string | RgbColor | [number, number, number];

export interface ErrorLevelInfo {
  level: ErrorLevel;
  label: string;
  userHint: string;
}

export interface ColorDistanceResult {
  originalHex: string;
  targetHex: string;
  originalRgb: RgbColor;
  targetRgb: RgbColor;
  distance: number;
  roundedDistance: number;
  errorLevel: ErrorLevel;
  errorLabel: string;
  userHint: string;
}

export interface NearestBeadColorResult {
  color: BeadColor;
  detail: ColorDistanceResult;
}

/**
 * 颜色误差等级说明。
 * low：匹配较准确
 * medium：有轻微色差
 * high：色差较明显
 */
export const ERROR_LEVEL_INFO: Record<ErrorLevel, ErrorLevelInfo> = {
  low: {
    level: "low",
    label: "低误差",
    userHint: "匹配较准确",
  },
  medium: {
    level: "medium",
    label: "中等误差",
    userHint: "有轻微色差",
  },
  high: {
    level: "high",
    label: "高误差",
    userHint: "色差较明显",
  },
};

/**
 * 把 HEX 颜色统一整理成 #RRGGBB 格式。
 * 支持：
 * #FFFFFF
 * FFFFFF
 * #FFF
 * FFF
 */
export function normalizeHex(hex: string): string {
  const cleanHex = hex.trim().replace(/^#/, "");

  const expandedHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((char) => char + char)
          .join("")
      : cleanHex;

  if (!/^[0-9a-fA-F]{6}$/.test(expandedHex)) {
    throw new Error(`无效的 HEX 颜色值：${hex}`);
  }

  return `#${expandedHex.toUpperCase()}`;
}

/**
 * 把 HEX 颜色转换成 RGB。
 * 示例：
 * #FF0000 -> { r: 255, g: 0, b: 0 }
 */
export function hexToRgb(hex: string): RgbColor {
  const normalizedHex = normalizeHex(hex).slice(1);

  return {
    r: Number.parseInt(normalizedHex.slice(0, 2), 16),
    g: Number.parseInt(normalizedHex.slice(2, 4), 16),
    b: Number.parseInt(normalizedHex.slice(4, 6), 16),
  };
}

/**
 * 把 RGB 数值限制在 0 到 255 之间。
 */
export function clampRgbValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

/**
 * 统一 RGB 格式，防止出现小数或越界值。
 */
export function normalizeRgb(rgb: RgbColor): RgbColor {
  return {
    r: clampRgbValue(rgb.r),
    g: clampRgbValue(rgb.g),
    b: clampRgbValue(rgb.b),
  };
}

/**
 * 把 RGB 转换成 HEX。
 * 示例：
 * { r: 255, g: 0, b: 0 } -> #FF0000
 */
export function rgbToHex(rgb: RgbColor): string {
  const normalizedRgb = normalizeRgb(rgb);

  const toHex = (value: number) =>
    value.toString(16).padStart(2, "0").toUpperCase();

  return `#${toHex(normalizedRgb.r)}${toHex(normalizedRgb.g)}${toHex(
    normalizedRgb.b
  )}`;
}

/**
 * 把不同输入格式统一转换成 RGB。
 * 支持：
 * "#FF0000"
 * { r: 255, g: 0, b: 0 }
 * [255, 0, 0]
 */
export function toRgbColor(input: ColorInput): RgbColor {
  if (typeof input === "string") {
    return hexToRgb(input);
  }

  if (Array.isArray(input)) {
    const [r, g, b] = input;
    return normalizeRgb({ r, g, b });
  }

  return normalizeRgb(input);
}

/**
 * 计算两个颜色之间的欧氏距离。
 *
 * 公式：
 * distance = sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2)
 *
 * 距离越小，说明颜色越接近。
 */
export function calculateColorDistance(
  colorA: ColorInput,
  colorB: ColorInput
): number {
  const rgbA = toRgbColor(colorA);
  const rgbB = toRgbColor(colorB);

  const rDiff = rgbA.r - rgbB.r;
  const gDiff = rgbA.g - rgbB.g;
  const bDiff = rgbA.b - rgbB.b;

  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

/**
 * 根据颜色距离判断误差等级。
 *
 * 0 - 40：low，匹配较准确
 * 41 - 90：medium，有轻微色差
 * 90 以上：high，色差较明显
 */
export function getErrorLevel(distance: number): ErrorLevel {
  if (distance <= 40) {
    return "low";
  }

  if (distance <= 90) {
    return "medium";
  }

  return "high";
}

/**
 * 根据误差等级返回中文说明。
 */
export function getErrorLevelInfo(level: ErrorLevel): ErrorLevelInfo {
  return ERROR_LEVEL_INFO[level];
}

/**
 * 根据距离直接返回用户可读提示。
 */
export function getErrorHintByDistance(distance: number): string {
  const level = getErrorLevel(distance);
  return getErrorLevelInfo(level).userHint;
}

/**
 * 保留两位小数，用于页面展示。
 */
export function roundDistance(distance: number): number {
  return Number(distance.toFixed(2));
}

/**
 * 分析两个 HEX 颜色之间的匹配误差。
 * 这个函数后面可以直接给前端组件使用。
 */
export function analyzeColorDistance(
  originalHex: string,
  targetHex: string
): ColorDistanceResult {
  const normalizedOriginalHex = normalizeHex(originalHex);
  const normalizedTargetHex = normalizeHex(targetHex);

  const originalRgb = hexToRgb(normalizedOriginalHex);
  const targetRgb = hexToRgb(normalizedTargetHex);

  const distance = calculateColorDistance(originalRgb, targetRgb);
  const roundedDistance = roundDistance(distance);
  const errorLevel = getErrorLevel(distance);
  const levelInfo = getErrorLevelInfo(errorLevel);

  return {
    originalHex: normalizedOriginalHex,
    targetHex: normalizedTargetHex,
    originalRgb,
    targetRgb,
    distance,
    roundedDistance,
    errorLevel,
    errorLabel: levelInfo.label,
    userHint: levelInfo.userHint,
  };
}

/**
 * 从拼豆色盘中找到与原图颜色最接近的颜色。
 *
 * 这个函数是后续 paletteMatcher.ts 的基础。
 * 输入一个原图颜色和一个色盘数组，输出最近的拼豆颜色和误差信息。
 */
export function findNearestBeadColor(
  originalHex: string,
  palette: BeadColor[]
): NearestBeadColorResult {
  if (palette.length === 0) {
    throw new Error("色盘为空，无法进行颜色匹配。");
  }

  let nearestColor = palette[0];
  let nearestDetail = analyzeColorDistance(originalHex, nearestColor.hex);

  for (const color of palette) {
    const detail = analyzeColorDistance(originalHex, color.hex);

    if (detail.distance < nearestDetail.distance) {
      nearestColor = color;
      nearestDetail = detail;
    }
  }

  return {
    color: nearestColor,
    detail: nearestDetail,
  };
}

/**
 * 生成给用户看的匹配说明。
 * 示例：
 * 距离 18.25，匹配较准确
 */
export function formatColorDistanceForUser(result: ColorDistanceResult): string {
  return `距离 ${result.roundedDistance}，${result.userHint}`;
}

/**
 * 生成完整的颜色匹配说明。
 * 示例：
 * 原图颜色 #C9232D 已匹配到目标颜色 #C9232D，距离 0，匹配较准确。
 */
export function formatColorMatchMessage(
  originalHex: string,
  targetHex: string
): string {
  const result = analyzeColorDistance(originalHex, targetHex);

  return `原图颜色 ${result.originalHex} 已匹配到目标颜色 ${result.targetHex}，距离 ${result.roundedDistance}，${result.userHint}。`;
}