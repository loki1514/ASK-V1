import React from "react";
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { Button, Text } from "react-native-paper";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { AppIcon } from "@/components/AppIcon";
import { SectionHeader } from "@/components/SectionHeader";
import { cleanTranscript } from "@/data/transcripts/cleanTranscript";
import { dirtyTranscript } from "@/data/transcripts/dirtyTranscript";
import { conversationStore } from "@/data/conversationStore";
import { liveEventRepository } from "@/data/liveMemory";
import { UnderstoodConversation, understandConversation } from "@/application/understandConversation";
import { ParsedConversation, SemanticEventDraft } from "@/domain/model";
import { fonts, letterSpacing, motion, radii, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";

type ProcessingState = "idle" | "parsing" | "speakers" | "understanding" | "compiling" | "verifying" | "remembered";
type Source = "dirty" | "clean" | "pasted";

const steps: Array<{ id: Exclude<ProcessingState, "idle">; label: string; detail: string }> = [
  { id: "parsing", label: "Reading conversation", detail: "Normalizing timestamps and speech" },
  { id: "speakers", label: "Finding speakers", detail: "Keeping identity claims honest" },
  { id: "understanding", label: "Understanding meaning", detail: "Actions, decisions, questions and risks" },
  { id: "compiling", label: "Compiling functions", detail: "Language becomes executable structure" },
  { id: "verifying", label: "Verifying evidence", detail: "Parameters, confidence and duplicates" },
  { id: "remembered", label: "Remembered", detail: "Canonical events added to ASK memory" },
];

export default function Understand() {
  const t = useThemeTokens();
  const { width } = useWindowDimensions();
  const [source, setSource] = React.useState<Source>("dirty");
  const [pasted, setPasted] = React.useState("");
  const [state, setState] = React.useState<ProcessingState>("idle");
  const [result, setResult] = React.useState<UnderstoodConversation>();
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const pulse = React.useRef(new Animated.Value(0)).current;
  const runRef = React.useRef(0);

  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  React.useEffect(() => {
    if (state === "idle" || state === "remembered" || reduceMotion) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion, state]);

  const input = source === "clean" ? cleanTranscript : source === "dirty" ? dirtyTranscript : pasted;
  const isWorking = state !== "idle" && state !== "remembered";
  const activeIndex = steps.findIndex((step) => step.id === state);

  const run = async () => {
    if (!input.trim() || isWorking) return;
    const runId = runRef.current + 1;
    runRef.current = runId;
    setResult(undefined);
    setState("parsing");
    const next = await understandConversation({ transcript: input, source, repository: liveEventRepository, now: () => new Date("2026-09-18T09:42:00.000Z") });
    if (runRef.current !== runId) return;
    setResult(next);
    conversationStore.set(next);
    const sequence: ProcessingState[] = ["speakers", "understanding", "compiling", "verifying", "remembered"];
    for (const nextState of sequence) {
      await delay(reduceMotion ? 80 : nextState === "remembered" ? 650 : 780);
      if (runRef.current !== runId) return;
      setState(nextState);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const reset = (nextSource: Source) => {
    runRef.current += 1;
    setSource(nextSource);
    setState("idle");
    setResult(undefined);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.surfaceRaised }}
      contentContainerStyle={[styles.content, { maxWidth: Math.min(width - 2 * spacing.lg, 980 - (width >= 1024 ? 240 : 0)) }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headingRow}>
        <SectionHeader kicker="Understand" title="Conversation → memory" description="Watch ASK turn raw speech into evidence-backed, askable structure." />
        <View style={[styles.localChip, { backgroundColor: t.successSurface }]}>
          <View style={[styles.localDot, { backgroundColor: t.success }]} />
          <Text style={[styles.localText, { color: t.success, fontFamily: fonts.bold }]}>LOCAL</Text>
        </View>
      </View>

      <View style={styles.sourceRow}>
        {(["dirty", "clean", "pasted"] as Source[]).map((item) => (
          <Pressable key={item} onPress={() => reset(item)} accessibilityRole="button" accessibilityState={{ selected: source === item }} style={[styles.sourceButton, { borderColor: source === item ? t.accent : t.borderSubtle, backgroundColor: source === item ? t.accentSoft : t.surface }]}>
            <Text style={[styles.sourceLabel, { color: source === item ? t.accent : t.textMuted, fontFamily: fonts.semibold }]}>{item === "pasted" ? "Paste yours" : `${capitalize(item)} transcript`}</Text>
          </Pressable>
        ))}
      </View>

      {source === "pasted" ? (
        <TextInput
          multiline
          value={pasted}
          onChangeText={setPasted}
          placeholder={'[00:10] SPEAKER_A\nPaste a timestamped conversation…'}
          placeholderTextColor={t.textMuted}
          style={[styles.pasteInput, { color: t.textPrimary, backgroundColor: t.surface, borderColor: t.borderSubtle, fontFamily: fonts.regular }]}
          accessibilityLabel="Paste transcript"
          textAlignVertical="top"
        />
      ) : null}

      <View style={[styles.instrument, { backgroundColor: t.surfaceInverse, borderColor: t.borderStrong }]}>
        <View style={styles.instrumentTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.instrumentKicker, { color: t.accentOnDark, fontFamily: fonts.bold }]}>{state === "idle" ? "READY" : state.toUpperCase()}</Text>
            <Text style={[styles.instrumentTitle, { fontFamily: fonts.display }]}>{stateTitle(state, result)}</Text>
            <Text style={[styles.instrumentBody, { fontFamily: fonts.regular }]}>{stateBody(state, result, source)}</Text>
          </View>
          <Animated.View style={[styles.orb, { backgroundColor: state === "remembered" ? t.success : t.accent, opacity: state === "idle" ? 0.55 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }), transform: [{ scale: state === "idle" || reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] }) }] }]}>
            <AppIcon name={state === "remembered" ? "check" : "scanSearch"} size="button" color="#FFFFFF" />
          </Animated.View>
        </View>

        <View style={styles.stepRail}>
          {steps.map((step, index) => {
            const reached = activeIndex >= index;
            const active = state === step.id;
            return (
              <View key={step.id} style={styles.stepWrap}>
                <View style={[styles.stepDot, { backgroundColor: reached ? t.accent : "#3B3743", borderColor: active ? t.accentOnDark : "transparent" }]} />
                {index < steps.length - 1 ? <View style={[styles.stepLine, { backgroundColor: activeIndex > index ? t.accent : "#3B3743" }]} /> : null}
              </View>
            );
          })}
        </View>
        <View style={styles.stepCopyRow}>
          <Text style={[styles.stepLabel, { color: "#F7F5FB", fontFamily: fonts.semibold }]}>{state === "idle" ? "One input. No prompt chain." : steps[Math.max(0, activeIndex)]?.label}</Text>
          {state !== "idle" ? <Text style={[styles.stepCount, { color: "#AAA5B4", fontFamily: fonts.regular }]}>{Math.max(1, activeIndex + 1)} / 6</Text> : null}
        </View>

        {state !== "idle" && result ? <CompilerView result={result} state={state} /> : (
          <View style={styles.idlePreview}>
            <View style={[styles.previewLine, { backgroundColor: "#312D38" }]} />
            <View style={[styles.previewLine, { width: "72%", backgroundColor: "#312D38" }]} />
            <Text style={[styles.idlePreviewText, { fontFamily: fonts.regular }]}>24 statements · 4 speakers · evidence preserved</Text>
          </View>
        )}

        <Button mode="contained" onPress={state === "remembered" ? () => reset(source) : run} loading={isWorking} disabled={!input.trim() || isWorking} contentStyle={styles.primaryContent} style={[styles.primary, { backgroundColor: t.accent }]}>
          {state === "remembered" ? "Run another transcript" : isWorking ? "Understanding…" : "Understand"}
        </Button>
      </View>

      {state === "remembered" && result ? <Completion result={result} onOpen={() => router.push(`/conversation/${result.conversation.id}`)} /> : null}
    </ScrollView>
  );
}

