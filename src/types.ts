export type AspectRatio = '9:16' | '1:1' | '16:9';

export type MotionSpeed = 'slow' | 'medium' | 'fast';
export type MotionIntensity = 'subtle' | 'normal' | 'aggressive';

export interface ColorPalette {
  id: string;
  name: string;
  background: string;
  text: string;
  accent: string;
}

export interface PresetStyle {
  id: string;
  name: string;
  font: string;
  motionType: 'hype' | 'bollywood' | 'tapori' | 'sale' | 'minimal' | 'glitch' | 'beat' | 'news' | 'retro' | 'flash' | 'liquid' | 'bounce' | 'cyberpunk' | 'neon' | 'horror' | 'comedy';
  description: string;
}

export interface AppState {
  text: string;
  aspectRatio: AspectRatio;
  presetId: string;
  paletteId: string;
  speed: MotionSpeed;
  intensity: MotionIntensity;
  fontSize: number;
  bgImage: string | null;
  textPosition: { x: number, y: number };
}
