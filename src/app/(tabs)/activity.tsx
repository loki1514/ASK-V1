import React from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { liveEventRepository } from "@/data/liveMemory";
import { SectionHeader } from "@/components/SectionHeader";
import { AppIcon, IconName } from "@/components/AppIcon";
import { fonts, radii, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";

const iconByType: Record<string, IconName> = {
  decision: "checkCircle",
  action: "listChecks",
  commitment: "heartHandshake",
  issue: "circleAlert",
};

export default function Activity() {
  const t = useThemeTokens();
  const { width } = useWindowDimensions();

  // Live timeline: every canonical event committed through the pipeline,
  // including captures made in this session.
  const events = React.useMemo(() => liveEventRepository.list(), []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.surfaceRaised }} contentContainerStyle={[styles.content, { maxWidth: Math.min(width - 2 * spacing.lg, 760 - (width >= 1024 ? 240 : 0)) }]}>
      <SectionHeader
        kicker="Activity"
        title="Activity"
        description="A clean record of decisions, actions, and commitments. Not a raw recording log."
      />
      {events.length ? (
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
          {events.map((event, index) => (
            <View key={event.id} style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.borderSubtle }]}>
              <View style={[styles.rowIcon, { backgroundColor: t.surfaceSubtle }]}>
                <AppIcon name={iconByType[event.type] ?? "messageSquare"} size="inline" color={t.accent} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: t.textPrimary, fontFamily: fonts.medium }]}>{event.title}</Text>
                <Text style={[styles.rowMeta, { color: t.textMuted, fontFamily: fonts.regular }]}>{event.functionName} · {event.evidence.length} source{event.evidence.length === 1 ? "" : "s"}</Text>
              </View>
              <AppIcon name="arrowRight" size={16} color={t.textMuted} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <AppIcon name="waves" size="large" color={t.textMuted} />
          <Text style={[styles.emptyTitle, { color: t.textPrimary, fontFamily: fonts.bold }]}>Nothing here yet</Text>
          <Text style={[styles.emptyBody, { color: t.textMuted, fontFamily: fonts.regular }]}>When the ASK device starts listening, decisions and actions will show up here as they happen.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 58, paddingBottom: 40, width: "100%", alignSelf: "center" },
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  rowIcon: { width: 38, height: 38, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 15 },
  rowMeta: { fontSize: 12, marginTop: 2 },
  empty: { alignItems: "center", marginTop: spacing.xl, gap: spacing.xs, padding: spacing.lg },
  emptyTitle: { fontSize: 16 },
  emptyBody: { fontSize: 13, textAlign: "center", maxWidth: 320, lineHeight: 19 },
});
