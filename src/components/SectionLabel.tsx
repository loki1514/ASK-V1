import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

// Section header: 12 muted tracked label, 24 above and 8 below. Not a bar,
// not a background.
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.06,
    color: tokens.colors.textMuted,
    marginTop: tokens.spacing.lg,
    marginBottom: tokens.spacing.xs,
    textTransform: "uppercase",
  },
});
