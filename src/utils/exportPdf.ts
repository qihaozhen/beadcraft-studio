import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { MaterialItem, PatternResult } from "../types/bead";
import type { PatternSummary } from "./materialCounter";

interface ExportPatternPdfOptions {
  canvas: HTMLCanvasElement;
  pattern: PatternResult;
  materials: MaterialItem[];
  summary: PatternSummary;
}

export function getPatternPdfFileName(pattern: PatternResult): string {
  return `beadcraft-pattern-${pattern.width}x${pattern.height}.pdf`;
}

function formatDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createColorBlock(hex: string): string {
  return `
    <span style="
      display:inline-block;
      width:14px;
      height:14px;
      border-radius:4px;
      background:${hex};
      border:1px solid #999;
      vertical-align:middle;
    "></span>
  `;
}

function createPdfRoot(): HTMLDivElement {
  const root = document.createElement("div");

  root.style.position = "fixed";
  root.style.left = "-99999px";
  root.style.top = "0";
  root.style.width = "794px";
  root.style.background = "#ffffff";
  root.style.color = "#111827";
  root.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif";

  document.body.appendChild(root);

  return root;
}

function createPage(title: string): HTMLDivElement {
  const page = document.createElement("div");

  page.style.width = "794px";
  page.style.minHeight = "1123px";
  page.style.boxSizing = "border-box";
  page.style.padding = "42px";
  page.style.background = "#ffffff";

  page.innerHTML = `
    <div style="border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="margin:0;font-size:30px;color:#111827;">${title}</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">
        BeadCraft Studio 拼豆图纸生成工具
      </p>
    </div>
  `;

  return page;
}

async function addElementToPdf(
  pdf: jsPDF,
  element: HTMLElement,
  isFirstPage: boolean
): Promise<boolean> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const pxPerMm = canvas.width / contentWidth;
  const sliceHeightPx = Math.floor(contentHeight * pxPerMm);

  let y = 0;
  let firstSlice = true;

  while (y < canvas.height) {
    if (!isFirstPage || !firstSlice) {
      pdf.addPage();
    }

    const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - y);

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = currentSliceHeight;

    const sliceContext = sliceCanvas.getContext("2d");

    if (!sliceContext) {
      throw new Error("PDF 导出失败：无法创建页面截图。");
    }

    sliceContext.drawImage(
      canvas,
      0,
      y,
      canvas.width,
      currentSliceHeight,
      0,
      0,
      canvas.width,
      currentSliceHeight
    );

    const imageData = sliceCanvas.toDataURL("image/png");
    const imageHeightMm = currentSliceHeight / pxPerMm;

    pdf.addImage(
      imageData,
      "PNG",
      margin,
      margin,
      contentWidth,
      imageHeightMm
    );

    y += currentSliceHeight;
    firstSlice = false;
  }

  return false;
}

/**
 * 导出 A4 PDF。
 *
 * 第 1 页：
 * - 标题
 * - 生成时间
 * - 图纸尺寸
 * - 总颗数
 * - 使用颜色数
 * - 拼豆图纸
 *
 * 第 2 页：
 * - 材料消耗清单
 * - 色号图例
 * - 使用说明
 */
