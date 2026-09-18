import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { followUpRepository } from "@/domain/people";
import { seedFollowUpsFromEvents } from "@/application/memoryDerived";
import { ScreenSection, Row } from "@/components/primitives";
import { tokens } from "@/theme/tokens";

export default function NeedsYou() {
  const router = useRouter();
  const followUps = React.useMemo(() => seedFollowUpsFromEvents(), []);
  const mine = followUps.filter((f) => f.waitType === "mine");
  const waiting = followUps.filter((f) => f.waitType === "waiting_on_others");
  const upcoming = followUps.filter((f) => f.waitType === "upcoming");
  const [done, setDone] = React.useState<Set<string>>(new Set());

  const complete = (id: string) => {
    followUpRepository.update(id, { status: "done" });
    setDone((s) => new Set(s).add(id));
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>
      <Text style={styles.title}>Needs you</Text>
      <Text style={styles.subtitle}>What is waiting, and what you promised.</Text>

      <ScreenSection>Today</ScreenSection>
      {mine.filter((f) => !done.has(f.id)).map((f) => (
        <View key={f.id} style={styles.rowWrap}>
          <Row label={f.title} second={`You · ${f.dueLabel}`} />
          <TouchableOpacity onPress={() => complete(f.id)} accessibilityRole="button" accessibilityLabel={`Complete ${f.title}`} style={styles.doneBtn}>
            <Text style={styles.doneText}>Complete</Text>
          </TouchableOpacity>
        </View>
      ))}
      {mine.every((f) => done.has(f.id)) ? <Text style={styles.emptyLine}>Nothing needs you right now.</Text> : null}

      <ScreenSection>Waiting on others</ScreenSection>
      {waiting.map((f) => (
        <Row key={f.id} label={f.title} second={`${f.assignee} · ${f.dueLabel}`} />
      ))}

      <ScreenSection>Upcoming</ScreenSection>
      {upcoming.map((f) => (
        <Row key={f.id} label={f.title} second={`${f.assignee} · ${f.dueLabel}`} onPress={() => router.push("/assign-follow-up")} />
      ))}

      {!followUps.length ? (
        <Text style={styles.emptyLine}>No follow-ups yet. They appear here once ASK understands an action.</Text>
      ) : null}
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
  rowWrap: { position: "relative" },
  doneBtn: { position: "absolute", right: 0, top: 12, zIndex: 2 },
  doneText: { fontSize: 14, color: tokens.colors.accent, fontWeight: "600" },
  emptyLine: { fontSize: 14, color: tokens.colors.textSecondary, paddingVertical: tokens.spacing.lg },
});
