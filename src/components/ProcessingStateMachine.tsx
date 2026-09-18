import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, Platform } from "react-native";
import { Text } from "react-native-paper";
import { fonts, motion, radii, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";
import { ThinkingOrb, orbStateFor } from "@/components/ThinkingOrb";

export type ProcessingState =
  | "idle"
  | "parsing"
  | "speakers"
  | "understanding"
  | "compiling"
  | "verifying"
  | "remembered";

const STATE_META: Record<ProcessingState, { label: string; detail: string; progress: number }> = {
  idle: { label: "Ready", detail: "Load a transcript to begin", progress: 0 },
  parsing: { label: "Reading conversation", detail: "Normalizing timestamps and speakers", progress: 0.18 },
  speakers: { label: "Identifying speakers", detail: "Detecting unique voices", progress: 0.36 },
  understanding: { label: "Understanding meaning", detail: "Finding decisions, actions, commitments", progress: 0.54 },
  compiling: { label: "Compiling events", detail: "Building structured memory", progress: 0.72 },
  verifying: { label: "Verifying", detail: "Checking evidence, confidence, duplicates", progress: 0.88 },
  remembered: { label: "Remembered", detail: "Events added to ASK memory", progress: 1 },
};

export function ProcessingStateMachine({ currentState, speakerCount, draftCount }: { currentState: ProcessingState; speakerCount?: number; draftCount?: number }) {
  const t = useThemeTokens();
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const meta = STATE_META[currentState];

  useEffect(() => {
    const { AccessibilityInfo } = require("react-native");
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    const target = meta.progress;
    Animated.timing(progress, {
      toValue: target,
      duration: reduceMotion ? 50 : motion.standard,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [meta.progress, progress, reduceMotion]);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const orbState = currentState === "idle" ? null : orbStateFor(currentState);

  return (
    <View style={[styles.wrap, { backgroundColor: t.surface, borderColor: t.borderSubtle }]} accessible accessibilityLabel={`Processing: ${meta.label}`}>
      <View style={styles.row}>
        {orbState ? (
          <ThinkingOrb state={orbState} size={64} dark={currentState !== "remembered"} />
        ) : (
          <View style={[styles.dot, { backgroundColor: t.accent }]} />
        )}
        <View style={styles.copy}>
          <Text style={[styles.label, { color: t.textPrimary, fontFamily: fonts.medium }]}>{meta.label}</Text>
          <Text style={[styles.detail, { color: t.textMuted, fontFamily: fonts.regular }]}>
            {currentState === "speakers" && speakerCount ? `${speakerCount} people detected` : meta.detail}
          </Text>
        </View>
        {currentState !== "idle" && currentState !== "remembered" ? (
          <Text style={[styles.percent, { color: t.textMuted, fontFamily: fonts.bold }]}>{Math.round(meta.progress * 100)}%</Text>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: t.borderSubtle }]}>
        <Animated.View style={[styles.fill, { backgroundColor: currentState === "remembered" ? t.success : t.accent, width: barWidth }]} />
      </View>
      {currentState === "remembered" && draftCount ? (
        <Text style={[styles.count, { color: t.textMuted, fontFamily: fonts.regular }]}>{draftCount} events added to ASK memory</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  copy: { flex: 1 },
  label: { fontSize: 15 },
  detail: { fontSize: 12, marginTop: 2 },
  percent: { fontSize: 13 },
  track: { height: 4, borderRadius: 2, marginTop: spacing.sm, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
  count: { fontSize: 12, marginTop: spacing.xs },
});