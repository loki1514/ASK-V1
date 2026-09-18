import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions, Alert } from "react-native";
import { Text } from "react-native-paper";
import { router } from "expo-router";
import { cleanTranscript } from "@/data/transcripts/cleanTranscript";
import { dirtyTranscript } from "@/data/transcripts/dirtyTranscript";
import { messyCallTranscript } from "@/data/transcripts/messyCallTranscript";
import { understandConversation, UnderstoodConversation, SessionCanonicalEventRepository } from "@/application/understandConversation";
import { liveEventRepository } from "@/data/liveMemory";
import { conversationStore } from "@/data/conversationStore";
import { ProcessingStateMachine, ProcessingState } from "@/components/ProcessingStateMachine";
import { EventCard } from "@/components/EventCard";
import { MeetingInsights } from "@/components/MeetingInsights";
import { AppIcon } from "@/components/AppIcon";
import { fonts, radii, spacing, motion } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";

export default function Home() {
  const t = useThemeTokens();
  const { width } = useWindowDimensions();
  const [pastedText, setPastedText] = useState("");
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<UnderstoodConversation>();
  const [showPaste, setShowPaste] = useState(false);
  const entry = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entry, { toValue: 1, duration: motion.screenEnter, useNativeDriver: true }).start();
  }, [entry]);

  const runUnderstand = useCallback(async (transcript: string, source: "clean" | "dirty" | "pasted") => {
    setProcessingState("parsing");
    await delay(700);
    setProcessingState("speakers");
    await delay(600);
    setProcessingState("understanding");
    await delay(800);
    setProcessingState("compiling");
    await delay(600);
    setProcessingState("verifying");
    await delay(500);

    const out = await understandConversation({
      transcript,
      source,
      repository: new SessionCanonicalEventRepository(liveEventRepository),
      now: () => new Date(),
    });
    conversationStore.set(out);
    setResult(out);
    setProcessingState("remembered");
  }, []);

  const loadTranscript = useCallback((transcript: string, source: "clean" | "dirty" | "pasted") => {
    setResult(undefined);
    setShowPaste(false);
    runUnderstand(transcript, source);
  }, [runUnderstand]);

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: t.surfaceRaised }}
      contentContainerStyle={[styles.content, { maxWidth: Math.min(width - 2 * spacing.lg, 900 - (width >= 1024 ? 240 : 0)) }]}
    >
      {/* Brand header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.brand, { color: t.textPrimary, fontFamily: fonts.bold }]}>ask<Text style={[styles.dot, { color: t.accent }]}>))</Text></Text>
          <Text style={[styles.tagline, { color: t.textMuted, fontFamily: fonts.regular }]}>Your conversations, understood.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open You" onPress={() => router.push("/you")} style={[styles.avatar, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
          <AppIcon name="userRound" size="button" color={t.textMuted} />
        </Pressable>
      </View>

      {/* Transcript selector (idle) */}
      {processingState === "idle" || processingState === "remembered" ? (
        <View style={[styles.selector, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
          <Text style={[styles.selectorTitle, { color: t.textPrimary, fontFamily: fonts.medium }]}>Load a conversation</Text>
          <Text style={[styles.selectorDesc, { color: t.textMuted, fontFamily: fonts.regular }]}>
            Paste a transcript or load a demo to see ASK turn conversation into structured memory.
          </Text>
          <View style={styles.selectorButtons}>
            <TouchableOpacity onPress={() => loadTranscript(cleanTranscript, "clean")} style={[styles.selectorBtn, { backgroundColor: t.accent }]} accessibilityRole="button" accessibilityLabel="Load clean demo transcript">
              <AppIcon name="sparkles" size="inline" color="#FFFFFF" />
              <Text style={[styles.selectorBtnText, { fontFamily: fonts.medium }]}>Clean demo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => loadTranscript(dirtyTranscript, "dirty")} style={[styles.selectorBtn, { backgroundColor: t.warning }]} accessibilityRole="button" accessibilityLabel="Load dirty demo transcript">
              <AppIcon name="zap" size="inline" color="#FFFFFF" />
              <Text style={[styles.selectorBtnText, { fontFamily: fonts.medium }]}>Dirty demo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => loadTranscript(messyCallTranscript, "dirty")} style={[styles.selectorBtn, { backgroundColor: t.danger }]} accessibilityRole="button" accessibilityLabel="Load real call transcript">
              <AppIcon name="waves" size="inline" color="#FFFFFF" />
              <Text style={[styles.selectorBtnText, { fontFamily: fonts.medium }]}>Real call</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPaste(true)} style={[styles.selectorBtn, { backgroundColor: t.textMuted }]} accessibilityRole="button" accessibilityLabel="Paste a transcript">
              <AppIcon name="fileText" size="inline" color="#FFFFFF" />
              <Text style={[styles.selectorBtnText, { fontFamily: fonts.medium }]}>Paste</Text>
            </TouchableOpacity>
          </View>
          {showPaste ? (
            <View style={styles.pasteArea}>
              <TextInput
                placeholder="Paste a transcript with timestamps and speakers..."
                placeholderTextColor={t.textMuted}
                value={pastedText}
                onChangeText={setPastedText}
                multiline
                style={[styles.pasteInput, { color: t.textPrimary, backgroundColor: t.surfaceRaised, borderColor: t.borderSubtle, fontFamily: fonts.regular }]}
              />
              <Pressable
                onPress={() => pastedText.trim() && loadTranscript(pastedText, "pasted")}
                disabled={!pastedText.trim()}
                style={[styles.pasteSubmit, { backgroundColor: pastedText.trim() ? t.accent : t.borderSubtle }]}
              >
                <Text style={[styles.pasteSubmitText, { fontFamily: fonts.bold, color: pastedText.trim() ? "#FFFFFF" : t.textMuted }]}>Understand</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Processing state machine */}
      {processingState !== "idle" ? (
        <View style={styles.processingWrap}>
          <ProcessingStateMachine
            currentState={processingState}
            speakerCount={result?.conversation.speakers.length}
            draftCount={result?.drafts.length}
          />
        </View>
      ) : null}

      {/* Summary (after remembered) */}
      {result && processingState === "remembered" ? (
        <View style={styles.summaryArea}>
          {/* Summary card */}
          <View style={[styles.summaryCard, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
            <Text style={[styles.summaryTitle, { color: t.textPrimary, fontFamily: fonts.bold }]}>{result.summary.title}</Text>
            <View style={styles.countsRow}>
              {Object.entries(result.summary.counts).map(([type, count]) => (
                <View key={type} style={[styles.countChip, { backgroundColor: t.surfaceSubtle }]}>
                  <Text style={[styles.countValue, { color: t.accent, fontFamily: fonts.bold }]}>{count}</Text>
                  <Text style={[styles.countLabel, { color: t.textMuted, fontFamily: fonts.regular }]}>{type}s</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.summaryMeta, { color: t.textMuted, fontFamily: fonts.regular }]}>
              {result.conversation.speakers.length} speakers · {result.conversation.segments.length} segments · {result.drafts.length} events
            </Text>
            {result.ignoredStatements.length ? (
              <View style={[styles.ignoredBox, { backgroundColor: t.warningSurface }]}>
                <AppIcon name="circleAlert" size="inline" color={t.warning} />
                <Text style={[styles.ignoredText, { color: t.warning, fontFamily: fonts.regular }]}>
                  {result.ignoredStatements[0].text} — {result.ignoredStatements[0].reason}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Meeting assistant dashboard (Dribbble ref): transcript + key moments */}
          <Text style={[styles.sectionTitle, { color: t.textPrimary, fontFamily: fonts.bold }]}>Meeting view</Text>
          <MeetingInsights conversation={result} />

          {/* Top priorities */}
          {result.summary.topPriorities.length ? (
            <View style={styles.priorities}>
              <Text style={[styles.sectionTitle, { color: t.textPrimary, fontFamily: fonts.bold }]}>Top priorities</Text>
              {result.summary.topPriorities.map((event) => {
                const draft = result.drafts.find((d) => d.idempotencyKey === event.idempotencyKey);
                const guard = result.guards.find((g) => g.draftId === draft?.id);
                return draft ? <EventCard key={event.id} draft={draft} guard={guard} event={event} /> : null;
              })}
            </View>
          ) : null}

          {/* Sections */}
          {result.summary.sections.map((section) => (
            <View key={section.type} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: t.textPrimary, fontFamily: fonts.bold }]}>{section.title}</Text>
              {section.events.map((event) => {
                const draft = result.drafts.find((d) => d.idempotencyKey === event.idempotencyKey);
                const guard = result.guards.find((g) => g.draftId === draft?.id);
                return draft ? <EventCard key={event.id} draft={draft} guard={guard} event={event} /> : null;
              })}
            </View>
          ))}

          {/* CTA to Ask */}
          <Pressable onPress={() => router.push("/ask")} style={[styles.askCta, { backgroundColor: t.accent }]}>
            <AppIcon name="messageSquare" size="button" color="#FFFFFF" />
            <Text style={[styles.askCtaText, { fontFamily: fonts.medium }]}>Ask this conversation</Text>
          </Pressable>

          {/* CTA to Activity */}
          <Pressable onPress={() => router.push("/activity")} style={[styles.activityCta, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
            <AppIcon name="waves" size="inline" color={t.textMuted} />
            <Text style={[styles.activityCtaText, { color: t.textMuted, fontFamily: fonts.regular }]}>View timeline</Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.ScrollView>
  );
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 58, paddingBottom: 48, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  brand: { fontSize: 24, letterSpacing: -0.02 },
  dot: { fontWeight: "800" },
  tagline: { marginTop: 3, fontSize: 14 },
  avatar: { width: 40, height: 40, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  selector: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, marginBottom: spacing.lg },
  selectorTitle: { fontSize: 20 },
  selectorDesc: { fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  selectorButtons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  selectorBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 11, borderRadius: radii.lg },
  selectorBtnText: { color: "#FFFFFF", fontSize: 13 },
  pasteArea: { marginTop: spacing.md },
  pasteInput: { borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, padding: spacing.sm, minHeight: 80, fontSize: 13, lineHeight: 18 },
  pasteSubmit: { marginTop: spacing.sm, paddingVertical: 11, borderRadius: radii.lg, alignItems: "center" },
  pasteSubmitText: { fontSize: 14 },
  processingWrap: { marginTop: spacing.sm, marginBottom: spacing.lg },
  summaryArea: { gap: spacing.md },
  summaryCard: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg },
  summaryTitle: { fontSize: 22 },
  countsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  countChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill },
  countValue: { fontSize: 16 },
  countLabel: { fontSize: 11 },
  summaryMeta: { fontSize: 12, marginTop: spacing.sm },
  ignoredBox: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radii.md },
  ignoredText: { flex: 1, fontSize: 12, lineHeight: 17 },
  priorities: { marginTop: spacing.xs },
  section: { marginTop: spacing.xs },
  sectionTitle: { fontSize: 17, marginBottom: spacing.sm },
  askCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: 14, borderRadius: radii.lg, marginTop: spacing.sm },
  askCtaText: { color: "#FFFFFF", fontSize: 15 },
  activityCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: 12, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth },
  activityCtaText: { fontSize: 13 },
});