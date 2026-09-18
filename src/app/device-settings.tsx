import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Row, ScreenSection } from "@/components/primitives";
import { tokens } from "@/theme/tokens";

export default function DeviceSettings() {
  const router = useRouter();
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>
      <Text style={styles.title}>Device</Text>
      <Text style={styles.subtitle}>Your wearable, at a glance.</Text>

      <View style={styles.deviceCard}>
        <Text style={styles.deviceName}>A7F2</Text>
        <Text style={styles.deviceStatus}>94% · listening · in range</Text>
        <Text style={styles.deviceMeta}>ASK wearable · firmware 0.9</Text>
      </View>

      <ScreenSection>Pairing</ScreenSection>
      <Row label="Pair a new device" second="Find available ASK devices nearby" value="Soon" />
      <Row label="This device" value="Paired" />

      <ScreenSection>Behavior</ScreenSection>
      <Row label="Listen when out of range" second="The device keeps recording and nothing is lost." value="On" />
      <Row label="Transfer over Wi-Fi" value="On" />
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
  deviceCard: { marginTop: tokens.spacing.lg, borderRadius: tokens.radii.card, borderWidth: 1, borderColor: tokens.colors.border, backgroundColor: tokens.colors.surfaceRaised, padding: tokens.spacing.lg },
  deviceName: { fontSize: 28, fontWeight: "600", color: tokens.colors.textPrimary },
  deviceStatus: { fontSize: 15, color: tokens.colors.success, marginTop: 4 },
  deviceMeta: { fontSize: 13, color: tokens.colors.textMuted, marginTop: 4 },
});
