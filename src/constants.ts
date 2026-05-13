import { ColorPalette, PresetStyle } from './types';

export const PALETTES: ColorPalette[] = [
  { id: 'zomato', name: 'Zomato Red', background: '#E23744', text: '#FFFFFF', accent: '#000000' },
  { id: 'neon-mumbai', name: 'Neon Mumbai', background: '#000000', text: '#CCFF00', accent: '#FF00FF' },
  { id: 'bw-swiss', name: 'Minimal Mono', background: '#FFFFFF', text: '#000000', accent: '#E5E5E5' },
  { id: 'ipl-gold', name: 'IPL Gold', background: '#004BA0', text: '#EBF0FF', accent: '#D4AF37' },
  { id: 'street-poster', name: 'Street Poster', background: '#FACC15', text: '#000000', accent: '#DC2626' },
  { id: 'cyber', name: 'Cyberpunk', background: '#0F172A', text: '#38BDF8', accent: '#38BDF8' },
  { id: 'punch', name: 'Punchy', background: '#000000', text: '#FFFFFF', accent: '#FFBDC3' },
  { id: 'lemon', name: 'Lemonade', background: '#111827', text: '#E2FF00', accent: '#E2FF00' },
  { id: 'candy', name: 'Cotton Candy', background: '#FFC0CB', text: '#000000', accent: '#00BFFF' },
  { id: 'midnight', name: 'Midnight', background: '#191970', text: '#FFFFFF', accent: '#FFD700' },
];

export const PRESETS: PresetStyle[] = [
  { id: 'hype', name: 'Hype', font: 'var(--font-display)', motionType: 'hype', description: 'Fast punchy scaling typography' },
  { id: 'bollywood', name: 'Bollywood', font: 'var(--font-art)', motionType: 'bollywood', description: 'Dramatic cinematic movement' },
  { id: 'tapori', name: 'Tapori', font: 'var(--font-display)', motionType: 'tapori', description: 'Street-style animated slang' },
  { id: 'sale', name: 'Sale Alert', font: 'var(--font-display)', motionType: 'sale', description: 'Loud advertising style' },
  { id: 'minimal', name: 'Minimal Mono', font: 'var(--font-tech)', motionType: 'minimal', description: 'Clean Swiss motion' },
  { id: 'glitch', name: 'Glitch', font: 'var(--font-mono)', motionType: 'glitch', description: 'Digital distortion transitions' },
  { id: 'beat', name: 'Beat Pop', font: 'var(--font-display)', motionType: 'beat', description: 'Rhythmic scaling pulses' },
  { id: 'news', name: 'News Flash', font: 'var(--font-tech)', motionType: 'news', description: 'Breaking news ticker style' },
  { id: 'retro', name: 'Retro CRT', font: 'var(--font-mono)', motionType: 'retro', description: '90s TV promo scanlines' },
  { id: 'flash', name: 'Flash', font: 'var(--font-art)', motionType: 'flash', description: 'Rapid high-energy cuts' },
  { id: 'liquid', name: 'Liquid', font: 'var(--font-art)', motionType: 'liquid', description: 'Smooth wavy flow motion' },
  { id: 'bounce', name: 'Bounce', font: 'var(--font-display)', motionType: 'bounce', description: 'Elastic organic movement' },
  { id: 'cyberpunk', name: 'Cyber Neon', font: 'var(--font-tech)', motionType: 'cyberpunk', description: 'Neon outline grid vibe' },
  { id: 'comedy', name: 'Comedy', font: 'var(--font-sans)', motionType: 'comedy', description: 'Playful jumpy text' },
  { id: 'horror', name: 'Horror', font: 'var(--font-display)', motionType: 'horror', description: 'Distorted jittery text' },
];

export const FONTS = [
  { id: 'display', name: 'Anton (Bold)', value: 'var(--font-display)' },
  { id: 'tech', name: 'Space Grotesk', value: 'var(--font-tech)' },
  { id: 'art', name: 'Syne', value: 'var(--font-art)' },
  { id: 'sans', name: 'Inter', value: 'var(--font-sans)' },
  { id: 'mono', name: 'JetBrains Mono', value: 'var(--font-mono)' },
];
