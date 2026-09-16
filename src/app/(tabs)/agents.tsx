import React, { useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { SectionHeader } from "@/components/SectionHeader";
import { AppIcon, IconName } from "@/components/AppIcon";
import { getFunctionDefinition } from "@/domain/functions/registry";
import { FunctionName } from "@/domain/model";
import { fonts, radii, spacing, springs } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";

// Ten permissioned workers, each backed by a real registered ASK function
// (PRD §5.4 and §13): toggling one grants or revokes that function's permission.
const AGENT_DEFS: { name: string; purpose: string; icon: IconName; functions: FunctionName[]; defaultEnabled: boolean }[] = [
  { name: "Decision Keeper", purpose: "Records what was decided, with the exact words it was based on.", icon: "checkCircle", functions: ["CREATE_DECISION"], defaultEnabled: true },
  { name: "Action Tracker", purpose: "Turns who-does-what into trackable open actions with an owner.", icon: "listChecks", functions: ["CREATE_ACTION"], defaultEnabled: true },
  { name: "Commitment Watcher", purpose: "Keeps promises you made in conversation, with the person who made them.", icon: "heartHandshake", functions: ["CREATE_COMMITMENT"], defaultEnabled: true },
  { name: "Question Catcher", purpose: "Holds open questions so nothing asked is lost.", icon: "messageSquare", functions: ["CREATE_QUESTION"], defaultEnabled: true },
  { name: "Requirement Writer", purpose: "Captures requirements so they stay attached to their source.", icon: "fileText", functions: ["CREATE_REQUIREMENT"], defaultEnabled: true },
  { name: "Issue Radar", purpose: "Flags problems early, with the evidence that raised them.", icon: "circleAlert", functions: ["CREATE_ISSUE"], defaultEnabled: true },
  { name: "Risk Monitor", purpose: "Tracks things that could go wrong before they do.", icon: "shieldCheck", functions: ["CREATE_RISK"], defaultEnabled: false },
  { name: "Approval Gate", purpose: "Handles approvals and rejections. Needs your confirmation before either is saved.", icon: "lock", functions: ["CREATE_APPROVAL", "CREATE_REJECTION"], defaultEnabled: false },
  { name: "Note Taker", purpose: "Keeps small notes from conversation, linked to the moment they were said.", icon: "fileSearch", functions: ["CREATE_NOTE"], defaultEnabled: false },
  { name: "Fact Ledger", purpose: "Builds a stable facts sheet that later answers can cite.", icon: "database", functions: ["UPSERT_FACT"], defaultEnabled: false },
];

function AgentToggle({ enabled, onPress }: { enabled: boolean; onPress: () => void }) {
  const t = useThemeTokens();
  const anim = React.useRef(new Animated.Value(enabled ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.spring(anim, { toValue: enabled ? 1 : 0, ...springs.weighty, useNativeDriver: true }).start();
  }, [enabled, anim]);
  const knobTranslate = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 24] });
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={enabled ? "Agent on" : "Agent off"}
      onPress={onPress}
      style={[styles.toggleTrack, { backgroundColor: enabled ? t.accent : t.borderSubtle }]}
    >
      <Animated.View style={[styles.toggleKnob, { transform: [{ translateX: knobTranslate }] }]} />
    </Pressable>
  );
}

export default function Agents() {
  const t = useThemeTokens();
  const { width } = useWindowDimensions();
  const [states, setStates] = useState<Record<string, boolean>>(() => Object.fromEntries(AGENT_DEFS.map((a) => [a.name, a.defaultEnabled])));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.surfaceRaised }} contentContainerStyle={[styles.content, { maxWidth: Math.min(width - 2 * spacing.lg, 760 - (width >= 1024 ? 240 : 0)) }]}>
      <SectionHeader
        kicker="Agents"
        title="Agents"
        description="Ten small, permissioned workers on top of your memory. Each one only runs the function it is granted, and nothing leaves this device."
      />
      <View style={styles.list}>
        {AGENT_DEFS.map((agent) => {
          const on = states[agent.name];
          const registry = agent.functions.map(getFunctionDefinition).filter(Boolean) as NonNullable<ReturnType<typeof getFunctionDefinition>>[];
          const needsApproval = registry.some((f) => f.confirmation !== "none");
          const status = registry[0]?.defaultStatus ?? "informational";
          return (
            <View key={agent.name} style={[styles.card, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: t.surfaceSubtle }]}>
                  <AppIcon name={agent.icon} size="button" color={t.accent} />
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.name, { color: t.textPrimary, fontFamily: fonts.medium }]}>{agent.name}</Text>
                  <Text style={[styles.purpose, { color: t.textMuted, fontFamily: fonts.regular }]} numberOfLines={2}>{agent.purpose}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={[styles.permissionChip, { backgroundColor: needsApproval ? t.warningSurface : t.successSurface }]}>
                  <AppIcon name={needsApproval ? "lock" : "zap"} size={12} color={needsApproval ? t.warning : t.success} />
                  <Text style={[styles.permissionText, { color: needsApproval ? t.warning : t.success, fontFamily: fonts.bold }]}>
                    {needsApproval ? "Your approval" : "Automatic"}
                  </Text>
                </View>
                <Text style={[styles.fnChip, { color: t.textMuted, fontFamily: fonts.regular }]} numberOfLines={1}>
                  {agent.functions.join(" · ")}
                </Text>
              </View>
              <View style={styles.rowBottom}>
                <Text style={[styles.toggleLabel, { color: t.textMuted, fontFamily: fonts.medium }]}>{on ? `Permitted · ${status}` : "Paused"}</Text>
                <AgentToggle enabled={on} onPress={() => setStates((s) => ({ ...s, [agent.name]: !s[agent.name] }))} />
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 58, paddingBottom: 40, width: "100%", alignSelf: "center" },
  list: { gap: spacing.sm },
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconWrap: { width: 42, height: 42, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  name: { fontSize: 15 },
  purpose: { fontSize: 13, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  permissionChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.pill },
  permissionText: { fontSize: 10, letterSpacing: 0.5 },
  fnChip: { fontSize: 11, flex: 1 },
  rowBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  toggleLabel: { fontSize: 12 },
  toggleTrack: { width: 50, height: 30, borderRadius: 15, justifyContent: "center", paddingHorizontal: 2 },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
});
