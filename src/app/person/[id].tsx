import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { personRepository } from "@/application/memoryDerived";
import { liveEventRepository } from "@/data/liveMemory";
import { ScreenSection, Row } from "@/components/primitives";
import { tokens } from "@/theme/tokens";

export default function PersonDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const person = personRepository.get(id ?? "");
  const events = liveEventRepository.list().filter((e) => e.people.some((p) => p.toLowerCase() === person?.displayName?.toLowerCase()));

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>
      <Text style={styles.title}>{person?.displayName ?? "Unknown"}</Text>
      {person ? (
        <Text style={styles.subtitle}>
          {person.conversationCount} conversations · {person.decisions} decisions · {person.commitments} commitments · {person.openActions} open actions
        </Text>
      ) : null}

      <ScreenSection>Recent conversations</ScreenSection>
      {events.slice(0, 6).map((e) => (
        <Row key={e.id} label={e.title} second={`${e.type} · ${e.project ?? "—"}`} onPress={() => router.push(`/conversation/${e.conversationId}`)} />
      ))}

      <TouchableOpacity onPress={() => router.push("/ask")} accessibilityRole="button" style={styles.cta}>
        <Text style={styles.ctaText}>Ask: "What has {person?.displayName ?? "this person"} promised?"</Text>
      </TouchableOpacity>
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
  subtitle: { fontSize: 15, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs, lineHeight: 22 },
  cta: { marginTop: tokens.spacing.xl, borderRadius: tokens.radii.primaryButton, backgroundColor: tokens.colors.accent, minHeight: 54, alignItems: "center", justifyContent: "center", paddingHorizontal: tokens.spacing.lg },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", textAlign: "center" },
});
