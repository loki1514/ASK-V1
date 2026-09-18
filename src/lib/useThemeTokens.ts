import { colors, themes } from "@/theme/tokens";

// Dark-only: the frozen spec has no light theme. Returns the one palette.
export function useThemeTokens() {
  return themes.dark;
}
