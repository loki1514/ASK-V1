import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Row, ScreenSection } from "@/components/primitives";
import { tokens } from "@/theme/tokens";

export default function Team() {
  const router = useRouter();
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>
      <Text style={styles.title}>Team</Text>
      <Text style={styles.subtitle}>Operations · Bangalore</Text>

      <ScreenSection>Members</ScreenSection>
      <Row label="Raj" second="Consultant" value="17 convos" />
      <Row label="Manoj" second="HVAC contractor" value="17 convos" />
      <Row label="Nandu" second="Team" value="11 convos" />
      <Row label="Unknown" second="Not yet recognized" value="6 convos" />

      <ScreenSection>Team</ScreenSection>
      <Row label="Team name" value="Operations" />
      <Row label="Invite members" value="Soon" />
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
});
