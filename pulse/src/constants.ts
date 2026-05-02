/** Pulse 壁紙の全レイアウト定数 (Vital Signs Monitor 版) */

export interface PulseProperties {
  accentColor: string;
  criticalThreshold: number;
  showSecondaryVitals: boolean;
  showGrid: boolean;
}

// Layout
export const HEADER_HEIGHT = 60;
export const FOOTER_HEIGHT = 50;
export const LANE_LABEL_WIDTH = 220;

// Vital colors
export const COLOR_PLETH = "#FFCC44";
export const COLOR_RESP = "#44CCFF";
export const COLOR_BAT = "#FF99CC";
export const COLOR_ALERT = "#FF3344";

// Grid
export const COLOR_GRID_MAJOR = "rgba(0, 255, 200, 0.06)";
export const COLOR_GRID_MINOR = "rgba(0, 255, 200, 0.02)";

// Synth buffers
export const SYNTH_SAMPLES_PER_SECOND = 60;
export const SYNTH_WINDOW_SECONDS = 8;
export const SYNTH_BUFFER_SIZE = SYNTH_SAMPLES_PER_SECOND * SYNTH_WINDOW_SECONDS;
export const PLETH_PHASE_OFFSET = 0.18;

// RESP
export const RESP_PERIOD_SECONDS = 4;
export const RESP_NOISE_AMPLITUDE = 0.05;

// Battery
export const BATTERY_SEGMENTS = 12;
export const BATTERY_LOW_THRESHOLD = 20;

// Audio (PHONO lane)
export const AUDIO_NUM_BANDS = 32;
export const COLOR_PHONO = "#bb88ff";

// EMA
export const EMA_ALPHA_CPU = 0.18;
export const EMA_ALPHA_MEM = 0.12;
export const EMA_ALPHA_BAT = 0.12;
export const EMA_ALPHA_NET = 0.25;
export const EMA_EPSILON_RATE = 1024;

// Defaults
export const DEFAULT_ACCENT = "#00FF88";
export const DEFAULT_THRESHOLD = 80;
