import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@/theme/tokens";
import { Memory } from "@/data/memories";

// Standard list row: 16 label primary, optional 14 second line secondary,
// right side a muted value + chevron. Hairline below. Min height 56.
export function MemoryRow({ memory, onPress, trailing }: { memory: Memory; onPress?: () => void; trailing?: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${memory.type}: ${memory.title}`}>
      <View style={styles.copy}>
        <Text style={styles.label} numberOfLines={1}>{memory.title}</Text>
        <Text style={styles.second} numberOfLines={1}>{memory.content}</Text>
      </View>
      {trailing ? <Text style={styles.value}>{trailing}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingVertical: tokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  copy: { flex: 1, paddingRight: tokens.spacing.sm },
  label: { fontSize: 16, color: tokens.colors.textPrimary, fontWeight: "500" },
  second: { fontSize: 14, color: tokens.colors.textSecondary, marginTop: 2 },
  value: { fontSize: 13, color: tokens.colors.textMuted },
});
