import { saveAs } from "file-saver";
import type { BeadCell, PatternResult } from "../types/bead";

/**
 * PNG 位图导出。
 *
 * bitmap：位图
 * image bitmap：图像位图
 * image matricielle：法语，位图 / 栅格图
 */

export interface ExportPatternBitmapOptions {
  pattern: PatternResult;
  title: string;
  cellSize: number;
  showGrid: boolean;
  showCode: boolean;
  beadMode: boolean;
  showCoordinates: boolean;
}

function getReadableTextColor(hex: string): string {
  const cleanHex = hex.replace("#", "");

  const r = Number.parseInt(cleanHex.slice(0, 2), 16);
  const g = Number.parseInt(cleanHex.slice(2, 4), 16);
  const b = Number.parseInt(cleanHex.slice(4, 6), 16);

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  return luminance > 150 ? "#111827" : "#ffffff";
}

function sanitizeFileName(text: string): string {
  const cleanText = text
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-");

  if (!cleanText) {
    return "beadcraft-pattern";
  }

  return cleanText.slice(0, 60);
}

export function getPatternPngFileName(
  pattern: PatternResult,
  title: string
): string {
  const safeTitle = sanitizeFileName(title || "beadcraft-pattern");

  return `${safeTitle}-${pattern.width}x${pattern.height}.png`;
}

function drawTransparentCell(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  context.fillStyle = "#f3f4f6";
  context.fillRect(x, y, size, size);

  context.fillStyle = "#ffffff";
  context.fillRect(x, y, size / 2, size / 2);
  context.fillRect(x + size / 2, y + size / 2, size / 2, size / 2);
}

function drawSquareCell(
  context: CanvasRenderingContext2D,
  cell: BeadCell,
  x: number,
  y: number,
  size: number
) {
  if (!cell.color) {
    drawTransparentCell(context, x, y, size);
    return;
  }

  context.fillStyle = cell.color.hex;
  context.fillRect(x, y, size, size);
}

function drawBeadCell(
  context: CanvasRenderingContext2D,
  cell: BeadCell,
  x: number,
  y: number,
  size: number
) {
  if (!cell.color) {
    drawTransparentCell(context, x, y, size);
    return;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(x, y, size, size);

  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size * 0.42;

  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fillStyle = cell.color.hex;
  context.fill();

  context.lineWidth = Math.max(1, size * 0.06);
  context.strokeStyle = "rgba(0, 0, 0, 0.18)";
  context.stroke();

  context.beginPath();
  context.arc(centerX, centerY, Math.max(1.5, size * 0.13), 0, Math.PI * 2);
  context.fillStyle = "rgba(255, 255, 255, 0.45)";
  context.fill();
}

function drawCellCode(
  context: CanvasRenderingContext2D,
  cell: BeadCell,
  x: number,
  y: number,
  size: number
) {
  if (!cell.color) {
    return;
  }

  if (size < 14) {
    return;
  }

  const code = cell.matchedCode ?? cell.color.code;
  const fontSize = size >= 22 ? Math.floor(size * 0.42) : Math.floor(size * 0.34);

  context.save();
  context.font = `700 ${fontSize}px Arial, Microsoft YaHei, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = getReadableTextColor(cell.color.hex);
  context.fillText(code, x + size / 2, y + size / 2, size - 2);
  context.restore();
}

function drawGrid(
  context: CanvasRenderingContext2D,
  gridX: number,
  gridY: number,
  width: number,
  height: number,
  cellSize: number
) {
  context.save();
  context.strokeStyle = "rgba(17, 24, 39, 0.24)";
  context.lineWidth = 1;

  for (let x = 0; x <= width; x += cellSize) {
    context.beginPath();
    context.moveTo(gridX + x + 0.5, gridY);
    context.lineTo(gridX + x + 0.5, gridY + height);
    context.stroke();
  }

  for (let y = 0; y <= height; y += cellSize) {
    context.beginPath();
    context.moveTo(gridX, gridY + y + 0.5);
    context.lineTo(gridX + width, gridY + y + 0.5);
    context.stroke();
  }

  context.restore();
}

function drawTitle(
  context: CanvasRenderingContext2D,
  title: string,
  canvasWidth: number,
  titleHeight: number,
  pattern: PatternResult
) {
  if (titleHeight <= 0) {
    return;
  }

  const cleanTitle = title.trim() || "BeadCraft 拼豆图纸";

  context.save();

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvasWidth, titleHeight);

  context.fillStyle = "#1f2937";
  context.font = "800 26px Arial, Microsoft YaHei, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(cleanTitle, canvasWidth / 2, 24, canvasWidth - 40);

  context.fillStyle = "#6b7280";
  context.font = "500 13px Arial, Microsoft YaHei, sans-serif";
  context.fillText(
    `尺寸：${pattern.width} × ${pattern.height}    实际拼豆：${pattern.totalBeads} 颗    使用颜色：${pattern.usedColors} 色`,
    canvasWidth / 2,
    50,
    canvasWidth - 40
  );

  context.restore();
}

function drawCoordinates(
  context: CanvasRenderingContext2D,
  pattern: PatternResult,
  gridX: number,
  gridY: number,
  cellSize: number,
  leftAxisWidth: number,
  topAxisHeight: number
) {
  if (leftAxisWidth <= 0 || topAxisHeight <= 0) {
    return;
  }

  const gridWidth = pattern.width * cellSize;
  const gridHeight = pattern.height * cellSize;
  const fontSize = Math.max(8, Math.min(13, Math.floor(cellSize * 0.45)));

  context.save();

  context.fillStyle = "#f9fafb";
  context.fillRect(gridX, gridY - topAxisHeight, gridWidth, topAxisHeight);
  context.fillRect(gridX - leftAxisWidth, gridY, leftAxisWidth, gridHeight);
  context.fillRect(
    gridX - leftAxisWidth,
    gridY - topAxisHeight,
    leftAxisWidth,
    topAxisHeight
  );

  context.strokeStyle = "#d1d5db";
  context.lineWidth = 1;
  context.strokeRect(gridX, gridY - topAxisHeight, gridWidth, topAxisHeight);
  context.strokeRect(gridX - leftAxisWidth, gridY, leftAxisWidth, gridHeight);

  context.fillStyle = "#374151";
  context.font = `700 ${fontSize}px Arial, Microsoft YaHei, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let x = 0; x < pattern.width; x += 1) {
    const label = String(x + 1);
    const labelX = gridX + x * cellSize + cellSize / 2;
    const labelY = gridY - topAxisHeight / 2;

    context.fillText(label, labelX, labelY, cellSize);
  }

  for (let y = 0; y < pattern.height; y += 1) {
    const label = String(y + 1);
    const labelX = gridX - leftAxisWidth / 2;
    const labelY = gridY + y * cellSize + cellSize / 2;

    context.fillText(label, labelX, labelY, leftAxisWidth - 4);
  }

  context.restore();
}

