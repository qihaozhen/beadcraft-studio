import type { PatternResult } from "../types/bead";

/**
 * 第 22 步：错误提示和边界处理工具函数。
 *
 * error handling：错误处理
 * gestion des erreurs：法语，错误处理
 *
 * boundary handling：边界处理
 * gestion des limites：法语，边界处理
 */

export const MAX_GRID_SIZE = 128;
export const DEFAULT_GRID_SIZE = 32;

export const MIN_CELL_SIZE = 10;
export const MAX_CELL_SIZE = 40;

export const FILE_SIZE_WARNING_BYTES = 5 * 1024 * 1024;

export const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export type PreviewMode = "original" | "pattern";

/**
 * 判断文件扩展名是否支持。
 */
function hasSupportedImageExtension(fileName: string): boolean {
  const lowerFileName = fileName.toLowerCase();

  return SUPPORTED_IMAGE_EXTENSIONS.some((extension) =>
    lowerFileName.endsWith(extension)
  );
}

/**
 * 校验上传图片格式。
 *
 * 必须处理：
 * - 没有上传图片
 * - 图片格式不支持
 */
export function validateImageFile(file: File | null): string | null {
  if (!file) {
    return "请先上传一张图片";
  }

  const extensionOk = hasSupportedImageExtension(file.name);

  const mimeOk =
    file.type === ""
      ? extensionOk
      : SUPPORTED_IMAGE_MIME_TYPES.has(file.type) || extensionOk;

  if (!mimeOk) {
    return "仅支持 PNG、JPG、JPEG、WEBP";
  }

  return null;
}

/**
 * 如果图片较大，不阻止处理，只给用户提示。
 */
export function getLargeImageWarning(file: File | null): string {
  if (!file) {
    return "";
  }

  if (file.size > FILE_SIZE_WARNING_BYTES) {
    return "图片较大，处理可能稍慢";
  }

  return "";
}

/**
 * 校验图纸尺寸。
 *
 * 必须处理：
 * - 尺寸太大
 * - 非法尺寸
 */
export function validateGridSize(width: number, height: number): string | null {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return "图纸尺寸必须是整数";
  }

  if (width <= 0 || height <= 0) {
    return "图纸尺寸必须大于 0";
  }

  if (width > MAX_GRID_SIZE || height > MAX_GRID_SIZE) {
    return "建议图纸尺寸不超过 128×128";
  }

  return null;
}

/**
 * 限制预览格子大小。
 */
export function clampCellSize(value: number): number {
  if (!Number.isFinite(value)) {
    return 18;
  }

  if (value < MIN_CELL_SIZE) {
    return MIN_CELL_SIZE;
  }

  if (value > MAX_CELL_SIZE) {
    return MAX_CELL_SIZE;
  }

  return value;
}

/**
 * 导出前检查 Canvas 是否可用。
 *
 * 必须处理：
 * - Canvas 为空
 */
export function validateCanvasBeforeExport(
  canvas: HTMLCanvasElement | null,
  pattern: PatternResult | null
): string | null {
  if (!canvas || !pattern) {
    return "请先生成图纸再导出";
  }

  if (canvas.width <= 0 || canvas.height <= 0) {
    return "Canvas 为空，请先生成图纸再导出";
  }

  return null;
}