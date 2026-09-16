import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View, Pressable, TextInput, useWindowDimensions } from "react-native";
import { Button, Text } from "react-native-paper";
import { MemoryAnswer, SemanticEventDraft, TranscriptSegment } from "@/domain/model";
import { answerFromMemories } from "@/lib/retrieval";
import { MemoryCard } from "@/components/MemoryCard";
import { SectionHeader } from "@/components/SectionHeader";
import { AppIcon, IconName } from "@/components/AppIcon";
import { fonts, radii, spacing, motion } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";
import { evidenceForSegment, runConversationPipeline, describeConversationState, ConversationState, PROCESSING_ORDER } from "@/application/runConversationPipeline";
import { liveEventRepository, liveTranscriptSegments, liveConversationId, answerFromLiveMemory } from "@/data/liveMemory";

const exampleQuestions = [
  "Why did the client reject option 2?",
  "What did we agree about the facade?",
  "Who owes the revised drawings?",
];

// PRD §8: a capture here takes real transcript segments, produces guarded drafts,
// and commits them through the idempotency path so they become searchable.
const liveDrafts: SemanticEventDraft[] = [
  {
    id: "derived_drawings",
    conversationId: liveConversationId,
    proposedType: "action",
    proposedFunction: "CREATE_ACTION",
    fields: {
      title: "Revised drawings",
      objectText: "Rohit will prepare the revised facade drawings and share them by Friday.",
      actor: "Rohit",
      people: ["Rohit"],
      project: "XYZ Tower",
      deadlineAt: "2026-09-18",
      status: "open",
    },
    parserConfidence: 0.96,
    evidence: [evidenceForSegment(liveTranscriptSegments.find((s) => s.id === "segment_drawings") as TranscriptSegment)],
    parserModelVersion: "fixture-parser/1.0.0",
    warnings: [],
    idempotencyKey: `live:drawings:${Date.now()}`,
  },
  {
    id: "derived_commitment",
    conversationId: liveConversationId,
    proposedType: "commitment",
    proposedFunction: "CREATE_COMMITMENT",
    fields: {
      title: "Pricing discussion",
      objectText: "I will speak with the contractor about pricing before the next client review.",
      actor: "You",
      people: ["You", "Contractor"],
      project: "XYZ Tower",
      status: "open",
    },
    parserConfidence: 0.91,
    evidence: [evidenceForSegment(liveTranscriptSegments.find((s) => s.id === "segment_pricing") as TranscriptSegment)],
    parserModelVersion: "fixture-parser/1.0.0",
    warnings: [],
    idempotencyKey: `live:pricing:${Date.now()}`,
  },
];

