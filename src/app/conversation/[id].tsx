import React from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { router } from "expo-router";
import { AppIcon, IconName } from "@/components/AppIcon";
import { conversationStore } from "@/data/conversationStore";
import { cleanTranscript } from "@/data/transcripts/cleanTranscript";
import { liveEventRepository } from "@/data/liveMemory";
import { DemoSemanticParser } from "@/application/parsing/DemoSemanticParser";
import { DeterministicTranscriptParser } from "@/application/parsing/DeterministicTranscriptParser";
import { renderSummary } from "@/application/renderSummary";
import { CanonicalEvent, EventType } from "@/domain/model";
import { fonts, letterSpacing, radii, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";

type DetailTab = "transcript" | "understanding" | "events";

const typeIcons: Partial<Record<EventType, IconName>> = {
  action: "listChecks",
  decision: "checkCircle",
  commitment: "heartHandshake",
  question: "messageSquare",
  requirement: "fileText",
  issue: "circleAlert",
  risk: "shieldCheck",
};

export default function ConversationDetail() {
  const t = useThemeTokens();
  const { width } = useWindowDimensions();
  const [tab, setTab] = React.useState<DetailTab>("understanding");
  const stored = conversationStore.get();
  const fallbackConversation = React.useMemo(() => {
    const conversation = new DeterministicTranscriptParser().parseSync(cleanTranscript, "clean");
    conversation.events = new DemoSemanticParser().extractSync(conversation.segments);
    return conversation;
  }, []);
  const conversation = stored?.conversation ?? fallbackConversation;
  const events = stored?.events ?? liveEventRepository.list();
  const summary = stored?.summary ?? renderSummary(events, conversation.title);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.surfaceRaised }} contentContainerStyle={[styles.content, { maxWidth: Math.min(width - 2 * spacing.lg, 900) }]}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={[styles.back, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
        <AppIcon name="arrowRight" size="inline" color={t.textMuted} style={{ transform: [{ rotate: "180deg" }] }} />
        <Text style={[styles.backText, { color: t.textMuted, fontFamily: fonts.medium }]}>Back</Text>
      </Pressable>

      <Text style={[styles.kicker, { color: t.accent, fontFamily: fonts.bold }]}>CONVERSATION</Text>
      <Text style={[styles.title, { color: t.textPrimary, fontFamily: fonts.display }]}>{conversation.title}</Text>
      <Text style={[styles.date, { color: t.textMuted, fontFamily: fonts.regular }]}>18 Sep 2026</Text>
      <View style={styles.metaRow}>
        <Meta value={conversation.speakers.length} label="Speakers" />
        <Meta value={events.length} label="Events" />
        <Meta value={conversation.segments.length} label="Segments" />
      </View>

      <View style={[styles.tabs, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
        {(["transcript", "understanding", "events"] as DetailTab[]).map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} style={[styles.tab, tab === item && { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.tabLabel, { color: tab === item ? t.accent : t.textMuted, fontFamily: fonts.semibold }]}>{item.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "transcript" ? (
        <View style={styles.list}>
          {conversation.segments.map((segment) => (
            <View key={segment.id} style={[styles.transcriptCard, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
              <View style={styles.transcriptTop}>
                <View style={[styles.speakerDot, { backgroundColor: speakerColor(segment.anonymousSpeakerId) }]} />
                <Text style={[styles.segmentSpeaker, { color: t.textPrimary, fontFamily: fonts.semibold }]}>{humanSpeaker(segment.anonymousSpeakerId)}</Text>
                <Text style={[styles.segmentTime, { color: t.textMuted, fontFamily: fonts.regular }]}>{formatTime(segment.startMs)}</Text>
              </View>
              <Text style={[styles.segmentText, { color: t.textPrimary, fontFamily: fonts.regular }]}>{segment.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {tab === "understanding" ? (
        <View style={styles.list}>
          {summary.sections.map((section) => section.events.map((event) => <EventCard key={event.id} event={event} compact />))}
        </View>
      ) : null}

      {tab === "events" ? (
        <View style={styles.list}>
          {events.map((event, index) => <EventCard key={event.id} event={event} eventId={`EVT-${String(index + 1).padStart(3, "0")}`} />)}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Meta({ value, label }: { value: number; label: string }) {
  const t = useThemeTokens();
  return <View><Text style={[styles.metaValue, { color: t.textPrimary, fontFamily: fonts.display }]}>{value}</Text><Text style={[styles.metaLabel, { color: t.textMuted, fontFamily: fonts.regular }]}>{label}</Text></View>;
}

function EventCard({ event, eventId, compact = false }: { event: CanonicalEvent; eventId?: string; compact?: boolean }) {
  const t = useThemeTokens();
  return (
    <View style={[styles.eventCard, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
      <View style={styles.eventTop}>
        <View style={[styles.eventIcon, { backgroundColor: typeSurface(event.type, t) }]}><AppIcon name={typeIcons[event.type] ?? "fileText"} size="inline" color={typeColor(event.type, t)} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eventType, { color: typeColor(event.type, t), fontFamily: fonts.bold }]}>{event.type.toUpperCase()}</Text>
          <Text style={[styles.eventTitle, { color: t.textPrimary, fontFamily: fonts.semibold }]}>{event.title}</Text>
        </View>
        {eventId ? <Text style={[styles.eventId, { color: t.textMuted, fontFamily: fonts.regular }]}>{eventId}</Text> : null}
      </View>
      <Text style={[styles.eventBody, { color: t.textMuted, fontFamily: fonts.regular }]}>{event.objectText}</Text>
      {!compact ? (
        <View style={[styles.evidence, { backgroundColor: t.surfaceSubtle }]}>
          <Text style={[styles.evidenceLabel, { color: t.accent, fontFamily: fonts.bold }]}>EVIDENCE · {formatTime(event.evidence[0]?.startMs ?? 0)}</Text>
          <Text style={[styles.evidenceText, { color: t.textPrimary, fontFamily: fonts.regular }]}>“{event.evidence[0]?.quotedText}”</Text>
          <View style={styles.verified}><AppIcon name="check" size={12} color={t.success} /><Text style={[styles.verifiedText, { color: t.success, fontFamily: fonts.bold }]}>VERIFIED · {Math.round(event.confidence.aggregate * 100)}%</Text></View>
        </View>
      ) : null}
    </View>
  );
}

function humanSpeaker(value?: string) { return value ? value.replace("speaker_", "Speaker ") : "Identity unresolved"; }
function formatTime(ms: number) { return `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`; }
function speakerColor(id?: string) { return ["#5B3DF5", "#1B6E9A", "#1F7A6D", "#945600"][Math.max(0, Number(id?.split("_")[1] ?? 1) - 1) % 4]; }
function typeColor(type: EventType, t: any) { return type === "decision" ? t.decision : type === "action" ? t.action : type === "commitment" ? t.commitment : type === "issue" || type === "risk" ? t.issue : t.accent; }
function typeSurface(type: EventType, t: any) { return type === "decision" ? t.decisionSurface : type === "action" ? t.actionSurface : type === "commitment" ? t.commitmentSurface : type === "issue" || type === "risk" ? t.issueSurface : t.surfaceSubtle; }

const styles = StyleSheet.create({
  content: { width: "100%", alignSelf: "center", padding: spacing.lg, paddingTop: 42, paddingBottom: 80 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.pill, minHeight: 40, paddingHorizontal: 12, marginBottom: spacing.lg },
  backText: { fontSize: 12 },
  kicker: { fontSize: 10, letterSpacing: letterSpacing.kicker },
  title: { fontSize: 34, letterSpacing: -1, marginTop: 5 },
  date: { fontSize: 13, marginTop: 3 },
  metaRow: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.lg },
  metaValue: { fontSize: 22 },
  metaLabel: { fontSize: 11 },
  tabs: { flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, padding: 4, marginTop: spacing.lg, marginBottom: spacing.md },
  tab: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: radii.md },
  tabLabel: { fontSize: 10, letterSpacing: 0.7 },
  list: { gap: spacing.xs },
  transcriptCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, padding: spacing.md },
  transcriptTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  speakerDot: { width: 8, height: 8, borderRadius: 4 },
  segmentSpeaker: { fontSize: 12, textTransform: "capitalize" },
  segmentTime: { fontSize: 11, marginLeft: "auto" },
  segmentText: { fontSize: 14, lineHeight: 21, marginTop: spacing.xs },
  eventCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, padding: spacing.md },
  eventTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  eventIcon: { width: 38, height: 38, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  eventType: { fontSize: 9, letterSpacing: 0.9 },
  eventTitle: { fontSize: 15, marginTop: 2 },
  eventId: { fontSize: 10 },
  eventBody: { fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  evidence: { borderRadius: radii.md, padding: spacing.sm, marginTop: spacing.sm },
  evidenceLabel: { fontSize: 9, letterSpacing: 0.8 },
  evidenceText: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  verified: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 },
  verifiedText: { fontSize: 9, letterSpacing: 0.6 },
});
