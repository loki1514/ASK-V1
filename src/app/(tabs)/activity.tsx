import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { liveEventRepository } from "@/data/liveMemory";
import { CanonicalEvent } from "@/domain/model";
import { AppIcon, IconName } from "@/components/AppIcon";
import { fmtTime } from "@/application/memoryDerived";
import { tokens } from "@/theme/tokens";

const iconByType: Record<string, IconName> = {
  decision: "checkCircle",
  action: "listChecks",
  commitment: "heartHandshake",
  question: "messageSquare",
  issue: "circleAlert",
};

function groupByDay(events: CanonicalEvent[]): { label: string; items: CanonicalEvent[] }[] {
  const days = new Map<string, typeof events>();
  for (const e of events) {
    const d = new Date(e.createdAt);
    const today = new Date();
    const yest = new Date(); yest.setDate(today.getDate() - 1);
    const label = d.toDateString() === today.toDateString() ? "Today" : d.toDateString() === yest.toDateString() ? "Yesterday" : d.toLocaleDateString();
    days.set(label, [...(days.get(label) ?? []), e]);
  }
  return [...days.entries()].map(([label, items]) => ({ label, items }));
}

export default function Activity() {
  const events = liveEventRepository.list();
  const groups = groupByDay(events);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.subtitle}>What ASK understood over time.</Text>

      {groups.length ? (
        groups.map((group) => (
          <View key={group.label}>
            <Text style={styles.dayLabel}>{group.label}</Text>
            {group.items.map((event) => (
              <TouchableOpacity key={event.id} style={styles.row} onPress={() => router.push(`/conversation/${event.conversationId}`)} accessibilityRole="button" accessibilityLabel={event.title}>
                <Text style={styles.rowTime}>{fmtTime(event.evidence?.[0]?.startMs ?? 0)}</Text>
                <View style={styles.rowBody}>
                  <Text style={styles.rowType}>{event.type.toUpperCase()}</Text>
                  <Text style={styles.rowTitle}>{event.title}</Text>
                  <Text style={styles.rowMeta}>
                    {event.people.length ? event.people.join(", ") : "Unknown"} · {event.project ?? "—"}
                  </Text>
                </View>
                <AppIcon name={iconByType[event.type] ?? "messageSquare"} size={18} color={tokens.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nothing understood yet</Text>
          <Text style={styles.emptyBody}>When ASK turns a conversation into memory, it appears here.</Text>
        </View>
      )}
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
  dayLabel: { fontSize: 13, color: tokens.colors.textMuted, fontWeight: "600", letterSpacing: 0.04, marginTop: tokens.spacing.xl, marginBottom: tokens.spacing.xs, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.md, paddingVertical: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  rowTime: { fontSize: 13, color: tokens.colors.textMuted, width: 52 },
  rowBody: { flex: 1 },
  rowType: { fontSize: 11, fontWeight: "600", color: tokens.colors.accent, letterSpacing: 0.06 },
  rowTitle: { fontSize: 16, color: tokens.colors.textPrimary, fontWeight: "500", marginTop: 2 },
  rowMeta: { fontSize: 13, color: tokens.colors.textSecondary, marginTop: 2 },
  emptyState: { marginTop: tokens.spacing.xl, alignItems: "center", paddingVertical: tokens.spacing.xl },
  emptyTitle: { fontSize: 16, color: tokens.colors.textPrimary, fontWeight: "600" },
  emptyBody: { fontSize: 14, color: tokens.colors.textSecondary, textAlign: "center", maxWidth: 300, lineHeight: 20, marginTop: tokens.spacing.xs },
});
