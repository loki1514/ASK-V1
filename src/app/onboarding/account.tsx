import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { tokens } from "@/theme/tokens";

export default function Account() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Make ASK yours.</Text>
      <Text style={styles.subtitle}>Your memory starts here.</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        placeholder="Your name"
        placeholderTextColor={tokens.colors.textMuted}
        value={name}
        onChangeText={setName}
        style={styles.input}
        accessibilityLabel="Your name"
      />
      <Text style={styles.label}>Email</Text>
      <TextInput
        placeholder="you@example.com"
        placeholderTextColor={tokens.colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        accessibilityLabel="Email"
      />

      <TouchableOpacity
        onPress={() => router.push("/onboarding/team")}
        disabled={!name.trim() || !email.trim()}
        accessibilityRole="button"
        accessibilityLabel="Continue"
        style={[styles.cta, (!name.trim() || !email.trim()) && styles.ctaDisabled]}
      >
        <Text style={styles.ctaText}>Continue</Text>
      </TouchableOpacity>
      <Text style={styles.step}>Step 2 of 5</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.xl, paddingBottom: 32, maxWidth: 560, width: "100%", alignSelf: "center" },
  back: { alignSelf: "flex-start", paddingVertical: tokens.spacing.xs, marginBottom: tokens.spacing.lg },
  backText: { fontSize: 32, color: tokens.colors.textPrimary, fontWeight: "400" },
  title: { fontSize: 34, fontWeight: "600", color: tokens.colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs, marginBottom: tokens.spacing.xl },
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
  cta: { marginTop: tokens.spacing.xl, borderRadius: tokens.radii.primaryButton, backgroundColor: tokens.colors.accent, minHeight: 54, alignItems: "center", justifyContent: "center" },
  ctaDisabled: { backgroundColor: tokens.colors.surfaceRaised },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  step: { fontSize: 12, color: tokens.colors.textMuted, textAlign: "center", marginTop: tokens.spacing.lg },
});
