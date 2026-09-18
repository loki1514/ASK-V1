import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions, Text as RNText } from "react-native";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { cleanTranscript } from "@/data/transcripts/cleanTranscript";
import { dirtyTranscript } from "@/data/transcripts/dirtyTranscript";
import { messyCallTranscript } from "@/data/transcripts/messyCallTranscript";
import { understandConversation, UnderstoodConversation, SessionCanonicalEventRepository } from "@/application/understandConversation";
import { liveEventRepository } from "@/data/liveMemory";
import { conversationStore } from "@/data/conversationStore";
import { ProcessingLine } from "@/components/ProcessingLine";
import { EventCard } from "@/components/EventCard";
import { MemoryRow } from "@/components/MemoryRow";
import { SectionLabel } from "@/components/SectionLabel";
import { AppIcon } from "@/components/AppIcon";
import { tokens } from "@/theme/tokens";

const PROCESS_STEPS: { label: string; detail: string; progress: number }[] = [
  { label: "Reading conversation", detail: "Normalizing timestamps and speakers", progress: 0.18 },
  { label: "Identifying speakers", detail: "Detecting unique voices", progress: 0.36 },
  { label: "Understanding meaning", detail: "Finding decisions, actions, commitments", progress: 0.54 },
  { label: "Compiling events", detail: "Building structured memory", progress: 0.72 },
  { label: "Verifying", detail: "Checking evidence, confidence, duplicates", progress: 0.9 },
];

