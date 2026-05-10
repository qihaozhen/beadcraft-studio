export type BeadFinish =
  | "solid"
  | "morandi"
  | "pearl"
  | "temperature"
  | "jelly"
  | "transparent"
  | "glow"
  | "photochromic";

export type ErrorLevel = "low" | "medium" | "high";

export interface BeadColor {
  /** 主品牌。本 295 色卡以 MARD 色号作为主色号，黄豆豆小舞色号与 MARD 相同。 */
  brand: string;

  /** 主色号，例如 A1、B12、ZG8。 */
  code: string;

  /** 展示名称。原色卡没有英文色名，因此这里用“品牌 + 色号”生成。 */
  name: string;

  /** 十六进制颜色，用于颜色匹配和前端显示。 */
  hex: string;

  /** RGB 数值，用于颜色误差计算。 */
  rgb?: [number, number, number];

  /** 原色卡 ID，1-295。 */
  id?: number;

  /** 系列，例如 A、B、M、R、ZG。 */
  series?: string;

  /** 材质 / 效果分类，用于材料占比统计。 */
  finish?: BeadFinish;

  /** 是否属于透明类材料。 */
  isTransparent?: boolean;

  /** 其他品牌对应色号。 */
  aliases?: {
    mard?: string;
    coco?: string;
    manman?: string;
    panpan?: string;
    mixiaowo?: string;
    huangdoudouXiaowu?: string;
  };
}

export interface MatchInfo {
  /** 颜色距离。 */
  distance: number;

  /** 误差等级。 */
  errorLevel: ErrorLevel;

  /** 给用户看的中文提示。 */
  userHint: string;
}

export interface BeadCell {
  /** 当前格子的横向坐标。 */
  x: number;

  /** 当前格子的纵向坐标。 */
  y: number;

  /**
   * 匹配到的拼豆颜色。
   * 如果是被忽略的透明像素，则为 null。
   */
  color: BeadColor | null;

  /** 原图像素颜色，统一保存成 HEX。 */
  originalHex: string;

  /**
   * PNG 像素透明度。
   * 0 表示完全透明，255 表示完全不透明。
   */
  alpha: number;

  /**
   * 匹配误差信息。
   * 如果透明像素被忽略，则为 null。
   */
  match: MatchInfo | null;

  /** 当前格子是否被当作透明格子处理。 */
  isTransparent: boolean;

  /** 当前品牌下显示的色号，例如 MARD A5 或 COCO D3。 */
  matchedCode: string | null;

  /** 当前匹配使用的品牌。 */
  matchedBrand: string | null;
}

export interface PatternResult {
  /** 图纸宽度，单位是格子数。 */
  width: number;

  /** 图纸高度，单位是格子数。 */
  height: number;

  /** 所有格子。 */
  cells: BeadCell[];

  /** 实际需要的拼豆数量，不包含透明格子。 */
  totalBeads: number;

  /** 实际使用到的颜色数量，不包含透明格子。 */
  usedColors: number;

  /** 原图中 alpha 小于阈值的透明像素数量。 */
  transparentCells: number;

  /** 因开启“忽略透明背景”而被忽略的格子数量。 */
  ignoredTransparentCells: number;
}

export interface MaterialItem {
  /** 色号。 */
  code: string;

  /** 颜色名称。 */
  name: string;

  /** HEX 颜色。 */
  hex: string;

  /** 数量。 */
  count: number;

  /** 占比。 */
  percentage: number;

  /** 平均颜色距离。 */
  avgDistance: number;

  /** 品牌。 */
  brand: string;

  /** 材质分类。 */
  finish?: BeadFinish;

  /** 是否属于透明类拼豆材料。 */
  isTransparent?: boolean;
}

export interface AppSettings {
  /** 图纸宽度。 */
  gridWidth: number;

  /** 图纸高度。 */
  gridHeight: number;

  /** 页面预览时单个格子的尺寸。 */
  cellSize: number;

  /** 是否显示网格线。 */
  showGrid: boolean;

  /** 是否显示色号。 */
  showCode: boolean;

  /** 是否显示圆形拼豆效果。 */
  beadMode: boolean;

  /** 是否忽略透明背景。 */
  ignoreTransparent: boolean;

  /** 最大颜色数，0 表示不限制。 */
  maxColors: number;

  /** 透明判断阈值，默认 20。 */
  transparentAlphaThreshold: number;
}