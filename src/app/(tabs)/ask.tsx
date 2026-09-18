import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { answerFromLiveMemory } from "@/data/liveMemory";
import { conversationStore } from "@/data/conversationStore";
import { AppIcon } from "@/components/AppIcon";
import { SourceRow, StatRow } from "@/components/primitives";
import { fmtTime } from "@/application/memoryDerived";
import { tokens } from "@/theme/tokens";

const recent = [
  "What did I promise Raj?",
  "What did we decide about the HVAC?",
  "Who is waiting for me?",
  "What changed in the Bangalore project?",
];

export default function Ask() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>();
  const [asked, setAsked] = useState(false);
  const understood = conversationStore.get();

  const ask = (text?: string) => {
    const q = text ?? query;
    if (!q.trim()) return;
    setResult(answerFromLiveMemory(q));
    setAsked(true);
    setQuery("");
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Wordmark */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>

      <Text style={styles.title}>Ask anything you've heard.</Text>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <AppIcon name="search" size="inline" color={tokens.colors.textMuted} />
          <TextInput
            placeholder="What did I promise Raj?"
            placeholderTextColor={tokens.colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => ask()}
            returnKeyType="search"
            style={styles.searchInput}
            autoCorrect={false}
            accessibilityLabel="Ask a question about your memory"
          />
        </View>
        <TouchableOpacity onPress={() => ask()} disabled={!query.trim()} accessibilityRole="button" accessibilityLabel="Ask" style={[styles.send, !query.trim() && styles.sendDisabled]}>
          <AppIcon name="arrowRight" size="button" color={query.trim() ? "#FFFFFF" : tokens.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Recent (pre-ask) */}
      {!asked ? (
        <>
          {understood ? (
            <View style={styles.convBlock}>
              <Text style={styles.convTitle}>{understood.summary.title}</Text>
              <Text style={styles.convMeta}>
                {understood.conversation.speakers.length} people · {understood.drafts.length} events
              </Text>
            </View>
          ) : null}
          <View style={styles.recentBlock}>
            <Text style={styles.recentLabel}>Recent</Text>
            {recent.map((q) => (
              <TouchableOpacity key={q} onPress={() => ask(q)} accessibilityRole="button" accessibilityLabel={q} style={styles.recentRow}>
                <Text style={styles.recentText}>{q}</Text>
                <AppIcon name="arrowRight" size={16} color={tokens.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      {/* Answer */}
      {result ? (
        <View style={styles.answerBlock}>
          <Text style={styles.answerMark}>))</Text>
          <Text style={styles.answerText}>{result.answer}</Text>
          <SourceRow text={`${understood?.summary.title ?? "Bangalore Project"} · ${fmtTime(0)}`} />
          {result.hits?.length ? (
            <>
              <Text style={styles.sourcesLabel}>Sources</Text>
              {result.hits.map((hit: any) => (
                <View key={hit.memory.id} style={styles.sourceRow}>
                  <Text style={styles.sourceTitle}>{hit.memory.title}</Text>
                  <Text style={styles.sourceMeta}>{hit.memory.people.join(", ") || "Unknown"} · {fmtTime(hit.memory.evidence?.[0]?.startMs ?? 0)}</Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      ) : null}

      {asked && result && !result.hits?.length ? (
        <Text style={styles.noHit}>Nothing found yet. Try a different question.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.xl, paddingBottom: 96, maxWidth: 600, width: "100%", alignSelf: "center" },
  header: { marginBottom: tokens.spacing.xl },
  wordmark: { fontSize: 24, fontWeight: "700", color: tokens.colors.textPrimary },
  mark: { color: tokens.colors.accent, fontWeight: "700" },
  title: { fontSize: 30, fontWeight: "600", color: tokens.colors.textPrimary, letterSpacing: -0.4 },
  searchWrap: { flexDirection: "row", gap: tokens.spacing.sm, marginTop: tokens.spacing.lg },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    borderRadius: tokens.radii.row,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.spacing.md,
    minHeight: 52,
  },
  searchInput: { flex: 1, fontSize: 16, color: tokens.colors.textPrimary, paddingVertical: 0 },
  send: {
    width: 52,
    height: 52,
    borderRadius: tokens.radii.row,
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { backgroundColor: tokens.colors.surfaceRaised },
  convBlock: { marginTop: tokens.spacing.xl },
  convTitle: { fontSize: 18, fontWeight: "600", color: tokens.colors.textPrimary },
  convMeta: { fontSize: 13, color: tokens.colors.textMuted, marginTop: 2 },
  recentBlock: { marginTop: tokens.spacing.lg },
  recentLabel: { fontSize: 12, fontWeight: "500", letterSpacing: 0.06, color: tokens.colors.textMuted, textTransform: "uppercase", marginBottom: tokens.spacing.xs },
  recentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  recentText: { fontSize: 15, color: tokens.colors.textSecondary },
  answerBlock: { marginTop: tokens.spacing.xl, padding: tokens.spacing.lg, borderRadius: tokens.radii.card, borderWidth: 1, borderColor: tokens.colors.border, backgroundColor: tokens.colors.surfaceRaised },
  answerMark: { color: tokens.colors.accent, fontSize: 18, fontWeight: "700" },
  answerText: { fontSize: 17, lineHeight: 25, color: tokens.colors.textPrimary, fontWeight: "500", marginTop: tokens.spacing.xs },
  sourcesLabel: { fontSize: 12, fontWeight: "500", letterSpacing: 0.06, color: tokens.colors.textMuted, textTransform: "uppercase", marginTop: tokens.spacing.lg, marginBottom: tokens.spacing.xs },
  sourceRow: { paddingVertical: tokens.spacing.sm, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  sourceTitle: { fontSize: 15, color: tokens.colors.textPrimary, fontWeight: "500" },
  sourceMeta: { fontSize: 13, color: tokens.colors.textMuted, marginTop: 1 },
  noHit: { fontSize: 14, color: tokens.colors.textSecondary, marginTop: tokens.spacing.lg },
});
