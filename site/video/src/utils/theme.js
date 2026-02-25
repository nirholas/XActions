/**
 * XActions Video Theme
 * Shared design tokens for all video compositions.
 * @author nich (@nichxbt)
 */

export const theme = {
  // Colors
  bg: '#0a0a0a',
  bgCard: '#161616',
  bgCardHover: '#1e1e1e',
  accent: '#1d9bf0', // Twitter blue
  accentGlow: 'rgba(29, 155, 240, 0.3)',
  green: '#00c853',
  red: '#ff1744',
  orange: '#ff9800',
  yellow: '#ffd600',
  purple: '#7c4dff',
  text: '#e7e9ea',
  textSecondary: '#71767b',
  textMuted: '#536471',
  border: '#2f3336',
  gradient: 'linear-gradient(135deg, #1d9bf0, #7c4dff)',
  gradientFire: 'linear-gradient(135deg, #ff6b35, #ff1744)',
  gradientGreen: 'linear-gradient(135deg, #00c853, #1d9bf0)',

  // Typography
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontMono: '"SF Mono", "Fira Code", "Cascadia Code", monospace',

  // Sizes
  borderRadius: 16,
  borderRadiusSm: 8,
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// 9:16 vertical (TikTok/Reels/Shorts)
export const V_WIDTH = 1080;
export const V_HEIGHT = 1920;

// 1:1 square (Instagram feed)
export const SQ_WIDTH = 1080;
export const SQ_HEIGHT = 1080;
