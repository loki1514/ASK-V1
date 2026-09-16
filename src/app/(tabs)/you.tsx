import React from "react";
import { ScrollView, StyleSheet, View, Pressable, useWindowDimensions } from "react-native";
import { Card, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VoiceIdentityPanel } from "@/features/voice/VoiceIdentityPanel";
import { AppIcon, IconName } from "@/components/AppIcon";
import { SectionHeader } from "@/components/SectionHeader";
import { fonts, letterSpacing, radii, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";
import { useTheme } from "@/lib/themeContext";

const deviceRows: { icon: IconName; title: string; description: string; trailing: "SOON" | "ON" | null }[] = [
  { icon: "smartphone", title: "ASK devices", description: "Pairing arrives in a later phase", trailing: "SOON" },
  { icon: "shieldCheck", title: "Local processing", description: "Required for voice templates", trailing: "ON" },
  { icon: "lock", title: "Privacy controls", description: "Export and delete inside Voice Identity", trailing: null },
];

export default function You() {
  const t = useThemeTokens();
  const { mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.surfaceRaised }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg + 8, maxWidth: Math.min(width - 2 * spacing.lg, 760 - (width >= 1024 ? 240 : 0)) }]}
    >
      <View style={styles.column}>
        <View style={styles.headerRow}>
          <SectionHeader
            kicker="Private identity"
            title="You"
            description="Your identity, your devices, your data. All under your control."
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mode === "light" ? "Switch to dark theme" : "Switch to light theme"}
            onPress={() => setMode(mode === "light" ? "dark" : "light")}
            style={[styles.themeChip, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}
          >
            <AppIcon name={mode === "light" ? "camera" : "sparkles"} size="inline" color={t.textMuted} />
            <Text style={[styles.themeChipText, { color: t.textMuted, fontFamily: fonts.medium }]}>{mode === "light" ? "Dark" : "Light"}</Text>
          </Pressable>
        </View>

        <VoiceIdentityPanel />

        <Text style={[styles.sectionLabel, { color: t.textMuted, fontFamily: fonts.bold }]}>Device and privacy</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
          {deviceRows.map((row, index) => (
            <Pressable key={row.title} style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.borderSubtle }]} accessibilityRole="button" accessibilityLabel={row.title}>
              <View style={[styles.rowIcon, { backgroundColor: t.surfaceSubtle }]}>
                <AppIcon name={row.icon} size={18} color={t.textMuted} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: t.textPrimary, fontFamily: fonts.medium }]}>{row.title}</Text>
                <Text style={[styles.rowDescription, { color: t.textMuted, fontFamily: fonts.regular }]}>{row.description}</Text>
              </View>
              {row.trailing === "SOON" ? (
                <View style={[styles.chip, { backgroundColor: t.surfaceSubtle }]}>
                  <Text style={[styles.chipText, { color: t.textMuted, fontFamily: fonts.bold }]}>SOON</Text>
                </View>
              ) : row.trailing === "ON" ? (
                <View style={styles.onChip}>
                  <View style={[styles.onDot, { backgroundColor: t.success }]} />
                  <Text style={[styles.onText, { color: t.success, fontFamily: fonts.bold }]}>ON</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  column: { width: "100%", maxWidth: 760, alignSelf: "center" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  themeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, marginTop: 4 },
  themeChipText: { fontSize: 12 },
  sectionLabel: { fontSize: 11, letterSpacing: letterSpacing.kicker, textTransform: "uppercase", marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: spacing.sm },
  rowIcon: { width: 38, height: 38, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 15 },
  rowDescription: { fontSize: 13, marginTop: 2 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.pill },
  chipText: { fontSize: 10, letterSpacing: 0.8 },
  onChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  onDot: { width: 7, height: 7, borderRadius: 4 },
  onText: { fontSize: 10, letterSpacing: 0.8 },
});
