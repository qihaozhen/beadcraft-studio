import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import "./App.css";
import PatternCanvas from "./components/PatternCanvas";
import PaletteLegend from "./components/PaletteLegend";
import type { PatternResult } from "./types/bead";
import { imageFileToPattern } from "./utils/imageProcessor";
import {
  MAX_COLOR_OPTIONS,
  formatMaxColorsLabel,
  isSupportedMaxColors,
  limitPatternColors,
  type MaxColorsOption,
} from "./utils/colorReducer";
import { countMaterials, summarizePattern } from "./utils/materialCounter";
import { exportPatternBitmapToPng } from "./utils/exportImage";
import { exportPatternPdf } from "./utils/exportPdf";
import { exportMaterialsToCsv } from "./utils/exportCsv";
import { loadAppSettings, saveAppSettings } from "./utils/storage";
import { createHorizontalMirroredPattern } from "./utils/patternTransform";
import {
  DEFAULT_GRID_SIZE,
  MAX_CELL_SIZE,
  MAX_GRID_SIZE,
  MIN_CELL_SIZE,
  SUPPORTED_IMAGE_EXTENSIONS,
  clampCellSize,
  getLargeImageWarning,
  validateCanvasBeforeExport,
  validateGridSize,
  validateImageFile,
  type PreviewMode,
} from "./utils/errorGuards";

const GRID_SIZE_OPTIONS = [16, 24, 32, 48, 64, 96, 128] as const;
type GridSizeOption = (typeof GRID_SIZE_OPTIONS)[number];

const CELL_SIZE_OPTIONS = [10, 12, 14, 18, 22, 26, 32, 40] as const;

