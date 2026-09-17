import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors, fonts, letterSpacing, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";

// The formalized kicker + title + one-line description pattern used on every section.
export function SectionHeader({ kicker, title, description, accent }: { kicker: string; title: string; description?: string; accent?: string }) {
  const t = useThemeTokens();
  const accentColor = accent ?? t.accent;
  return (
    <View style={styles.wrap}>
      {kicker ? <Text style={[styles.kicker, { color: accentColor, fontFamily: fonts.bold }]}>{kicker}</Text> : null}
      <Text style={[styles.title, { color: t.textPrimary, fontFamily: fonts.bold }]}>{title}</Text>
      {description ? <Text style={[styles.description, { color: t.textMuted, fontFamily: fonts.regular }]}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg, flex: 1, flexShrink: 1 },
  kicker: {
    fontSize: 11,
    letterSpacing: letterSpacing.kicker,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 30,
    letterSpacing: letterSpacing.tight,
  },
  description: {
    marginTop: spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 480,
  },
});
