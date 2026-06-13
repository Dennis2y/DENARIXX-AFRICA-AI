import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  score?: number;
  size?: "sm" | "md";
}

export function MatchBadge({ score, size = "md" }: Props) {
  const colors = useColors();

  if (score === undefined || score === null) return null;

  const pct = Math.round(score);
  const color =
    pct >= 80 ? colors.accent : pct >= 60 ? colors.primary : colors.secondary;

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: color,
          backgroundColor: color + "22",
          paddingHorizontal: isSmall ? 6 : 8,
          paddingVertical: isSmall ? 2 : 4,
          borderRadius: colors.radius / 2,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color, fontSize: isSmall ? 11 : 13, fontFamily: "Inter_700Bold" },
        ]}
      >
        {pct}% match
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    letterSpacing: 0.3,
  },
});