function isGridSizeOption(value: number): value is GridSizeOption {
  return GRID_SIZE_OPTIONS.includes(value as GridSizeOption);
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [initialSettings] = useState(() => loadAppSettings());

  const initialGridSize: GridSizeOption = isGridSizeOption(
    initialSettings.gridWidth
  )
    ? initialSettings.gridWidth
    : DEFAULT_GRID_SIZE;

  const initialMaxColors: MaxColorsOption = isSupportedMaxColors(
    initialSettings.maxColors
  )
    ? initialSettings.maxColors
    : 0;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState("");

  const [basePattern, setBasePattern] = useState<PatternResult | null>(null);

  const [selectedGridSize, setSelectedGridSize] =
    useState<GridSizeOption>(initialGridSize);

  const [ignoreTransparent, setIgnoreTransparent] = useState(
    initialSettings.ignoreTransparent
  );

  const [maxColors, setMaxColors] =
    useState<MaxColorsOption>(initialMaxColors);

  const [cellSize, setCellSize] = useState(
    clampCellSize(initialSettings.cellSize)
  );

  const [showGrid, setShowGrid] = useState(initialSettings.showGrid);
  const [showCode, setShowCode] = useState(initialSettings.showCode);
  const [beadMode, setBeadMode] = useState(initialSettings.beadMode);

  const [previewMode, setPreviewMode] = useState<PreviewMode>("original");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  /**
   * 第 23 步新增：
   * 1. 导出标题
   * 2. 水平镜像
   * 3. 导出 PNG 显示坐标数字
   */
  const [exportTitle, setExportTitle] = useState("BeadCraft 拼豆图纸");
  const [mirrorHorizontal, setMirrorHorizontal] = useState(false);
  const [showExportCoordinates, setShowExportCoordinates] = useState(true);

  useEffect(() => {
    if (!selectedFile) {
      setOriginalImageUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setOriginalImageUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    saveAppSettings({
      gridWidth: selectedGridSize,
      gridHeight: selectedGridSize,
      cellSize,
      showGrid,
      showCode,
      beadMode,
      ignoreTransparent,
      maxColors,
      transparentAlphaThreshold: 20,
    });
  }, [
    selectedGridSize,
    cellSize,
    showGrid,
    showCode,
    beadMode,
    ignoreTransparent,
    maxColors,
  ]);

  const pattern = useMemo(() => {
    if (!basePattern) {
      return null;
    }

    return limitPatternColors(basePattern, maxColors, "MARD");
  }, [basePattern, maxColors]);

  /**
   * 第 23 步新增：
   * displayPattern 是最终用于预览和导出的图纸。
   * 开启水平镜像时，只改变显示和导出，不破坏原始识别结果。
   */
  const displayPattern = useMemo(() => {
    if (!pattern) {
      return null;
    }

    return mirrorHorizontal ? createHorizontalMirroredPattern(pattern) : pattern;
  }, [pattern, mirrorHorizontal]);

  const materials = useMemo(() => {
    if (!displayPattern) {
      return [];
    }

    return countMaterials(displayPattern);
  }, [displayPattern]);

  const summary = useMemo(() => {
    if (!displayPattern) {
      return null;
    }

    return summarizePattern(displayPattern);
  }, [displayPattern]);

  function resetGeneratedPattern(message = "") {
    setBasePattern(null);
    setPreviewMode("original");

    if (message) {
      setWarningMessage(message);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setErrorMessage("");
    setWarningMessage("");
    setBasePattern(null);
    setPreviewMode("original");

    const fileError = validateImageFile(file);

    if (fileError) {
      setSelectedFile(null);
      event.target.value = "";
      setErrorMessage(fileError);
      return;
    }

    setSelectedFile(file);
    setWarningMessage(getLargeImageWarning(file));
  }

  function handleGridSizeChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = Number(event.target.value);

    if (!isGridSizeOption(value)) {
      setErrorMessage("建议图纸尺寸不超过 128×128");
      return;
    }

    setSelectedGridSize(value);
    resetGeneratedPattern("图纸尺寸已修改，请重新点击“生成拼豆图纸”。");
  }

  function handleMaxColorsChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = Number(event.target.value);

    if (!isSupportedMaxColors(value)) {
      setErrorMessage("最大颜色数设置不合法");
      return;
    }

    setMaxColors(value);
    setErrorMessage("");
  }

  function handleCellSizeChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = clampCellSize(Number(event.target.value));

    setCellSize(value);
    setErrorMessage("");
  }

  function handleIgnoreTransparentChange(event: ChangeEvent<HTMLInputElement>) {
    setIgnoreTransparent(event.target.checked);
    resetGeneratedPattern("透明背景设置已修改，请重新点击“生成拼豆图纸”。");
  }

  async function handleGeneratePattern() {
    const fileError = validateImageFile(selectedFile);

    if (fileError) {
      setErrorMessage(fileError);
      return;
    }

    const gridError = validateGridSize(selectedGridSize, selectedGridSize);

    if (gridError) {
      setErrorMessage(gridError);
      return;
    }

    if (!selectedFile) {
      setErrorMessage("请先上传一张图片");
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage("");
      setWarningMessage(getLargeImageWarning(selectedFile));

      const result = await imageFileToPattern(selectedFile, {
        gridWidth: selectedGridSize,
        gridHeight: selectedGridSize,
        ignoreTransparent,
        transparentAlphaThreshold: 20,
        brand: "MARD",
        imageSmoothingEnabled: false,
      });

      setBasePattern(result);
      setPreviewMode("pattern");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "图片处理失败，请重试";

      setErrorMessage(message);
      setBasePattern(null);
      setPreviewMode("original");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleExportPng() {
    if (!displayPattern) {
      setErrorMessage("请先生成图纸再导出");
      return;
    }

    try {
      setErrorMessage("");

      await exportPatternBitmapToPng({
        pattern: displayPattern,
        title: exportTitle,
        cellSize,
        showGrid,
        showCode,
        beadMode,
        showCoordinates: showExportCoordinates,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `PNG 导出失败：${error.message}`
          : "PNG 导出失败，请重试";

      setErrorMessage(message);
    }
  }

  async function handleExportPdf() {
    const exportError = validateCanvasBeforeExport(
      canvasRef.current,
      displayPattern
    );

    if (exportError) {
      setErrorMessage(exportError);
      return;
    }

    if (!canvasRef.current || !displayPattern || !summary) {
      setErrorMessage("请先生成图纸再导出");
      return;
    }

    try {
      setIsExportingPdf(true);
      setErrorMessage("");

      await exportPatternPdf({
        canvas: canvasRef.current,
        pattern: displayPattern,
        materials,
        summary,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `导出失败，请重试：${error.message}`
          : "导出失败，请重试";

      setErrorMessage(message);
    } finally {
      setIsExportingPdf(false);
    }
  }

  function handleExportCsv() {
    if (materials.length === 0) {
      setErrorMessage("请先生成图纸再导出 CSV 材料清单");
      return;
    }

    setErrorMessage("");
    exportMaterialsToCsv(materials);
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="app-kicker">BeadCraft Studio</p>
          <h1>拼豆图纸生成工具</h1>
          <p className="app-desc">
            上传图片后，系统会自动像素化、匹配真实拼豆色盘，并生成可下载的 PNG、
            PDF 图纸和 CSV 材料清单。
          </p>
        </div>

        <div className="header-badge">
          <span>高分版</span>
          <strong>PNG 位图 + 镜像 + 坐标</strong>
        </div>
      </header>

      {(errorMessage || warningMessage) && (
        <section className="message-area">
          {errorMessage && <div className="error-message">{errorMessage}</div>}
          {warningMessage && !errorMessage && (
            <div className="warning-message">{warningMessage}</div>
          )}
        </section>
      )}

      <section className="workspace-layout">
        <aside className="left-column">
          <section className="panel">
            <div className="section-title-row">
              <div>
                <h2>上传图片</h2>
                <p>支持 PNG、JPG、JPEG、WEBP</p>
              </div>
            </div>

            <label className="upload-box">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
              />

              <span className="upload-icon">＋</span>
              <strong>选择图片</strong>
              <small>
                支持格式：{SUPPORTED_IMAGE_EXTENSIONS.join(" / ")}
              </small>
            </label>

            {selectedFile && (
              <div className="file-card">
                <span>当前文件</span>
                <strong>{selectedFile.name}</strong>
                <small>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </small>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="section-title-row">
              <div>
                <h2>高级选项</h2>
                <p>控制图纸尺寸、颜色数量和显示方式</p>
              </div>
            </div>

            <div className="form-group">
              <label>图纸尺寸</label>
              <select value={selectedGridSize} onChange={handleGridSizeChange}>
                {GRID_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} × {size}
                  </option>
                ))}
              </select>
              <p className="field-help">
                默认 {DEFAULT_GRID_SIZE}×{DEFAULT_GRID_SIZE}，最大{" "}
                {MAX_GRID_SIZE}×{MAX_GRID_SIZE}。
              </p>
            </div>

            <div className="form-group">
              <label>最大颜色数</label>
              <select value={maxColors} onChange={handleMaxColorsChange}>
                {MAX_COLOR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatMaxColorsLabel(option)}
                  </option>
                ))}
              </select>
              <p className="field-help">
                建议演示时选择 12 色，材料清单更清晰。
              </p>
            </div>

            <div className="form-group">
              <label>预览格子大小</label>
              <select value={cellSize} onChange={handleCellSizeChange}>
                {CELL_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
              <p className="field-help">
                最小 {MIN_CELL_SIZE}px，最大 {MAX_CELL_SIZE}px。
              </p>
            </div>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={ignoreTransparent}
                onChange={handleIgnoreTransparentChange}
              />
              <span>忽略透明背景</span>
            </label>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={mirrorHorizontal}
                onChange={(event) => setMirrorHorizontal(event.target.checked)}
              />
              <span>水平镜像图纸</span>
            </label>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(event) => setShowGrid(event.target.checked)}
              />
              <span>显示网格线</span>
            </label>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={showCode}
                onChange={(event) => setShowCode(event.target.checked)}
              />
              <span>显示色号</span>
            </label>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={beadMode}
                onChange={(event) => setBeadMode(event.target.checked)}
              />
              <span>圆珠显示模式</span>
            </label>

            <button
              className="primary-button"
              type="button"
              onClick={handleGeneratePattern}
              disabled={isProcessing}
            >
              {isProcessing ? "正在生成..." : "生成拼豆图纸"}
            </button>
          </section>

          <section className="panel usage-panel">
            <h2>用户使用流程</h2>
            <ol>
              <li>打开网页</li>
              <li>上传图片</li>
              <li>选择 32×32 等图纸尺寸</li>
              <li>设置最大颜色数，例如 12 色</li>
              <li>按需要开启水平镜像</li>
              <li>输入导出图纸标题</li>
              <li>下载带坐标数字的 PNG 位图</li>
            </ol>
          </section>
        </aside>

        <section className="center-column">
          <section className="preview-panel">
            <div className="section-title-row">
              <div>
                <h2>图纸预览</h2>
                <p>
                  {displayPattern
                    ? `${displayPattern.width} × ${displayPattern.height}，共 ${displayPattern.totalBeads} 颗`
                    : "上传图片并生成后显示"}
                  {mirrorHorizontal && displayPattern ? "，当前为水平镜像预览" : ""}
                </p>
              </div>

              <div className="tab-group">
                <button
                  type="button"
                  className={previewMode === "original" ? "active-tab" : ""}
                  onClick={() => setPreviewMode("original")}
                >
                  原图
                </button>
                <button
                  type="button"
                  className={previewMode === "pattern" ? "active-tab" : ""}
                  onClick={() => setPreviewMode("pattern")}
                  disabled={!displayPattern}
                >
                  拼豆图
                </button>
              </div>
            </div>

            <div className="preview-body">
              {previewMode === "original" && originalImageUrl && (
                <img
                  className="original-preview"
                  src={originalImageUrl}
                  alt="用户上传的原图预览"
                />
              )}

              {previewMode === "original" && !originalImageUrl && (
                <div className="empty-preview">
                  <strong>暂无原图</strong>
                  <span>请先在左侧上传一张图片。</span>
                </div>
              )}

              {previewMode === "pattern" && displayPattern && (
                <div className="canvas-scroll">
                  <PatternCanvas
                    pattern={displayPattern}
                    cellSize={cellSize}
                    showGrid={showGrid}
                    showCode={showCode}
                    beadMode={beadMode}
                    canvasRef={canvasRef}
                  />
                </div>
              )}

              {previewMode === "pattern" && !displayPattern && (
                <div className="empty-preview">
                  <strong>暂无拼豆图纸</strong>
                  <span>请先点击“生成拼豆图纸”。</span>
                </div>
              )}
            </div>

            <p className="preview-note">
              灰白棋盘格表示透明区域；开启“忽略透明背景”后，这些格子不会计入材料清单。
              PNG 导出时可自动加入标题和坐标数字。
            </p>
          </section>
        </section>

        <aside className="right-column">
          <section className="panel">
            <div className="section-title-row">
              <div>
                <h2>统计信息</h2>
                <p>实时展示图纸基础数据</p>
              </div>
            </div>

            {summary ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <span>总格子数</span>
                  <strong>{summary.totalCells}</strong>
                </div>

                <div className="stat-card">
                  <span>实际拼豆数</span>
                  <strong>{summary.totalBeads}</strong>
                </div>

                <div className="stat-card">
                  <span>使用颜色数</span>
                  <strong>{summary.usedColors}</strong>
                </div>

                <div className="stat-card">
                  <span>透明空格</span>
                  <strong>{summary.emptyCells}</strong>
                </div>
              </div>
            ) : (
              <p className="empty-text">生成图纸后，这里会显示统计信息。</p>
            )}
          </section>

          <section className="panel">
            <div className="section-title-row">
              <div>
                <h2>材料清单</h2>
                <p>不统计透明格子，镜像不影响材料数量</p>
              </div>

              {materials.length > 0 && (
                <span className="size-badge">{materials.length} 色</span>
              )}
            </div>

            {materials.length === 0 ? (
              <p className="empty-text">暂无材料清单。</p>
            ) : (
              <div className="material-list">
                {materials.map((item) => (
                  <div
                    className="material-item"
                    key={`${item.brand}-${item.code}`}
                  >
                    <span
                      className="color-dot"
                      style={{ backgroundColor: item.hex }}
                    />

                    <div>
                      <strong>
                        {item.code} {item.name}
                      </strong>
                      <small>
                        {item.count} 颗，占比 {item.percentage}%，平均误差{" "}
                        {item.avgDistance}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <PaletteLegend materials={materials} />

          <section className="panel">
            <div className="section-title-row">
              <div>
                <h2>导出文件</h2>
                <p>PNG 位图支持标题和坐标数字</p>
              </div>
            </div>

            <div className="form-group">
              <label>导出图纸标题</label>
              <input
                className="text-input"
                type="text"
                value={exportTitle}
                maxLength={40}
                placeholder="例如：皮卡丘拼豆图纸"
                onChange={(event) => setExportTitle(event.target.value)}
              />
              <p className="field-help">
                该标题会显示在 PNG 顶部，也会用于生成文件名。
              </p>
            </div>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={showExportCoordinates}
                onChange={(event) =>
                  setShowExportCoordinates(event.target.checked)
                }
              />
              <span>PNG 导出图显示坐标数字</span>
            </label>

            <div className="export-buttons">
              <button type="button" onClick={handleExportPng}>
                下载 PNG 位图
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
              >
                {isExportingPdf ? "PDF 导出中..." : "下载 PDF"}
              </button>

              <button type="button" onClick={handleExportCsv}>
                导出 CSV 材料清单
              </button>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

export default App;