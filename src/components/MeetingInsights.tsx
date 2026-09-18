import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { UnderstoodConversation } from "@/application/understandConversation";
import { AppIcon } from "@/components/AppIcon";
import { fonts, radii, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";

// The Dribbble "AI meeting assistant dashboard" treatment: live transcript
// feed with speaker context, a key-moments rail, and an event list grouped by
// meaning. Built from an UnderstoodConversation, so it stays demo-complete.
export function MeetingInsights({ conversation }: { conversation: UnderstoodConversation }) {
  const t = useThemeTokens();
  const { segments, speakers } = conversation.conversation;

  const speakerLabel = (seg: { anonymousSpeakerId?: string; speakerName?: string; resolvedSpeakerId?: string }) => {
    if (seg.resolvedSpeakerId) return seg.resolvedSpeakerId;
    if (seg.speakerName) return seg.speakerName;
    const spk = speakers.find((s) => s.id === seg.anonymousSpeakerId);
    return spk?.label ?? "Speaker";
  };

  // Key moments: the segments that produced an event.
  const keyMoments = conversation.drafts
    .map((draft) => ({
      text: draft.evidence[0]?.quotedText ?? "",
      type: draft.proposedType,
      title: draft.fields.title,
      time: formatMs(draft.evidence[0]?.startMs ?? 0),
    }));

  return (
    <View style={{ gap: spacing.md }}>
      {/* Live transcript feed */}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
        <View style={styles.cardHead}>
          <View style={[styles.liveDot, { backgroundColor: t.danger }]} />
          <Text style={[styles.cardTitle, { color: t.textPrimary, fontFamily: fonts.bold }]}>Transcript</Text>
          <Text style={[styles.cardMeta, { color: t.textMuted, fontFamily: fonts.regular }]}>
            {segments.length} segments · {speakers.length} speakers
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.feedScroller}>
          <View style={styles.feed}>
            {segments.slice(0, 12).map((seg, i) => (
              <View key={seg.id} style={styles.feedRow}>
                <Text style={[styles.feedTime, { color: t.textMuted, fontFamily: fonts.regular }]}>{formatMs(seg.startMs)}</Text>
                <View style={[styles.feedSpeaker, { backgroundColor: t.surfaceSubtle }]}>
                  <Text style={[styles.feedSpeakerText, { color: t.accent, fontFamily: fonts.medium }]} numberOfLines={1}>{speakerLabel(seg)}</Text>
                </View>
                <Text style={[styles.feedText, { color: t.textPrimary, fontFamily: fonts.regular }]} numberOfLines={2}>{seg.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Key moments (AI insights rail) */}
      {keyMoments.length ? (
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary, fontFamily: fonts.bold }]}>Key moments</Text>
          <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
            {keyMoments.map((moment, i) => (
              <View key={i} style={[styles.momentRow, { backgroundColor: t.surfaceRaised }]}>
                <MomentBadge type={moment.type} />
                <View style={styles.momentCopy}>
                  <Text style={[styles.momentTitle, { color: t.textPrimary, fontFamily: fonts.medium }]} numberOfLines={1}>{moment.title}</Text>
                  <Text style={[styles.momentText, { color: t.textMuted, fontFamily: fonts.regular }]} numberOfLines={2}>“{moment.text}”</Text>
                </View>
                <Text style={[styles.momentTime, { color: t.textMuted, fontFamily: fonts.regular }]}>{moment.time}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function MomentBadge({ type }: { type: string }) {
  const t = useThemeTokens();
  const meta: Record<string, { icon: any; color: string }> = {
    decision: { icon: "checkCircle", color: t.decision },
    action: { icon: "listChecks", color: t.action },
    commitment: { icon: "heartHandshake", color: t.commitment },
    question: { icon: "messageSquare", color: t.action },
    issue: { icon: "circleAlert", color: t.issue },
    risk: { icon: "shieldCheck", color: t.issue },
  };
  const m = meta[type] ?? { icon: "zap", color: t.textMuted };
  return (
    <View style={[styles.momentIcon, { backgroundColor: `${m.color}1A` }]}>
      <AppIcon name={m.icon} size={14} color={m.color} />
    </View>
  );
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 15 },
  cardMeta: { fontSize: 11, marginLeft: "auto" },
  feedScroller: { marginHorizontal: -spacing.md },
  feed: { paddingHorizontal: spacing.md, gap: spacing.sm, flexDirection: "row" },
  feedRow: { width: 260, gap: 4 },
  feedTime: { fontSize: 10 },
  feedSpeaker: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill },
  feedSpeakerText: { fontSize: 10 },
  feedText: { fontSize: 12, lineHeight: 16 },
  momentRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md },
  momentIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  momentCopy: { flex: 1 },
  momentTitle: { fontSize: 13 },
  momentText: { fontSize: 11, marginTop: 2 },
  momentTime: { fontSize: 10 },
});
