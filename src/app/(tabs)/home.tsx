import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { todayMetrics, seedFollowUpsFromEvents, fmtTime } from "@/application/memoryDerived";
import { followUpRepository } from "@/domain/people";
import { liveEventRepository } from "@/data/liveMemory";
import { AppIcon } from "@/components/AppIcon";
import { ScreenSection, SourceRow, StatRow } from "@/components/primitives";
import { tokens } from "@/theme/tokens";

export default function Home() {
  const metrics = todayMetrics();
  const followUps = React.useMemo(() => {
    const seeded = seedFollowUpsFromEvents();
    return seeded;
  }, []);
  const mine = followUps.filter((f) => f.waitType === "mine");
  const waiting = followUps.filter((f) => f.waitType === "waiting_on_others");
  const upcoming = followUps.filter((f) => f.waitType === "upcoming");

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header: wordmark + device */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
        <Text style={styles.device}>A7F2 · 94% · listening</Text>
      </View>

      {/* Greeting + understood metric */}
      <Text style={styles.title}>Good afternoon.</Text>
      <TouchableOpacity onPress={() => router.push("/understand")} accessibilityRole="button" accessibilityLabel="Understanding history" style={styles.understoodRow}>
        <Text style={styles.understood}>{metrics.understoodToday} min</Text>
        <Text style={styles.understoodLabel}>understood today</Text>
        <View style={styles.understoodChevron}><AppIcon name="arrowRight" size={16} color={tokens.colors.textMuted} /></View>
      </TouchableOpacity>

      {/* Metrics */}
      <StatRow
        stats={[
          { value: metrics.openActions, label: "open actions" },
          { value: metrics.decisions, label: "decisions" },
          { value: metrics.questions, label: "questions" },
        ]}
      />

      {/* Needs you */}
      <ScreenSection>Needs you</ScreenSection>
      {mine.length ? (
        mine.map((f) => (
          <TouchableOpacity key={f.id} style={styles.followUpRow} onPress={() => router.push("/needs-you")} accessibilityRole="button" accessibilityLabel={f.title}>
            <Text style={styles.followUpTitle}>{f.title}</Text>
            <Text style={styles.followUpMeta}>{f.assignee === "Me" ? "You" : f.assignee} · {f.dueLabel}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyLine}>Nothing needs you right now.</Text>
      )}

      {/* Waiting on others */}
      <ScreenSection>Waiting on others</ScreenSection>
      {waiting.length ? (
        waiting.map((f) => (
          <TouchableOpacity key={f.id} style={styles.followUpRow} onPress={() => router.push("/needs-you")} accessibilityRole="button" accessibilityLabel={f.title}>
            <Text style={styles.followUpTitle}>{f.title}</Text>
            <Text style={styles.followUpMeta}>{f.assignee} · {f.dueLabel}</Text>
          </TouchableOpacity>
        ))
      ) : null}

      {/* Upcoming */}
      <ScreenSection>Upcoming</ScreenSection>
      {upcoming.map((f) => (
        <TouchableOpacity key={f.id} style={styles.followUpRow} onPress={() => router.push("/needs-you")} accessibilityRole="button" accessibilityLabel={f.title}>
          <Text style={styles.followUpTitle}>{f.title}</Text>
          <Text style={styles.followUpMeta}>{f.assignee === "Me" ? "You" : f.assignee} · {f.dueLabel}</Text>
        </TouchableOpacity>
      ))}

      {/* Recent memory */}
      {metrics.recent.length ? (
        <>
          <ScreenSection>Recent</ScreenSection>
          {metrics.recent.map((event) => (
            <TouchableOpacity key={event.id} style={styles.recentRow} onPress={() => router.push(`/conversation/${event.conversationId}`)} accessibilityRole="button" accessibilityLabel={event.title}>
              <View style={styles.recentCopy}>
                <Text style={styles.recentTitle}>{event.title}</Text>
                <Text style={styles.recentMeta}>
                  {event.project ?? "—"} · {fmtTime(0)}
                </Text>
              </View>
              <AppIcon name="arrowRight" size={16} color={tokens.colors.textMuted} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => router.push("/understand")} accessibilityRole="button" accessibilityLabel="Understand a conversation" style={styles.cta}>
            <Text style={styles.ctaText}>Understand a conversation</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyBody}>Understand a conversation and it shows up here. Nothing is lost while the device is out of range.</Text>
          <TouchableOpacity onPress={() => router.push("/understand")} accessibilityRole="button" accessibilityLabel="Understand a conversation" style={styles.cta}>
            <Text style={styles.ctaText}>Understand a conversation</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.xl, paddingBottom: 96, maxWidth: 600, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.spacing.xl },
  wordmark: { fontSize: 24, fontWeight: "700", color: tokens.colors.textPrimary },
  mark: { color: tokens.colors.accent, fontWeight: "700" },
  device: { fontSize: 13, color: tokens.colors.textMuted },
  title: { fontSize: 34, fontWeight: "600", color: tokens.colors.textPrimary, letterSpacing: -0.5 },
  understoodRow: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.xs, marginTop: tokens.spacing.sm },
  understood: { fontSize: 16, fontWeight: "600", color: tokens.colors.accent },
  understoodLabel: { fontSize: 14, color: tokens.colors.textSecondary },
  understoodChevron: { marginLeft: "auto" },
  followUpRow: { paddingVertical: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  followUpTitle: { fontSize: 16, color: tokens.colors.textPrimary, fontWeight: "500" },
  followUpMeta: { fontSize: 13, color: tokens.colors.textMuted, marginTop: 3 },
  emptyLine: { fontSize: 14, color: tokens.colors.textSecondary, paddingVertical: tokens.spacing.md },
  recentRow: { flexDirection: "row", alignItems: "center", paddingVertical: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: tokens.colors.border, gap: tokens.spacing.sm },
  recentCopy: { flex: 1 },
  recentTitle: { fontSize: 16, color: tokens.colors.textPrimary, fontWeight: "500" },
  recentMeta: { fontSize: 13, color: tokens.colors.textMuted, marginTop: 2 },
  emptyState: { marginTop: tokens.spacing.xl, alignItems: "center", paddingVertical: tokens.spacing.xl },
  emptyTitle: { fontSize: 16, color: tokens.colors.textPrimary, fontWeight: "600" },
  emptyBody: { fontSize: 14, color: tokens.colors.textSecondary, textAlign: "center", maxWidth: 300, lineHeight: 20, marginTop: tokens.spacing.xs },
  cta: {
    marginTop: tokens.spacing.xl,
    borderRadius: tokens.radii.primaryButton,
    backgroundColor: tokens.colors.accent,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.lg,
    alignSelf: "center",
  },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
