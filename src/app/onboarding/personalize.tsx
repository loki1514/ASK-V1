import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { tokens } from "@/theme/tokens";

const focuses = ["Projects", "People", "Decisions", "Follow-ups", "Meetings", "Sales", "Operations", "Personal"];
const proactivity = ["Quiet", "Helpful", "Proactive"];

export default function Personalize() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(["Projects", "Decisions"]));
  const [level, setLevel] = useState("Helpful");

  const toggle = (f: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Teach ASK what matters.</Text>
      <Text style={styles.subtitle}>Choose what to focus on.</Text>

      <Text style={styles.label}>Focus</Text>
      <View style={styles.chipWrap}>
        {focuses.map((f) => {
          const on = selected.has(f);
          return (
            <TouchableOpacity key={f} onPress={() => toggle(f)} accessibilityRole="button" accessibilityLabel={f} style={[styles.chip, on && styles.chipActive]}>
              <Text style={[styles.chipText, on && { color: tokens.colors.accent }]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>How proactive should ASK be?</Text>
      {proactivity.map((p) => (
        <TouchableOpacity key={p} onPress={() => setLevel(p)} accessibilityRole="button" accessibilityLabel={p} style={[styles.kindRow, level === p && styles.kindRowActive]}>
          <Text style={[styles.kindText, level === p && { color: tokens.colors.accent }]}>{p}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={() => router.push("/onboarding/voice")} accessibilityRole="button" accessibilityLabel="Continue" style={styles.cta}>
        <Text style={styles.ctaText}>Continue</Text>
      </TouchableOpacity>
      <Text style={styles.step}>Step 4 of 5</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.xl, paddingBottom: 32, maxWidth: 560, width: "100%", alignSelf: "center" },
  back: { alignSelf: "flex-start", paddingVertical: tokens.spacing.xs, marginBottom: tokens.spacing.lg },
  backText: { fontSize: 32, color: tokens.colors.textPrimary, fontWeight: "400" },
  title: { fontSize: 34, fontWeight: "600", color: tokens.colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs, marginBottom: tokens.spacing.lg },
  label: { fontSize: 13, color: tokens.colors.textMuted, marginBottom: tokens.spacing.sm, marginTop: tokens.spacing.lg },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.xs },
  chip: { paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.sm, borderRadius: tokens.radii.chip, borderWidth: 1, borderColor: tokens.colors.border },
  chipActive: { borderColor: tokens.colors.accent },
  chipText: { fontSize: 14, color: tokens.colors.textSecondary, fontWeight: "500" },
  kindRow: { paddingVertical: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  kindRowActive: { backgroundColor: "rgba(91,46,255,0.06)" },
  kindText: { fontSize: 16, color: tokens.colors.textSecondary, fontWeight: "500" },
  cta: { marginTop: tokens.spacing.xl, borderRadius: tokens.radii.primaryButton, backgroundColor: tokens.colors.accent, minHeight: 54, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  step: { fontSize: 12, color: tokens.colors.textMuted, textAlign: "center", marginTop: tokens.spacing.lg },
});
