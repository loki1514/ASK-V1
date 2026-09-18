import React from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon, IconName } from "@/components/AppIcon";
import { tokens } from "@/theme/tokens";

// Bottom navigation: exactly four items. No Agents tab, no fifth bar, no FAB.
export const NAV_ITEMS: { name: string; icon: IconName; label: string }[] = [
  { name: "home", icon: "activity", label: "Today" },
  { name: "ask", icon: "messageSquare", label: "Ask" },
  { name: "activity", icon: "waves", label: "Activity" },
  { name: "you", icon: "userRound", label: "You" },
];

export type TabBarProps = {
  activeKey: string;
  navigation?: any;
};

export function TabBar({ activeKey, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  const navigate = (name: string) => {
    try {
      navigation?.navigate(name);
    } catch {
      const { router } = require("expo-router");
      router.navigate(`/${name === "home" ? "home" : name}`);
    }
  };

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: tokens.colors.bg, borderTopColor: tokens.colors.border, paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {NAV_ITEMS.map((item) => (
        <TabItem key={item.name} item={item} active={item.name === activeKey} onPress={() => navigate(item.name)} />
      ))}
    </View>
  );
}

function TabItem({ item, active, onPress }: { item: { name: string; icon: IconName; label: string }; active: boolean; onPress: () => void }) {
  const spring = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.spring(spring, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
  }, [active, spring]);

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View style={{ transform: [{ scale: spring }] }}>
        <View style={styles.tabIconWrap}>
          <AppIcon name={item.icon} size="nav" color={active ? tokens.colors.accent : tokens.colors.textMuted} />
        </View>
      </Animated.View>
      <Text style={[styles.tabLabel, { color: active ? tokens.colors.accent : tokens.colors.textSecondary }]}>{item.label}</Text>
      {active ? <View style={[styles.tabIndicator, { backgroundColor: tokens.colors.accent }]} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 12,
    minHeight: tokens.nav.tabHeight,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 50, gap: 3 },
  tabIconWrap: { alignItems: "center", justifyContent: "center", minHeight: 26 },
  tabIndicator: { width: 16, height: 3, borderRadius: 2, marginTop: 2 },
  tabLabel: { fontSize: 12, letterSpacing: 0.02, fontWeight: "500" },
});
