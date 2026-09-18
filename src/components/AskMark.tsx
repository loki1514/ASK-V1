import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useAccessibilityReduceMotion } from "@/theme/tokens";
import { colors as c } from "@/theme/tokens";

// The )) mark: three concentric arcs opening right. It is the intelligence and
// memory signal. Loops only while something is live; otherwise static.
export function AskMark({ size = 16, live = false, color }: { size?: number; live?: boolean; color?: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const reduce = useAccessibilityReduceMotion();

  useEffect(() => {
    if (!live || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, pulse, reduce]);

  const ink = color ?? c.accent;
  // Three right-open arcs, drawn as half-rings (border trick with transparent
  // rounded corners on two stacked views).
  return (
    <View
      style={{ width: size, height: size * 0.8, justifyContent: "center" }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="ASK memory signal"
    >
      <View style={styles.stack}>
        <Arc size={size * 0.68} stroke={Math.max(1.5, size * 0.09)} color={ink} />
        <Arc size={size * 0.84} stroke={Math.max(1.5, size * 0.09)} color={ink} />
        <Arc size={size} stroke={Math.max(1.5, size * 0.09)} color={ink} />
      </View>
      {live ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.9] }),
            },
          ]}
        >
          <Arc size={size * 1.2} stroke={Math.max(1.5, size * 0.09)} color={c.accentGlow} />
        </Animated.View>
      ) : null}
    </View>
  );
}

// One right-open arc: a half ring (border on a rounded square, three sides cut
// by a smaller transparent pseudo-element inset from the left).
function Arc({ size, stroke, color }: { size: number; stroke: number; color: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: color,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        transform: [{ rotate: "-45deg" }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  stack: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
