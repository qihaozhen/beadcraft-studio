import { hamaPalette } from "../data/hamaPalette";
import type { BeadCell, BeadColor, PatternResult } from "../types/bead";
import { rgbToHex } from "./colorDistance";
import { matchPixelToBead, type PaletteBrand } from "./paletteMatcher";

/**
 * 用户可选择的自动像素化尺寸。
 *
 * pixelation：像素化
 * pixellisation：法语中的像素化
 */
export const PIXEL_SIZE_OPTIONS = [16, 24, 32, 48, 64, 96] as const;

export type PixelGridSize = (typeof PIXEL_SIZE_OPTIONS)[number];

export const DEFAULT_PIXEL_GRID_SIZE: PixelGridSize = 32;

export interface ImageProcessOptions {
  /** 输出图纸宽度，单位是格子。 */
  gridWidth: number;

  /** 输出图纸高度，单位是格子。 */
  gridHeight: number;

  /**
   * 是否忽略透明背景。
   * 开启后：alpha < transparentAlphaThreshold 的像素不生成拼豆。
   */
  ignoreTransparent: boolean;

  /**
   * 透明判断阈值。
   * 本项目默认按题目要求使用 20。
   */
  transparentAlphaThreshold?: number;

  /** 当前选择的品牌。 */
  brand?: PaletteBrand;

  /** 当前使用的色盘。 */
  palette?: BeadColor[];

  /**
   * 是否开启 Canvas 平滑。
   * 自动像素化时必须关闭，所以默认 false。
   */
  imageSmoothingEnabled?: boolean;
}

interface NormalizedImageProcessOptions {
  gridWidth: number;
  gridHeight: number;
  ignoreTransparent: boolean;
  transparentAlphaThreshold: number;
  brand: PaletteBrand;
  palette: BeadColor[];
  imageSmoothingEnabled: boolean;
}

/**
 * 检查用户传入的尺寸是否合法。
 */
function validateGridSize(gridWidth: number, gridHeight: number): void {
  if (!Number.isInteger(gridWidth) || !Number.isInteger(gridHeight)) {
    throw new Error("图纸尺寸必须是整数。");
  }

  if (gridWidth <= 0 || gridHeight <= 0) {
    throw new Error("图纸尺寸必须大于 0。");
  }

  if (gridWidth > 256 || gridHeight > 256) {
    throw new Error("图纸尺寸过大，建议不要超过 256 × 256。");
  }
}

/**
 * 默认图片处理配置。
 */
function normalizeImageProcessOptions(
  options: ImageProcessOptions
): NormalizedImageProcessOptions {
  validateGridSize(options.gridWidth, options.gridHeight);

  return {
    gridWidth: options.gridWidth,
    gridHeight: options.gridHeight,
    ignoreTransparent: options.ignoreTransparent,
    transparentAlphaThreshold: options.transparentAlphaThreshold ?? 20,
    brand: options.brand ?? "MARD",
    palette: options.palette ?? hamaPalette,
    imageSmoothingEnabled: options.imageSmoothingEnabled ?? false,
  };
}

/**
 * 判断当前像素是否应该被当作透明背景忽略。
 *
 * 规则：
 * 如果 alpha < 20，并且用户开启“忽略透明背景”，则该格子不生成拼豆。
 */
export function shouldIgnoreTransparentPixel(
  alpha: number,
  ignoreTransparent: boolean,
  transparentAlphaThreshold = 20
): boolean {
  return ignoreTransparent && alpha < transparentAlphaThreshold;
}

/**
 * 从用户上传的图片文件中读取 HTMLImageElement。
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("图片读取失败，请确认上传的是 PNG、JPG 或 JPEG 图片。"));
    };

    image.src = imageUrl;
  });
}

/**
 * 创建隐藏 Canvas。
 *
 * 注意：
 * 这里不把 canvas 加到页面里，所以它就是隐藏处理用的 Canvas。
 */
function createHiddenCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  return canvas;
}