export default function Home() {
  const [processing, setProcessing] = useState<{ step: number; note: string } | null>(null);
  const [result, setResult] = useState<UnderstoodConversation>();
  const [pastedText, setPastedText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const { width } = useWindowDimensions();

  const runUnderstand = useCallback(async (transcript: string, source: "clean" | "dirty" | "pasted") => {
    for (let i = 0; i < PROCESS_STEPS.length; i += 1) {
      setProcessing({ step: i, note: "" });
      await delay(620);
    }
    const out = await understandConversation({
      transcript,
      source,
      repository: new SessionCanonicalEventRepository(liveEventRepository),
      now: () => new Date(),
    });
    conversationStore.set(out);
    setResult(out);
    setProcessing(null);
  }, []);

  const load = useCallback((transcript: string, source: "clean" | "dirty" | "pasted") => {
    setResult(undefined);
    setShowPaste(false);
    runUnderstand(transcript, source);
  }, [runUnderstand]);

  const currentStep = processing ? PROCESS_STEPS[processing.step] : null;

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { maxWidth: Math.min(width, 600) }]} keyboardShouldPersistTaps="handled">
      {/* Header: wordmark + device strip */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>))</Text></Text>
        <Text style={styles.deviceStrip}>A7F2 · 94% · listening</Text>
      </View>

      {/* Screen title + subtitle */}
      <Text style={styles.screenTitle}>Today</Text>
      <Text style={styles.subtitle}>Your conversations, understood.</Text>

      {/* Content: transcript loader or processing or result */}
      {!processing && !result ? (
        <View style={styles.block}>
          <SectionLabel>Load a conversation</SectionLabel>
          <View style={styles.chipRow}>
            {[
              { label: "Clean demo", on: () => load(cleanTranscript, "clean") },
              { label: "Dirty demo", on: () => load(dirtyTranscript, "dirty") },
              { label: "Real call", on: () => load(messyCallTranscript, "dirty") },
            ].map((opt) => (
              <TouchableOpacity key={opt.label} onPress={opt.on} style={styles.chip} accessibilityRole="button" accessibilityLabel={opt.label}>
                <Text style={styles.chipText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowPaste(true)} style={styles.chip} accessibilityRole="button" accessibilityLabel="Paste a transcript">
              <Text style={styles.chipText}>Paste</Text>
            </TouchableOpacity>
          </View>
          {showPaste ? (
            <View style={styles.pasteBox}>
              <TextInput
                placeholder="Paste a transcript with timestamps and speakers"
                placeholderTextColor={tokens.colors.textMuted}
                value={pastedText}
                onChangeText={setPastedText}
                multiline
                style={styles.pasteInput}
              />
              <TouchableOpacity onPress={() => pastedText.trim() && load(pastedText, "pasted")} disabled={!pastedText.trim()} style={[styles.cta, !pastedText.trim() && styles.ctaDisabled]} accessibilityRole="button">
                <Text style={styles.ctaText}>Understand</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}

      {processing && currentStep ? (
        <View style={styles.block}>
          <ProcessingLine label={currentStep.label} detail={currentStep.detail} progress={currentStep.progress} />
        </View>
      ) : null}

      {result ? <ResultView result={result} onLoadAgain={() => { setResult(undefined); }} /> : null}

      {/* Primary CTA: one per screen */}
      <TouchableOpacity onPress={() => router.push("/ask")} style={styles.cta} accessibilityRole="button" accessibilityLabel="Ask your memory">
        <AppIcon name="messageSquare" size="button" color="#FFFFFF" />
        <Text style={styles.ctaText}>Ask your memory</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setShowPaste(true)} style={styles.textLink} accessibilityRole="button">
        <Text style={styles.textLinkText}>Paste a transcript instead</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ResultView({ result, onLoadAgain }: { result: UnderstoodConversation; onLoadAgain: () => void }) {
  return (
    <View style={styles.block}>
      {/* Summary block (the one card) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{result.summary.title}</Text>
        <View style={styles.statRow}>
          {Object.entries(result.summary.counts).slice(0, 4).map(([type, count]) => (
            <Stat key={type} value={count} label={type} />
          ))}
        </View>
        <Text style={styles.cardMeta}>
          {result.conversation.speakers.length} speakers · {result.conversation.segments.length} segments · {result.drafts.length} events
        </Text>
      </View>

      {result.summary.topPriorities.map((event) => {
        const draft = result.drafts.find((d) => d.idempotencyKey === event.idempotencyKey);
        const guard = result.guards.find((g) => g.draftId === draft?.id);
        return draft ? <EventCard key={event.id} draft={draft} guard={guard} event={event} /> : null;
      })}

      <TouchableOpacity onPress={onLoadAgain} style={styles.textLink} accessibilityRole="button">
        <Text style={styles.textLinkText}>Load another conversation</Text>
      </TouchableOpacity>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}s</Text>
    </View>
  );
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { padding: tokens.spacing.lg, paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing.xl, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.spacing.xl },
  wordmark: { fontSize: 24, fontWeight: "700", color: tokens.colors.textPrimary },
  mark: { color: tokens.colors.accent, fontWeight: "700" },
  deviceStrip: { fontSize: 13, color: tokens.colors.textMuted },
  screenTitle: { fontSize: 34, fontWeight: "600", color: tokens.colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs },
  block: { marginTop: tokens.spacing.lg },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.xs },
  chip: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radii.chip,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: "transparent",
  },
  chipText: { fontSize: 14, color: tokens.colors.textSecondary, fontWeight: "500" },
  pasteBox: { marginTop: tokens.spacing.md },
  pasteInput: {
    minHeight: 96,
    borderRadius: tokens.radii.row,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    padding: tokens.spacing.md,
    textAlignVertical: "top",
  },
  card: {
    borderRadius: tokens.radii.card,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceRaised,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
  },
  cardTitle: { fontSize: 20, fontWeight: "600", color: tokens.colors.textPrimary },
  statRow: { flexDirection: "row", marginTop: tokens.spacing.md },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 28, fontWeight: "500", color: tokens.colors.textPrimary },
  statLabel: { fontSize: 13, color: tokens.colors.textMuted, marginTop: 2 },
  cardMeta: { fontSize: 13, color: tokens.colors.textMuted, marginTop: tokens.spacing.md, textAlign: "center" },
  cta: {
    marginTop: tokens.spacing.xl,
    borderRadius: tokens.radii.primaryButton,
    backgroundColor: tokens.colors.accent,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
  },
  ctaDisabled: { backgroundColor: tokens.colors.surfaceRaised },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  textLink: { marginTop: tokens.spacing.sm, alignSelf: "center", paddingVertical: tokens.spacing.xs },
  textLinkText: { fontSize: 14, color: tokens.colors.textMuted },
});
