import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MatchBadge } from "@/components/MatchBadge";
import { useColors } from "@/hooks/useColors";
import {
  useApplyToJob,
  useGenerateCoverLetter,
  useJob,
  useMatchExplain,
  useSaveJob,
} from "@/hooks/useJobs";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = parseInt(id ?? "0", 10);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const { data: job, isLoading } = useJob(jobId);
  const applyMutation = useApplyToJob();
  const saveJob = useSaveJob();
  const genCoverLetter = useGenerateCoverLetter();
  const matchExplain = useMatchExplain();

  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [matchExplanation, setMatchExplanation] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useLayoutEffect(() => {
    if (job) {
      navigation.setOptions({ title: job.title });
    }
  }, [job, navigation]);

  const handleSave = () => {
    const next = !isSaved;
    setIsSaved(next);
    saveJob.mutate({ jobId, save: next });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleGenerateCoverLetter = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await genCoverLetter.mutateAsync({ jobId });
      setCoverLetter(res?.coverLetter ?? res?.letter ?? JSON.stringify(res));
    } catch {
      Alert.alert("Error", "Could not generate cover letter. Please try again.");
    }
  };

  const handleMatchExplain = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await matchExplain.mutateAsync({ jobId });
      setMatchExplanation(res?.explanation ?? res?.message ?? JSON.stringify(res));
    } catch {
      Alert.alert("Error", "Could not get match analysis. Please try again.");
    }
  };

  const handleApply = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await applyMutation.mutateAsync({ jobId, coverLetter: coverLetter ?? undefined });
      setHasApplied(true);
      setShowApplyModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Applied!", "Your application has been submitted.");
    } catch {
      Alert.alert("Error", "Could not submit application. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={colors.mutedForeground}
        />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          Job not found
        </Text>
      </View>
    );
  }

  const initials = job.company
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { borderBottomColor: colors.border }]}>
          <View style={styles.heroTop}>
            <View
              style={[
                styles.companyAvatar,
                {
                  backgroundColor: colors.primary + "22",
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {initials}
              </Text>
            </View>
            <Pressable onPress={handleSave} style={styles.saveBtn}>
              <MaterialCommunityIcons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={26}
                color={isSaved ? colors.primary : colors.mutedForeground}
              />
            </Pressable>
          </View>

          <Text style={[styles.jobTitle, { color: colors.foreground }]}>
            {job.title}
          </Text>
          <Text style={[styles.company, { color: colors.primary }]}>
            {job.company}
          </Text>

          <View style={styles.chips}>
            <View
              style={[
                styles.chip,
                { backgroundColor: colors.muted, borderRadius: colors.radius / 2 },
              ]}
            >
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={14}
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
                size={14}
                color={colors.mutedForeground}
              />
              <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                {job.jobType}
              </Text>
            </View>
            {job.salary && (
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.accent + "22",
                    borderRadius: colors.radius / 2,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.accent }]}>
                  {job.salary}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.matchRow}>
            <MatchBadge score={job.matchScore} />
            {job.matchScore !== undefined && (
              <Pressable
                onPress={handleMatchExplain}
                disabled={matchExplain.isPending}
                style={[
                  styles.explainBtn,
                  {
                    borderColor: colors.border,
                    borderRadius: colors.radius / 2,
                  },
                ]}
              >
                {matchExplain.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="brain"
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={[styles.explainText, { color: colors.primary }]}>
                      Why this match?
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {matchExplanation && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              MATCH ANALYSIS
            </Text>
            <View
              style={[
                styles.analysisBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.primary + "44",
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text style={[styles.analysisText, { color: colors.foreground }]}>
                {matchExplanation}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            JOB DESCRIPTION
          </Text>
          <Text style={[styles.bodyText, { color: colors.foreground }]}>
            {job.description}
          </Text>
        </View>

        {job.requiredSkills?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              REQUIRED SKILLS
            </Text>
            <View style={styles.skillsWrap}>
              {job.requiredSkills.map((skill) => (
                <View
                  key={skill}
                  style={[
                    styles.skillTag,
                    {
                      backgroundColor: colors.secondary + "22",
                      borderColor: colors.secondary + "55",
                      borderRadius: colors.radius / 2,
                    },
                  ]}
                >
                  <Text style={[styles.skillText, { color: colors.secondary }]}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            COVER LETTER
          </Text>

          {coverLetter ? (
            <View
              style={[
                styles.clBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text
                style={[styles.clText, { color: colors.foreground }]}
                selectable
              >
                {coverLetter}
              </Text>
              <Pressable
                onPress={handleGenerateCoverLetter}
                style={styles.regenInline}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={14}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.regenInlineText, { color: colors.mutedForeground }]}>
                  Regenerate
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleGenerateCoverLetter}
              disabled={genCoverLetter.isPending}
              style={[
                styles.genClBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              {genCoverLetter.isPending ? (
                <View style={styles.row}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.genClText, { color: colors.mutedForeground }]}>
                    Generating cover letter...
                  </Text>
                </View>
              ) : (
                <View style={styles.row}>
                  <MaterialCommunityIcons
                    name="creation"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={[styles.genClText, { color: colors.primary }]}>
                    Generate AI Cover Letter
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomPad + 8,
          },
        ]}
      >
        {hasApplied ? (
          <View
            style={[
              styles.appliedBadge,
              {
                backgroundColor: colors.accent + "22",
                borderColor: colors.accent,
                borderRadius: colors.radius,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.accent}
            />
            <Text style={[styles.appliedText, { color: colors.accent }]}>
              Application Submitted
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowApplyModal(true)}
            style={({ pressed }) => [
              styles.applyBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            testID="apply-btn"
          >
            <Text style={[styles.applyText, { color: colors.primaryForeground }]}>
              Apply Now
            </Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={colors.primaryForeground}
            />
          </Pressable>
        )}
      </View>

      <Modal
        visible={showApplyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius * 2,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Confirm Application
            </Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              {coverLetter
                ? "Your AI cover letter will be included."
                : "No cover letter attached."}
            </Text>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowApplyModal(false)}
                style={[
                  styles.cancelBtn,
                  {
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleApply}
                disabled={applyMutation.isPending}
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                {applyMutation.isPending ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <Text style={[styles.confirmText, { color: colors.primaryForeground }]}>
                    Submit
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  hero: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  companyAvatar: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  saveBtn: {
    padding: 4,
  },
  jobTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  company: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  explainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  explainText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  section: {
    padding: 20,
    paddingBottom: 0,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  clBox: {
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  clText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  regenInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-end",
  },
  regenInlineText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  genClBtn: {
    padding: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  genClText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  analysisBox: {
    padding: 16,
    borderWidth: 1,
  },
  analysisText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  applyText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  appliedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1,
  },
  appliedText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "flex-end",
    padding: 16,
  },
  modalContent: {
    padding: 24,
    gap: 16,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  modalSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  confirmBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
  },
  confirmText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
