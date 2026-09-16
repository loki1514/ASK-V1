import React from "react";

export type ThemeName = "light" | "dark";

export const ThemeContext = React.createContext<{ mode: ThemeName; setMode: (m: ThemeName) => void }>({
  mode: "light",
  setMode: () => {},
});

export function useTheme() {
  return React.useContext(ThemeContext);
}
