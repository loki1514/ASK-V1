import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { tokens } from "@/theme/tokens";
import { AppIcon, IconName } from "@/components/AppIcon";

// The standard list row: 16 label primary, optional 14 second line secondary,
// right side is a muted value or a hairline chevron. Hairline below. Min 56.
export function Row({
  label,
  second,
  value,
  icon,
  onPress,
  style,
  destructive,
}: {
  label: string;
  second?: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  style?: ViewStyle;
  destructive?: boolean;
}) {
  const content = (
    <>
      <View style={styles.copy}>
        <Text style={[styles.label, destructive && { color: tokens.colors.error }]} numberOfLines={1}>{label}</Text>
        {second ? <Text style={styles.second} numberOfLines={2}>{second}</Text> : null}
      </View>
      {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
      {onPress ? <AppIcon name="arrowRight" size={18} color={tokens.colors.textMuted} /> : null}
    </>
  );
  return (
    <View style={[styles.row, style]}>
      {onPress ? (
        <TouchableOpacity style={styles.inner} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      ) : (
        <View style={styles.inner}>{content}</View>
      )}
    </View>
  );
}

// Stat row: 2–4 values on one line, divided by thin vertical rules.
export function StatRow({ stats }: { stats: { value: string | number; label: string }[] }) {
  return (
    <View style={styles.statRow}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 ? <View style={styles.statDivider} /> : null}
          <View style={styles.stat}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

// Source row: small violet )) mark, then conversation · speaker · timestamp.
// Every generated answer or extracted fact carries one.
export function SourceRow({ text }: { text: string }) {
  return (
    <View style={styles.sourceRow}>
      <Text style={styles.sourceMark}>))</Text>
      <Text style={styles.sourceText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// Section label: 12 muted tracked, 24 above and 8 below.
export function ScreenSection({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

// One accent CTA per screen.
export function PrimaryCta({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.cta, disabled && styles.ctaDisabled]}
    >
      <Text style={styles.ctaText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  inner: { flexDirection: "row", alignItems: "center", minHeight: 56, paddingVertical: tokens.spacing.xs, gap: tokens.spacing.sm },
  copy: { flex: 1 },
  label: { fontSize: 16, color: tokens.colors.textPrimary, fontWeight: "500" },
  second: { fontSize: 14, color: tokens.colors.textSecondary, marginTop: 2 },
  value: { fontSize: 13, color: tokens.colors.textMuted },
  statRow: { flexDirection: "row", alignItems: "center", marginTop: tokens.spacing.md },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 28, fontWeight: "500", color: tokens.colors.textPrimary },
  statLabel: { fontSize: 13, color: tokens.colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: tokens.colors.border },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: tokens.spacing.xs },
  sourceMark: { color: tokens.colors.accent, fontSize: 13, fontWeight: "700" },
  sourceText: { fontSize: 13, color: tokens.colors.textMuted, flex: 1 },
  section: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.06,
    color: tokens.colors.textMuted,
    marginTop: tokens.spacing.lg,
    marginBottom: tokens.spacing.xs,
    textTransform: "uppercase",
  },
  cta: {
    marginTop: tokens.spacing.xl,
    borderRadius: tokens.radii.primaryButton,
    backgroundColor: tokens.colors.accent,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { backgroundColor: tokens.colors.surfaceRaised },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
