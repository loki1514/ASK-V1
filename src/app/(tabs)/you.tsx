import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { VoiceIdentityPanel } from "@/features/voice/VoiceIdentityPanel";
import { ScreenSection, Row } from "@/components/primitives";
import { tokens } from "@/theme/tokens";

export default function You() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>
      <Text style={styles.title}>You</Text>
      <Text style={styles.subtitle}>Identity, device, and privacy under your control.</Text>

      {/* Voice identity */}
      <ScreenSection>Voice</ScreenSection>
      <VoiceIdentityPanel />

      {/* Device */}
      <ScreenSection>Device</ScreenSection>
      <Row label="ASK devices" second="Pairing arrives in a later phase" value="Soon" onPress={() => router.push("/device-settings")} />
      <Row label="Local processing" second="Required for voice templates" value="On" />

      {/* Memory */}
      <ScreenSection>Storage</ScreenSection>
      <View style={styles.storageBlock}>
        <Text style={styles.storageValue}>12.4 GB</Text>
        <Text style={styles.storageMeta}>8.7 GB conversations · 3.7 GB system and memory</Text>
        <Row label="Offload old conversations" second="Older audio moves to secure archive. Memories stay available." onPress={() => router.push("/your-data")} />
      </View>

      {/* Agents: invisible workers, under You (not a tab) */}
      <ScreenSection>Agents</ScreenSection>
      <Row label="Workers and permissions" second="The people who turn memory into follow-ups" onPress={() => router.push("/agents-settings")} />

      {/* Preferences */}
      <ScreenSection>Preferences</ScreenSection>
      <Row label="Team" second="Operations · Bangalore" onPress={() => router.push("/team")} />
      <Row label="Proactivity" second="Helpful" />
      <Row label="Export data" onPress={() => router.push("/your-data")} />
      <Row label="Delete all data" destructive onPress={() => router.push("/your-data")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.xl, paddingBottom: 96, maxWidth: 640, width: "100%", alignSelf: "center" },
  header: { marginBottom: tokens.spacing.lg },
  wordmark: { fontSize: 24, fontWeight: "700", color: tokens.colors.textPrimary },
  mark: { color: tokens.colors.accent, fontWeight: "700" },
  title: { fontSize: 34, fontWeight: "600", color: tokens.colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs },
  storageBlock: {},
  storageValue: { fontSize: 28, fontWeight: "500", color: tokens.colors.textPrimary, marginBottom: 2 },
  storageMeta: { fontSize: 13, color: tokens.colors.textSecondary, marginBottom: tokens.spacing.sm },
});