function CompilerView({ result, state }: { result: UnderstoodConversation; state: ProcessingState }) {
  const t = useThemeTokens();
  const draft = result.drafts.find((item) => item.proposedFunction === "CREATE_ACTION") ?? result.drafts[0];
  const segment = result.conversation.segments.find((item) => item.id === draft?.evidence[0]?.transcriptSegmentId);
  if (!draft || !segment) return null;
  const stateIndex = ["parsing", "speakers", "understanding", "compiling", "verifying", "remembered"].indexOf(state);
  return (
    <View style={styles.compilerGrid}>
      <View style={[styles.codeCard, { borderColor: "#3B3743" }]}>
        <Text style={[styles.codeKicker, { color: "#AAA5B4", fontFamily: fonts.bold }]}>{stateIndex >= 1 ? (segment.anonymousSpeakerId ?? "speaker") .replace("_", " ").toUpperCase() : "RAW SPEECH"}</Text>
        <Text style={[styles.quote, { fontFamily: fonts.medium }]}>“{segment.text}”</Text>
        <Text style={[styles.time, { color: "#AAA5B4", fontFamily: fonts.regular }]}>{formatTime(segment.startMs)} — {formatTime(segment.endMs)}</Text>
      </View>
      <View style={[styles.arrowBadge, { backgroundColor: "#2B2640" }]}><AppIcon name="arrowRight" size={14} color={t.accentOnDark} /></View>
      <View style={[styles.codeCard, { borderColor: stateIndex >= 3 ? t.accent : "#3B3743" }]}>
        <Text style={[styles.codeKicker, { color: t.accentOnDark, fontFamily: fonts.bold }]}>{stateIndex >= 3 ? draft.proposedFunction : stateIndex >= 2 ? "ACTION" : "FINDING MEANING"}</Text>
        <Field label="actor" value={draft.fields.actor ?? "—"} />
        <Field label="action" value={draft.fields.title} />
        <Field label="deadline" value="Today · 5:00 PM" />
        {stateIndex >= 4 ? <View style={styles.guardList}><CheckLine text="Function recognized" /><CheckLine text="Evidence verified" /><CheckLine text={`Confidence ${Math.round(draft.parserConfidence * 100)}%`} /><CheckLine text="No duplicate event" /></View> : null}
      </View>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <View style={styles.fieldRow}><Text style={[styles.fieldLabel, { fontFamily: fonts.regular }]}>{label}</Text><Text style={[styles.fieldValue, { fontFamily: fonts.medium }]}>{value}</Text></View>;
}

function CheckLine({ text }: { text: string }) {
  const t = useThemeTokens();
  return <View style={styles.checkLine}><AppIcon name="check" size={13} color={t.success} /><Text style={[styles.checkText, { fontFamily: fonts.regular }]}>{text}</Text></View>;
}

function Completion({ result, onOpen }: { result: UnderstoodConversation; onOpen: () => void }) {
  const t = useThemeTokens();
  const counts = result.summary.counts;
  return (
    <View style={styles.completion}>
      <View style={styles.metricsGrid}>
        <Metric label="Events" value={result.events.length} />
        <Metric label="Speakers" value={result.conversation.speakers.length} />
        <Metric label="Actions" value={counts.action ?? 0} />
        <Metric label="Decisions" value={counts.decision ?? 0} />
      </View>
      <View style={[styles.contrastCard, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
        <Text style={[styles.contrastKicker, { color: t.textMuted, fontFamily: fonts.bold }]}>THE DIFFERENCE</Text>
        <View style={styles.contrastRow}>
          <View style={[styles.contrastCell, { backgroundColor: t.dangerSurface }]}>
            <Text style={[styles.contrastStatus, { color: t.danger, fontFamily: fonts.bold }]}>NOT AN ACTION</Text>
            <Text style={[styles.contrastQuote, { color: t.textPrimary, fontFamily: fonts.medium }]}>“Maybe we should reduce the workstations to 100.”</Text>
            <Text style={[styles.contrastReason, { color: t.textMuted, fontFamily: fonts.regular }]}>No commitment or assignment detected.</Text>
          </View>
          <View style={[styles.contrastCell, { backgroundColor: t.successSurface }]}>
            <Text style={[styles.contrastStatus, { color: t.success, fontFamily: fonts.bold }]}>CREATE_ACTION</Text>
            <Text style={[styles.contrastQuote, { color: t.textPrimary, fontFamily: fonts.medium }]}>Ask client to confirm workstation count</Text>
            <Text style={[styles.contrastReason, { color: t.textMuted, fontFamily: fonts.regular }]}>Speaker 3 · Tomorrow · Verified</Text>
          </View>
        </View>
      </View>
      <Button mode="outlined" onPress={onOpen} contentStyle={styles.detailContent} style={[styles.detailButton, { borderColor: t.borderStrong }]} textColor={t.textPrimary}>Open conversation</Button>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const t = useThemeTokens();
  return <View style={[styles.metric, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}><Text style={[styles.metricValue, { color: t.textPrimary, fontFamily: fonts.display }]}>{value}</Text><Text style={[styles.metricLabel, { color: t.textMuted, fontFamily: fonts.regular }]}>{label}</Text></View>;
}

function stateTitle(state: ProcessingState, result?: UnderstoodConversation): string {
  if (state === "idle") return "Ready to understand.";
  if (state === "parsing") return "Reading conversation…";
  if (state === "speakers") return `${result?.conversation.speakers.length ?? 0} people detected`;
  if (state === "understanding") return "Finding what matters…";
  if (state === "compiling") return `${result?.conversation.segments.length ?? 0} statements → ${result?.drafts.length ?? 0} events`;
  if (state === "verifying") return `${result?.events.length ?? 0} / ${result?.drafts.length ?? 0} verified`;
  return `${result?.events.length ?? 0} events remembered`;
}

function stateBody(state: ProcessingState, result: UnderstoodConversation | undefined, source: Source): string {
  if (state === "idle") return `Loaded: ${source === "pasted" ? "your transcript" : `${capitalize(source)} transcript`}. ASK will progress automatically after one tap.`;
  if (state === "speakers") return "Names were not claimed. Every identity remains explicitly unresolved.";
  if (state === "remembered") return "The summary and answers below are generated from canonical events, never directly from raw transcript text.";
  return steps.find((step) => step.id === state)?.detail ?? "";
}

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 52, paddingBottom: 110, width: "100%", alignSelf: "center" },
  headingRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  localChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.pill, marginTop: 2 },
  localDot: { width: 6, height: 6, borderRadius: 3 },
  localText: { fontSize: 10, letterSpacing: 0.8 },
  sourceRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  sourceButton: { minHeight: 42, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1 },
  sourceLabel: { fontSize: 12 },
  pasteInput: { minHeight: 150, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md, fontSize: 13, lineHeight: 20 },
  instrument: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, overflow: "hidden" },
  instrumentTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  instrumentKicker: { fontSize: 10, letterSpacing: letterSpacing.kicker, marginBottom: 6 },
  instrumentTitle: { color: "#F7F5FB", fontSize: 28, letterSpacing: -0.7, lineHeight: 34 },
  instrumentBody: { color: "#AAA5B4", fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 560 },
  orb: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  stepRail: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg },
  stepWrap: { flexDirection: "row", alignItems: "center", flex: 1 },
  stepDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  stepLine: { height: 2, flex: 1, marginHorizontal: 5 },
  stepCopyRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  stepLabel: { fontSize: 12 },
  stepCount: { fontSize: 11 },
  idlePreview: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: "#201D26", borderRadius: radii.lg },
  previewLine: { height: 9, borderRadius: 5, marginBottom: 8 },
  idlePreviewText: { color: "#AAA5B4", fontSize: 11, marginTop: 5 },
  compilerGrid: { marginTop: spacing.lg, gap: spacing.xs },
  codeCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, padding: spacing.md, backgroundColor: "#201D26" },
  codeKicker: { fontSize: 10, letterSpacing: 1.1, marginBottom: 8 },
  quote: { color: "#F7F5FB", fontSize: 15, lineHeight: 22 },
  time: { fontSize: 11, marginTop: 8 },
  arrowBadge: { width: 28, height: 28, borderRadius: 14, alignSelf: "center", alignItems: "center", justifyContent: "center", transform: [{ rotate: "90deg" }] },
  fieldRow: { flexDirection: "row", gap: spacing.sm, paddingVertical: 5 },
  fieldLabel: { width: 66, color: "#AAA5B4", fontSize: 11 },
  fieldValue: { flex: 1, color: "#F7F5FB", fontSize: 12 },
  guardList: { marginTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#3B3743", paddingTop: spacing.sm, gap: 6 },
  checkLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  checkText: { color: "#D8D2E1", fontSize: 11 },
  primary: { marginTop: spacing.lg, borderRadius: radii.lg, alignSelf: "flex-start" },
  primaryContent: { minHeight: 48, paddingHorizontal: spacing.lg },
  completion: { marginTop: spacing.lg },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  metric: { flexGrow: 1, minWidth: 120, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, padding: spacing.md },
  metricValue: { fontSize: 28, lineHeight: 32 },
  metricLabel: { fontSize: 12, marginTop: 2 },
  contrastCard: { marginTop: spacing.md, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg },
  contrastKicker: { fontSize: 10, letterSpacing: 1.2, marginBottom: spacing.sm },
  contrastRow: { gap: spacing.xs },
  contrastCell: { padding: spacing.md, borderRadius: radii.md },
  contrastStatus: { fontSize: 10, letterSpacing: 0.8 },
  contrastQuote: { fontSize: 14, lineHeight: 20, marginTop: 5 },
  contrastReason: { fontSize: 11, lineHeight: 16, marginTop: 5 },
  detailButton: { marginTop: spacing.md, borderRadius: radii.lg, alignSelf: "flex-start" },
  detailContent: { minHeight: 46, paddingHorizontal: spacing.md },
});
