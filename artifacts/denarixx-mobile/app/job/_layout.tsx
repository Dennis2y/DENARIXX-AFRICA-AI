import { Stack } from "expo-router";
import React from "react";

import { useColors } from "@/hooks/useColors";

export default function JobStackLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
        },
        headerShadowVisible: false,
        headerBackTitle: "",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: "Job Details",
        }}
      />
    </Stack>
  );
}
