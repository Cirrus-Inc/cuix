// The hive family (hive-day / hive-night), taken from the HIVE v6 mockup palette
// (Cirrus-Inc/hive docs/mockup/css/hive.css and cirrus.css) to the same AAA
// gate as every other theme. Mockup values are used as-is where they pass;
// a value that fails moves to the nearest passing colour (same OKLCH hue,
// smallest OKLab ΔE), and docs/tokens.md lists every move.
//
// Palette: paper #f7f7f2 · ink #172f37 · ink-deep #10272e · coral #f5a18b ·
// coral-dark #d7755c · rust #a13624 · muted #52646a · line #dce2dc ·
// hover #edf1e8 · selected #edf4eb · mint #d7e8d5.
//
// hive-day's accent is ink, not coral: coral is 1.9:1 on paper and `accent` is
// also link and selected-state text. Taken to 7:1 at its own hue it lands on
// brick (#903016), ΔE 1 from danger. The mockup already draws every selected,
// pressed, checked and focus state in ink, and has an ink button (`button-dark`).
// hive-night has no mockup source; it keeps ink-deep surfaces, paper text and
// a coral accent, and borrows the footer's on-dark colours.

import type { ThemeColors } from '../vocabulary.ts';

export const hiveDay: ThemeColors = {
  background: '#f7f7f2', // paper
  surface: '#ffffff', // pane
  'surface-raised': '#edf1e8', // hover. The 7:1 floor.
  foreground: '#172f37', // ink
  'foreground-muted': '#435359', // muted #52646a deepened to 7:1 on hover
  'foreground-subtle': '#435359', // the mockup has one secondary text colour
  border: '#dce2dc', // line, decorative only
  'border-strong': '#888b88', // line deepened to 3:1 on hover
  accent: '#172f37', // ink
  'accent-strong': '#10272e', // ink-deep
  'accent-foreground': '#f7f7f2', // paper, as on aria-pressed
  'accent-soft': '#edf4eb', // selected
  'accent-on-soft': '#172f37',
  success: '#374f39', // checked-choice green #445e46 deepened to 7:1 on hover and mint
  'success-foreground': '#ffffff',
  'success-soft': '#d7e8d5', // mint
  'success-on-soft': '#374f39',
  warning: '#803e02', // no mockup source: cuix day #813e00, 6.99 on hover, nudged
  'warning-foreground': '#ffffff',
  'warning-soft': '#fdf1e6',
  'warning-on-soft': '#803e02',
  danger: '#942b19', // rust #a13624 deepened to 7:1 under white and on hover
  'danger-foreground': '#ffffff',
  'danger-soft': '#fff2ee', // form error tint
  'danger-on-soft': '#832a1d', // form error text
  'danger-strong': '#832a1d',
  info: '#172f37',
  'info-foreground': '#f7f7f2',
  'info-soft': '#edf4eb',
  'info-on-soft': '#172f37',
  'focus-ring': '#172f37', // the mockup's 2px ink outline
  'overlay-scrim': '#10272e80',
  // coral first, then cuix day's blue, violet, green, magenta (its orange sits on coral).
  'chart-1': '#d26e55', // coral-dark #d7755c deepened to 3:1 on hover
  'chart-2': '#0079a8',
  'chart-3': '#6b4de6',
  'chart-4': '#127c0a',
  'chart-5': '#b0306a',
};

export const hiveNight: ThemeColors = {
  background: '#10272e', // ink-deep
  surface: '#172f37', // ink
  'surface-raised': '#1f373f', // one more ink-deep → ink step. The 7:1 floor.
  foreground: '#f7f7f2', // paper
  'foreground-muted': '#d7e1dc', // footer text
  'foreground-subtle': '#b9cbc4', // footer links
  border: '#2a3f45', // footer rule #ffffff1c on ink-deep, flattened
  'border-strong': '#6f8480', // mobile-nav edge on ink-deep
  accent: '#fcaf9a', // coral #f5a18b lifted to 7:1 on ink and the raised step
  'accent-strong': '#ffc1b0', // one step lighter, like the mockup's coral hover
  'accent-foreground': '#10272e',
  // Dark tints sit at or below the raised step (the 7:1 floor), so they carry
  // hue, not lightness: sage for selected (as hive-day), green, amber, red.
  'accent-soft': '#18362f', // the mockup's selected sage, dark
  'accent-on-soft': '#fcaf9a',
  success: '#afc9ab', // map edge #a9c2a5 lifted to 7:1
  'success-foreground': '#10272e',
  'success-soft': '#183723',
  'success-on-soft': '#afc9ab',
  warning: '#fdb266', // cuix night #f6a95a lifted to 7:1
  'warning-foreground': '#10272e',
  'warning-soft': '#3a2d18',
  'warning-on-soft': '#fdb266',
  // Rust at 7:1 on ink is salmon, within ΔE 1 of the accent: at this lightness
  // no red separates from coral. The icon or word that every status carries does.
  danger: '#fbafa0',
  'danger-foreground': '#10272e',
  'danger-soft': '#3d201c', // red, not coral: the tint is what separates it from accent
  'danger-on-soft': '#fbafa0',
  'danger-strong': '#ffc1b4',
  info: '#fcaf9a',
  'info-foreground': '#10272e',
  'info-soft': '#18362f',
  'info-on-soft': '#fcaf9a',
  'focus-ring': '#fcaf9a', // the mockup's on-dark focus is coral
  'overlay-scrim': '#000000a3',
  'chart-1': '#d7755c', // coral-dark, as-is
  'chart-2': '#00a0b0',
  'chart-3': '#8878e0',
  'chart-4': '#38a456',
  'chart-5': '#cf6396',
};
