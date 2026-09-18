import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { tokens } from "@/theme/tokens";

export default function Voice() {
  const router = useRouter();
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Let ASK know your voice.</Text>
      <Text style={styles.subtitle}>Your voice profile helps ASK recognize who is speaking.</Text>

      <View style={styles.markBlock}>
        <Text style={styles.mark}>))</Text>
      </View>

      <TouchableOpacity onPress={() => router.replace("/home")} accessibilityRole="button" accessibilityLabel="Calibrate my voice" style={styles.cta}>
        <Text style={styles.ctaText}>Calibrate my voice</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace("/home")} accessibilityRole="button" accessibilityLabel="Set up device later" style={styles.link}>
        <Text style={styles.linkText}>Set up device later</Text>
      </TouchableOpacity>
      <Text style={styles.step}>Step 5 of 5</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { flex: 1, paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.xl, paddingBottom: 32, maxWidth: 560, width: "100%", alignSelf: "center" },
  back: { alignSelf: "flex-start", paddingVertical: tokens.spacing.xs, marginBottom: tokens.spacing.lg },
  backText: { fontSize: 32, color: tokens.colors.textPrimary, fontWeight: "400" },
  title: { fontSize: 34, fontWeight: "600", color: tokens.colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs, marginBottom: tokens.spacing.xl },
  markBlock: { alignItems: "center", paddingVertical: tokens.spacing.xxl },
  mark: { color: tokens.colors.accent, fontSize: 48, fontWeight: "700" },
  cta: { borderRadius: tokens.radii.primaryButton, backgroundColor: tokens.colors.accent, minHeight: 54, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  link: { alignSelf: "center", marginTop: tokens.spacing.md, paddingVertical: tokens.spacing.xs },
  linkText: { fontSize: 14, color: tokens.colors.textMuted },
  step: { fontSize: 12, color: tokens.colors.textMuted, textAlign: "center", marginTop: tokens.spacing.lg },
});
