import React, { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, View, useWindowDimensions, Pressable, AccessibilityInfo } from "react-native";
import { router } from "expo-router";
import { Button, Text } from "react-native-paper";
import { memories, memoryRepository } from "@/data/memories";
import { liveEventRepository } from "@/data/liveMemory";
import { MemoryCard } from "@/components/MemoryCard";
import { AppIcon } from "@/components/AppIcon";
import { SectionHeader } from "@/components/SectionHeader";
import { DeviceFlow } from "@/components/DeviceFlow";
import { fonts, letterSpacing, motion, radii, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";

export default function Home() {
  const t = useThemeTokens();
  const scroll = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const heroGlow = scroll.interpolate({ inputRange: [0, 420], outputRange: [0, -46], extrapolate: "clamp" });

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: t.surfaceRaised }}
      contentContainerStyle={[styles.content, { maxWidth: Math.min(width - 2 * spacing.lg, 900 - (width >= 1024 ? 240 : 0)) }]}
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scroll } } }], { useNativeDriver: true })}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.brand, { color: t.textPrimary, fontFamily: fonts.bold }]}>ask<Text style={[styles.dot, { color: t.accent }]}>))</Text></Text>
          <Text style={[styles.tagline, { color: t.textMuted, fontFamily: fonts.regular }]}>What matters now.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open You"
          onPress={() => router.push("/you")}
          style={[styles.headerAvatar, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}
        >
          <AppIcon name="userRound" size="button" color={t.textMuted} />
        </Pressable>
      </View>

      <View style={[styles.hero, { backgroundColor: t.surfaceInverse, borderColor: t.borderStrong }]}>
        <Animated.View style={[styles.heroGlow, { backgroundColor: t.glow, transform: [{ translateY: heroGlow }] }]} pointerEvents="none" />
        <Text style={[styles.heroKicker, { color: t.accentOnDark, fontFamily: fonts.bold }]}>MEMORY IS READY</Text>
        <Text style={[styles.heroTitle, { fontFamily: fonts.bold }]}>Ask anything you've heard.</Text>
        <Text style={[styles.heroText, { fontFamily: fonts.regular }]}>
          Every conversation becomes searchable. Decisions, actions, and commitments you can actually find.
        </Text>
        <Button mode="contained" onPress={() => router.push("/ask")} contentStyle={styles.heroButtonContent} style={[styles.heroButton, { backgroundColor: t.accent }]}>
          <Text style={{ color: "#FFFFFF", fontFamily: fonts.semibold, fontSize: 14 }}>Just ask</Text>
        </Button>
      </View>

      <SectionHeader
        kicker="Memory"
        title="What matters"
        description="The decisions and commitments from your recent conversations."
      />
      <RevealList items={homeMemories} />

      <Text style={[styles.flowLabel, { color: t.textMuted, fontFamily: fonts.bold }]}>DEVICE FLOW</Text>
      <DeviceFlow />
      <View style={[styles.flowNote, { backgroundColor: t.surface, borderColor: t.borderSubtle }]}>
        <AppIcon name="zap" size="inline" color={t.accent} />
        <Text style={[styles.flowNoteText, { color: t.textMuted, fontFamily: fonts.regular }]}>
          Listening, capturing, transcribing, extracting, checking, and remembering happen in that order, entirely on this device. The Ask tab can run a capture now.
        </Text>
      </View>
    </Animated.ScrollView>
  );
}

// A live slice over the shared repository: shows the latest memories in memory,
// including anything captured in this session.
const homeMemories = (() => {
  const liveEvents = liveEventRepository.list().slice(0, 3);
  if (liveEvents.length) {
    const { projectEventToMemory } = require("@/data/memories");
    return liveEvents.map(projectEventToMemory);
  }
  return memories.slice(0, 3);
})();

// Staggered fade/rise reveal for memory cards as they enter the composition.
function RevealList({ items }: { items: any[] }) {
  const t = useThemeTokens();
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  return (
    <View>
      {items.map((m, i) => (
        <Reveal key={m.id} index={i} reduce={reduce}>
          <MemoryCard memory={m} />
        </Reveal>
      ))}
    </View>
  );
}

function Reveal({ children, index, reduce }: { children: React.ReactNode; index: number; reduce: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.timing(anim, { toValue: 1, duration: motion.standard + index * 60, delay: 40 * index, useNativeDriver: true }).start();
  }, [anim, index, reduce]);
  if (reduce) return <>{children}</>;
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 58, paddingBottom: 36, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  brand: { fontSize: 24, letterSpacing: letterSpacing.tight },
  dot: { fontWeight: "800" },
  tagline: { marginTop: 3, fontSize: 14 },
  headerAvatar: { width: 40, height: 40, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroGlow: { position: "absolute", top: -90, right: -70, width: 260, height: 260, borderRadius: 130 },
  heroKicker: { fontSize: 11, letterSpacing: letterSpacing.kicker, marginBottom: spacing.sm },
  heroTitle: { color: "#F7F5FB", fontSize: 30, letterSpacing: letterSpacing.display, lineHeight: 36, maxWidth: 320 },
  heroText: { marginTop: spacing.sm, color: "#AAA5B4", fontSize: 14, lineHeight: 21, maxWidth: 380 },
  heroButton: { marginTop: spacing.lg, borderRadius: radii.lg, alignSelf: "flex-start" },
  heroButtonContent: { minHeight: 48, paddingHorizontal: spacing.lg },
  flowLabel: { marginTop: spacing.lg, marginBottom: spacing.sm, fontSize: 11, letterSpacing: letterSpacing.kicker },
  flowNote: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  flowNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
