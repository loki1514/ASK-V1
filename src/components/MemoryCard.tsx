import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Memory } from "@/data/memories";
import { AppIcon, IconName } from "@/components/AppIcon";
import { fonts, radii, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";

// The four scannable memory kinds: icon + label + color (never color alone).
export const memoryTypeMeta: Record<Memory["type"], { icon: IconName; label: string }> = {
  "Decision": { icon: "checkCircle", label: "Decision" },
  "Action": { icon: "listChecks", label: "Action" },
  "Commitment": { icon: "heartHandshake", label: "Commitment" },
  "Issue": { icon: "circleAlert", label: "Issue" },
  "Risk": { icon: "circleAlert", label: "Risk" },
  "Question": { icon: "messageSquare", label: "Question" },
  "Approval": { icon: "checkCircle", label: "Approval" },
  "Rejection": { icon: "circleAlert", label: "Rejection" },
  "Requirement": { icon: "listChecks", label: "Requirement" },
  "Note": { icon: "fileText", label: "Note" },
  "Fact": { icon: "zap", label: "Fact" },
};

// Maps a memory type to its semantic color pair (theme-aware).
export function memoryTypeColors(type: Memory["type"]) {
  const t = useThemeTokens();
  switch (type) {
    case "Decision": case "Approval": return { color: t.decision, surface: t.decisionSurface };
    case "Action": case "Requirement": return { color: t.action, surface: t.actionSurface };
    case "Commitment": case "Fact": return { color: t.commitment, surface: t.commitmentSurface };
    case "Issue": case "Risk": case "Rejection": return { color: t.issue, surface: t.issueSurface };
    case "Question": return { color: t.action, surface: t.actionSurface };
    default: return { color: t.textMuted, surface: t.surfaceSubtle };
  }
}

export function MemoryCard({ memory, showEvidence = false }: { memory: Memory; showEvidence?: boolean }) {
  const evidence = memory.evidence[0];
  const t = useThemeTokens();
  const meta = memoryTypeMeta[memory.type];
  const { color, surface } = memoryTypeColors(memory.type);
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.borderSubtle }]} accessible accessibilityLabel={`${meta.label}: ${memory.title}`}>
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          <View style={[styles.typeBadge, { backgroundColor: surface }]}>
            <AppIcon name={meta.icon} size="inline" color={color} />
            <Text style={[styles.typeText, { color, fontFamily: fonts.bold }]} numberOfLines={1}>
              {meta.label}
            </Text>
          </View>
          <Text style={[styles.title, { color: t.textPrimary, fontFamily: fonts.bold }]} numberOfLines={2}>{memory.title}</Text>
        </View>
      </View>
      <Text style={[styles.content, { color: t.textPrimary, fontFamily: fonts.regular }]} numberOfLines={3}>{memory.content}</Text>
      <Text style={[styles.meta, { color: t.textMuted, fontFamily: fonts.medium }]}>
        {memory.date} · {memory.people.join(", ") || "Unknown speaker"}
      </Text>
      {showEvidence && evidence ? (
        <View style={[styles.evidence, { borderTopColor: t.borderSubtle }]}>
          <View style={styles.evidenceHead}>
            <AppIcon name="fileSearch" size={12} color={t.textMuted} />
            <Text style={[styles.evidenceLabel, { color: t.textMuted, fontFamily: fonts.bold }]}>SOURCE · {formatTime(evidence.startMs)}</Text>
          </View>
          <Text style={[styles.evidenceText, { color: t.textPrimary, fontFamily: fonts.regular }]}>“{evidence.quotedText}”</Text>
        </View>
      ) : null}
    </View>
  );
}

function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    shadowColor: "#17151F",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  titleWrap: { flex: 1 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: spacing.xs, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radii.pill },
  typeText: { fontSize: 10, letterSpacing: 0.06, textTransform: "uppercase" },
  title: { fontSize: 15, lineHeight: 20, marginBottom: spacing.xs },
  content: { fontSize: 13, lineHeight: 19, opacity: 0.82, marginBottom: spacing.sm },
  meta: { fontSize: 11 },
  evidence: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  evidenceHead: { flexDirection: "row", alignItems: "center", gap: 5 },
  evidenceLabel: { fontSize: 10, letterSpacing: 0.8 },
  evidenceText: { marginTop: 4, opacity: 0.75, fontSize: 12, lineHeight: 17 },
});
