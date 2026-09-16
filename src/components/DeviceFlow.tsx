import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { AppIcon, IconName } from "@/components/AppIcon";
import { fonts, motion, radii, spacing } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";

export const deviceFlowSteps: { label: string; icon: IconName }[] = [
  { label: "Listening", icon: "mic" },
  { label: "Captured", icon: "circleCheck" },
  { label: "Remembered", icon: "heartHandshake" },
];

// A small connected timeline that progresses, rather than static text with arrows.
export function DeviceFlow() {
  const t = useThemeTokens();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: motion.screenEnter * 4, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <View style={[styles.wrap, { backgroundColor: t.surface, borderColor: t.borderSubtle }]} accessible accessibilityLabel="Device flow: listening, captured, remembered">
      <View style={styles.track}>
        {deviceFlowSteps.map((step, index) => {
          const start = index / deviceFlowSteps.length;
          const end = (index + 1) / deviceFlowSteps.length;
          const opacity = progress.interpolate({ inputRange: [0, start, end, 1], outputRange: [0.35, 0.35, 1, 1], extrapolate: "clamp" });
          const active = progress.interpolate({ inputRange: [0, start, end, 1], outputRange: [0.4, 0.4, 1, 1], extrapolate: "clamp" });
          return (
            <Animated.View key={step.label} style={[styles.step, { opacity }]}>
              <Animated.View style={[styles.stepNode, { borderColor: t.accent, opacity: active, backgroundColor: t.surfaceRaised }]}>
                <AppIcon name={step.icon} size="inline" color={t.accent} />
              </Animated.View>
              <Text style={[styles.stepLabel, { color: t.textMuted, fontFamily: fonts.medium }]}>{step.label}</Text>
              {index < deviceFlowSteps.length - 1 ? (
                <Animated.View style={[styles.connector, { backgroundColor: t.borderStrong, opacity: progress.interpolate({ inputRange: [0, end, 1], outputRange: [0.5, 1, 1], extrapolate: "clamp" }) }]} />
              ) : null}
            </Animated.View>
          );
        })}
      </View>
      <Text style={[styles.foot, { color: t.textMuted, fontFamily: fonts.regular }]}>
        The physical ASK device controls recording. The app is the intelligence layer.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  track: { flexDirection: "row", alignItems: "center" },
  step: { flexDirection: "row", alignItems: "center", flex: 1 },
  stepNode: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 12, marginLeft: 8 },
  connector: { flex: 1, height: 1.5, marginHorizontal: spacing.xs },
  foot: { fontSize: 12, lineHeight: 17, marginTop: spacing.md },
});
