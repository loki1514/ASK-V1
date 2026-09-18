import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { tokens } from "@/theme/tokens";

const teamTypes = ["Operations", "Projects", "Sales", "Founder's Office", "Other"];

export default function Team() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("Operations");
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Who are you working with?</Text>
      <Text style={styles.subtitle}>ASK can understand people, responsibilities and follow-ups.</Text>

      <Text style={styles.label}>Team name</Text>
      <TextInput
        placeholder="e.g. Bangalore Ops"
        placeholderTextColor={tokens.colors.textMuted}
        value={name}
        onChangeText={setName}
        style={styles.input}
        accessibilityLabel="Team name"
      />

      <Text style={styles.label}>What kind</Text>
      {teamTypes.map((t) => (
        <TouchableOpacity key={t} onPress={() => setKind(t)} accessibilityRole="button" accessibilityLabel={t} style={[styles.kindRow, kind === t && styles.kindRowActive]}>
          <Text style={[styles.kindText, kind === t && { color: tokens.colors.accent }]}>{t}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={() => router.push("/onboarding/personalize")} accessibilityRole="button" accessibilityLabel="Create team" style={styles.cta}>
        <Text style={styles.ctaText}>Create team</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/onboarding/personalize")} accessibilityRole="button" accessibilityLabel="Invite later" style={styles.link}>
        <Text style={styles.linkText}>Invite later</Text>
      </TouchableOpacity>
      <Text style={styles.step}>Step 3 of 5</Text>
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
  label: { fontSize: 13, color: tokens.colors.textMuted, marginBottom: tokens.spacing.xs, marginTop: tokens.spacing.md },
  input: {
    borderRadius: tokens.radii.row,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    color: tokens.colors.textPrimary,
    fontSize: 16,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
  },
  kindRow: { paddingVertical: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  kindRowActive: { backgroundColor: "rgba(91,46,255,0.06)" },
  kindText: { fontSize: 16, color: tokens.colors.textSecondary, fontWeight: "500" },
  cta: { marginTop: tokens.spacing.xl, borderRadius: tokens.radii.primaryButton, backgroundColor: tokens.colors.accent, minHeight: 54, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  link: { alignSelf: "center", marginTop: tokens.spacing.md, paddingVertical: tokens.spacing.xs },
  linkText: { fontSize: 14, color: tokens.colors.textMuted },
  step: { fontSize: 12, color: tokens.colors.textMuted, textAlign: "center", marginTop: tokens.spacing.lg },
});
