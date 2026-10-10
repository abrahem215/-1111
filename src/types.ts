export type Language = 'ar' | 'en';

export type GestureState =
  | 'NO_HAND'
  | 'IDLE'
  | 'PINCH_POTENTIAL'
  | 'TRIGGERED'
  | 'WAIT_RELEASE'
  | 'PALM_PAUSED'
  | 'DWELLING'
  | 'EMERGENCY_STOPPED';

export type SelectionMode = 'pinch' | 'dwell' | 'both';

export interface HandLandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface HandTrackingData {
  detected: boolean;
  landmarks: HandLandmarkPoint[];
  indexTip: { x: number; y: number } | null;
  thumbTip: { x: number; y: number } | null;
  wrist: { x: number; y: number } | null;
  pinchDistance: number;
  isOpenPalm: boolean;
  handedness: 'Right' | 'Left' | 'Unknown';
  confidence: number;
}

export interface CalibrationProfile {
  zoneXMin: number;
  zoneXMax: number;
  zoneYMin: number;
  zoneYMax: number;
  pinchThreshold: number;
  dwellTimeMs: number;
  selectionMode: SelectionMode;
  mirrorCamera: boolean;
  smoothingAlpha: number;
  cooldownMs: number;
  calibratedAt?: string;
}

export interface KeyItem {
  id: string;
  label: string;
  value: string;
  type: 'char' | 'action';
  width: number;
}

export interface KeyboardRow {
  rowId: string;
  keys: KeyItem[];
}

export interface KeyboardLayoutData {
  layoutId: string;
  language: Language;
  name: string;
  direction: 'rtl' | 'ltr';
  rows: KeyboardRow[];
}

export interface EngineSettings {
  pinchThreshold: number; // 0.02 - 0.12
  smoothingAlpha: number;  // 0.1 - 0.9
  cooldownMs: number;      // 100 - 1000
  soundEnabled: boolean;
  selectionMode: SelectionMode;
  dwellTimeMs: number;     // 400 - 1500
  mirrorCamera: boolean;
  showSkeleton: boolean;
  zoneXMin: number;        // Calibration zone
  zoneXMax: number;
  zoneYMin: number;
  zoneYMax: number;
}

export interface ProjectFile {
  path: string;
  category: 'shared' | 'desktop' | 'android' | 'docs' | 'root';
  language: string;
  content: string;
}