function createBitmapCanvas(options: ExportPatternBitmapOptions): HTMLCanvasElement {
  const {
    pattern,
    title,
    showCoordinates,
    cellSize,
    showGrid,
    showCode,
    beadMode,
  } = options;

  /**
   * 导出用 cellSize 不低于 18，保证坐标数字和色号能看清。
   * 页面预览可以小，导出图要更适合打印和查看。
   */
  const exportCellSize = Math.max(18, Math.min(40, cellSize));

  const titleHeight = title.trim() ? 68 : 0;
  const leftAxisWidth = showCoordinates
    ? Math.max(38, Math.floor(exportCellSize * 1.8))
    : 0;
  const topAxisHeight = showCoordinates
    ? Math.max(30, Math.floor(exportCellSize * 1.45))
    : 0;

  const gridWidth = pattern.width * exportCellSize;
  const gridHeight = pattern.height * exportCellSize;

  const canvas = document.createElement("canvas");

  canvas.width = leftAxisWidth + gridWidth;
  canvas.height = titleHeight + topAxisHeight + gridHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("PNG 导出失败：浏览器无法创建 Canvas。");
  }

  context.imageSmoothingEnabled = false;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawTitle(context, title, canvas.width, titleHeight, pattern);

  const gridX = leftAxisWidth;
  const gridY = titleHeight + topAxisHeight;

  if (showCoordinates) {
    drawCoordinates(
      context,
      pattern,
      gridX,
      gridY,
      exportCellSize,
      leftAxisWidth,
      topAxisHeight
    );
  }

  for (const cell of pattern.cells) {
    const x = gridX + cell.x * exportCellSize;
    const y = gridY + cell.y * exportCellSize;

    if (beadMode) {
      drawBeadCell(context, cell, x, y, exportCellSize);
    } else {
      drawSquareCell(context, cell, x, y, exportCellSize);
    }

    if (showCode) {
      drawCellCode(context, cell, x, y, exportCellSize);
    }
  }

  if (showGrid || showCoordinates) {
    drawGrid(context, gridX, gridY, gridWidth, gridHeight, exportCellSize);
  }

  return canvas;
}

/**
 * 导出带标题、坐标数字的 PNG 位图。
 */
export function exportPatternBitmapToPng(
  options: ExportPatternBitmapOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = createBitmapCanvas(options);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("PNG 导出失败：Canvas 无法生成图片文件。"));
          return;
        }

        saveAs(blob, getPatternPngFileName(options.pattern, options.title));
        resolve();
      }, "image/png");
    } catch (error) {
      reject(error);
    }
  });
}