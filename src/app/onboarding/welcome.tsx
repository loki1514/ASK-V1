import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { tokens } from "@/theme/tokens";

export default function Welcome() {
  const router = useRouter();
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.center}>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
        <Text style={styles.title}>Your conversations,{'\n'}understood.</Text>
        <Text style={styles.subtitle}>
          A private intelligence layer for everything you hear.
        </Text>

        <TouchableOpacity onPress={() => router.push("/onboarding/account")} accessibilityRole="button" accessibilityLabel="Continue with Apple" style={styles.socialBtn}>
          <Text style={styles.socialText}>Continue with Apple</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/onboarding/account")} accessibilityRole="button" accessibilityLabel="Continue with Google" style={[styles.socialBtn, styles.socialBtnOutline]}>
          <Text style={styles.socialOutlineText}>Continue with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/onboarding/account")} accessibilityRole="button" accessibilityLabel="Sign in another way" style={styles.link}>
          <Text style={styles.linkText}>Sign in another way</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.step}>Step 1 of 5</Text>
    </ScrollView>
  );
}

export const onboardingShell = {
  back: "‹",
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { flex: 1, paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.xl, paddingBottom: 32, maxWidth: 560, width: "100%", alignSelf: "center" },
  center: { flex: 1, justifyContent: "center" },
  wordmark: { fontSize: 26, fontWeight: "700", color: tokens.colors.textPrimary, marginBottom: tokens.spacing.xl },
  mark: { color: tokens.colors.accent, fontWeight: "700" },
  title: { fontSize: 34, fontWeight: "600", color: tokens.colors.textPrimary, letterSpacing: -0.5, lineHeight: 42 },
  subtitle: { fontSize: 16, color: tokens.colors.textSecondary, lineHeight: 24, marginTop: tokens.spacing.md, marginBottom: tokens.spacing.xl },
  socialBtn: { borderRadius: tokens.radii.primaryButton, backgroundColor: tokens.colors.surfaceRaised, minHeight: 52, alignItems: "center", justifyContent: "center", marginBottom: tokens.spacing.sm },
  socialBtnOutline: { backgroundColor: "transparent", borderWidth: 1, borderColor: tokens.colors.border },
  socialText: { fontSize: 16, color: tokens.colors.textPrimary, fontWeight: "600" },
  socialOutlineText: { fontSize: 16, color: tokens.colors.textSecondary, fontWeight: "600" },
  link: { alignSelf: "center", marginTop: tokens.spacing.md, paddingVertical: tokens.spacing.xs },
  linkText: { fontSize: 14, color: tokens.colors.textMuted },
  step: { fontSize: 12, color: tokens.colors.textMuted, textAlign: "center" },
});
