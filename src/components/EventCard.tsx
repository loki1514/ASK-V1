import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { AppIcon, IconName } from "@/components/AppIcon";
import { fonts, radii, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";
import { SemanticEventDraft, GuardDecision, CanonicalEvent } from "@/domain/model";

const typeMeta: Record<string, { icon: IconName; colorKey: string }> = {
  decision: { icon: "checkCircle", colorKey: "decision" },
  action: { icon: "listChecks", colorKey: "action" },
  commitment: { icon: "heartHandshake", colorKey: "commitment" },
  question: { icon: "messageSquare", colorKey: "action" },
  requirement: { icon: "fileText", colorKey: "action" },
  issue: { icon: "circleAlert", colorKey: "issue" },
  risk: { icon: "shieldCheck", colorKey: "issue" },
};

export function EventCard({ draft, guard, event }: { draft: SemanticEventDraft; guard?: GuardDecision; event?: CanonicalEvent }) {
  const t = useThemeTokens();
  const meta = typeMeta[draft.proposedType] ?? { icon: "zap", colorKey: "textMuted" };
  const color = (t as any)[meta.colorKey] ?? t.textMuted;
  const surface = (t as any)[`${meta.colorKey}Surface`] ?? t.surfaceSubtle;
  const outcome = guard?.outcome ?? "allow_commit";
  const outcomeColor = outcome === "allow_commit" ? t.success : outcome === "deny" ? t.danger : t.warning;

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: surface }]}>
          <AppIcon name={meta.icon} size={14} color={color} />
          <Text style={[styles.badgeText, { color, fontFamily: fonts.bold }]}>{draft.proposedType.toUpperCase()}</Text>
        </View>
        {guard ? (
          <View style={[styles.outcomeChip, { backgroundColor: outcome === "allow_commit" ? t.successSurface : outcome === "deny" ? t.dangerSurface : t.warningSurface }]}>
            <Text style={[styles.outcomeText, { color: outcomeColor, fontFamily: fonts.bold }]}>
              {outcome === "allow_commit" ? "✓ Verified" : outcome === "deny" ? "✗ Denied" : "⚠ Review"}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.title, { color: t.textPrimary, fontFamily: fonts.medium }]}>{draft.fields.title}</Text>
      <Text style={[styles.body, { color: t.textMuted, fontFamily: fonts.regular }]} numberOfLines={2}>{draft.fields.objectText}</Text>
      {draft.fields.actor ? (
        <View style={styles.metaRow}>
          <AppIcon name="userRound" size={12} color={t.textMuted} />
          <Text style={[styles.metaText, { color: t.textMuted, fontFamily: fonts.regular }]}>{draft.fields.actor}</Text>
        </View>
      ) : null}
      {draft.evidence[0] ? (
        <View style={[styles.evidence, { borderTopColor: t.borderSubtle }]}>
          <View style={styles.evidenceHead}>
            <AppIcon name="fileSearch" size={12} color={t.textMuted} />
            <Text style={[styles.evidenceLabel, { color: t.textMuted, fontFamily: fonts.bold }]}>Evidence</Text>
          </View>
          <Text style={[styles.evidenceText, { color: t.textPrimary, fontFamily: fonts.regular }]}>“{draft.evidence[0].quotedText}”</Text>
        </View>
      ) : null}
      {guard ? (
        <View style={styles.guardRow}>
          {guard.ruleResults.slice(0, 4).map((rule) => (
            <View key={rule.ruleId} style={styles.guardItem}>
              <AppIcon name={rule.result === "pass" ? "check" : rule.result === "fail" ? "circleAlert" : "refresh"} size={10} color={rule.result === "pass" ? t.success : rule.result === "fail" ? t.danger : t.warning} />
              <Text style={[styles.guardText, { color: t.textMuted, fontFamily: fonts.regular }]} numberOfLines={1}>{rule.reasonCode}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {event ? (
        <Text style={[styles.eventId, { color: t.textMuted, fontFamily: fonts.regular }]}>Event {event.id}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, marginBottom: spacing.sm },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.pill },
  badgeText: { fontSize: 10, letterSpacing: 0.5 },
  outcomeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill },
  outcomeText: { fontSize: 10, letterSpacing: 0.3 },
  title: { fontSize: 15, marginBottom: 3 },
  body: { fontSize: 13, lineHeight: 18, marginBottom: spacing.xs },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: spacing.xs },
  metaText: { fontSize: 12 },
  evidence: { marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth },
  evidenceHead: { flexDirection: "row", alignItems: "center", gap: 5 },
  evidenceLabel: { fontSize: 10, letterSpacing: 0.6 },
  evidenceText: { marginTop: 3, fontSize: 12, lineHeight: 16, opacity: 0.8 },
  guardRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.xs },
  guardItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  guardText: { fontSize: 10 },
  eventId: { fontSize: 10, marginTop: spacing.xs },
});