// The extended four (dawn / midnight / ocean / forest), taken to AAA from
// source palettes authored in HSL at AA or below. cuix keeps the hue and
// saturation of every value and moves lightness until the pair passes:
// text 7:1 on every surface, labels 7:1 on their fill, marks 3:1.
//
// What AAA changed, so nobody reads it as drift:
//   dawn      primary 250 85% 60% (#6d5bef, 4.1:1) → #4326d5. Accent sky becomes `info`.
//   midnight  primary 260 75% 60% (#9366f0, 4.0:1) → lavender #b69ffa. Violet at
//             7:1 on near-black is pale; that is the ratio, not a taste.
//   ocean     primary 195 90% 55% stays cyan (#24c0f3); its violet accent becomes `info`.
//   forest    primary 150 50% 40% (#339966, 3.4:1) → #1a5a3a. Amber accent → `warning`.
// The source palette.s second accent (`--accent`) has no role in the vocabulary; it lands
// on `info` so the hue survives for banners and chart-4.

import type { ThemeColors } from '../vocabulary.ts';

export const dawn: ThemeColors = {
  background: '#fdfcfb', // 30 20% 99%, warm paper
  surface: '#ffffff',
  'surface-raised': '#f4f2f0', // 30 15% 95%, source `muted`. The 7:1 floor.
  foreground: '#1c1c21', // 240 10% 12%
  'foreground-muted': '#3d3d4b',
  'foreground-subtle': '#505062',
  border: '#e9e6e2', // 30 15% 90%, decorative only
  'border-strong': '#89899f',
  accent: '#4326d5',
  'accent-strong': '#3b21bb',
  'accent-foreground': '#ffffff',
  'accent-soft': '#ebe8fc',
  'accent-on-soft': '#4326d5',
  success: '#105d41',
  'success-foreground': '#ffffff',
  'success-soft': '#e8fcf5',
  'success-on-soft': '#105d41',
  warning: '#7d4207',
  'warning-foreground': '#ffffff',
  'warning-soft': '#fcf2e8',
  'warning-on-soft': '#7d4207',
  danger: '#9b1616',
  'danger-foreground': '#ffffff',
  'danger-soft': '#fce8e8',
  'danger-on-soft': '#9b1616',
  'danger-strong': '#801212',
  info: '#07567e', // the source sky accent
  'info-foreground': '#ffffff',
  'info-soft': '#e8f6fc',
  'info-on-soft': '#07567e',
  'focus-ring': '#4326d5',
  'overlay-scrim': '#1c1c2180',
  // violet, green, orange, sky, pink: the source order, 280 swapped for the sky accent (CVD).
  'chart-1': '#664ce6',
  'chart-2': '#219d6f',
  'chart-3': '#d27111',
  'chart-4': '#1193d4',
  'chart-5': '#e05281',
};

export const midnight: ThemeColors = {
  background: '#0e0e11', // 240 10% 6%
  surface: '#17171c', // 240 8% 10%
  'surface-raised': '#212127', // 240 8% 14%
  foreground: '#f4f4f5', // 240 5% 96%
  'foreground-muted': '#c7c7cd',
  'foreground-subtle': '#acacb5',
  border: '#292932',
  'border-strong': '#6b6b79',
  accent: '#b69ffa',
  'accent-strong': '#ccbcfb',
  'accent-foreground': '#0e0e11',
  'accent-soft': '#231a3d',
  'accent-on-soft': '#b49dfa',
  success: '#31c38d',
  'success-foreground': '#0e0e11',
  'success-soft': '#1a3d30',
  'success-on-soft': '#6ddbb2',
  warning: '#ed9a25',
  'warning-foreground': '#0e0e11',
  'warning-soft': '#3d2e1a',
  'warning-on-soft': '#f2b35b',
  danger: '#f59188',
  'danger-foreground': '#0e0e11',
  'danger-soft': '#3d1d1a',
  'danger-on-soft': '#f6988f',
  'danger-strong': '#f8aba4',
  info: '#3bb7f5', // the source sky accent
  'info-foreground': '#0e0e11',
  'info-soft': '#1a313d',
  'info-on-soft': '#64c6f7',
  'focus-ring': '#b69ffa',
  'overlay-scrim': '#000000a3',
  'chart-1': '#744bf0',
  'chart-2': '#29a376',
  'chart-3': '#b86614',
  'chart-4': '#0a85c2',
  'chart-5': '#d01e59',
};

export const ocean: ThemeColors = {
  background: '#0f131a', // 215 28% 8%
  surface: '#171d26', // 215 25% 12%
  'surface-raised': '#1f2733', // 215 25% 16%
  foreground: '#f6f7f8', // 215 10% 97%
  'foreground-muted': '#caced3',
  'foreground-subtle': '#acb3bb',
  border: '#263140',
  'border-strong': '#687280',
  accent: '#24c0f3', // 195 90% 55%, the source primary, unchanged in hue
  'accent-strong': '#41c8f5',
  'accent-foreground': '#0f131a',
  'accent-soft': '#1a343d',
  'accent-on-soft': '#4fccf6',
  success: '#2ac8a0',
  'success-foreground': '#0f131a',
  'success-soft': '#1a3d34',
  'success-on-soft': '#5cdcbc',
  warning: '#eca413',
  'warning-foreground': '#0f131a',
  'warning-soft': '#3d311a',
  'warning-on-soft': '#f0b847',
  danger: '#f69990',
  'danger-foreground': '#0f131a',
  'danger-soft': '#3d1d1a',
  'danger-on-soft': '#f6988f',
  'danger-strong': '#f8b3ac',
  info: '#d59df1', // the source violet accent
  'info-foreground': '#0f131a',
  'info-soft': '#311a3d',
  'info-on-soft': '#d398f0',
  'focus-ring': '#24c0f3',
  'overlay-scrim': '#000000a3',
  'chart-1': '#0a94c2',
  'chart-2': '#24a887',
  'chart-3': '#bd830f',
  'chart-4': '#a63adc',
  'chart-5': '#d81f5d',
};

export const forest: ThemeColors = {
  background: '#f3f6f5', // 150 15% 96%
  surface: '#ffffff',
  'surface-raised': '#ebefed', // 150 12% 93%, source `muted`
  foreground: '#222a26', // 150 10% 15%
  'foreground-muted': '#333e39',
  'foreground-subtle': '#43524b',
  border: '#dce5e0',
  'border-strong': '#748d81',
  accent: '#1a5a3a',
  'accent-strong': '#13422b',
  'accent-foreground': '#ffffff',
  'accent-soft': '#e8fcf2',
  'accent-on-soft': '#1a5a3a',
  success: '#165a38',
  'success-foreground': '#ffffff',
  'success-soft': '#e8fcf2',
  'success-on-soft': '#165a38',
  warning: '#6b4803', // the source amber accent
  'warning-foreground': '#ffffff',
  'warning-soft': '#fcf6e8',
  'warning-on-soft': '#6b4803',
  danger: '#9b1616',
  'danger-foreground': '#ffffff',
  'danger-soft': '#fce8e8',
  'danger-on-soft': '#9b1616',
  'danger-strong': '#801212',
  info: '#0d5477',
  'info-foreground': '#ffffff',
  'info-soft': '#e8f6fc',
  'info-on-soft': '#0d5477',
  'focus-ring': '#1a5a3a',
  'overlay-scrim': '#14201a80',
  'chart-1': '#2d9a63',
  'chart-2': '#b47d0f',
  'chart-3': '#2390c6',
  'chart-4': '#ad5cd6',
  'chart-5': '#db5783',
};
