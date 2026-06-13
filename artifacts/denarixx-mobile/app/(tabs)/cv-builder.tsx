import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import {
  useGenerateCv,
  useImportCv,
  type CvGenerateResponse,
  type ParsedCvData,
} from "@/hooks/useCvBuilder";
import { useUser } from "@/context/UserContext";

type Tab = "form" | "cv" | "letter";

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
  highlight,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
  highlight?: boolean;
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
            backgroundColor: highlight
              ? colors.primary + "11"
              : colors.card,
            borderColor: highlight ? colors.primary + "66" : colors.border,
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={styles.reviewRow}>
      <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[styles.reviewValue, { color: colors.foreground }]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

function ImportReviewModal({
  visible,
  parsed,
  colors,
  insets,
  onApply,
  onDismiss,
}: {
  visible: boolean;
  parsed: ParsedCvData | null;
  colors: ReturnType<typeof useColors>;
  insets: { top: number; bottom: number };
  onApply: () => void;
  onDismiss: () => void;
}) {
  if (!parsed) return null;
  const skillsPreview = Array.isArray(parsed.skills)
    ? parsed.skills.slice(0, 8).join(", ") +
      (parsed.skills.length > 8 ? `  +${parsed.skills.length - 8} more` : "")
    : "";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View
            style={[styles.modalHandle, { backgroundColor: colors.border }]}
          />

          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalIconBg,
                { backgroundColor: colors.primary + "22" },
              ]}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={24}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              CV Imported
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: colors.mutedForeground }]}
            >
              Review the extracted fields below, then apply to pre-fill the form.
            </Text>
          </View>

          <ScrollView
            style={styles.reviewScroll}
            showsVerticalScrollIndicator={false}
          >
            <ReviewRow label="Name" value={parsed.name} />
            <ReviewRow label="Target Role" value={parsed.targetRole || parsed.currentRole} />
            <ReviewRow label="Location" value={parsed.location} />
            <ReviewRow label="Skills" value={skillsPreview} />
            <ReviewRow label="Education" value={parsed.education} />
            <ReviewRow label="Experience" value={parsed.experience} />
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable
              onPress={onDismiss}
              style={[
                styles.modalBtn,
                styles.modalBtnSecondary,
                { borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <Text
                style={[
                  styles.modalBtnText,
                  { color: colors.mutedForeground },
                ]}
              >
                Discard
              </Text>
            </Pressable>
            <Pressable
              onPress={onApply}
              style={[
                styles.modalBtn,
                styles.modalBtnPrimary,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="check"
                size={16}
                color={colors.primaryForeground}
              />
              <Text
                style={[
                  styles.modalBtnText,
                  { color: colors.primaryForeground },
                ]}
              >
                Apply to Form
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CvBuilderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, cvResult, saveCvResult } = useUser();
  const generateCv = useGenerateCv();
  const importCv = useImportCv();

  const [tab, setTab] = useState<Tab>("form");
  const result = cvResult;
  const [parsedCv, setParsedCv] = useState<ParsedCvData | null>(null);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState(false);

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

      await saveCvResult(res);
      setTab("cv");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not generate CV. Please try again.");
    }
  };

  const handlePickFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain"],
        copyToCacheDirectory: true,
      });

      if (picked.canceled || !picked.assets?.length) return;

      const asset = picked.assets[0];
      const filename = asset.name ?? "document";
      const uri = asset.uri;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let payload: { fileBase64: string; filename: string } | { cvText: string };

      if (filename.toLowerCase().endsWith(".txt")) {
        const text = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        payload = { cvText: text };
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        payload = { fileBase64: base64, filename };
      }

      const data = await importCv.mutateAsync(payload);
      setParsedCv(data);
      setReviewVisible(true);
    } catch (err: any) {
      const msg =
        err?.message?.replace(/^Import failed: \d+$/, "Could not import this file.") ??
        "Could not import your CV. Please try again.";
      Alert.alert("Import Failed", msg);
    }
  };

  const handleApplyImport = async () => {
    if (!parsedCv) return;

    const skillsStr = Array.isArray(parsedCv.skills)
      ? parsedCv.skills.join(", ")
      : "";

    await updateProfile({
      name: parsedCv.name || profile.name,
      role: parsedCv.targetRole || parsedCv.currentRole || profile.role,
      location: parsedCv.location || profile.location,
      skills: skillsStr || profile.skills,
      education: parsedCv.education || profile.education,
      experience: parsedCv.experience || profile.experience,
    });

    setReviewVisible(false);
    setParsedCv(null);
    setHighlightedFields(true);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => setHighlightedFields(false), 3000);
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

          <Pressable
            onPress={handlePickFile}
            disabled={importCv.isPending}
            style={({ pressed }) => [
              styles.importBtn,
              {
                borderColor: importCv.isPending
                  ? colors.primary + "44"
                  : colors.primary,
                borderRadius: colors.radius,
                backgroundColor: importCv.isPending
                  ? colors.primary + "08"
                  : colors.primary + "11",
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            testID="import-cv-btn"
          >
            {importCv.isPending ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.importBtnText, { color: colors.primary }]}>
                  Reading your CV…
                </Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <MaterialCommunityIcons
                  name="file-upload-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.importBtnText, { color: colors.primary }]}>
                  Upload CV to pre-fill
                </Text>
                <Text
                  style={[styles.importBtnHint, { color: colors.mutedForeground }]}
                >
                  PDF or TXT
                </Text>
              </View>
            )}
          </Pressable>

          {highlightedFields && (
            <View
              style={[
                styles.importedBanner,
                {
                  backgroundColor: colors.primary + "18",
                  borderColor: colors.primary + "44",
                  borderRadius: colors.radius / 2,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={15}
                color={colors.primary}
              />
              <Text style={[styles.importedBannerText, { color: colors.primary }]}>
                Fields pre-filled from your CV — review and edit below
              </Text>
            </View>
          )}

          <Field
            label="FULL NAME *"
            value={profile.name}
            onChange={(v) => updateProfile({ name: v })}
            placeholder="e.g. Amara Osei"
            highlight={highlightedFields && !!profile.name}
          />
          <Field
            label="TARGET ROLE *"
            value={profile.role}
            onChange={(v) => updateProfile({ role: v })}
            placeholder="e.g. Software Engineer"
            highlight={highlightedFields && !!profile.role}
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
            highlight={highlightedFields && !!profile.location}
          />
          <Field
            label="SKILLS (comma-separated)"
            value={profile.skills}
            onChange={(v) => updateProfile({ skills: v })}
            placeholder="e.g. React, Python, SQL, Leadership"
            highlight={highlightedFields && !!profile.skills}
          />
          <Field
            label="EDUCATION"
            value={profile.education}
            onChange={(v) => updateProfile({ education: v })}
            placeholder="e.g. BSc Computer Science, University of Ghana"
            multiline
            highlight={highlightedFields && !!profile.education}
          />
          <Field
            label="WORK EXPERIENCE"
            value={profile.experience}
            onChange={(v) => updateProfile({ experience: v })}
            placeholder="Describe your roles, responsibilities and achievements..."
            multiline
            highlight={highlightedFields && !!profile.experience}
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
              saveCvResult(null);
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

      <ImportReviewModal
        visible={reviewVisible}
        parsed={parsedCv}
        colors={colors}
        insets={{ top: insets.top, bottom: insets.bottom }}
        onApply={handleApplyImport}
        onDismiss={() => {
          setReviewVisible(false);
          setParsedCv(null);
        }}
      />
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
  importBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
  },
  importBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  importBtnHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginLeft: 2,
  },
  importedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  importedBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingTop: 12,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 16,
    alignItems: "center",
  },
  modalIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  reviewScroll: {
    paddingHorizontal: 20,
    flexGrow: 0,
  },
  reviewRow: {
    marginBottom: 12,
    gap: 2,
  },
  reviewLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  reviewValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  modalBtnSecondary: {
    borderWidth: 1,
  },
  modalBtnPrimary: {},
  modalBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
