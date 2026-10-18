import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

export type ParticleFieldProps = {
  active: boolean;
  children: React.ReactNode;
  count?: number;
  color?: string;
  radius?: number;
  particleSize?: number;
  style?: ViewStyle;
};

export function ParticleField({
  active,
  children,
  count = 12,
  color = "#5B2EFF",
  radius = 120,
  particleSize = 6,
  style,
}: ParticleFieldProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const loop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      opacity.setValue(0);
      scale.setValue(0);
      rotation.setValue(0);

      loop.current = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
      );
      loop.current.start();

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      loop.current?.stop();
      loop.current = null;
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      loop.current?.stop();
    };
  }, [active, opacity, rotation, scale]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            opacity,
            transform: [{ rotate: spin }, { scale }],
          },
        ]}
        pointerEvents="none"
      >
        {Array.from({ length: count }).map((_, index) => {
          const angle = (index / count) * Math.PI * 2;
          const x = radius + radius * Math.cos(angle) - particleSize / 2;
          const y = radius + radius * Math.sin(angle) - particleSize / 2;
          return (
            <View
              key={index}
              style={[
                styles.particle,
                {
                  width: particleSize,
                  height: particleSize,
                  borderRadius: particleSize / 2,
                  backgroundColor: color,
                  left: x,
                  top: y,
                },
              ]}
            />
          );
        })}
      </Animated.View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute" },
  particle: { position: "absolute" },
});
