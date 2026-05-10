import { saveAs } from "file-saver";
import type { MaterialItem } from "../types/bead";

export function getMaterialCsvFileName(): string {
  return "beadcraft-material-list.csv";
}

function escapeCsvValue(value: string | number): string {
  const text = String(value);

  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/**
 * 导出材料清单 CSV。
 *
 * CSV 字段：
 * code,name,hex,count,percentage,avgDistance
 */
export function exportMaterialsToCsv(materials: MaterialItem[]): void {
  const header = [
    "code",
    "name",
    "hex",
    "count",
    "percentage",
    "avgDistance",
  ];

  const rows = materials.map((item) => [
    item.code,
    item.name,
    item.hex,
    item.count,
    item.percentage,
    item.avgDistance,
  ]);

  const csvContent = [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");

  /**
   * 加 UTF-8 BOM，避免 Excel 打开中文乱码。
   */
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8",
  });

  saveAs(blob, getMaterialCsvFileName());
}