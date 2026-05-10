import type { BeadColor } from "../types/bead";
import { hamaPalette } from "../data/hamaPalette";
import {
  analyzeColorDistance,
  getErrorLevelInfo,
  normalizeHex,
  rgbToHex,
  toRgbColor,
  type ColorInput,
  type ErrorLevel,
} from "./colorDistance";

/**
 * 支持选择的品牌。
 *
 * 说明：
 * 目前 295 色卡里主色号是 MARD；
 * 其他品牌色号保存在 aliases 里。
 *
 * color matching：颜色匹配
 * correspondance de couleur：颜色对应 / 色彩匹配
 */
export type PaletteBrand =
  | "MARD"
  | "COCO"
  | "MANMAN"
  | "PANPAN"
  | "MIXIAOWO"
  | "HUANGDOUDOU_XIAOWU";

/**
 * 匹配结果中的色号信息。
 */
export interface MatchedBeadCode {
  /**
   * 当前选择的品牌。
   */
  brand: PaletteBrand;

  /**
   * 当前选择品牌下的色号。
   * 例如：
   * MARD 下可能是 A5
   * COCO 下可能是 D3
   */
  code: string;

  /**
   * 主色号。
   * 本项目色盘主色号是 MARD 色号。
   */
  mardCode: string;

  /**
   * 颜色名称。
   */
  name: string;

  /**
   * 十六进制颜色。
   */
  hex: string;
}

/**
 * 最近色匹配结果。
 */
export interface PaletteMatchResult {
  /**
   * 输入的原始颜色。
   */
  inputColor: ColorInput;

  /**
   * 标准化后的原图颜色 HEX。
   */
  originalHex: string;

  /**
   * 匹配到的完整拼豆颜色对象。
   */
  beadColor: BeadColor;

  /**
   * 匹配到的品牌色号信息。
   */
  matchedCode: MatchedBeadCode;

  /**
   * 颜色距离。
   */
  distance: number;

  /**
   * 保留两位小数后的颜色距离。
   */
  roundedDistance: number;

  /**
   * 误差等级。
   * low：匹配较准确
   * medium：有轻微色差
   * high：色差较明显
   */
  errorLevel: ErrorLevel;

  /**
   * 误差等级中文名称。
   */
  errorLabel: string;

  /**
   * 给用户看的提示。
   */
  userHint: string;

  /**
   * 是否透明类材料。
   */
  isTransparent: boolean;

  /**
   * 材质 / 效果分类。
   */
  finish?: BeadColor["finish"];
}

/**
 * 批量匹配结果。
 */
export interface PaletteMatchListResult {
  total: number;
  brand: PaletteBrand;
  results: PaletteMatchResult[];
}

/**
 * 根据品牌读取对应 aliases 字段。
 */
function getAliasKeyByBrand(
  brand: PaletteBrand
): keyof NonNullable<BeadColor["aliases"]> {
  switch (brand) {
    case "MARD":
      return "mard";
    case "COCO":
      return "coco";
    case "MANMAN":
      return "manman";
    case "PANPAN":
      return "panpan";
    case "MIXIAOWO":
      return "mixiaowo";
    case "HUANGDOUDOU_XIAOWU":
      return "huangdoudouXiaowu";
    default:
      return "mard";
  }
}

/**
 * 判断某个品牌色号是否有效。
 *
 * 有些色号在原表里是 "-"，表示该品牌没有对应色号。
 */
function isValidCode(code: string | undefined): code is string {
  if (!code) {
    return false;
  }

  const cleanCode = code.trim();

  return cleanCode.length > 0 && cleanCode !== "-";
}

/**
 * 获取某个拼豆颜色在指定品牌下的色号。
 *
 * 例如：
 * getColorCodeByBrand(color, "MARD") 可能返回 A5
 * getColorCodeByBrand(color, "COCO") 可能返回 D3
 */
export function getColorCodeByBrand(
  color: BeadColor,
  brand: PaletteBrand
): string | null {
  if (brand === "MARD") {
    return color.code;
  }

  const aliasKey = getAliasKeyByBrand(brand);
  const aliasCode = color.aliases?.[aliasKey];

  if (!isValidCode(aliasCode)) {
    return null;
  }

  return aliasCode;
}

/**
 * 根据选择的品牌筛选色盘。
 *
 * 注意：
 * 本项目 295 色卡主数据都是 MARD；
 * 如果选择 COCO / MANMAN / PANPAN 等品牌，
 * 就只保留 aliases 中存在该品牌有效色号的颜色。
 */
