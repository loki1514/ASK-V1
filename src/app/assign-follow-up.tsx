import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { liveEventRepository } from "@/data/liveMemory";
import { FollowUp, followUpRepository } from "@/domain/people";
import { persistFollowUpsNow } from "@/data/liveMemory";
import { ScreenSection, Row } from "@/components/primitives";
import { tokens } from "@/theme/tokens";

export default function AssignFollowUp() {
  const router = useRouter();
  const [eventId, setEventId] = React.useState<string | null>(null);
  const [assignee, setAssignee] = React.useState<string>("Me");
  const [due, setDue] = React.useState<string>("Wednesday · 12 PM");
  const openActions = liveEventRepository.list().filter((e) => e.type === "action" || e.type === "commitment");
  const selected = openActions.find((e) => e.id === eventId) ?? openActions[0];
  const [saved, setSaved] = React.useState(false);

  const assign = () => {
    if (!selected) return;
    const followUp: FollowUp = {
      id: `followup_${selected.id}_${Date.now()}`,
      canonicalEventId: selected.id,
      conversationId: selected.conversationId,
      title: selected.title,
      assignee,
      dueLabel: due,
      project: selected.project ?? "Bangalore Project",
      status: "open",
      createdAt: new Date().toISOString(),
      waitType: assignee === "Me" ? "mine" : "waiting_on_others",
      source: { conversation: selected.project ?? "Bangalore Project", timeLabel: "12:41" },
    };
    followUpRepository.add(followUp);
    persistFollowUpsNow();
    setSaved(true);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>
      <Text style={styles.title}>Assign follow-up</Text>
      <Text style={styles.subtitle}>Memory becomes execution.</Text>

      {saved ? (
        <View style={styles.savedBlock}>
          <Text style={styles.savedMark}>✓</Text>
          <Text style={styles.savedTitle}>Follow-up created</Text>
          <Text style={styles.savedMeta}>Linked to its source memory. Nothing is lost.</Text>
          <TouchableOpacity onPress={() => router.push("/needs-you")} accessibilityRole="button" style={styles.cta}>
            <Text style={styles.ctaText}>View needs you</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScreenSection>Event</ScreenSection>
          {openActions.map((e) => (
            <TouchableOpacity key={e.id} onPress={() => setEventId(e.id)} accessibilityRole="button" accessibilityLabel={e.title} style={[styles.selectRow, selected?.id === e.id && styles.selectRowActive]}>
              <Text style={[styles.selectLabel, selected?.id === e.id && { color: tokens.colors.accent }]}>{e.title}</Text>
              <Text style={styles.selectMeta}>{e.type} · {e.project ?? "—"}</Text>
            </TouchableOpacity>
          ))}

          <ScreenSection>Assignee</ScreenSection>
          {["Project Coordinator", "Design Lead", "Procurement", "Me"].map((a) => (
            <TouchableOpacity key={a} onPress={() => setAssignee(a)} accessibilityRole="button" accessibilityLabel={a} style={[styles.selectRow, assignee === a && styles.selectRowActive]}>
              <Text style={[styles.selectLabel, assignee === a && { color: tokens.colors.accent }]}>{a}</Text>
            </TouchableOpacity>
          ))}

          <ScreenSection>Due</ScreenSection>
          {["Today", "Wednesday · 12 PM", "Tomorrow", "Next week"].map((d) => (
            <TouchableOpacity key={d} onPress={() => setDue(d)} accessibilityRole="button" accessibilityLabel={d} style={[styles.selectRow, due === d && styles.selectRowActive]}>
              <Text style={[styles.selectLabel, due === d && { color: tokens.colors.accent }]}>{d}</Text>
            </TouchableOpacity>
          ))}

          <ScreenSection>Source</ScreenSection>
          <Text style={styles.sourceText}>{selected?.project ?? "Bangalore Project"} conversation · 12:41</Text>

          <TouchableOpacity onPress={assign} disabled={!selected} accessibilityRole="button" accessibilityLabel="Assign follow-up" style={styles.cta}>
            <Text style={styles.ctaText}>Assign</Text>
          </TouchableOpacity>
        </>
      )}
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
  selectRow: { paddingVertical: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  selectRowActive: { backgroundColor: "rgba(91,46,255,0.06)" },
  selectLabel: { fontSize: 16, color: tokens.colors.textPrimary, fontWeight: "500" },
  selectMeta: { fontSize: 13, color: tokens.colors.textMuted, marginTop: 2 },
  sourceText: { fontSize: 13, color: tokens.colors.textMuted },
  cta: { marginTop: tokens.spacing.xl, borderRadius: tokens.radii.primaryButton, backgroundColor: tokens.colors.accent, minHeight: 54, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  savedBlock: { marginTop: tokens.spacing.xl, alignItems: "center", paddingVertical: tokens.spacing.xl },
  savedMark: { color: tokens.colors.success, fontSize: 28, fontWeight: "700" },
  savedTitle: { fontSize: 20, color: tokens.colors.textPrimary, fontWeight: "600", marginTop: tokens.spacing.sm },
  savedMeta: { fontSize: 14, color: tokens.colors.textSecondary, textAlign: "center", marginTop: 4 },
});
