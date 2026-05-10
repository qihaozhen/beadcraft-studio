import { useEffect, useRef, type RefObject } from "react";
import type { BeadCell, PatternResult } from "../types/bead";

interface PatternCanvasProps {
  pattern: PatternResult;
  cellSize: number;
  showGrid: boolean;
  showCode: boolean;
  beadMode: boolean;
  canvasRef?: RefObject<HTMLCanvasElement | null>;
}

function getReadableTextColor(hex: string): string {
  const cleanHex = hex.replace("#", "");

  const r = Number.parseInt(cleanHex.slice(0, 2), 16);
  const g = Number.parseInt(cleanHex.slice(2, 4), 16);
  const b = Number.parseInt(cleanHex.slice(4, 6), 16);

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  return luminance > 150 ? "#111827" : "#ffffff";
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
  context.strokeStyle = "rgba(0, 0, 0, 0.16)";
  context.stroke();

  context.beginPath();
  context.arc(centerX, centerY, Math.max(1.5, size * 0.13), 0, Math.PI * 2);
  context.fillStyle = "rgba(255, 255, 255, 0.45)";
  context.fill();
}

function drawGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number
) {
  context.save();
  context.strokeStyle = "rgba(17, 24, 39, 0.18)";
  context.lineWidth = 1;

  for (let x = 0; x <= width; x += cellSize) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, height);
    context.stroke();
  }

  for (let y = 0; y <= height; y += cellSize) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(width, y + 0.5);
    context.stroke();
  }

  context.restore();
}

function drawCode(
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

export default function PatternCanvas({
  pattern,
  cellSize,
  showGrid,
  showCode,
  beadMode,
  canvasRef,
}: PatternCanvasProps) {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const actualCanvasRef = canvasRef ?? internalCanvasRef;

  useEffect(() => {
    const canvas = actualCanvasRef.current;

    if (!canvas) {
      return;
    }

    const canvasWidth = pattern.width * cellSize;
    const canvasHeight = pattern.height * cellSize;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    for (const cell of pattern.cells) {
      const x = cell.x * cellSize;
      const y = cell.y * cellSize;

      if (beadMode) {
        drawBeadCell(context, cell, x, y, cellSize);
      } else {
        drawSquareCell(context, cell, x, y, cellSize);
      }

      if (showCode) {
        drawCode(context, cell, x, y, cellSize);
      }
    }

    if (showGrid) {
      drawGrid(context, canvasWidth, canvasHeight, cellSize);
    }
  }, [actualCanvasRef, pattern, cellSize, showGrid, showCode, beadMode]);

  return (
    <canvas
      ref={actualCanvasRef}
      className="pattern-canvas"
      aria-label="拼豆图纸 Canvas 预览"
    />
  );
}