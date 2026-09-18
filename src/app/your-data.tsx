import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenSection, Row } from "@/components/primitives";
import { tokens } from "@/theme/tokens";

export default function YourData() {
  const router = useRouter();
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>
      <Text style={styles.title}>Your data</Text>
      <Text style={styles.subtitle}>On your device, under your control.</Text>

      <View style={styles.usage}>
        <Text style={styles.usageValue}>12.4 GB</Text>
        <Text style={styles.usageLabel}>used</Text>
      </View>
      <Row label="Conversations" second="8.7 GB" />
      <Row label="System and memory" second="3.7 GB" />

      <ScreenSection>Offload</ScreenSection>
      <Row label="Offload old conversations" second="Move older audio to a secure archive. Your memories and summaries stay available." value="Off" />

      <ScreenSection>Processing</ScreenSection>
      <Row label="Local processing" value="On" />
      <Row label="Cloud processing" value="Off" />

      <ScreenSection>Voice</ScreenSection>
      <Row label="Voice profiles" value="On" />
      <Row label="Conversation audio" value="On" />

      <ScreenSection>Data</ScreenSection>
      <Row label="Export data" onPress={() => {}} />
      <Row label="Delete all data" destructive onPress={() => {}} />
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
  usage: { flexDirection: "row", alignItems: "baseline", gap: tokens.spacing.xs, marginTop: tokens.spacing.lg },
  usageValue: { fontSize: 34, fontWeight: "600", color: tokens.colors.textPrimary },
  usageLabel: { fontSize: 14, color: tokens.colors.textMuted },
});
