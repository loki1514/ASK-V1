import React from "react";
import { ThemeContext } from "@/lib/themeContext";
import { SemanticTokens, themes } from "@/theme/tokens";

// Live theme tokens for components that need dynamic colors. StyleSheet layout
// stays static; theme-dependent values are applied inline via t.*.
export function useThemeTokens(): SemanticTokens {
  const { mode } = React.useContext(ThemeContext);
  return themes[mode];
}
