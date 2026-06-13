import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JobCard } from "@/components/JobCard";
import { useColors } from "@/hooks/useColors";
import { useJobs, useSaveJob } from "@/hooks/useJobs";
import { useUser } from "@/context/UserContext";

const FILTERS = ["All", "Full Time", "Contract", "Remote"];

export default function JobsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const { savedJobIds, toggleSavedJob } = useUser();

  const { data: jobs, isLoading, error, refetch, isRefetching } = useJobs();
  const saveJob = useSaveJob();

  const filtered = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((j) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q);
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Full Time" && j.jobType === "full-time") ||
        (activeFilter === "Contract" && j.jobType === "contract") ||
        (activeFilter === "Remote" &&
          j.location.toLowerCase().includes("remote"));
      return matchesQuery && matchesFilter;
    });
  }, [jobs, query, activeFilter]);

  const handleSave = (jobId: number, saved: boolean) => {
    toggleSavedJob(jobId, saved);
    saveJob.mutate({ jobId, save: saved });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.logo, { color: colors.primary }]}>DENARIXX</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Find your next opportunity
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {jobs?.length ?? 0} jobs
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.mutedForeground}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search roles, companies..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            testID="job-search-input"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => {
              setActiveFilter(f);
              Haptics.selectionAsync();
            }}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  activeFilter === f ? colors.primary : colors.muted,
                borderRadius: colors.radius / 2,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    activeFilter === f
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                },
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading jobs...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="wifi-off"
            size={40}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Could not load jobs
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Check your connection and try again
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[
              styles.retryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onSave={handleSave}
              isSaved={savedJobIds.includes(item.id)}
            />
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: bottomPad + 80 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={filtered.length > 0}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons
                name="briefcase-search-outline"
                size={48}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No jobs found
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
