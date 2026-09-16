// ASK design tokens: the single source of truth for color, type, spacing, radius, elevation, shadow, motion.
// Nothing below should be duplicated in component styles. Components import tokens, never raw hexes.
import { StyleSheet } from "react-native";

// ---------------------------------------------------------------------------
// Color: ramps
// ---------------------------------------------------------------------------

export const violet = {
  50: "#F4F1FF",
  100: "#EAE5FF",
  200: "#D6CCFF",
  300: "#B8A9FF",
  400: "#9C85FF",
  500: "#7C5CFF",
  600: "#5B3DF5", // anchor
  700: "#4328D7",
  800: "#3420A8",
  900: "#241672",
} as const;

export const neutral = {
  0: "#FFFFFF",
  50: "#FAFAFC",
  100: "#F4F4F8",
  150: "#EDEDF3",
  200: "#E4E3EC",
  300: "#D8D6E2",
  400: "#B4B1C0",
  500: "#918E9E",
  600: "#6F6B78",
  700: "#4A4653",
  800: "#2A2731",
  850: "#221F28",
  900: "#17151F", // ink
  950: "#0E0C14",
} as const;

// ---------------------------------------------------------------------------
// Semantic surface tokens: resolved per theme ("light" | "dark")
// ---------------------------------------------------------------------------

export type ThemeName = "light" | "dark";

export interface SemanticTokens {
  name: ThemeName;
  // Surfaces
  surface: string;
  surfaceRaised: string;
  surfaceSubtle: string; // soft tinted wells (voice, preview)
  surfaceInverse: string; // the "machine" dark instrument card
  // Text
  textPrimary: string;
  textMuted: string;
  textInverse: string;
  textOnAccent: string;
  // Lines & borders
  borderSubtle: string;
  borderStrong: string;
  // Accent (the one reserved violet)
  accent: string;
  accentPressed: string;
  accentSoft: string;
  accentOnDark: string;
  glow: string;
  focusRing: string;
  // Semantic memory-type mapping (decision / action / commitment / issue)
  decision: string;
  decisionSurface: string;
  action: string;
  actionSurface: string;
  commitment: string;
  commitmentSurface: string;
  issue: string;
  issueSurface: string;
  // Status
  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  danger: string;
  dangerSurface: string;
  // Nav
  navActive: string;
  navInactive: string;
  navBackground: string;
}

export const themes: Record<ThemeName, SemanticTokens> = {
  light: {
    name: "light",
    surface: neutral[0],
    surfaceRaised: neutral[50],
    surfaceSubtle: violet[50],
    surfaceInverse: neutral[900],
    textPrimary: neutral[900],
    textMuted: neutral[600],
    textInverse: neutral[50],
    textOnAccent: neutral[0],
    borderSubtle: neutral[200],
    borderStrong: neutral[300],
    accent: violet[600],
    accentPressed: violet[700],
    accentSoft: violet[100],
    accentOnDark: violet[300],
    glow: "rgba(124, 92, 255, 0.28)",
    focusRing: violet[500],
    decision: violet[700],
    decisionSurface: violet[50],
    action: "#1B6E9A",
    actionSurface: "#EDF6FB",
    commitment: "#8A5A00",
    commitmentSurface: "#FFF6E3",
    issue: "#A33A2E",
    issueSurface: "#FBEEEC",
    success: "#1F7A6D",
    successSurface: "#E6F5F2",
    warning: "#945600",
    warningSurface: "#FFF3D8",
    danger: "#B42318",
    dangerSurface: "#FDECEA",
    navActive: violet[600],
    navInactive: neutral[500],
    navBackground: neutral[0],
  },
  dark: {
    name: "dark",
    surface: neutral[900],
    surfaceRaised: neutral[850],
    surfaceSubtle: "#2B2640",
    surfaceInverse: neutral[950],
    textPrimary: neutral[50],
    textMuted: neutral[400],
    textInverse: neutral[900],
    textOnAccent: neutral[0],
    borderSubtle: neutral[800],
    borderStrong: neutral[700],
    accent: violet[400],
    accentPressed: violet[300],
    accentSoft: violet[800],
    accentOnDark: violet[300],
    glow: "rgba(124, 92, 255, 0.42)",
    focusRing: violet[300],
    decision: violet[300],
    decisionSurface: "#2B2650",
    action: "#6FC4EF",
    actionSurface: "#123144",
    commitment: "#F0C674",
    commitmentSurface: "#3A2F14",
    issue: "#F3A399",
    issueSurface: "#45221E",
    success: "#7FDBD0",
    successSurface: "#14332E",
    warning: "#F0B86B",
    warningSurface: "#40301A",
    danger: "#F3A399",
    dangerSurface: "#45221E",
    navActive: violet[400],
    navInactive: neutral[500],
    navBackground: neutral[900],
  },
};

export const colors = themes.light;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const typeScale = {
  micro: 11,
  caption: 12,
  body: 14,
  bodyLarge: 16,
  title: 20,
  heading: 28,
  display: 40,
  displayLarge: 56,
} as const;

export const fonts = {
  display: "SpaceGrotesk_700Bold",
  displayMedium: "SpaceGrotesk_500Medium",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const letterSpacing = {
  tight: -0.02,
  display: -0.035,
  wide: 0.02,
  kicker: 0.18,
} as const;

export const lineHeights = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
} as const;

// ---------------------------------------------------------------------------
// Spacing (8px grid)
// ---------------------------------------------------------------------------

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// ---------------------------------------------------------------------------
// Radius scale: 8 / 12 / 16 / 24
// ---------------------------------------------------------------------------

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

// ---------------------------------------------------------------------------
// Elevation: hairline border + barely-there shadow (premium = subtle)
// ---------------------------------------------------------------------------

export const elevation = {
  flat: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    shadowColor: neutral[900],
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  raised: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    shadowColor: neutral[900],
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;

// ---------------------------------------------------------------------------
// Motion (calm, physically-weighted)
// ---------------------------------------------------------------------------

export const motion = {
  instant: 90,
  fast: 140,
  standard: 220,
  emphasis: 320,
  screenEnter: 360,
  ambientLoop: 2800,
} as const;

export const springs = {
  default: { mass: 0.6, damping: 20, stiffness: 260 },
  gentle: { mass: 0.8, damping: 24, stiffness: 180 },
  weighty: { mass: 0.9, damping: 14, stiffness: 200 }, // toggles: slight overshoot
} as const;

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

export const nav = {
  tabHeight: 68,
  iconSize: 20,
  label: 11,
  desktopRailWidth: 240,
} as const;

// ---------------------------------------------------------------------------
// Icon style: one stroke weight everywhere
// ---------------------------------------------------------------------------

export const icon = {
  strokeWidth: 1.75,
  sizes: {
    nav: 20,
    inline: 16,
    card: 20,
    button: 18,
    large: 24,
  },
} as const;

// Keep old aliases so existing imports migrate without churn.
export const oldColors = {
  background: themes.light.surface,
  surface: themes.light.surfaceRaised,
  voiceSurface: themes.light.surfaceSubtle,
  line: themes.light.borderSubtle,
  text: themes.light.textPrimary,
  muted: themes.light.textMuted,
  primary: themes.light.accent,
  primaryPressed: themes.light.accentPressed,
  accent: themes.light.success,
  successSurface: themes.light.successSurface,
  warning: themes.light.warning,
  warningSurface: themes.light.warningSurface,
  danger: themes.light.danger,
  dangerSurface: themes.light.dangerSurface,
} as const;
