import React from "react";
import { View } from "react-native";
import { ThinkingOrb as RealOrb, OrbState, OrbTheme } from "thinking-orbs";

// Web implementation — Metro picks this on web. Native uses ThinkingOrb.native.tsx.
// (Metro's platform resolution: .native.tsx overrides .tsx on iOS/Android.)

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
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessible accessibilityLabel="Thinking">
      <RealOrb state={state as OrbState} size={64} theme={(dark ? "dark" : "light") as OrbTheme} />
    </View>
  );
}

export function ThinkingOrb({ state, size = 64, dark = true }: { state: ThinkingOrbState; size?: number; dark?: boolean }) {
  return <ProcessingThinkingOrb state={state} size={size} dark={dark} />;
}