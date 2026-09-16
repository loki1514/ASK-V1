import React from "react";
import { Stack } from "expo-router";
import { MD3LightTheme, MD3DarkTheme, PaperProvider } from "react-native-paper";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { ThemeContext, ThemeName } from "@/lib/themeContext";
import { themes } from "@/theme/tokens";

function paperTheme(mode: ThemeName) {
  const t = themes[mode];
  const base = mode === "dark" ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    roundness: 3,
    colors: {
      ...base.colors,
      primary: t.accent,
      secondary: t.success,
      background: t.surfaceRaised,
      surface: t.surface,
      surfaceVariant: t.surfaceSubtle,
      onSurface: t.textPrimary,
      onSurfaceVariant: t.textMuted,
      outline: t.borderSubtle,
      error: t.danger,
      accent: t.success,
    },
  };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const [mode, setMode] = React.useState<ThemeName>("light");

  if (!fontsLoaded) return null; // keep a blank shell until fonts are ready (avoids FOUT)

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <PaperProvider theme={paperTheme(mode)}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </ThemeContext.Provider>
  );
}
