import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MatchBadge } from "@/components/MatchBadge";
import { useColors } from "@/hooks/useColors";
import type { Job } from "@/hooks/useJobs";

interface Props {
  job: Job;
  onSave?: (jobId: number, saved: boolean) => void;
  isSaved?: boolean;
}

const JOB_TYPE_LABEL: Record<string, string> = {
  "full-time": "Full Time",
  "part-time": "Part Time",
  contract: "Contract",
  freelance: "Freelance",
};

const LEVEL_LABEL: Record<string, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
};

export function JobCard({ job, onSave, isSaved }: Props) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/job/${job.id}`);
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave?.(job.id, !isSaved);
  };

  const initials = job.company
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      testID={`job-card-${job.id}`}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.primary + "22", borderRadius: colors.radius - 4 },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {initials || "?"}
          </Text>
        </View>

        <View style={styles.info}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {job.title}
          </Text>
          <Text
            style={[styles.company, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {job.company}
          </Text>
        </View>

        {onSave && (
          <Pressable onPress={handleSave} style={styles.saveBtn} testID={`save-${job.id}`}>
            <MaterialCommunityIcons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={isSaved ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.meta}>
        <View
          style={[
            styles.chip,
            { backgroundColor: colors.muted, borderRadius: colors.radius / 2 },
          ]}
        >
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={12}
            color={colors.mutedForeground}
          />
          <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
            {job.location}
          </Text>
        </View>

        <View
          style={[
            styles.chip,
            { backgroundColor: colors.muted, borderRadius: colors.radius / 2 },
          ]}
        >
          <MaterialCommunityIcons
            name="briefcase-outline"
            size={12}
            color={colors.mutedForeground}
          />
          <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
            {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
          </Text>
        </View>

        {job.level && (
          <View
            style={[
              styles.chip,
              { backgroundColor: colors.muted, borderRadius: colors.radius / 2 },
            ]}
          >
            <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
              {LEVEL_LABEL[job.level] ?? job.level}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <MatchBadge score={job.matchScore} size="sm" />
        {job.salary && (
          <Text style={[styles.salary, { color: colors.accent }]}>
            {job.salary}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  company: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: {
    padding: 4,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  salary: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