export async function exportPatternPdf({
  canvas,
  pattern,
  materials,
  summary,
}: ExportPatternPdfOptions): Promise<void> {
  const root = createPdfRoot();

  try {
    const generatedAt = formatDateTime(new Date());
    const patternImage = canvas.toDataURL("image/png");

    const page1 = createPage("BeadCraft Studio 拼豆图纸");

    page1.innerHTML += `
      <div style="
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:12px;
        margin-bottom:24px;
      ">
        <div style="padding:14px;border:1px solid #e5e7eb;border-radius:14px;">
          <div style="font-size:12px;color:#6b7280;">生成时间</div>
          <div style="font-size:16px;font-weight:700;">${generatedAt}</div>
        </div>

        <div style="padding:14px;border:1px solid #e5e7eb;border-radius:14px;">
          <div style="font-size:12px;color:#6b7280;">图纸尺寸</div>
          <div style="font-size:16px;font-weight:700;">${pattern.width} × ${pattern.height}</div>
        </div>

        <div style="padding:14px;border:1px solid #e5e7eb;border-radius:14px;">
          <div style="font-size:12px;color:#6b7280;">实际拼豆数</div>
          <div style="font-size:16px;font-weight:700;">${summary.totalBeads}</div>
        </div>

        <div style="padding:14px;border:1px solid #e5e7eb;border-radius:14px;">
          <div style="font-size:12px;color:#6b7280;">使用颜色数</div>
          <div style="font-size:16px;font-weight:700;">${summary.usedColors}</div>
        </div>
      </div>

      <div style="
        text-align:center;
        border:1px solid #e5e7eb;
        border-radius:18px;
        padding:20px;
        background:#fafafa;
      ">
        <img
          src="${patternImage}"
          alt="拼豆图纸"
          style="
            max-width:100%;
            max-height:760px;
            object-fit:contain;
            background:#ffffff;
          "
        />
      </div>

      <p style="margin-top:18px;font-size:14px;line-height:1.8;color:#374151;">
        本 PDF 可直接打印，用户可以按照图纸中的网格和色号摆放拼豆。
      </p>
    `;

    const page2 = createPage("材料消耗清单与色盘图例");

    const materialRows = materials
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">
              ${createColorBlock(item.hex)}
            </td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.code}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.name}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${item.count}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${item.percentage}%</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${item.avgDistance}</td>
          </tr>
        `
      )
      .join("");

    const legendItems = materials
      .map(
        (item) => `
          <div style="
            display:flex;
            align-items:center;
            gap:8px;
            padding:8px 10px;
            border:1px solid #e5e7eb;
            border-radius:10px;
            font-size:13px;
          ">
            ${createColorBlock(item.hex)}
            <span><strong>${item.code}</strong> ${item.name} - ${item.count} 颗</span>
          </div>
        `
      )
      .join("");

    page2.innerHTML += `
      <h2 style="font-size:20px;margin:0 0 12px;">一、图纸总览</h2>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
        <tbody>
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">图纸尺寸</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${pattern.width} × ${pattern.height}</td>
            <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">总格子数</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${summary.totalCells}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">实际拼豆数</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${summary.totalBeads}</td>
            <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">使用颜色数</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${summary.usedColors}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">透明空格</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${summary.emptyCells}</td>
            <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">拼豆覆盖率</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${summary.beadCoverage}%</td>
          </tr>
        </tbody>
      </table>

      <h2 style="font-size:20px;margin:0 0 12px;">二、材料消耗清单</h2>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;border-bottom:2px solid #111827;">颜色</th>
            <th style="padding:8px;border-bottom:2px solid #111827;text-align:left;">色号</th>
            <th style="padding:8px;border-bottom:2px solid #111827;text-align:left;">名称</th>
            <th style="padding:8px;border-bottom:2px solid #111827;text-align:right;">数量</th>
            <th style="padding:8px;border-bottom:2px solid #111827;text-align:right;">占比</th>
            <th style="padding:8px;border-bottom:2px solid #111827;text-align:right;">误差</th>
          </tr>
        </thead>
        <tbody>
          ${materialRows}
        </tbody>
      </table>

      <h2 style="font-size:20px;margin:0 0 12px;">三、色号图例</h2>

      <div style="
        display:grid;
        grid-template-columns:repeat(2,1fr);
        gap:8px;
        margin-bottom:24px;
      ">
        ${legendItems}
      </div>

      <h2 style="font-size:20px;margin:0 0 12px;">四、使用说明</h2>

      <ol style="font-size:14px;line-height:1.9;color:#374151;margin:0;padding-left:22px;">
        <li>打印第 1 页图纸。</li>
        <li>根据每个格子的颜色和色号摆放拼豆。</li>
        <li>材料清单中的数量已经排除了透明空格。</li>
        <li>如果开启最大颜色数限制，系统会把低频颜色重新归并到主要颜色中，减少购买材料的复杂度。</li>
      </ol>
    `;

    root.appendChild(page1);
    root.appendChild(page2);

    const pdf = new jsPDF("p", "mm", "a4");

    let isFirstPage = true;
    isFirstPage = await addElementToPdf(pdf, page1, isFirstPage);
    await addElementToPdf(pdf, page2, isFirstPage);

    pdf.save(getPatternPdfFileName(pattern));
  } finally {
    document.body.removeChild(root);
  }
}