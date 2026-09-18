import React from "react";
import { Stack } from "expo-router";
import { MD3DarkTheme, PaperProvider } from "react-native-paper";
import { colors } from "@/theme/tokens";
import { initializeLiveStore } from "@/data/liveMemory";

const theme = {
  ...MD3DarkTheme,
  roundness: 3,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.accent,
    secondary: colors.success,
    background: colors.bg,
    surface: colors.surface,
    surfaceVariant: colors.surfaceRaised,
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    error: colors.error,
    accent: colors.success,
  },
};

export default function RootLayout() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let mounted = true;
    initializeLiveStore().then(() => mounted && setReady(true));
    return () => { mounted = false; };
  }, []);

  if (!ready) return null; // brief hydration gate; avoids flash of empty store

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}
