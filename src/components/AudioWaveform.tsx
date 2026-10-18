import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

export type AudioWaveformProps = {
  level: number;
  count?: number;
  active?: boolean;
  color?: string;
  style?: ViewStyle;
};

export function AudioWaveform({
  level,
  count = 7,
  active = true,
  color = "#5B2EFF",
  style,
}: AudioWaveformProps) {
  const bars = useRef<Animated.Value[]>([]);

  if (bars.current.length === 0) {
    for (let i = 0; i < count; i += 1) {
      bars.current.push(new Animated.Value(0.2));
    }
  }

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    if (active) {
      bars.current.forEach((bar, index) => {
        const phase = index / count;
        const base = 0.15 + Math.abs(Math.sin(phase * Math.PI)) * 0.35;
        const target = Math.min(1, base + level * 0.9);

        const anim = Animated.spring(bar, {
          toValue: target,
          friction: 5,
          tension: 180,
          useNativeDriver: true,
        });
        anim.start();
        animations.push(anim);
      });
    } else {
      bars.current.forEach((bar) => {
        const anim = Animated.timing(bar, {
          toValue: 0.15,
          duration: 250,
          useNativeDriver: true,
        });
        anim.start();
        animations.push(anim);
      });
    }

    return () => {
      for (const anim of animations) {
        anim.stop();
      }
    };
  }, [level, active, count]);

  return (
    <View style={[styles.wrap, style]}>
      {bars.current.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              opacity: bar.interpolate({
                inputRange: [0, 1],
                outputRange: [0.35, 1],
              }),
              transform: [
                { scaleY: bar },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
  },
  bar: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
});
