import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusPill } from "@/components/StatusPill";
import { useColors } from "@/hooks/useColors";
import { useApplications, type Application } from "@/hooks/useJobs";

const STATUS_ORDER = ["applied", "reviewing", "interview", "offered", "rejected"];

function ApplicationCard({ app }: { app: Application }) {
  const colors = useColors();

  const jobTitle = app.job?.title ?? `Job #${app.jobId}`;
  const company = app.job?.company ?? "";
  const appliedDate = new Date(app.appliedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const initials = company
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Pressable
      onPress={() => router.push(`/job/${app.jobId}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.secondary + "22",
              borderRadius: colors.radius - 4,
            },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.secondary }]}>
            {initials || "?"}
          </Text>
        </View>

        <View style={styles.info}>
          <Text
            style={[styles.jobTitle, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {jobTitle}
          </Text>
          {company && (
            <Text
              style={[styles.company, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {company}
            </Text>
          )}
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            Applied {appliedDate}
          </Text>
        </View>

        <StatusPill status={app.status} />
      </View>

      {app.coverLetter && (
        <View
          style={[
            styles.clPreview,
            {
              backgroundColor: colors.muted,
              borderRadius: colors.radius / 2,
              borderLeftColor: colors.primary,
            },
          ]}
        >
          <Text
            style={[styles.clText, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            {app.coverLetter}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ApplicationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: apps, isLoading, error, refetch, isRefetching } = useApplications();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const sorted = apps
    ? [...apps].sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      )
    : [];

  const counts = apps
    ? {
        total: apps.length,
        active: apps.filter((a) =>
          ["applied", "reviewing", "interview"].includes(a.status)
        ).length,
        offers: apps.filter((a) => a.status === "offered").length,
      }
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.primary }]}>
          Applications
        </Text>
        {counts && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>
                {counts.total}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                Total
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.statNum, { color: colors.primary }]}>
                {counts.active}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                Active
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.statNum, { color: colors.accent }]}>
                {counts.offers}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                Offers
              </Text>
            </View>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="account-lock-outline"
            size={48}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Sign in to see applications
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Use the web app to sign in, then your applications will appear here
          </Text>
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="send-circle-outline"
            size={48}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No applications yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Browse jobs and apply to get started
          </Text>
          <Pressable
            onPress={() => router.push("/")}
            style={[
              styles.browseBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.browseBtnText, { color: colors.primaryForeground }]}>
              Browse Jobs
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ApplicationCard app={item} />}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: bottomPad + 80,
          }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={sorted.length > 0}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    gap: 4,
  },
  statNum: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  jobTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  company: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  clPreview: {
    padding: 10,
    borderLeftWidth: 3,
  },
  clText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
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
  browseBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  browseBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
