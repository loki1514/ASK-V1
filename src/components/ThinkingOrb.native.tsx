import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { AccessibilityInfo } from "react-native";

// Native implementation — Metro picks this on iOS/Android. Web uses ThinkingOrb.tsx.

export type ThinkingOrbState =
  | "working"
  | "searching"
  | "solving"
  | "listening"
  | "connecting"
  | "weaving"
  | "composing"
  | "breathing"
  | "shaping";

export const PROCESSING_ORB_STATE: Record<string, ThinkingOrbState> = {
  idle: "breathing",
  parsing: "working",
  speakers: "searching",
  understanding: "listening",
  compiling: "weaving",
  verifying: "solving",
  remembered: "breathing",
};

export function orbStateFor(state: string): ThinkingOrbState {
  return PROCESSING_ORB_STATE[state] ?? "breathing";
}

export function ProcessingThinkingOrb({ state, size = 64, dark = true }: { state: ThinkingOrbState; size?: number; dark?: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(spin, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.82, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    pulseLoop.start();
    return () => { loop.stop(); pulseLoop.stop(); };
  }, [reduce, spin, pulse]);

  const ink = dark ? "#C9BEFF" : "#5B3DF5";
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessible accessibilityLabel="Thinking">
      <Animated.View
        style={{
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: size * 0.36,
          borderWidth: 2,
          borderColor: ink,
          borderStyle: "dashed",
          opacity: pulse,
          transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }, { scale: pulse }],
        }}
      />
      <View style={{ position: "absolute", width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15, backgroundColor: ink, opacity: 0.9 }} />
    </View>
  );
}

export function ThinkingOrb({ state, size = 64, dark = true }: { state: ThinkingOrbState; size?: number; dark?: boolean }) {
  return <ProcessingThinkingOrb state={state} size={size} dark={dark} />;
}