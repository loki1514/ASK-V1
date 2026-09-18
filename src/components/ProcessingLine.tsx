import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { AskMark } from "@/components/AskMark";
import { tokens, useAccessibilityReduceMotion } from "@/theme/tokens";

// The one processing signal: a 2px accent line that fills, plus the )) mark
// that loops while live. Progress is a line only, never a percentage circle,
// never a spinner, never a skeleton shimmer.
export function ProcessingLine({ label, detail, progress }: { label: string; detail: string; progress: number }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(value, { toValue: progress, duration: tokens.motion.standard, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress, value]);
  const width = value.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <View style={[styles.wrap, { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }]}>
      <View style={styles.row}>
        <AskMark size={22} live color={tokens.colors.accent} />
        <View style={styles.copy}>
          <Text style={[styles.label, { color: tokens.colors.textPrimary }]}>{label}</Text>
          <Text style={[styles.detail, { color: tokens.colors.textMuted }]}>{detail}</Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: tokens.colors.surfaceRaised }]}>
        <Animated.View style={[styles.fill, { backgroundColor: tokens.colors.accent, width }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: tokens.radii.row, borderWidth: 1, padding: tokens.spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  copy: { flex: 1 },
  label: { fontSize: 15, fontWeight: "600" },
  detail: { fontSize: 13, marginTop: 2 },
  track: { height: 2, borderRadius: 1, marginTop: tokens.spacing.sm, overflow: "hidden" },
  fill: { height: 2, borderRadius: 1 },
});
