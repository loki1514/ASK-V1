import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// ---------------------------------------------------------------------------
// ASK design tokens — single source of truth. Frozen per the UI prompt pack.
// Dark only. No light theme. No raw hex outside this file.
// ---------------------------------------------------------------------------

export const colors = {
  bg: "#080808",
  surface: "#111113",
  surfaceRaised: "#18181B",
  border: "#27272A",
  textPrimary: "#F5F5F5",
  textSecondary: "#A1A1AA",
  textMuted: "#71717A",
  accent: "#5B2EFF",
  accentGlow: "rgba(91,46,255,0.28)",
  success: "#35D07F",
  warning: "#FFB547",
  error: "#FF5C5C",
  // Aliases so existing components keep compiling: legacy names -> dark values.
  background: "#080808",
  line: "#27272A",
  borderSubtle: "#27272A",
  borderStrong: "#27272A",
  surfaceSubtle: "#18181B",
  surfaceInverse: "#080808",
  textPrimaryAlias: "#F5F5F5",
  textMutedAlias: "#71717A",
  textSecondaryAlias: "#A1A1AA",
  accentOnDark: "#5B2EFF",
  accentPressed: "#5B2EFF",
  accentSoft: "#18181B",
  decision: "#5B2EFF",
  decisionSurface: "#18181B",
  action: "#35D07F",
  actionSurface: "#111113",
  commitment: "#FFB547",
  commitmentSurface: "#111113",
  issue: "#FF5C5C",
  issueSurface: "#111113",
  successSurface: "rgba(53,208,127,0.12)",
  warningSurface: "rgba(255,181,71,0.12)",
  danger: "#FF5C5C",
  dangerSurface: "rgba(255,92,92,0.12)",
  vet: "#35D07F",
  glow: "rgba(91,46,255,0.28)",
  focusRing: "#5B2EFF",
  navActive: "#5B2EFF",
  navInactive: "#71717A",
  navBackground: "#080808",
  voiceSurface: "#111113",
  text: "#F5F5F5",
  muted: "#71717A",
  primary: "#5B2EFF",
  primaryPressed: "#5B2EFF",
  accentOld: "#5B2EFF",
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 56,
} as const;

export const radii = {
  row: 12,
  card: 16,
  primaryButton: 28,
  chip: 999,
  action: 28,
  sm: 12,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typeScale = {
  screenTitle: 34,
  sectionTitle: 20,
  metric: 28,
  body: 16,
  rowSecond: 14,
  caption: 13,
  label: 12,
} as const;

// Font aliases kept so existing components using fonts.* compile; the app uses
// the system font (SF Pro / default) per the frozen spec, so these all resolve
// to the system stack.
export const fonts = {
  display: undefined,
  displayMedium: undefined,
  regular: undefined,
  medium: undefined,
  semibold: undefined,
  bold: undefined,
} as const;

export const letterSpacing = {
  tight: -0.02,
  display: -0.035,
  wide: 0.02,
  kicker: 0.06,
} as const;

export const lineHeights = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
} as const;

export const motion = {
  fast: 180,
  standard: 250,
  emphasis: 350,
  ambientLoop: 1800,
  instant: 90,
  screenEnter: 320,
} as const;

export const springs = {
  default: { mass: 0.6, damping: 20, stiffness: 260 },
  gentle: { mass: 0.8, damping: 24, stiffness: 180 },
  weighty: { mass: 0.9, damping: 14, stiffness: 200 },
} as const;

// Elevation is always a hairline border, never a shadow.
export const elevation = {
  hairline: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  flat: {
    borderWidth: 1,
    borderColor: colors.border,
  },
} as const;

export const nav = {
  tabCount: 4,
  tabHeight: 56,
} as const;

export const icon = {
  strokeWidth: 1.75,
  sizes: {
    nav: 20,
    card: 24,
    button: 18,
    inline: 16,
    large: 24,
  },
} as const;

export const tokens = {
  colors,
  spacing,
  radii,
  typeScale,
  fonts,
  motion,
  elevation,
  nav,
  icon,
} as const;

// Reduce-motion hook: loops stop, springs still settle.
export function useAccessibilityReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

// Legacy aliases so existing imports survive the retune (kept names only).
export const oldColors = {
  background: colors.bg,
  surface: colors.surface,
  surfaceRaised: colors.surfaceRaised,
  line: colors.border,
  text: colors.textPrimary,
  muted: colors.textMuted,
  primary: colors.accent,
  primaryPressed: colors.accent,
  accent: colors.accent,
  successSurface: "rgba(53,208,127,0.12)",
  warningSurface: "rgba(255,181,71,0.12)",
  danger: colors.error,
  dangerSurface: "rgba(255,92,92,0.12)",
  voiceSurface: colors.surface,
} as const;

export const themes = { light: colors, dark: colors } as const;
export const electric = true; // placeholder to satisfy any stray import
