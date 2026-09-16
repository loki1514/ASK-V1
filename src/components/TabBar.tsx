import React from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon, IconName } from "@/components/AppIcon";
import { fonts, nav, radii, springs, typeScale } from "@/theme/tokens";
import { useTheme } from "@/lib/themeContext";

export const NAV_ITEMS: { name: string; icon: IconName; label: string }[] = [
  { name: "home", icon: "activity", label: "Home" },
  { name: "ask", icon: "messageSquare", label: "Ask" },
  { name: "activity", icon: "waves", label: "Activity" },
  { name: "agents", icon: "bot", label: "Agents" },
  { name: "you", icon: "userRound", label: "You" },
];

export type TabBarProps = {
  activeKey: string;
  navigation?: any;
};

export function TabBar({ activeKey, navigation }: TabBarProps) {
  const { mode } = useTheme();
  const t = mode === "dark" ? dark : light;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensionsRNSafe();
  const isDesktop = width >= 1024;

  const navigate = (name: string) => {
    try {
      navigation?.navigate(name);
    } catch {
      const { router } = require("expo-router");
      router.navigate(`/${name}`);
    }
  };

  if (isDesktop) {
    return (
      <View style={[styles.rail, { backgroundColor: t.surface, borderRightColor: t.borderSubtle }]}>
        <View style={styles.railBrand}>
          <Text style={[styles.railWord, { color: t.textPrimary, fontFamily: fonts.display }]}>
            ask<Text style={[styles.railDot, { color: t.accent }]}>) )</Text>
          </Text>
        </View>
        {NAV_ITEMS.map((item) => {
          const active = item.name === activeKey;
          return (
            <TouchableOpacity
              key={item.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              onPress={() => navigate(item.name)}
              style={[styles.railItem, active && { backgroundColor: t.surfaceSubtle }]}
            >
              {active ? <View style={[styles.railMarker, { backgroundColor: t.accent }]} /> : null}
              <AppIcon name={item.icon} size="nav" color={active ? t.accent : t.navInactive} />
              <Text style={[styles.railLabel, { color: active ? t.accent : t.navInactive, fontFamily: active ? fonts.semibold : fonts.regular }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.bar, { backgroundColor: t.surface, borderTopColor: t.borderSubtle, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {NAV_ITEMS.map((item) => (
        <TabItem key={item.name} item={item} active={item.name === activeKey} activeColor={t.accent} inactiveColor={t.navInactive} onPress={() => navigate(item.name)} />
      ))}
    </View>
  );
}

function TabItem({ item, active, activeColor, inactiveColor, onPress }: { item: { name: string; icon: IconName; label: string }; active: boolean; activeColor: string; inactiveColor: string; onPress: () => void }) {
  const spring = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.spring(spring, { toValue: 1, ...springs.default, useNativeDriver: true }).start();
  }, [active, spring]);
  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={onPress}
      onPressIn={() => { if (!active) Animated.spring(spring, { toValue: 0.94, ...springs.default, useNativeDriver: true }).start(); }}
      onPressOut={() => { Animated.spring(spring, { toValue: 1, ...springs.default, useNativeDriver: true }).start(); }}
      style={styles.tab}
    >
      <Animated.View style={{ transform: [{ scale: spring }] }}>
        <View style={styles.tabIconWrap}>
          <AppIcon name={item.icon} size="nav" color={active ? activeColor : inactiveColor} />
        </View>
      </Animated.View>
      <Text style={[styles.tabLabel, { color: active ? activeColor : inactiveColor, fontFamily: active ? fonts.semibold : fonts.regular }]}>{item.label}</Text>
      {active ? <View style={[styles.tabIndicator, { backgroundColor: activeColor }]} /> : null}
    </TouchableOpacity>
  );
}

function useWindowDimensionsRNSafe() {
  // react-native-web window dimensions; safe on both native + web.
  const { useWindowDimensions } = require("react-native");
  return useWindowDimensions();
}

const light = {
  surface: "#FFFFFF",
  surfaceSubtle: "#F4F1FF",
  borderSubtle: "#E4E3EC",
  accent: "#5B3DF5",
  navInactive: "#918E9E",
  textPrimary: "#17151F",
};

const dark = {
  surface: "#17151F",
  surfaceSubtle: "#2B2640",
  borderSubtle: "#2A2731",
  accent: "#9C85FF",
  navInactive: "#918E9E",
  textPrimary: "#FAFAFC",
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 12,
    minHeight: nav.tabHeight,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 52, gap: 3 },
  tabIconWrap: { alignItems: "center", justifyContent: "center", minHeight: 26 },
  tabIndicator: { width: 18, height: 3, borderRadius: 2, marginTop: 2 },
  tabLabel: { fontSize: 11, letterSpacing: 0.02 },
  rail: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: nav.desktopRailWidth,
    paddingTop: 48,
    paddingHorizontal: 16,
    gap: 2,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  railBrand: { paddingHorizontal: 8, paddingBottom: 28 },
  railWord: { fontSize: 26, letterSpacing: -1.2 },
  railDot: { fontWeight: "800" },
  railItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: radii.md, position: "relative" },
  railMarker: { position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
  railLabel: { fontSize: 14 },
});
