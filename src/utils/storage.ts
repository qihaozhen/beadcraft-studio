import type { AppSettings } from "../types/bead";

/**
 * localStorage：浏览器本地存储
 * stockage local：法语里可理解为本地存储
 *
 * 这个 key 是本项目专用的本地存储名称。
 */
const STORAGE_KEY = "beadcraft-studio-settings-v1";

/**
 * 本项目允许保存的图纸尺寸。
 */
const ALLOWED_GRID_SIZES = [16, 24, 32, 48, 64, 96];

/**
 * 本项目允许保存的最大颜色数。
 * 0 表示不限制。
 */
const ALLOWED_MAX_COLORS = [0, 8, 12, 16, 24];

/**
 * 默认设置。
 *
 * 当 localStorage 中没有数据，或者数据损坏时，使用这里的默认值。
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  gridWidth: 32,
  gridHeight: 32,
  cellSize: 18,
  showGrid: true,
  showCode: true,
  beadMode: false,
  ignoreTransparent: true,
  maxColors: 0,
  transparentAlphaThreshold: 20,
};

function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const rounded = Math.round(value);

  if (rounded < min || rounded > max) {
    return fallback;
  }

  return rounded;
}

function normalizeGridSize(value: unknown, fallback: number): number {
  const numberValue = normalizeNumber(value, fallback, 1, 256);

  if (!ALLOWED_GRID_SIZES.includes(numberValue)) {
    return fallback;
  }

  return numberValue;
}

function normalizeMaxColors(value: unknown, fallback: number): number {
  const numberValue = normalizeNumber(value, fallback, 0, 999);

  if (!ALLOWED_MAX_COLORS.includes(numberValue)) {
    return fallback;
  }

  return numberValue;
}

function normalizeCellSize(value: unknown, fallback: number): number {
  return normalizeNumber(value, fallback, 6, 64);
}

/**
 * 把 localStorage 里读出来的数据整理成安全的 AppSettings。
 *
 * 这样做的好处：
 * 即使用户手动改了浏览器缓存，或者旧版本数据格式不一致，
 * 页面也不会崩溃。
 */
export function normalizeAppSettings(value: unknown): AppSettings {
  if (!isRecord(value)) {
    return DEFAULT_APP_SETTINGS;
  }

  const gridWidth = normalizeGridSize(
    value.gridWidth,
    DEFAULT_APP_SETTINGS.gridWidth
  );

  const gridHeight = normalizeGridSize(
    value.gridHeight,
    DEFAULT_APP_SETTINGS.gridHeight
  );

  return {
    gridWidth,
    gridHeight,
    cellSize: normalizeCellSize(
      value.cellSize,
      DEFAULT_APP_SETTINGS.cellSize
    ),
    showGrid: normalizeBoolean(
      value.showGrid,
      DEFAULT_APP_SETTINGS.showGrid
    ),
    showCode: normalizeBoolean(
      value.showCode,
      DEFAULT_APP_SETTINGS.showCode
    ),
    beadMode: normalizeBoolean(
      value.beadMode,
      DEFAULT_APP_SETTINGS.beadMode
    ),
    ignoreTransparent: normalizeBoolean(
      value.ignoreTransparent,
      DEFAULT_APP_SETTINGS.ignoreTransparent
    ),
    maxColors: normalizeMaxColors(
      value.maxColors,
      DEFAULT_APP_SETTINGS.maxColors
    ),
    transparentAlphaThreshold: normalizeNumber(
      value.transparentAlphaThreshold,
      DEFAULT_APP_SETTINGS.transparentAlphaThreshold,
      0,
      255
    ),
  };
}

/**
 * 读取保存的设置。
 */
export function loadAppSettings(): AppSettings {
  if (!isBrowserEnvironment()) {
    return DEFAULT_APP_SETTINGS;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return DEFAULT_APP_SETTINGS;
  }

  const parsedValue = safeParseJson(rawValue);

  return normalizeAppSettings(parsedValue);
}

/**
 * 保存设置。
 */
export function saveAppSettings(settings: AppSettings): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  const normalizedSettings = normalizeAppSettings(settings);

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizedSettings)
  );
}

/**
 * 局部更新设置。
 *
 * 例如只更新 showGrid，不影响其他设置。
 */
export function updateStoredAppSettings(
  partialSettings: Partial<AppSettings>
): AppSettings {
  const currentSettings = loadAppSettings();

  const nextSettings = normalizeAppSettings({
    ...currentSettings,
    ...partialSettings,
  });

  saveAppSettings(nextSettings);

  return nextSettings;
}

/**
 * 清空保存的设置。
 *
 * 以后如果你想做“恢复默认设置”按钮，可以调用这个函数。
 */
export function clearStoredAppSettings(): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}