import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

export type VoiceGlowVariant =
  | "colorful"
  | "mono"
  | "ocean"
  | "sunset"
  | "forest"
  | "candy"
  | "ice"
  | "gold";

export type VoiceGlowType = "default" | "pill" | "mobile";

export type VoiceGlowProps = {
  children: React.ReactNode;
  level: number;
  active?: boolean;
  processing?: boolean;
  type?: VoiceGlowType;
  colorVariant?: VoiceGlowVariant;
  strength?: number;
  style?: ViewStyle;
};

const PALETTES: Record<VoiceGlowVariant, string[]> = {
  colorful: ["#FF5C5C", "#FFB547", "#35D07F", "#5B2EFF", "#00C2FF", "#FF5CFF", "#5B2EFF"],
  mono: ["#8F78FF", "#B8A9FF", "#7457FF", "#5B2EFF", "#7457FF", "#B8A9FF", "#8F78FF"],
  ocean: ["#00C2FF", "#00E5FF", "#5B2EFF", "#0080FF", "#00C2FF", "#00E5FF", "#0080FF"],
  sunset: ["#FF5C5C", "#FF8A47", "#FFB547", "#FF5C5C", "#FF8A47", "#FFB547", "#FF5C5C"],
  forest: ["#35D07F", "#00C26E", "#2ECC71", "#35D07F", "#00C26E", "#2ECC71", "#35D07F"],
  candy: ["#FF5CFF", "#FF5C5C", "#FFB547", "#00C2FF", "#FF5CFF", "#FF5C5C", "#00C2FF"],
  ice: ["#A8E6FF", "#00C2FF", "#5B2EFF", "#A8E6FF", "#00E5FF", "#5B2EFF", "#A8E6FF"],
  gold: ["#FFD700", "#FFB547", "#FF8A47", "#FFD700", "#FFB547", "#FF8A47", "#FFD700"],
};

const TYPE_HEIGHTS: Record<VoiceGlowType, number> = {
  default: 64,
  pill: 32,
  mobile: 96,
};

export function VoiceGlow({
  children,
  level,
  active = true,
  processing = false,
  type = "mobile",
  colorVariant = "colorful",
  strength = 1,
  style,
}: VoiceGlowProps) {
  const colors = PALETTES[colorVariant];
  const glowHeight = TYPE_HEIGHTS[type];

  const pulse = useRef(new Animated.Value(0.4)).current;
  const beam = useRef(new Animated.Value(0)).current;
  const bloom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(bloom, {
      toValue: active ? Math.min(1, Math.max(0.15, level)) : 0,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }, [level, active, bloom]);

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.8, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulse.setValue(0.4);
    }
  }, [active, pulse]);

  useEffect(() => {
    if (processing) {
      beam.setValue(0);
      Animated.loop(
        Animated.timing(beam, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      beam.setValue(0);
    }
    return () => {
      beam.setValue(0);
    };
  }, [processing, beam]);

  const beamTranslate = beam.interpolate({
    inputRange: [0, 1],
    outputRange: ["-100%", "100%"],
  });

  return (
    <View style={[styles.wrap, style]}>
      {children}

      {/* Bottom glow layer */}
      <View style={[styles.glowBase, { height: glowHeight }]} pointerEvents="none">
        {colors.map((color, index) => {
          const left = `${(index / (colors.length - 1)) * 100}%` as `${number}%`;
          const width = `${100 / colors.length + 10}%` as `${number}%`;
          const lobeOpacity = (0.25 + Math.abs(Math.sin((index / colors.length) * Math.PI)) * 0.55) * strength;
          const lobeScale = 0.6 + (index % 3) * 0.2;
          return (
            <Animated.View
              key={index}
              style={[
                styles.lobe,
                {
                  left,
                  width,
                  backgroundColor: color,
                  opacity: Animated.multiply(bloom, lobeOpacity),
                  transform: [{ scaleY: Animated.multiply(bloom, lobeScale) }],
                },
              ]}
            />
          );
        })}

        {/* Core beam */}
        <Animated.View
          style={[
            styles.core,
            {
              opacity: Animated.multiply(pulse, strength),
              transform: [{ scaleY: bloom }],
            },
          ]}
        />

        {/* Processing traveling beam */}
        {processing && (
          <Animated.View
            style={[
              styles.traveler,
              {
                transform: [{ translateX: beamTranslate }],
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  glowBase: {
    position: "absolute",
    bottom: -24,
    left: -24,
    right: -24,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    overflow: "hidden",
    pointerEvents: "none",
  },
  lobe: {
    position: "absolute",
    bottom: 0,
    height: "100%",
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  core: {
    position: "absolute",
    bottom: 0,
    width: "40%",
    height: "60%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    opacity: 0.2,
  },
  traveler: {
    position: "absolute",
    bottom: 0,
    width: "30%",
    height: "80%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    opacity: 0.35,
  },
});
