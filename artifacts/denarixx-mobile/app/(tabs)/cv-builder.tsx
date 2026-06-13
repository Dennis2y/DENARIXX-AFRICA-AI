import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGenerateCv, type CvGenerateResponse } from "@/hooks/useCvBuilder";
import { useUser } from "@/context/UserContext";

type Tab = "form" | "cv" | "letter";

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) {
  const colors = useColors();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground + "88"}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        style={[
          styles.input,
          multiline && styles.textarea,
          {
            color: colors.foreground,
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius / 2,
          },
        ]}
      />
    </View>
  );
}

function OutputSection({
  label,
  content,
  accentColor,
}: {
  label: string;
  content: string;
  accentColor: string;
}) {
  const colors = useColors();

  return (
    <View style={styles.outputSection}>
      <View style={styles.outputHeader}>
        <View style={[styles.outputDot, { backgroundColor: accentColor }]} />
        <Text style={[styles.outputLabel, { color: accentColor }]}>{label}</Text>
      </View>
      <View
        style={[
          styles.outputBox,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <Text
          style={[styles.outputText, { color: colors.foreground }]}
          selectable
        >
          {content}
        </Text>
      </View>
    </View>
  );
}

export default function CvBuilderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUser();
  const generateCv = useGenerateCv();

  const [tab, setTab] = useState<Tab>("form");
  const [result, setResult] = useState<CvGenerateResponse | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleGenerate = async () => {
    if (!profile.name.trim() || !profile.role.trim()) {
      Alert.alert("Missing info", "Please enter your name and target role.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await generateCv.mutateAsync({
        name: profile.name,
        targetRole: profile.role,
        yearsExperience: parseInt(profile.yearsExperience || "0", 10),
        location: profile.location,
        skills: profile.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        education: profile.education,
        experience: profile.experience,
      });

      setResult(res);
      setTab("cv");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not generate CV. Please try again.");
    }
  };

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
          CV Builder
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          AI-powered resumes for African talent
        </Text>

        {result && (
          <View
            style={[
              styles.tabRow,
              {
                backgroundColor: colors.muted,
                borderRadius: colors.radius / 2,
              },
            ]}
          >
            {(["form", "cv", "letter"] as Tab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[
                  styles.tabBtn,
                  {
                    backgroundColor:
                      tab === t ? colors.primary : "transparent",
                    borderRadius: colors.radius / 2 - 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        tab === t ? colors.primaryForeground : colors.mutedForeground,
                    },
                  ]}
                >
                  {t === "form"
                    ? "Form"
                    : t === "cv"
                    ? "Resume"
                    : "Cover Letter"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {tab === "form" && (
        <ScrollView
          contentContainerStyle={[
            styles.formContent,
            { paddingBottom: bottomPad + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.primary + "11",
                borderColor: colors.primary + "44",
                borderRadius: colors.radius,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="robot-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Our AI will craft a professional resume tailored for African job
              markets
            </Text>
          </View>

          <Field
            label="FULL NAME *"
            value={profile.name}
            onChange={(v) => updateProfile({ name: v })}
            placeholder="e.g. Amara Osei"
          />
          <Field
            label="TARGET ROLE *"
            value={profile.role}
            onChange={(v) => updateProfile({ role: v })}
            placeholder="e.g. Software Engineer"
          />
          <Field
            label="YEARS OF EXPERIENCE"
            value={profile.yearsExperience}
            onChange={(v) => updateProfile({ yearsExperience: v })}
            placeholder="e.g. 3"
            keyboardType="numeric"
          />
          <Field
            label="LOCATION"
            value={profile.location}
            onChange={(v) => updateProfile({ location: v })}
            placeholder="e.g. Lagos, Nigeria"
          />
          <Field
            label="SKILLS (comma-separated)"
            value={profile.skills}
            onChange={(v) => updateProfile({ skills: v })}
            placeholder="e.g. React, Python, SQL, Leadership"
          />
          <Field
            label="EDUCATION"
            value={profile.education}
            onChange={(v) => updateProfile({ education: v })}
            placeholder="e.g. BSc Computer Science, University of Ghana"
            multiline
          />
          <Field
            label="WORK EXPERIENCE"
            value={profile.experience}
            onChange={(v) => updateProfile({ experience: v })}
            placeholder="Describe your roles, responsibilities and achievements..."
            multiline
          />

          <Pressable
            onPress={handleGenerate}
            disabled={generateCv.isPending}
            style={({ pressed }) => [
              styles.generateBtn,
              {
                backgroundColor: generateCv.isPending
                  ? colors.primary + "88"
                  : colors.primary,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            testID="generate-cv-btn"
          >
            {generateCv.isPending ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color={colors.primaryForeground} size="small" />
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                  Generating...
                </Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <MaterialCommunityIcons
                  name="creation"
                  size={20}
                  color={colors.primaryForeground}
                />
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                  Generate CV
                </Text>
              </View>
            )}
          </Pressable>
        </ScrollView>
      )}

      {(tab === "cv" || tab === "letter") && result && (
        <ScrollView
          contentContainerStyle={[
            styles.outputContent,
            { paddingBottom: bottomPad + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {tab === "cv" ? (
            <OutputSection
              label="YOUR RESUME"
              content={result.resume}
              accentColor={colors.primary}
            />
          ) : (
            <OutputSection
              label="COVER LETTER"
              content={result.coverLetter}
              accentColor={colors.accent}
            />
          )}

          <Pressable
            onPress={() => {
              setResult(null);
              setTab("form");
            }}
            style={[
              styles.regenBtn,
              {
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={18}
              color={colors.mutedForeground}
            />
            <Text style={[styles.regenText, { color: colors.mutedForeground }]}>
              Edit &amp; Regenerate
            </Text>
          </Pressable>
        </ScrollView>
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
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  tabRow: {
    flexDirection: "row",
    padding: 3,
    gap: 2,
    marginTop: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  formContent: {
    padding: 20,
    gap: 16,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    gap: 10,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
  },
  input: {
    padding: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  generateBtn: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  outputContent: {
    padding: 20,
    gap: 20,
  },
  outputSection: {
    gap: 10,
  },
  outputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  outputDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  outputLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
  },
  outputBox: {
    padding: 16,
    borderWidth: 1,
  },
  outputText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1,
  },
  regenText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
