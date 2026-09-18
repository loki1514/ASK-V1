import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Row, ScreenSection } from "@/components/primitives";
import { tokens } from "@/theme/tokens";

const workers = [
  { name: "Project Coordinator", role: "Keeps projects moving", on: true },
  { name: "Design Lead", role: "Turns decisions into drawings", on: true },
  { name: "Procurement", role: "Tracks orders and delivery", on: true },
  { name: "Follow-up", role: "Reminds you what you promised", on: true },
];

export default function AgentsSettings() {
  const router = useRouter();
  const [state, setState] = React.useState<Record<string, boolean>>(() => Object.fromEntries(workers.map((w) => [w.name, w.on])));

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>
      <Text style={styles.title}>Workers</Text>
      <Text style={styles.subtitle}>The people who turn memory into follow-ups.</Text>

      {workers.map((w) => (
        <View key={w.name} style={styles.rowWrap}>
          <Row label={w.name} second={w.role} value={state[w.name] ? "On" : "Off"} onPress={() => setState((s) => ({ ...s, [w.name]: !s[w.name] }))} />
        </View>
      ))}

      <Text style={styles.note}>Workers only see what you allow. Nothing leaves this device.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.xl, paddingBottom: 64, maxWidth: 640, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg },
  back: { paddingVertical: tokens.spacing.xs, paddingRight: tokens.spacing.xs },
  backText: { fontSize: 28, color: tokens.colors.textPrimary, fontWeight: "400" },
  wordmark: { fontSize: 22, fontWeight: "700", color: tokens.colors.textPrimary },
  mark: { color: tokens.colors.accent, fontWeight: "700" },
  title: { fontSize: 34, fontWeight: "600", color: tokens.colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs },
  rowWrap: {},
  note: { fontSize: 13, color: tokens.colors.textMuted, lineHeight: 18, marginTop: tokens.spacing.lg },
});