export function getPaletteByBrand(
  brand: PaletteBrand,
  palette: BeadColor[] = hamaPalette
): BeadColor[] {
  if (brand === "MARD") {
    return palette;
  }

  return palette.filter((color) => {
    const code = getColorCodeByBrand(color, brand);
    return isValidCode(code ?? undefined);
  });
}

/**
 * 把输入颜色统一转换成 HEX。
 *
 * 支持：
 * "#FF0000"
 * "FF0000"
 * [255, 0, 0]
 * { r: 255, g: 0, b: 0 }
 */
export function colorInputToHex(inputColor: ColorInput): string {
  if (typeof inputColor === "string") {
    return normalizeHex(inputColor);
  }

  const rgb = toRgbColor(inputColor);
  return rgbToHex(rgb);
}

/**
 * 把匹配到的 BeadColor 转换成用户更容易看的色号信息。
 */
export function createMatchedBeadCode(
  color: BeadColor,
  brand: PaletteBrand
): MatchedBeadCode {
  const brandCode = getColorCodeByBrand(color, brand) ?? color.code;

  return {
    brand,
    code: brandCode,
    mardCode: color.code,
    name: color.name,
    hex: color.hex,
  };
}

/**
 * 在指定品牌色盘中查找最近的拼豆颜色。
 *
 * 输入：
 * inputColor：某个像素颜色
 *
 * 输出：
 * 最近的拼豆色号 + 距离 + 误差等级
 */
export function matchNearestColor(
  inputColor: ColorInput,
  brand: PaletteBrand = "MARD",
  palette: BeadColor[] = hamaPalette
): PaletteMatchResult {
  const selectedPalette = getPaletteByBrand(brand, palette);

  if (selectedPalette.length === 0) {
    throw new Error(`品牌 ${brand} 的可用色盘为空，无法进行颜色匹配。`);
  }

  const originalHex = colorInputToHex(inputColor);

  let nearestColor = selectedPalette[0];
  let nearestDetail = analyzeColorDistance(originalHex, nearestColor.hex);

  for (const color of selectedPalette) {
    const detail = analyzeColorDistance(originalHex, color.hex);

    if (detail.distance < nearestDetail.distance) {
      nearestColor = color;
      nearestDetail = detail;
    }
  }

  const levelInfo = getErrorLevelInfo(nearestDetail.errorLevel);

  return {
    inputColor,
    originalHex,
    beadColor: nearestColor,
    matchedCode: createMatchedBeadCode(nearestColor, brand),
    distance: nearestDetail.distance,
    roundedDistance: nearestDetail.roundedDistance,
    errorLevel: nearestDetail.errorLevel,
    errorLabel: levelInfo.label,
    userHint: levelInfo.userHint,
    isTransparent: nearestColor.isTransparent ?? false,
    finish: nearestColor.finish,
  };
}

/**
 * 批量匹配多个颜色。
 *
 * 后面处理图片时，一张图片会被拆成很多像素格，
 * 每个像素格都可以调用这个函数进行匹配。
 */
export function matchColorList(
  inputColors: ColorInput[],
  brand: PaletteBrand = "MARD",
  palette: BeadColor[] = hamaPalette
): PaletteMatchListResult {
  const results = inputColors.map((inputColor) =>
    matchNearestColor(inputColor, brand, palette)
  );

  return {
    total: results.length,
    brand,
    results,
  };
}

/**
 * 只返回后续图纸生成最需要的核心字段。
 *
 * 这个函数后面会给 imageProcessor.ts 使用。
 */
export function matchPixelToBead(
  inputColor: ColorInput,
  brand: PaletteBrand = "MARD",
  palette: BeadColor[] = hamaPalette
): {
  color: BeadColor;
  code: string;
  brand: PaletteBrand;
  distance: number;
  errorLevel: ErrorLevel;
  userHint: string;
} {
  const result = matchNearestColor(inputColor, brand, palette);

  return {
    color: result.beadColor,
    code: result.matchedCode.code,
    brand: result.matchedCode.brand,
    distance: result.roundedDistance,
    errorLevel: result.errorLevel,
    userHint: result.userHint,
  };
}

/**
 * 生成一句给用户看的匹配说明。
 *
 * 示例：
 * 原图颜色 #F6D21A 已匹配到 MARD A5，距离 12.35，匹配较准确。
 */
export function formatPaletteMatchMessage(result: PaletteMatchResult): string {
  return `原图颜色 ${result.originalHex} 已匹配到 ${result.matchedCode.brand} ${result.matchedCode.code}，距离 ${result.roundedDistance}，${result.userHint}。`;
}

/**
 * 测试用函数。
 * 可以在 App.tsx 里临时调用，检查最近色匹配是否正常。
 */
export function createPaletteMatchTestResult(): PaletteMatchResult {
  return matchNearestColor("#F6D21A", "MARD");
}