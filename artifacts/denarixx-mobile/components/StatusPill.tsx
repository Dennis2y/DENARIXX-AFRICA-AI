import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  applied: { label: "Applied", color: "#7D8FA0" },
  reviewing: { label: "Reviewing", color: "#7E61FF" },
  interview: { label: "Interview", color: "#00E5FF" },
  offered: { label: "Offered", color: "#00FF9E" },
  rejected: { label: "Rejected", color: "#F14C4C" },
};

interface Props {
  status: string;
}

export function StatusPill({ status }: Props) {
  const colors = useColors();
  const config = STATUS_CONFIG[status] ?? { label: status, color: colors.mutedForeground };

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: config.color + "22",
          borderColor: config.color,
          borderRadius: colors.radius / 2,
        },
      ]}
    >
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
});
