import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { liveEventRepository, liveTranscriptSegments } from "@/data/liveMemory";
import { conversationStore } from "@/data/conversationStore";
import { fmtTime } from "@/application/memoryDerived";
import { ScreenSection } from "@/components/primitives";
import { tokens } from "@/theme/tokens";

const typeColor: Record<string, string> = {
  decision: tokens.colors.accent,
  action: tokens.colors.success,
  commitment: tokens.colors.warning,
  question: tokens.colors.textSecondary,
  issue: tokens.colors.error,
};

export default function ConversationDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = React.useState<"understanding" | "transcript">("understanding");
  const understood = conversationStore.get();
  const events = liveEventRepository.list().filter((e) => e.conversationId === id);
  const segments = understood?.conversation.segments ?? liveTranscriptSegments;
  const title = understood?.summary.title ?? "Bangalore Project";

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {segments.length} minutes · {understood?.conversation.speakers.length ?? 0} people
      </Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["understanding", "transcript"] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} accessibilityRole="button" accessibilityLabel={t} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && { color: tokens.colors.accent }]}>{t === "understanding" ? "Understanding" : "Transcript"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "understanding" ? (
        <>
          <ScreenSection>What mattered</ScreenSection>
          {Object.entries(
            events.reduce<Record<string, number>>((acc, e) => {
              acc[e.type] = (acc[e.type] ?? 0) + 1;
              return acc;
            }, {}),
          ).map(([type, count]) => (
            <View key={type} style={styles.countRow}>
              <Text style={[styles.countValue, { color: typeColor[type] ?? tokens.colors.textPrimary }]}>{count}</Text>
              <Text style={styles.countLabel}>{type}s</Text>
            </View>
          ))}

          <ScreenSection>Events</ScreenSection>
          {events.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <Text style={[styles.eventType, { color: typeColor[event.type] ?? tokens.colors.textPrimary }]}>{event.type.toUpperCase()}</Text>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>
                {event.people.length ? event.people.join(", ") : "Unknown"} · {fmtTime(event.evidence?.[0]?.startMs ?? 0)}
              </Text>
            </View>
          ))}
        </>
      ) : (
        <>
          <ScreenSection>Transcript</ScreenSection>
          {segments.map((seg) => (
            <View key={seg.id} style={styles.segRow}>
              <Text style={styles.segTime}>{fmtTime(seg.startMs)}</Text>
              <Text style={styles.segText}>{seg.text}</Text>
              <Text style={styles.segSpeaker}>{seg.speakerName ?? seg.anonymousSpeakerId ?? "Unknown"}</Text>
            </View>
          ))}
        </>
      )}

      <TouchableOpacity onPress={() => router.push("/ask")} accessibilityRole="button" accessibilityLabel="Ask this conversation" style={styles.cta}>
        <Text style={styles.ctaText}>Ask this conversation</Text>
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
  subtitle: { fontSize: 16, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs },
  tabs: { flexDirection: "row", gap: tokens.spacing.lg, marginTop: tokens.spacing.lg, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  tab: { paddingVertical: tokens.spacing.sm, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: tokens.colors.accent },
  tabText: { fontSize: 16, color: tokens.colors.textSecondary, fontWeight: "500" },
  countRow: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm, paddingVertical: tokens.spacing.sm },
  countValue: { fontSize: 20, fontWeight: "600" },
  countLabel: { fontSize: 14, color: tokens.colors.textSecondary },
  eventRow: { paddingVertical: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  eventType: { fontSize: 11, fontWeight: "600", letterSpacing: 0.06 },
  eventTitle: { fontSize: 16, color: tokens.colors.textPrimary, fontWeight: "500", marginTop: 2 },
  eventMeta: { fontSize: 13, color: tokens.colors.textSecondary, marginTop: 2 },
  segRow: { paddingVertical: tokens.spacing.sm, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  segTime: { fontSize: 13, color: tokens.colors.textMuted, marginBottom: 2 },
  segText: { fontSize: 15, color: tokens.colors.textPrimary, lineHeight: 21 },
  segSpeaker: { fontSize: 12, color: tokens.colors.textSecondary, marginTop: 2 },
  cta: { marginTop: tokens.spacing.xl, borderRadius: tokens.radii.primaryButton, backgroundColor: tokens.colors.accent, minHeight: 54, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
