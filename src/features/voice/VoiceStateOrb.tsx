import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { AppIcon, IconName } from "@/components/AppIcon";
import { fonts, motion, springs } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";

export type VoiceOrbState =
  | "ready"
  | "listening"
  | "checking"
  | "accepted"
  | "retry"
  | "calibrating"
  | "profile_ready";

const stateMeta: Record<VoiceOrbState, { label: string; icon: IconName; tone: string }> = {
  ready: { label: "Ready when you are", icon: "mic", tone: "#B8A9FF" },
  listening: { label: "Listening", icon: "activity", tone: "#C9BEFF" },
  checking: { label: "Checking sample", icon: "ellipsis", tone: "#AFC5FF" },
  accepted: { label: "Sample accepted", icon: "checkCircle", tone: "#72D5C9" },
  retry: { label: "Try that again", icon: "refresh", tone: "#F0B86B" },
  calibrating: { label: "Evaluation needed", icon: "settings", tone: "#C9BEFF" },
  profile_ready: { label: "Profile ready", icon: "shieldCheck", tone: "#72D5C9" },
};

export function VoiceStateOrb({ state, level = 0 }: { state: VoiceOrbState; level?: number }) {
  const t = useThemeTokens();
  const scale = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(0.28)).current;
  const beam = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const meta = stateMeta[state];

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  // A subtle scale shift keeps the control alive without adding decorative
  // concentric rings around the primary microphone affordance.
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: motion.ambientLoop / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: motion.ambientLoop / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  useEffect(() => {
    if (state === "listening") {
      Animated.spring(scale, {
        toValue: 1 + Math.min(Math.max(level, 0), 1) * (reduceMotion ? 0.02 : 0.16),
        ...springs.gentle,
        useNativeDriver: true,
      }).start();
      Animated.timing(halo, {
        toValue: 0.3 + Math.min(Math.max(level, 0), 1) * 0.5,
        duration: motion.fast,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.spring(scale, {
      toValue: state === "accepted" && !reduceMotion ? 1.06 : 1,
      ...springs.default,
      useNativeDriver: true,
    }).start();
    Animated.timing(halo, {
      toValue: state === "checking" ? 0.58 : 0.28,
      duration: motion.standard,
      useNativeDriver: true,
    }).start();

    if (state === "accepted" && !reduceMotion) {
      beam.setValue(0);
      Animated.timing(beam, {
        toValue: 1,
        duration: motion.emphasis,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [beam, halo, level, pulse, reduceMotion, scale, state]);

  return (
    <View
      style={s.wrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${meta.label}${state === "listening" ? `, audio level ${Math.round(level * 100)} percent` : ""}`}
    >
      <Animated.View style={[s.halo, { opacity: halo, transform: [{ scale: pulse }] }]} />
      <Animated.View
        pointerEvents="none"
        style={[
          s.acceptanceBeam,
          {
            opacity: beam.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 0.7, 0] }),
            transform: [{ scale: beam.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.55] }) }],
          },
        ]}
      />
      <Animated.View style={[s.orb, { backgroundColor: meta.tone, transform: [{ scale }] }]}>
        <View style={[s.orbCore, { backgroundColor: meta.tone }]}> 
          <AppIcon name={meta.icon} size={30} color="#17151F" />
        </View>
      </Animated.View>
      <View style={s.labelRow}>
        {state === "listening" ? <View style={s.liveDot} /> : null}
        <Text style={[s.label, { fontFamily: fonts.medium }]}>{meta.label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", minHeight: 168 },
  // This intentionally uses a soft rounded field rather than a circle: it
  // supports the control without reading as a second ring.
  halo: { position: "absolute", width: 126, height: 104, borderRadius: 38, backgroundColor: "#392878" },
  acceptanceBeam: { position: "absolute", width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: "#72D5C9" },
  orb: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8F78FF",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  orbCore: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(8,8,8,0.10)" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 18 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FF776F" },
  label: { color: "#F7F5FB", letterSpacing: 0.2, fontSize: 13 },
});