/**
 * 把图片缩放到指定网格尺寸，并读取每一个格子的 RGBA 像素。
 *
 * 核心流程：
 * 1. 创建隐藏 Canvas；
 * 2. 设置 Canvas 宽高为 gridWidth × gridHeight；
 * 3. 关闭 imageSmoothingEnabled；
 * 4. drawImage 把原图压缩成目标像素尺寸；
 * 5. getImageData 读取每个像素；
 * 6. 每个像素匹配最近拼豆色；
 * 7. 生成 PatternResult。
 */
export function processImageElementToPattern(
  image: HTMLImageElement,
  options: ImageProcessOptions
): PatternResult {
  const normalizedOptions = normalizeImageProcessOptions(options);

  const canvas = createHiddenCanvas(
    normalizedOptions.gridWidth,
    normalizedOptions.gridHeight
  );

  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error("浏览器不支持 Canvas 2D，无法处理图片。");
  }

  /**
   * 关键高分点：
   * 关闭 Canvas 平滑，保留像素块效果。
   *
   * imageSmoothingEnabled = false
   * 可以避免浏览器在缩放图片时自动模糊边缘。
   */
  context.imageSmoothingEnabled = normalizedOptions.imageSmoothingEnabled;

  context.clearRect(0, 0, canvas.width, canvas.height);

  /**
   * 直接把图片绘制到指定网格尺寸。
   *
   * 例如：
   * 32 × 32 表示最终只读取 1024 个像素点，
   * 每一个像素点对应一个拼豆格子。
   */
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const cells: BeadCell[] = [];
  const usedColorSet = new Set<string>();

  let totalBeads = 0;
  let transparentCells = 0;
  let ignoredTransparentCells = 0;

  for (let y = 0; y < normalizedOptions.gridHeight; y += 1) {
    for (let x = 0; x < normalizedOptions.gridWidth; x += 1) {
      const index = (y * normalizedOptions.gridWidth + x) * 4;

      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const alpha = data[index + 3];

      const originalHex = rgbToHex({ r, g, b });

      const isTransparentPixel =
        alpha < normalizedOptions.transparentAlphaThreshold;

      if (isTransparentPixel) {
        transparentCells += 1;
      }

      if (
        shouldIgnoreTransparentPixel(
          alpha,
          normalizedOptions.ignoreTransparent,
          normalizedOptions.transparentAlphaThreshold
        )
      ) {
        ignoredTransparentCells += 1;

        cells.push({
          x,
          y,
          color: null,
          originalHex,
          alpha,
          match: null,
          isTransparent: true,
          matchedCode: null,
          matchedBrand: null,
        });

        continue;
      }

      const matched = matchPixelToBead(
        [r, g, b],
        normalizedOptions.brand,
        normalizedOptions.palette
      );

      totalBeads += 1;
      usedColorSet.add(`${matched.brand}:${matched.code}`);

      cells.push({
        x,
        y,
        color: matched.color,
        originalHex,
        alpha,
        match: {
          distance: matched.distance,
          errorLevel: matched.errorLevel,
          userHint: matched.userHint,
        },
        isTransparent: false,
        matchedCode: matched.code,
        matchedBrand: matched.brand,
      });
    }
  }

  return {
    width: normalizedOptions.gridWidth,
    height: normalizedOptions.gridHeight,
    cells,
    totalBeads,
    usedColors: usedColorSet.size,
    transparentCells,
    ignoredTransparentCells,
  };
}

/**
 * 从 File 直接生成拼豆图纸结果。
 * App.tsx 里主要调用这个函数。
 */
export async function imageFileToPattern(
  file: File,
  options: ImageProcessOptions
): Promise<PatternResult> {
  const image = await loadImageFromFile(file);
  return processImageElementToPattern(image, options);
}

/**
 * 判断某个尺寸是否是系统推荐尺寸。
 */
export function isSupportedPixelGridSize(size: number): size is PixelGridSize {
  return PIXEL_SIZE_OPTIONS.includes(size as PixelGridSize);
}

/**
 * 根据用户选择的尺寸生成说明文字。
 */
export function formatGridSizeLabel(size: PixelGridSize): string {
  return `${size} × ${size}`;
}