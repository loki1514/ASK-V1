import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { memoryGraph, MemoryNode, MemoryEdge } from "@/domain/memoryGraph";
import { tokens } from "@/theme/tokens";

const NODE_COLOR: Record<MemoryNode["type"], string> = {
  person: tokens.colors.textPrimary,
  project: tokens.colors.accent,
  conversation: tokens.colors.textSecondary,
  decision: tokens.colors.accent,
  action: tokens.colors.success,
  issue: tokens.colors.error,
  requirement: tokens.colors.warning,
  topic: tokens.colors.textSecondary,
};

// A sparse connected map: center project, people and events around it.
// Pure Views (native-safe, no canvas).
export default function MemoryGraph() {
  const router = useRouter();
  const { nodes, edges } = memoryGraph();

  const center = nodes.find((n) => n.type === "project");
  const people = nodes.filter((n) => n.type === "person");
  const events = nodes.filter((n) => n.type !== "project" && n.type !== "person");
  const ring = [...people, ...events].slice(0, 10);

  const angleFor = (i: number, total: number) => (i / total) * Math.PI * 2 - Math.PI / 2;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>ask<Text style={styles.mark}>) )</Text></Text>
      </View>
      <Text style={styles.title}>Memory graph</Text>
      <Text style={styles.subtitle}>How the things you know are connected.</Text>

      {/* The map */}
      <View style={styles.map}>
        {center ? (
          <View style={styles.centerNode}>
            <Text style={[styles.centerLabel, { color: NODE_COLOR[center.type] }]} numberOfLines={2}>{center.label}</Text>
            <Text style={styles.centerCount}>{center.events} connected</Text>
          </View>
        ) : null}
        {ring.map((node, i) => {
          const angle = angleFor(i, ring.length);
          const x = 140 + Math.cos(angle) * 120;
          const y = 140 + Math.sin(angle) * 120;
          return (
            <React.Fragment key={node.id}>
              {/* connecting line */}
              <View
                pointerEvents="none"
                style={[styles.edge, { left: 140, top: 140, transform: [{ rotate: `${angle + Math.PI / 2}rad` }] }]}
              />
              <View style={[styles.node, { left: x - 46, top: y - 20 }]}>
                <Text style={[styles.nodeLabel, { color: NODE_COLOR[node.type] }]} numberOfLines={1}>{node.label}</Text>
                <Text style={styles.nodeCount}>{node.events}</Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      <Text style={styles.legendLabel}>Legend</Text>
      <View style={styles.legend}>
        {(["person", "project", "decision", "action", "issue", "requirement"] as const).map((t) => (
          <View key={t} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: NODE_COLOR[t] }]} />
            <Text style={styles.legendText}>{t}</Text>
          </View>
        ))}
      </View>

      {/* Connections list */}
      <Text style={styles.legendLabel}>Connections</Text>
      {edges.slice(0, 12).map((edge: MemoryEdge) => (
        <View key={`${edge.sourceId}${edge.targetId}`} style={styles.edgeRow}>
          <Text style={styles.edgeText}>{edge.relationship}: </Text>
          <Text style={styles.edgeValue}>{edge.sourceId.replace("person_", "").replace("project_", "")}</Text>
          <Text style={styles.edgeText}> — </Text>
          <Text style={styles.edgeValue}>{edge.targetId.replace("person_", "").replace("project_", "")}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.xl, paddingBottom: 64, maxWidth: 640, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg },
  back: { paddingVertical: tokens.spacing.xs, paddingRight: tokens.spacing.xs },
  backText: { fontSize: 28, color: tokens.colors.textPrimary, fontWeight: "400" },
  wordmark: { fontSize: 22, fontWeight: "700", color: tokens.colors.textPrimary },
  mark: { color: tokens.colors.accent, fontWeight: "700" },
  title: { fontSize: 34, fontWeight: "600", color: tokens.colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs },
  map: { width: 280, height: 280, alignSelf: "center", marginTop: tokens.spacing.xl, position: "relative" },
  centerNode: {
    position: "absolute",
    left: 95,
    top: 95,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  centerLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  centerCount: { fontSize: 11, color: tokens.colors.textMuted, marginTop: 2 },
  edge: {
    position: "absolute",
    width: 120,
    height: 1,
    backgroundColor: tokens.colors.border,
  },
  node: {
    position: "absolute",
    width: 92,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: tokens.radii.row,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    alignItems: "center",
  },
  nodeLabel: { fontSize: 11, fontWeight: "600", maxWidth: 84 },
  nodeCount: { fontSize: 10, color: tokens.colors.textMuted, marginTop: 1 },
  legendLabel: { fontSize: 12, fontWeight: "500", letterSpacing: 0.06, color: tokens.colors.textMuted, textTransform: "uppercase", marginTop: tokens.spacing.xl, marginBottom: tokens.spacing.sm },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, color: tokens.colors.textSecondary, textTransform: "capitalize" },
  edgeRow: { flexDirection: "row", flexWrap: "wrap", paddingVertical: tokens.spacing.xs, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  edgeText: { fontSize: 13, color: tokens.colors.textMuted },
  edgeValue: { fontSize: 13, color: tokens.colors.textSecondary, fontWeight: "500" },
});