export default function Ask() {
  const t = useThemeTokens();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MemoryAnswer>();
  const [asked, setAsked] = useState(false);
  const [flowState, setFlowState] = useState<ConversationState>("idle");
  const [capturedCount, setCapturedCount] = useState(0);
  const { width } = useWindowDimensions();

  const pipeline = useMemo(() => liveDrafts, []);
  const isProcessing = flowState !== "idle" && flowState !== "remembered" && flowState !== "denied";

  const ask = (text?: string) => {
    const q = text ?? query;
    if (!q.trim()) return;
    setResult(answerFromLiveMemory(q));
    setAsked(true);
  };

  const captureConversation = async () => {
    setFlowState("listening");
    await delay(350);
    setFlowState("captured");
    await delay(250);
    setFlowState("transcribing");
    await delay(300);
    setFlowState("drafting");
    await delay(300);
    setFlowState("guarding");
    await delay(250);

    const outcome = runConversationPipeline({
      conversationId: liveConversationId,
      segments: liveTranscriptSegments,
      drafts: pipeline,
      repository: liveEventRepository,
      onTransition: (s) => setFlowState(s),
    });

    if (outcome.denied.length) {
      setFlowState("denied");
    } else if (outcome.reviewed.length) {
      setFlowState("review");
      Alert.alert(
        "Needs your approval",
        "ASK found a memory that needs your confirmation before it is saved to local memory.",
        [{ text: "Approve", onPress: () => { setFlowState("remembered"); } }, { text: "Not now", style: "cancel", onPress: () => setFlowState("denied") }],
      );
    } else {
      setFlowState("remembered");
    }
    setCapturedCount((c) => c + outcome.committed.length);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.surfaceRaised }} contentContainerStyle={[styles.content, { maxWidth: Math.min(width - 2 * spacing.lg, 760 - (width >= 1024 ? 240 : 0)) }]} keyboardShouldPersistTaps="handled">
      <SectionHeader
        kicker="Ask"
        title="Just ask."
        description="Chat with your local, evidence-backed memory. Answers come only from what was actually said, with the source attached."
      />

      <View style={styles.searchWrap}>
        <View style={[styles.searchField, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
          <AppIcon name="search" size="inline" color={t.textMuted} />
          <TextInput
            placeholder="Why did the client reject option 2?"
            placeholderTextColor={t.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => ask()}
            returnKeyType="search"
            style={[styles.searchInput, { color: t.textPrimary, fontFamily: fonts.regular }]}
            accessibilityLabel="Ask a question about your memory"
            autoCorrect={false}
          />
        </View>
        <Pressable
          onPress={() => ask()}
          disabled={!query.trim()}
          accessibilityRole="button"
          accessibilityLabel="Ask"
          style={[styles.sendButton, { backgroundColor: query.trim() ? t.accent : t.borderSubtle }]}
        >
          <AppIcon name="arrowRight" size="button" color={query.trim() ? "#FFFFFF" : t.textMuted} />
        </Pressable>
      </View>

      {!asked ? (
        <View style={styles.examples}>
          <Text style={[styles.examplesLabel, { color: t.textMuted, fontFamily: fonts.bold }]}>Try one of these</Text>
          {exampleQuestions.map((q) => (
            <Pressable key={q} onPress={() => { setQuery(q); ask(q); }} accessibilityRole="button" accessibilityLabel={q} style={[styles.exampleChip, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
              <AppIcon name="messageSquare" size={14} color={t.textMuted} />
              <Text style={[styles.exampleText, { color: t.textMuted, fontFamily: fonts.regular }]}>{q}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Live conversation instrument: the core flow */}
      <View style={[styles.captureCard, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
        <View style={styles.captureTop}>
          <View style={[styles.liveDot, { backgroundColor: flowState === "listening" || flowState === "captured" ? t.danger : t.textMuted }]} />
          <Text style={[styles.captureTitle, { color: t.textPrimary, fontFamily: fonts.medium }]}>
            {isProcessing ? "Processing this conversation" : "Turn a conversation into memory"}
          </Text>
        </View>
        <Text style={[styles.captureDesc, { color: t.textMuted, fontFamily: fonts.regular }]}>
          {flowState === "idle"
            ? "Run the demo capture: it transcribes, extracts decisions and actions, checks them against the guard rules, and commits the approved ones to local memory."
            : describeConversationState(flowState)}
        </Text>
        <View style={styles.progressRow}>
          {PROCESSING_ORDER.map((step, i) => {
            const activeIdx = PROCESSING_ORDER.indexOf(step);
            const reached = flowIndex(flowState) >= activeIdx;
            return (
              <View key={step} style={styles.progressStep}>
                <View style={[styles.progressDot, { backgroundColor: reached ? t.accent : t.borderStrong }]} />
                {i < PROCESSING_ORDER.length - 1 ? <View style={[styles.progressLine, { backgroundColor: reached ? t.accent : t.borderStrong }]} /> : null}
              </View>
            );
          })}
        </View>
        <Text style={[styles.captureMeta, { color: t.textMuted, fontFamily: fonts.regular }]}>
          {capturedCount > 0 ? `${capturedCount} memory captured and committed in this session` : "No captures in this session yet"}
        </Text>
        <Button
          mode="contained"
          onPress={captureConversation}
          disabled={isProcessing}
          loading={isProcessing}
          contentStyle={styles.captureButtonContent}
          style={[styles.captureButton, { backgroundColor: t.accent }]}
        >
          {flowState === "idle" ? "Capture a conversation" : flowState === "remembered" ? "Capture again" : "Processing…"}
        </Button>
      </View>

      {result ? (
        <View style={[styles.answerCard, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
          <View style={styles.answerHeader}>
            <Text style={[styles.answerLabel, { color: t.accent, fontFamily: fonts.bold }]}>Answer</Text>
            <View style={[styles.confidenceChip, { backgroundColor: confidenceSurface(result.confidence, t) }]}>
              <Text style={[styles.confidenceText, { color: confidenceColor(result.confidence, t), fontFamily: fonts.bold }]}>{result.confidence.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[styles.answerText, { color: t.textPrimary, fontFamily: fonts.medium }]}>{result.answer}</Text>
          <Text style={[styles.answerMode, { color: t.textMuted, fontFamily: fonts.regular }]}>
            {result.answerMode} · {result.hits.length} evidence source{result.hits.length === 1 ? "" : "s"}
          </Text>
        </View>
      ) : null}

      {result?.hits.length ? (
        <>
          <View style={styles.sourcesHeader}>
            <Text style={[styles.sourcesTitle, { color: t.textPrimary, fontFamily: fonts.bold }]}>Sources</Text>
            <Text style={[styles.muted, { color: t.textMuted, fontFamily: fonts.regular }]}>{result.hits.length} canonical memories</Text>
          </View>
          {result.hits.map(({ memory }) => (
            <MemoryCard key={memory.id} memory={memory} showEvidence />
          ))}
        </>
      ) : null}

      {asked && result && !result.hits.length ? (
        <View style={styles.noHits}>
          <AppIcon name="search" size="large" color={t.textMuted} />
          <Text style={[styles.noHitsTitle, { color: t.textPrimary, fontFamily: fonts.bold }]}>Nothing found yet</Text>
          <Text style={[styles.noHitsBody, { color: t.textMuted, fontFamily: fonts.regular }]}>No memory matches that question yet. Capture a conversation first, then ask again.</Text>
        </View>
      ) : null}

      <Text style={[styles.note, { color: t.textMuted, fontFamily: fonts.regular }]}>
        How answers are made: results come only from what was actually said, with the source attached. Captured memories are held locally and can be deleted at any time.
      </Text>
    </ScrollView>
  );
}

function flowIndex(state: ConversationState): number {
  const order: ConversationState[] = ["listening", "captured", "transcribing", "drafting", "guarding", "review", "committing", "remembered"];
  const i = order.indexOf(state);
  return i === -1 ? 0 : i;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function confidenceSurface(level: MemoryAnswer["confidence"], t: any): string {
  return level === "high" ? t.successSurface : level === "medium" ? t.warningSurface : t.dangerSurface;
}
function confidenceColor(level: MemoryAnswer["confidence"], t: any): string {
  return level === "high" ? t.success : level === "medium" ? t.warning : t.danger;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 58, paddingBottom: 40, width: "100%", alignSelf: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchField: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, minHeight: 52 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  sendButton: { width: 48, height: 48, borderRadius: radii.lg, alignItems: "center", justifyContent: "center" },
  examples: { marginTop: spacing.md },
  examplesLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: spacing.xs },
  exampleChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, paddingHorizontal: spacing.sm, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, marginBottom: 6 },
  exampleText: { fontSize: 13 },
  captureCard: { marginTop: spacing.lg, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  captureTop: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  captureTitle: { fontSize: 15 },
  captureDesc: { fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  progressRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md, marginBottom: spacing.sm },
  progressStep: { flexDirection: "row", alignItems: "center" },
  progressDot: { width: 10, height: 10, borderRadius: 5 },
  progressLine: { width: 34, height: 2, marginHorizontal: 2 },
  captureMeta: { fontSize: 11, marginBottom: spacing.sm },
  captureButton: { borderRadius: radii.lg, alignSelf: "flex-start" },
  captureButtonContent: { minHeight: 44, paddingHorizontal: spacing.lg },
  answerCard: { marginTop: spacing.lg, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg },
  answerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  answerLabel: { fontSize: 11, letterSpacing: 1 },
  confidenceChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.pill },
  confidenceText: { fontSize: 10, letterSpacing: 0.6 },
  answerText: { marginTop: spacing.sm, fontSize: 17, lineHeight: 24, fontWeight: "600" },
  answerMode: { marginTop: spacing.sm, fontSize: 12 },
  sourcesHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl, marginBottom: spacing.sm },
  sourcesTitle: { fontSize: 17 },
  muted: { fontSize: 12 },
  noHits: { alignItems: "center", marginTop: spacing.xl, padding: spacing.lg, gap: spacing.xs },
  noHitsTitle: { fontSize: 16 },
  noHitsBody: { fontSize: 13, textAlign: "center", maxWidth: 300, lineHeight: 19 },
  note: { fontSize: 12, lineHeight: 18, marginTop: spacing.xl },
});
