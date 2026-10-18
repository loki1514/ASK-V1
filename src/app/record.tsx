import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import {
  Surface,
  Card,
  FAB,
  Text,
  IconButton,
  ProgressBar,
  Button,
  Chip,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useVoiceEnrollmentRecorder } from "@/features/voice/useVoiceEnrollmentRecorder";
import { VoiceStateOrb } from "@/features/voice/VoiceStateOrb";
import { AudioWaveform } from "@/components/AudioWaveform";
import { VoiceGlow } from "@/components/VoiceGlow";
import { getDefaultSttProvider } from "@/infrastructure/asr/getDefaultSttProvider";
import { loadDevSettings, saveDevSettings } from "@/infrastructure/dev/devSettingsStore";
import { understandConversation, SessionCanonicalEventRepository } from "@/application/understandConversation";
import { liveEventRepository } from "@/data/liveMemory";
import { conversationStore } from "@/data/conversationStore";
import { playSfx } from "@/lib/sfx";
import { tokens } from "@/theme/tokens";
import { isDevModeEnabled } from "@/config/devMode";

type Step = "ready" | "starting" | "recording" | "transcribing" | "understanding" | "done" | "error";

function fmtDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const isExpoGo = (Constants.appOwnership as string | null) === "ExpoGo";

export default function RecordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const recorder = useVoiceEnrollmentRecorder();
  const [step, setStep] = useState<Step>("ready");
  const [error, setError] = useState<string>("");
  const [transcriptPreview, setTranscriptPreview] = useState<string>("");
  const [devPhrase, setDevPhrase] = useState<string>("");
  const [devUiVisible, setDevUiVisible] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    loadDevSettings().then((settings) => {
      if (mounted) setDevPhrase(settings.mockSttPhrase);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (recorder.isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.05, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      Animated.spring(pulse, { toValue: 1, friction: 6, tension: 200, useNativeDriver: true }).start();
    }
  }, [recorder.isRecording, pulse]);

  const processTranscript = useCallback(async (text: string) => {
    setTranscriptPreview(text);
    setStep("understanding");

    const transcript = `[00:00] SPEAKER_A\n${text}`;
    try {
      const out = await understandConversation({
        transcript,
        source: "recorded",
        repository: new SessionCanonicalEventRepository(liveEventRepository),
        now: () => new Date(),
      });
      conversationStore.set(out);
      setStep("done");
      playSfx("success");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/conversation/${out.conversation.id}`);
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : "Could not understand conversation");
      playSfx("error");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [router]);

  const toggleRecording = useCallback(async () => {
    if (recorder.isRecording) {
      setStep("transcribing");
      playSfx("record_stop");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const sample = recorder.stop();
      const provider = getDefaultSttProvider();

      let text: string;
      try {
        if (provider.stop) {
          text = await provider.stop();
        } else if (sample) {
          text = await provider.transcribe(sample);
        } else {
          throw new Error("No audio was captured. Try speaking a little longer, or check microphone permission.");
        }
      } catch (e) {
        setStep("error");
        setError(e instanceof Error ? e.message : "Transcription failed");
        playSfx("error");
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      await processTranscript(text);
      return;
    }

    setError("");
    setTranscriptPreview("");
    setStep("starting");
    const provider = getDefaultSttProvider();
    if (provider.start) {
      try {
        await provider.start();
      } catch (e) {
        setStep("error");
        setError(e instanceof Error ? e.message : "STT failed to start");
        playSfx("error");
        return;
      }
    }
    const ok = await recorder.start();
    if (!ok) {
      setStep("error");
      setError(recorder.error ?? "Could not start microphone. Check permission and try again.");
      playSfx("error");
      return;
    }
    setStep("recording");
    playSfx("record_start");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [recorder, processTranscript]);

  const simulateRecording = useCallback(async () => {
    setError("");
    setTranscriptPreview("");
    setStep("transcribing");
    playSfx("record_start");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const settings = await loadDevSettings();
    const phrase = settings.mockSttPhrase.trim();
    if (!phrase) {
      setStep("error");
      setError("Set a dev phrase first, then tap Simulate.");
      playSfx("error");
      return;
    }

    await processTranscript(phrase);
  }, [processTranscript]);

  const updateDevPhrase = useCallback((value: string) => {
    setDevPhrase(value);
    void saveDevSettings({ mockSttPhrase: value });
  }, []);

  const providerName = getDefaultSttProvider().name;
  const isBusy = step === "starting" || step === "transcribing" || step === "understanding" || step === "done";

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor={theme.colors.onBackground} size={24} onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.headerTitle}>Record memory</Text>
        {isDevModeEnabled ? (
          <IconButton
            icon="flask"
            iconColor={devUiVisible ? theme.colors.primary : theme.colors.onSurfaceVariant}
            size={22}
            onPress={() => setDevUiVisible((v) => !v)}
          />
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Title block */}
      <Text variant="displaySmall" style={styles.title}>Capture one thought</Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Tap the mic, say a sentence, tap again. ASK remembers the meaning.
      </Text>

      {/* Main stage */}
      <Surface style={styles.stage} elevation={2}>
        <VoiceGlow
          level={recorder.isRecording ? recorder.level : 0}
          active={recorder.isRecording}
          processing={step === "transcribing" || step === "understanding"}
          type="mobile"
          colorVariant="colorful"
          strength={0.9}
        >
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <VoiceStateOrb state={recorder.isRecording ? "listening" : step === "error" ? "retry" : "ready"} level={recorder.level} />
          </Animated.View>
        </VoiceGlow>

        {recorder.isRecording ? (
          <AudioWaveform
            level={recorder.level}
            active
            color={theme.colors.error}
            style={styles.waveform}
          />
        ) : (
          <Text variant="bodyMedium" style={styles.readyHint}>Tap below to begin</Text>
        )}

        <View style={styles.badgeRow}>
          <Chip icon="clock-outline" style={styles.badge}>
            {recorder.isRecording ? fmtDuration(recorder.durationMs) : "00:00"}
          </Chip>
          {recorder.isRecording ? (
            <Chip icon="microphone" style={[styles.badge, styles.liveBadge]} textStyle={{ color: theme.colors.error }}>
              Listening
            </Chip>
          ) : null}
        </View>
      </Surface>

      {/* Status / progress */}
      {(step === "starting" || step === "transcribing" || step === "understanding") && (
        <View style={styles.progressBlock}>
          <ProgressBar
            indeterminate
            color={theme.colors.primary}
            style={styles.progressBar}
          />
          <Text variant="bodyMedium" style={styles.progressLabel}>
            {step === "starting" && "Starting microphone…"}
            {step === "transcribing" && "Transcribing…"}
            {step === "understanding" && "Understanding…"}
          </Text>
        </View>
      )}

      {transcriptPreview && step !== "done" ? (
        <Card style={styles.previewCard}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>TRANSCRIPT</Text>
            <Text variant="bodyLarge" style={styles.previewText}>“{transcriptPreview}”</Text>
          </Card.Content>
        </Card>
      ) : null}

      {error ? (
        <Card style={[styles.alertCard, { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content style={styles.alertContent}>
            <IconButton icon="alert-circle" iconColor={theme.colors.error} size={24} />
            <Text variant="bodyMedium" style={[styles.alertText, { color: theme.colors.onErrorContainer }]}>{error}</Text>
          </Card.Content>
        </Card>
      ) : null}

      {/* Record FAB */}
      <View style={styles.fabWrap}>
        <FAB
          icon={recorder.isRecording ? "stop" : "microphone"}
          mode="elevated"
          size="large"
          color="#FFFFFF"
          style={[
            styles.fab,
            { backgroundColor: recorder.isRecording ? theme.colors.error : theme.colors.primary },
          ]}
          onPress={toggleRecording}
          disabled={isBusy}
          accessibilityLabel={recorder.isRecording ? "Stop recording" : "Start recording"}
        />
      </View>

      {/* Expo Go fallback */}
      {isExpoGo ? (
        <Card style={styles.noticeCard}>
          <Card.Content>
            <View style={styles.noticeHeader}>
              <IconButton icon="cellphone-information" iconColor={theme.colors.tertiary} size={24} />
              <Text variant="titleMedium" style={styles.noticeTitle}>Running in Expo Go</Text>
            </View>
            <Text variant="bodyMedium" style={styles.noticeBody}>
              Live microphone streaming and native models need a custom development build. Use Simulate to test the pipeline here.
            </Text>
            <Button
              mode="contained-tonal"
              icon="lightning-bolt"
              onPress={simulateRecording}
              disabled={isBusy}
              style={styles.simulateButton}
            >
              Simulate recorded sentence
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      {/* Dev settings */}
      {isDevModeEnabled && devUiVisible && (
        <Card style={styles.devCard}>
          <Card.Content>
            <View style={styles.devHeader}>
              <Text variant="titleMedium">Developer STT settings</Text>
              <Chip compact>{providerName}</Chip>
            </View>
            <Text variant="bodyMedium" style={styles.devBody}>
              {providerName === "dev-phrase"
                ? "The dev-phrase provider returns the sentence below. Type what you plan to say."
                : "This provider transcribes real audio."}
            </Text>
            <TextInput
              label="Mock transcript phrase"
              value={devPhrase}
              onChangeText={updateDevPhrase}
              multiline
              mode="outlined"
              style={styles.devInput}
            />
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg, paddingBottom: 96 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.spacing.md,
  },
  headerTitle: { fontWeight: "600" },
  title: { fontWeight: "700", marginTop: tokens.spacing.sm },
  subtitle: { color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs },
  stage: {
    marginTop: tokens.spacing.xl,
    padding: tokens.spacing.xl,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: tokens.colors.surfaceRaised,
  },
  waveform: { marginTop: tokens.spacing.lg },
  readyHint: { marginTop: tokens.spacing.lg, color: tokens.colors.textMuted },
  badgeRow: { flexDirection: "row", gap: tokens.spacing.sm, marginTop: tokens.spacing.lg },
  badge: { backgroundColor: tokens.colors.surface },
  liveBadge: { backgroundColor: `${tokens.colors.error}20` },
  progressBlock: { marginTop: tokens.spacing.xl },
  progressBar: { borderRadius: 999, height: 6 },
  progressLabel: { textAlign: "center", marginTop: tokens.spacing.sm, color: tokens.colors.textSecondary },
  previewCard: { marginTop: tokens.spacing.lg, backgroundColor: tokens.colors.surfaceRaised },
  previewText: { marginTop: tokens.spacing.xs, fontStyle: "italic" },
  alertCard: { marginTop: tokens.spacing.lg },
  alertContent: { flexDirection: "row", alignItems: "center", paddingLeft: tokens.spacing.sm },
  alertText: { flex: 1, flexShrink: 1, marginLeft: tokens.spacing.xs },
  fabWrap: { alignItems: "center", marginTop: tokens.spacing.xxxl },
  fab: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  noticeCard: { marginTop: tokens.spacing.xxxl, backgroundColor: tokens.colors.surfaceRaised },
  noticeHeader: { flexDirection: "row", alignItems: "center" },
  noticeTitle: { fontWeight: "600" },
  noticeBody: { color: tokens.colors.textSecondary, marginTop: tokens.spacing.xs, marginBottom: tokens.spacing.md },
  simulateButton: { borderRadius: tokens.radii.primaryButton },
  devCard: { marginTop: tokens.spacing.xl, backgroundColor: tokens.colors.surfaceRaised },
  devHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.spacing.sm },
  devBody: { color: tokens.colors.textSecondary, marginBottom: tokens.spacing.md },
  devInput: { backgroundColor: tokens.colors.surface },
});
