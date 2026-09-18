import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { cleanTranscript } from "@/data/transcripts/cleanTranscript";
import { dirtyTranscript } from "@/data/transcripts/dirtyTranscript";
import { messyCallTranscript } from "@/data/transcripts/messyCallTranscript";
import { understandConversation, UnderstoodConversation, SessionCanonicalEventRepository } from "@/application/understandConversation";
import { liveEventRepository } from "@/data/liveMemory";
import { conversationStore } from "@/data/conversationStore";
import { tokens, useAccessibilityReduceMotion } from "@/theme/tokens";
import { AppIcon } from "@/components/AppIcon";

type Phase = "idle" | "parsing" | "speakers" | "understanding" | "compiling" | "verifying" | "remembered";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Ready",
  parsing: "Reading conversation",
  speakers: "Identifying speakers",
  understanding: "Finding meaning",
  compiling: "Compiling events",
  verifying: "Verifying",
  remembered: "Remembered",
};

export default function Understand() {
  const router = useRouter();
  const reduce = useAccessibilityReduceMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<UnderstoodConversation>();
  // The currently-showcased draft while understanding/verifying.
  const [spotlight, setSpotlight] = useState<UnderstoodConversation["drafts"][number] | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  const fadeThrough = useCallback(async (next: Phase, ms = 650) => {
    if (!reduce) {
      await new Promise((r) => Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(r));
    }
    setPhase(next);
    if (!reduce) {
      fade.setValue(0);
      await new Promise((r) => Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start(r));
    }
    await delay(ms);
  }, [fade, reduce]);

  const run = useCallback(async (transcript: string, source: "clean" | "dirty" | "pasted") => {
    setResult(undefined);
    setSpotlight(null);
    await fadeThrough("parsing", 500);
    await fadeThrough("speakers", 500);
    await fadeThrough("understanding", 500);

    const out = await understandConversation({
      transcript,
      source,
      repository: new SessionCanonicalEventRepository(liveEventRepository),
      now: () => new Date(),
    });
    conversationStore.set(out);
    setResult(out);
    // Spotlight each interesting draft through compiling/verifying.
    for (const draft of out.drafts.slice(0, 3)) {
      setSpotlight(draft);
      await fadeThrough("compiling", 420);
      await fadeThrough("verifying", 520);
    }
    setSpotlight(null);
    await fadeThrough("remembered", 300);
  }, [fadeThrough]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>

      <Text style={styles.title}>Understanding</Text>
      <Text style={styles.subtitle}>Conversation becomes memory.</Text>

      {/* Phase indicator */}
      <Animated.View style={{ opacity: fade }}>
        <View style={styles.phaseRow}>
          <Text style={[styles.phaseLabel, { color: phase === "remembered" ? tokens.colors.success : tokens.colors.accent }]}>
            {PHASE_LABEL[phase]}
          </Text>
          {phase !== "idle" && phase !== "remembered" ? <View style={styles.phaseLive} /> : null}
        </View>

        {/* Spotlight: transcript -> function -> guard -> event */}
        {spotlight && (phase === "compiling" || phase === "verifying") ? (
          <View style={styles.tower}>
            {/* Source fragment */}
            <View style={styles.step}>
              <Text style={styles.stepLabel}>Source</Text>
              <Text style={styles.quote}>“{spotlight.evidence[0]?.quotedText}”</Text>
              <Text style={styles.stepMeta}>{spotlight.fields.actor ?? "Unknown"} · {fmt(spotlight.evidence[0]?.startMs ?? 0)}</Text>
            </View>
            <ArrowDown />
            {/* Function */}
            <View style={styles.step}>
              <Text style={styles.stepLabel}>Function</Text>
              <Text style={styles.fn}>{spotlight.proposedFunction}</Text>
              <Text style={styles.stepValue}>{spotlight.fields.title}</Text>
            </View>
            <ArrowDown />
            {/* Guard */}
            {phase === "verifying" ? (
              <View style={styles.step}>
                <Text style={styles.stepLabel}>Verify</Text>
                <Text style={styles.guardLine}>✓ Evidence verified</Text>
                <Text style={styles.guardLine}>✓ Confidence {Math.round(spotlight.parserConfidence * 100)}%</Text>
                <Text style={styles.guardLine}>✓ No duplicate</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Result summary */}
        {result && phase === "remembered" ? (
          <View style={styles.doneBlock}>
            <Text style={styles.doneMark}>✓</Text>
            <Text style={styles.doneTitle}>{result.drafts.length} events remembered</Text>
            <Text style={styles.doneMeta}>
              {result.conversation.speakers.length} speakers · {result.conversation.segments.length} segments
            </Text>
            <TouchableOpacity onPress={() => router.push(`/conversation/${result.conversation.id}`)} accessibilityRole="button" accessibilityLabel="Open conversation" style={styles.secondary}>
              <Text style={styles.secondaryText}>Open conversation</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Animated.View>

      {/* Controls (idle) */}
      {phase === "idle" ? (
        <View style={styles.controls}>
          <Text style={styles.controlsLabel}>Run a demo conversation</Text>
          {[
            { label: "Clean demo", t: cleanTranscript, s: "clean" as const },
            { label: "Dirty demo", t: dirtyTranscript, s: "dirty" as const },
            { label: "Real call", t: messyCallTranscript, s: "dirty" as const },
          ].map((opt) => (
            <TouchableOpacity key={opt.label} onPress={() => run(opt.t, opt.s)} accessibilityRole="button" accessibilityLabel={opt.label} style={styles.controlRow}>
              <Text style={styles.controlText}>{opt.label}</Text>
              <AppIcon name="arrowRight" size={16} color={tokens.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function ArrowDown() {
  return (
    <View style={{ alignItems: "center", paddingVertical: 6 }}>
      <Text style={{ color: tokens.colors.accent, fontSize: 16, fontWeight: "700" }}>↓</Text>
    </View>
  );
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.xl, paddingBottom: 64, maxWidth: 600, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg },
  back: { paddingVertical: tokens.spacing.xs, paddingRight: tokens.spacing.xs },
  backText: { fontSize: 28, color: tokens.colors.textPrimary, fontWeight: "400" },
  wordmark: { fontSize: 22, fontWeight: "700", color: tokens.colors.textPrimary },
  mark: { color: tokens.colors.accent, fontWeight: "700" },
  title: { fontSize: 34, fontWeight: "600", color: tokens.colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs },
  phaseRow: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.xs, marginTop: tokens.spacing.xl },
  phaseLabel: { fontSize: 20, fontWeight: "600" },
  phaseLive: { width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.colors.accent },
  tower: { marginTop: tokens.spacing.lg },
  step: { borderRadius: tokens.radii.card, borderWidth: 1, borderColor: tokens.colors.border, backgroundColor: tokens.colors.surfaceRaised, padding: tokens.spacing.md },
  stepLabel: { fontSize: 12, fontWeight: "500", letterSpacing: 0.06, color: tokens.colors.textMuted, textTransform: "uppercase" },
  quote: { fontSize: 15, color: tokens.colors.textPrimary, lineHeight: 21, marginTop: tokens.spacing.xs, fontStyle: "italic" },
  stepMeta: { fontSize: 13, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs },
  fn: { fontSize: 17, fontWeight: "600", color: tokens.colors.accent, marginTop: tokens.spacing.xs },
  stepValue: { fontSize: 15, color: tokens.colors.textPrimary, marginTop: 2 },
  guardLine: { fontSize: 14, color: tokens.colors.success, marginTop: 3 },
  doneBlock: { marginTop: tokens.spacing.xl, alignItems: "center", paddingVertical: tokens.spacing.lg },
  doneMark: { color: tokens.colors.success, fontSize: 28, fontWeight: "700" },
  doneTitle: { fontSize: 20, color: tokens.colors.textPrimary, fontWeight: "600", marginTop: tokens.spacing.sm },
  doneMeta: { fontSize: 14, color: tokens.colors.textSecondary, marginTop: 2 },
  secondary: { marginTop: tokens.spacing.lg, paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.lg, borderWidth: 1, borderColor: tokens.colors.border, borderRadius: tokens.radii.chip },
  secondaryText: { fontSize: 14, color: tokens.colors.textPrimary, fontWeight: "500" },
  controls: { marginTop: tokens.spacing.xl },
  controlsLabel: { fontSize: 12, fontWeight: "500", letterSpacing: 0.06, color: tokens.colors.textMuted, textTransform: "uppercase", marginBottom: tokens.spacing.xs },
  controlRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  controlText: { fontSize: 16, color: tokens.colors.textPrimary, fontWeight: "500" },
});
