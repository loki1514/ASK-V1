import React, { useState } from "react";
import { ScrollView, StyleSheet, View, Pressable, TextInput, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { MemoryAnswer } from "@/domain/model";
import { MemoryCard } from "@/components/MemoryCard";
import { SectionHeader } from "@/components/SectionHeader";
import { AppIcon } from "@/components/AppIcon";
import { fonts, radii, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";
import { answerFromLiveMemory } from "@/data/liveMemory";
import { conversationStore } from "@/data/conversationStore";
import { EventCard } from "@/components/EventCard";

const exampleQuestions = [
  "What did we decide about the HVAC?",
  "Who was supposed to send the drawing?",
  "What happened with the electrical panels?",
];

export default function Ask() {
  const t = useThemeTokens();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MemoryAnswer>();
  const [asked, setAsked] = useState(false);
  const { width } = useWindowDimensions();
  const understood = conversationStore.get();

  const ask = (text?: string) => {
    const q = text ?? query;
    if (!q.trim()) return;
    setResult(answerFromLiveMemory(q));
    setAsked(true);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.surfaceRaised }} contentContainerStyle={[styles.content, { maxWidth: Math.min(width - 2 * spacing.lg, 760 - (width >= 1024 ? 240 : 0)) }]} keyboardShouldPersistTaps="handled">
      <SectionHeader
        kicker="Ask"
        title="Just ask."
        description="Ask anything you've heard. Answers come only from what was actually said, with the source attached."
      />

      <View style={styles.searchWrap}>
        <View style={[styles.searchField, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
          <AppIcon name="search" size="inline" color={t.textMuted} />
          <TextInput
            placeholder="What did we decide about the HVAC?"
            placeholderTextColor={t.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => ask()}
            returnKeyType="search"
            style={[styles.searchInput, { color: t.textPrimary, fontFamily: fonts.regular }]}
            accessibilityLabel="Ask a question about your conversation"
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

      {understood && !asked ? (
        <View style={[styles.convCard, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
          <Text style={[styles.convTitle, { color: t.textPrimary, fontFamily: fonts.medium }]}>{understood.summary.title}</Text>
          <Text style={[styles.convMeta, { color: t.textMuted, fontFamily: fonts.regular }]}>
            {understood.conversation.speakers.length} speakers · {understood.conversation.segments.length} segments · {understood.drafts.length} events understood
          </Text>
          {understood.summary.topPriorities.slice(0, 2).map((event) => {
            const draft = understood.drafts.find((d) => d.idempotencyKey === event.idempotencyKey);
            return draft ? <EventCard key={event.id} draft={draft} /> : null;
          })}
        </View>
      ) : null}

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
          <Text style={[styles.noHitsBody, { color: t.textMuted, fontFamily: fonts.regular }]}>No memory matches that question yet. Understand a conversation first, then ask again.</Text>
        </View>
      ) : null}

      <Text style={[styles.note, { color: t.textMuted, fontFamily: fonts.regular }]}>
        How this works: a conversation is parsed, speakers are identified, meaning is extracted, and everything is verified against source evidence before it becomes answerable memory.
      </Text>
    </ScrollView>
  );
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
  convCard: { marginTop: spacing.md, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  convTitle: { fontSize: 15 },
  convMeta: { fontSize: 12, marginTop: 3, marginBottom: spacing.sm },
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