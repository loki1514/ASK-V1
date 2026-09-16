import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Button, Card, Chip, Text } from "react-native-paper";
import { captureCalibrationTrial } from "@/application/identity/captureCalibrationTrial";
import { enrollVoiceProfile } from "@/application/identity/enrollVoiceProfile";
import { verifySpeaker } from "@/application/identity/verifySpeaker";
import { analyzeVoiceSample } from "@/domain/identity/audioQuality";
import { serializeCalibrationTrialsCsv } from "@/domain/identity/calibrationCsv";
import {
  CalibrationTrialLabel,
  PcmAudioSample,
  SpeakerDecision,
  VoiceCalibrationTrial,
  VoiceProfile,
  VoiceSampleQuality,
} from "@/domain/identity/model";
import { elevation, fonts, motion, radii, spacing, colors } from "@/theme/tokens";
import { useThemeTokens } from "@/lib/useThemeTokens";
import { AppIcon, IconName } from "@/components/AppIcon";
import { exportCalibrationScores } from "@/features/voice/exportCalibrationScores";
import { useVoiceEnrollmentRecorder } from "@/features/voice/useVoiceEnrollmentRecorder";
import { VoiceOrbState, VoiceStateOrb } from "@/features/voice/VoiceStateOrb";
import {
  voiceCalibrationTrialRepository,
  voiceEmbeddingEngine,
  voiceProfileRepository,
  voiceRuntimeDescriptor,
  voiceThresholdProfile,
} from "@/features/voice/runtime";

type CapturedSample = { sample: PcmAudioSample; quality: VoiceSampleQuality };
type CapturePurpose = "enrollment" | "verification" | "calibration_target" | "calibration_impostor";
type ScreenState = "loading" | "empty" | "ready" | "load_error";
type WorkflowState = "idle" | "starting" | "checking" | "enrolling" | "calibrating" | "deleting" | "exporting";

const qualityCopy: Record<VoiceSampleQuality["reasons"][number], string> = {
  too_short: "Speak for at least 8 seconds",
  too_quiet: "Move closer or speak a little louder",
  too_much_silence: "Keep speaking through most of the sample",
  clipped: "Move slightly farther from the microphone",
};

const decisionCopy: Record<SpeakerDecision["outcome"], { title: string; detail: string }> = {
  verified: { title: "Likely you", detail: "This sample cleared the evaluated comparison boundary." },
  unknown: { title: "Not enough evidence", detail: "ASK could not make a confident comparison from this sample." },
  ambiguous: { title: "Too close to call", detail: "More than one profile produced a similar result." },
  rejected_quality: { title: "Sample could not be checked", detail: "Record again in a quieter space and speak naturally." },
};

export function VoiceIdentityPanel() {
  const t = useThemeTokens();
  const recorder = useVoiceEnrollmentRecorder();
  const entry = useRef(new Animated.Value(0)).current;
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [workflow, setWorkflow] = useState<WorkflowState>("idle");
  const [samples, setSamples] = useState<CapturedSample[]>([]);
  const [profile, setProfile] = useState<VoiceProfile>();
  const [trials, setTrials] = useState<VoiceCalibrationTrial[]>([]);
  const [purpose, setPurpose] = useState<CapturePurpose>("enrollment");
  const [decision, setDecision] = useState<SpeakerDecision>();
  const [lastCaptureAccepted, setLastCaptureAccepted] = useState<boolean>();
  const [showTechnical, setShowTechnical] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    Promise.all([
      voiceProfileRepository.listProfiles(),
      voiceCalibrationTrialRepository.listTrials(),
    ]).then(([profiles, storedTrials]) => {
      if (!mounted) return;
      const owner = profiles.find((item) => item.owner);
      setProfile(owner);
      setTrials(storedTrials);
      setScreenState(owner ? "ready" : "empty");
    }).catch(() => {
      if (!mounted) return;
      setScreenState("load_error");
      setError("The local voice-profile store could not be opened.");
    });
    Animated.timing(entry, {
      toValue: 1,
      duration: motion.screenEnter,
      useNativeDriver: true,
    }).start();
    return () => { mounted = false; };
  }, [entry]);

  const acceptedSamples = useMemo(() => samples.filter((item) => item.quality.accepted), [samples]);
  const isBusy = workflow !== "idle";
  const profileCompatible = Boolean(
    profile &&
    profile.modelVersion === voiceEmbeddingEngine.modelVersion &&
    profile.preprocessingVersion === voiceEmbeddingEngine.preprocessingVersion,
  );
  const canEnroll = acceptedSamples.length >= 3 && !isBusy && !recorder.isRecording && voiceRuntimeDescriptor.captureEnabled;
  const targetTrials = trials.filter((item) => item.label === "target").length;
  const impostorTrials = trials.filter((item) => item.label === "impostor").length;

  const announce = (message: string) => AccessibilityInfo.announceForAccessibility(message);

  const beginCapture = async (nextPurpose: CapturePurpose) => {
    if (!voiceRuntimeDescriptor.captureEnabled || isBusy || screenState === "loading") return;
    setError(undefined);
    setDecision(undefined);
    setLastCaptureAccepted(undefined);
    setPurpose(nextPurpose);
    setWorkflow("starting");
    const started = await recorder.start();
    setWorkflow("idle");
    if (started) {
      await Haptics.selectionAsync();
      announce("Recording started");
    }
  };

  const finishCapture = async () => {
    const sample = recorder.stop();
    if (!sample) return;
    setWorkflow("checking");
    announce("Recording stopped. Checking sample.");
    const quality = analyzeVoiceSample(sample);

    if (purpose === "enrollment") {
      const next = [...samples, { sample, quality }];
      const compact = next.filter((item) => item.quality.accepted).slice(-3);
      const lastRejected = [...next].reverse().find((item) => !item.quality.accepted);
      setSamples(lastRejected ? [...compact, lastRejected].slice(-4) : compact);
      setLastCaptureAccepted(quality.accepted);
      setWorkflow("idle");
      await Haptics.notificationAsync(
        quality.accepted ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
      );
      announce(quality.accepted
        ? `Sample accepted. ${Math.min(acceptedSamples.length + 1, 3)} of 3 complete.`
        : "Sample needs to be recorded again.");
      return;
    }

    if (purpose === "verification") {
      if (!voiceThresholdProfile || !voiceRuntimeDescriptor.verificationEnabled) {
        setError("Voice comparison stays locked until an evaluated threshold is installed.");
        setWorkflow("idle");
        return;
      }
      try {
        const result = await verifySpeaker({
          sample,
          engine: voiceEmbeddingEngine,
          repository: voiceProfileRepository,
          thresholdProfile: voiceThresholdProfile,
        });
        setDecision(result);
        setLastCaptureAccepted(result.outcome === "verified");
        await Haptics.notificationAsync(
          result.outcome === "verified"
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
        );
        announce(decisionCopy[result.outcome].title);
      } catch {
        setError("Voice comparison failed. Your stored profile was not changed.");
      } finally {
        setWorkflow("idle");
      }
      return;
    }

    const label: CalibrationTrialLabel = purpose === "calibration_target" ? "target" : "impostor";
    setWorkflow("calibrating");
    try {
      const trial = await captureCalibrationTrial({
        label,
        sample,
        engine: voiceEmbeddingEngine,
        profiles: voiceProfileRepository,
        trials: voiceCalibrationTrialRepository,
        platform: platformName(),
      });
      setTrials((current) => [...current.filter((item) => item.id !== trial.id), trial]);
      setLastCaptureAccepted(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      announce(`${label === "target" ? "Same-speaker" : "Different-speaker"} trial saved. Audio discarded.`);
    } catch {
      setLastCaptureAccepted(false);
      setError("This calibration sample could not be saved. Check the recording quality and try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      setWorkflow("idle");
    }
  };

  const createProfile = async () => {
    if (!canEnroll) return;
    setWorkflow("enrolling");
    setError(undefined);
    try {
      const result = await enrollVoiceProfile({
        profileId: "local_owner",
        displayName: "You",
        owner: true,
        samples: acceptedSamples.slice(0, 3).map((item) => item.sample),
        engine: voiceEmbeddingEngine,
        repository: voiceProfileRepository,
        thresholdProfile: voiceThresholdProfile,
      });
      setProfile(result.profile);
      setScreenState("ready");
      setSamples([]);
      setLastCaptureAccepted(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      announce(voiceRuntimeDescriptor.calibrationRequired
        ? "Voice profile created. Evaluation trials are now needed."
        : "Voice profile created.");
    } catch {
      setLastCaptureAccepted(false);
      setError("The samples were not consistent enough. Record three fresh samples in the same room.");
    } finally {
      setWorkflow("idle");
    }
  };

  const requestDelete = () => {
    if (!profile || isBusy) return;
    Alert.alert(
      "Delete voice profile?",
      "This removes the local voice templates and every saved calibration score from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setWorkflow("deleting");
            setError(undefined);
            try {
              await voiceProfileRepository.deleteProfile(profile.id);
              await voiceCalibrationTrialRepository.clearTrials();
              setProfile(undefined);
              setTrials([]);
              setDecision(undefined);
              setSamples([]);
              setScreenState("empty");
              announce("Voice profile and calibration scores deleted");
            } catch {
              setError("The voice profile could not be deleted. Nothing was removed.");
            } finally {
              setWorkflow("idle");
            }
          },
        },
      ],
    );
  };

  const exportTrials = async () => {
    if (!trials.length || isBusy) return;
    setWorkflow("exporting");
    setError(undefined);
    try {
      await exportCalibrationScores(serializeCalibrationTrialsCsv(trials));
    } catch {
      setError("Calibration scores could not be exported on this device.");
    } finally {
      setWorkflow("idle");
    }
  };

  const orbState: VoiceOrbState = recorder.isRecording
    ? "listening"
    : ["checking", "enrolling", "calibrating"].includes(workflow)
      ? "checking"
      : lastCaptureAccepted === true
        ? "accepted"
        : lastCaptureAccepted === false
          ? "retry"
          : profile
            ? voiceRuntimeDescriptor.calibrationRequired ? "calibrating" : "profile_ready"
            : "ready";

  const status = screenState === "loading"
    ? "LOADING"
    : !profile
      ? "NOT ENROLLED"
      : !profileCompatible
        ? "RE-ENROLL"
        : voiceRuntimeDescriptor.calibrationRequired
          ? "EVALUATION"
          : "READY";

  return (
    <Animated.View style={{ opacity: entry, transform: [{ translateY: entry.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      <View style={[s.instrument, { backgroundColor: t.surfaceInverse }]}>
        <View style={s.instrumentTop}>
          <View>
            <Text style={[s.eyebrow, { color: "#AAA5B4" }]}>VOICE IDENTITY</Text>
            <Text style={[s.instrumentTitle, { color: "#F7F5FB" }]}>Your voice, held privately.</Text>
          </View>
          <Chip compact textStyle={s.darkChipText} style={s.darkChip}>{status}</Chip>
        </View>
        <VoiceStateOrb state={orbState} level={recorder.level} />
        <Text style={[s.instrumentFoot, { color: "#AAA5B4" }]}>
          {voiceRuntimeDescriptor.persistence === "protected_local"
            ? "Raw audio is discarded after processing. Templates remain protected on this device."
            : "Interactive preview only. Data stays in memory and resets when this page reloads."}
        </Text>
      </View>

      <View style={s.runtimeRow}>
        <AppIcon name={voiceRuntimeDescriptor.kind === "candidate_onnx" ? "flask" : "smartphone"} size="inline" color={t.warning} />
        <Text style={[s.runtimeText, { color: t.warning }]}>{voiceRuntimeDescriptor.label}</Text>
      </View>

      {screenState === "loading" ? <LoadingCard /> : null}

      {screenState === "empty" ? (
        <Card mode="contained" style={s.card}>
          <Card.Content>
            <Text variant="titleMedium" style={s.cardTitle} accessibilityRole="header">Build your voice profile</Text>
            <Text variant="bodyMedium" style={s.instructions}>
              Three clear samples teach the on-device model what stays consistent in your voice.
            </Text>
            <SampleRail count={acceptedSamples.length} recording={recorder.isRecording} />
            <View style={s.progressCopy}>
              <Text variant="labelLarge">{acceptedSamples.length} of 3 usable samples</Text>
              <Text variant="labelMedium" style={s.muted}>8–12 sec each</Text>
            </View>

            {recorder.isRecording ? <LiveCoach level={recorder.level} peak={recorder.peak} durationMs={recorder.durationMs} /> : null}

            {samples.map(({ sample, quality }, index) => (
              <View key={sample.id} style={s.sampleRow}>
                <View style={[s.sampleIcon, quality.accepted ? s.sampleIconGood : s.sampleIconWarn]}>
                  <AppIcon name={quality.accepted ? "check" : "circleAlert"} color={quality.accepted ? t.success : t.warning} size="inline" />
                </View>
                <View style={s.sampleCopy}>
                  <Text variant="labelLarge">Sample {Math.min(index + 1, 3)} · {(quality.durationMs / 1_000).toFixed(1)}s</Text>
                  <Text variant="bodySmall" style={s.muted}>
                    {quality.accepted ? "Clear and usable" : quality.reasons.map((reason) => qualityCopy[reason]).join(" · ")}
                  </Text>
                </View>
              </View>
            ))}

            {!voiceRuntimeDescriptor.captureEnabled ? (
              <View style={s.previewNotice}>
                <AppIcon name="smartphone" size="button" color={t.accent} />
                <Text variant="bodySmall" style={s.previewText}>Open the iOS or Android development build to capture microphone PCM and run the model.</Text>
              </View>
            ) : null}

            <Button
              mode={recorder.isRecording ? "contained-tonal" : "contained"}
              icon={() => <AppIcon name={recorder.isRecording ? "pause" : "mic"} size="button" color="#FFFFFF" />}
              onPress={recorder.isRecording ? finishCapture : () => beginCapture("enrollment")}
              contentStyle={s.primaryButtonContent}
              style={s.primaryButton}
              disabled={isBusy || !voiceRuntimeDescriptor.captureEnabled}
              accessibilityLabel={recorder.isRecording ? "Stop enrollment recording" : "Record voice sample"}
            >
              {recorder.isRecording ? `Stop · ${(recorder.durationMs / 1_000).toFixed(1)}s` : "Record sample"}
            </Button>
            <Button
              mode="outlined"
              onPress={createProfile}
              disabled={!canEnroll}
              loading={workflow === "enrolling"}
              style={s.secondaryButton}
            >
              {workflow === "enrolling" ? "Preparing voice model" : "Create protected profile"}
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      {screenState === "ready" && profile ? (
        <>
          <Card mode="contained" style={s.card}>
            <Card.Content>
              <View style={s.profileSummary}>
                <View style={s.profileName}>
                  <Text variant="titleMedium" style={s.cardTitle} accessibilityRole="header">{profile.displayName}</Text>
                  <Text variant="bodySmall" style={s.muted}>
                    {profile.templateIds.length} voice samples · stored on this device
                  </Text>
                </View>
                <View style={s.localBadge}>
                  <AppIcon name="shieldCheck" size={17} color={t.success} />
                  <Text variant="labelSmall" style={s.localBadgeText}>LOCAL</Text>
                </View>
              </View>

              {!profileCompatible ? (
                <View style={s.warningPanel}>
                  <AppIcon name="circleAlert" size="button" color={t.warning} />
                  <Text variant="bodySmall" style={s.warningPanelText}>The voice model changed. Delete this profile and enroll again before collecting trials.</Text>
                </View>
              ) : null}

              {voiceRuntimeDescriptor.verificationEnabled && profileCompatible ? (
                <Button
                  mode={recorder.isRecording && purpose === "verification" ? "contained-tonal" : "contained"}
                  icon={() => <AppIcon name={recorder.isRecording && purpose === "verification" ? "pause" : "activity"} size="button" color="#FFFFFF" />}
                  onPress={recorder.isRecording ? finishCapture : () => beginCapture("verification")}
                  contentStyle={s.primaryButtonContent}
                  style={s.primaryButton}
                  disabled={isBusy || !voiceRuntimeDescriptor.captureEnabled}
                  accessibilityLabel="Compare a voice sample"
                >
                  {recorder.isRecording ? `Stop · ${(recorder.durationMs / 1_000).toFixed(1)}s` : "Compare a voice sample"}
                </Button>
              ) : null}

              {decision ? <DecisionCard decision={decision} showScore={showTechnical} /> : null}

              <Button
                mode="text"
                icon={() => <AppIcon name={showTechnical ? "chevronUp" : "chevronDown"} size="inline" color={t.textMuted} />}
                onPress={() => setShowTechnical((current) => !current)}
                style={s.detailsButton}
              >
                Technical details
              </Button>
              {showTechnical ? (
                <View style={s.technicalPanel}>
                  <TechnicalRow label="Runtime" value={voiceRuntimeDescriptor.kind === "candidate_onnx" ? "ONNX ECAPA-TDNN" : "Prototype vector"} />
                  <TechnicalRow label="Embedding" value={`${profile.centroid.length} dimensions`} />
                  <TechnicalRow label="Consistency" value={profile.selfConsistency.toFixed(3)} />
                  <TechnicalRow label="Model" value={profile.modelVersion} />
                  <TechnicalRow label="Preprocessing" value={profile.preprocessingVersion} />
                  <TechnicalRow label="Threshold" value={voiceThresholdProfile?.id ?? "Not installed"} />
                </View>
              ) : null}
            </Card.Content>
          </Card>

          {voiceRuntimeDescriptor.calibrationRequired && profileCompatible ? (
            <Card mode="contained" style={s.card}>
              <Card.Content>
                <View style={s.calibrationHeader}>
                  <View style={s.calibrationIcon}><AppIcon name="settings" size="large" color={t.accent} /></View>
                  <View style={s.calibrationTitle}>
                    <Text variant="titleMedium" style={s.cardTitle} accessibilityRole="header">Evaluate before trusting</Text>
                    <Text variant="bodySmall" style={s.muted}>Experimental comparison · not yet evaluated on enough trials.</Text>
                  </View>
                </View>
                <View style={s.trialCounts}>
                  <TrialCount value={targetTrials} label="Same speaker" />
                  <View style={s.countDivider} />
                  <TrialCount value={impostorTrials} label="Different speaker" />
                </View>
                {recorder.isRecording ? <LiveCoach level={recorder.level} peak={recorder.peak} durationMs={recorder.durationMs} /> : null}
                <Button
                  mode="contained"
                  icon={() => <AppIcon name={recorder.isRecording && purpose === "calibration_target" ? "pause" : "mic"} size="button" color="#FFFFFF" />}
                  onPress={recorder.isRecording ? finishCapture : () => beginCapture("calibration_target")}
                  disabled={isBusy || !voiceRuntimeDescriptor.captureEnabled}
                  contentStyle={s.primaryButtonContent}
                  style={s.primaryButton}
                >
                  {recorder.isRecording && purpose === "calibration_target" ? "Stop same-speaker trial" : "Record my voice trial"}
                </Button>
                <Button
                  mode="outlined"
                  icon={() => <AppIcon name={recorder.isRecording && purpose === "calibration_impostor" ? "pause" : "userRound"} size="button" color="#FFFFFF" />}
                  onPress={recorder.isRecording ? finishCapture : () => beginCapture("calibration_impostor")}
                  disabled={isBusy || !voiceRuntimeDescriptor.captureEnabled}
                  style={s.secondaryButton}
                >
                  {recorder.isRecording && purpose === "calibration_impostor" ? "Stop different-speaker trial" : "Record different speaker"}
                </Button>
                <Text variant="bodySmall" style={s.consentCopy}>
                  Ask the other person first. Their audio is discarded immediately; only an anonymous comparison score and model metadata are saved.
                </Text>
                <View style={s.privacyLine}>
                  <AppIcon name="shieldLock" size={17} color={t.textMuted} />
                  <Text variant="bodySmall" style={s.muted}>Raw audio is never added to the calibration export.</Text>
                </View>
                <Button
                  mode="text"
                  icon={() => <AppIcon name="download" size="inline" color={t.accent} />}
                  onPress={exportTrials}
                  disabled={!trials.length || isBusy}
                  loading={workflow === "exporting"}
                  style={s.exportButton}
                >
                  Export {trials.length || ""} score{trials.length === 1 ? "" : "s"}
                </Button>
              </Card.Content>
            </Card>
          ) : null}

          <Button
            textColor={t.danger}
            onPress={requestDelete}
            disabled={isBusy || recorder.isRecording}
            loading={workflow === "deleting"}
            style={s.deleteButton}
            accessibilityHint="Permanently removes local templates and calibration scores"
          >
            Delete voice profile
          </Button>
        </>
      ) : null}

      {recorder.error || error ? (
        <View style={s.errorCard} accessibilityRole="alert">
          <AppIcon name="circleAlert" size="button" color={t.danger} />
          <Text variant="bodySmall" style={s.errorText}>{recorder.error ?? error}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

function SampleRail({ count, recording }: { count: number; recording: boolean }) {
  const t = useThemeTokens();
  return (
    <View
      style={s.sampleRail}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 3, now: count, text: `${count} of 3 usable samples` }}
    >
      {[0, 1, 2].map((index) => {
        const complete = index < count;
        const current = index === count && recording;
        return (
          <View key={index} style={[s.railSegment, complete && s.railComplete, current && s.railCurrent]}>
            <AppIcon name={complete ? "check" : current ? "mic" : "circleCheck"} size="inline" color={complete ? "#FFFFFF" : current ? t.accent : t.textMuted} />
          </View>
        );
      })}
    </View>
  );
}

function LiveCoach({ level, peak, durationMs }: { level: number; peak: number; durationMs: number }) {
  const coaching = peak > 0.92 ? "Move a little farther away" : level < 0.18 ? "Speak a little louder" : "Good level — keep speaking";
  return (
    <View style={s.liveCoach} accessible accessibilityLabel={`${coaching}. ${(durationMs / 1_000).toFixed(1)} seconds recorded`}>
      <View style={s.liveCoachTop}>
        <View style={s.liveLabel}><View style={s.liveDot} /><Text variant="labelSmall" style={s.liveText}>LIVE</Text></View>
        <Text variant="labelMedium" style={s.liveDuration}>{(durationMs / 1_000).toFixed(1)}s / 8–12s</Text>
      </View>
      <View style={s.levelTrack}><View style={[s.levelFill, { width: `${Math.max(4, Math.min(level * 100, 100))}%` }]} /></View>
      <Text variant="bodySmall" style={s.coachText}>{coaching}</Text>
    </View>
  );
}

function TrialCount({ value, label }: { value: number; label: string }) {
  return <View style={s.trialCount}><Text variant="headlineSmall" style={s.trialValue}>{value}</Text><Text variant="labelSmall" style={s.muted}>{label}</Text></View>;
}

function TechnicalRow({ label, value }: { label: string; value: string }) {
  return <View style={s.technicalRow}><Text variant="labelSmall" style={s.muted}>{label}</Text><Text variant="bodySmall" style={s.technicalValue} selectable>{value}</Text></View>;
}

function LoadingCard() {
  return (
    <Card mode="contained" style={s.card} accessible accessibilityLabel="Opening protected voice profile">
      <Card.Content style={s.loadingContent}>
        <View style={s.loadingDot} />
        <View><Text variant="labelLarge">Opening your voice profile</Text><Text variant="bodySmall" style={s.muted}>Checking protected local storage…</Text></View>
      </Card.Content>
    </Card>
  );
}

function DecisionCard({ decision, showScore }: { decision: SpeakerDecision; showScore: boolean }) {
  const t = useThemeTokens();
  const copy = decisionCopy[decision.outcome];
  const tone = decision.outcome === "verified" ? "success" : decision.outcome === "unknown" ? "neutral" : decision.outcome === "rejected_quality" ? "danger" : "warning";
  const icons: Record<string, IconName> = { success: "checkCircle", neutral: "userRound", danger: "micOff", warning: "circleAlert" };
  const iconColor = tone === "success" ? t.success : tone === "danger" ? t.danger : tone === "neutral" ? t.textMuted : t.warning;
  return (
    <View style={[s.decision, tone === "success" ? s.decisionSuccess : tone === "danger" ? s.decisionDanger : tone === "neutral" ? s.decisionNeutral : s.decisionWarning]} accessibilityRole="alert">
      <AppIcon name={icons[tone]} color={iconColor} size="large" />
      <View style={s.decisionCopy}>
        <Text variant="labelLarge">{copy.title}</Text>
        <Text variant="bodySmall" style={s.muted}>{copy.detail}</Text>
        {showScore && decision.cosineScore !== undefined ? <Text variant="labelSmall" style={s.score}>Cosine score {decision.cosineScore.toFixed(3)}</Text> : null}
      </View>
    </View>
  );
}

function platformName(): VoiceCalibrationTrial["platform"] {
  if (Platform.OS === "ios" || Platform.OS === "android") return Platform.OS;
  return "web";
}

const s = StyleSheet.create({
  instrument: { borderRadius: 28, padding: spacing.lg, overflow: "hidden", marginBottom: spacing.sm },
  instrumentTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  eyebrow: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800" },
  instrumentTitle: { fontSize: 22, fontWeight: "800", marginTop: 4, maxWidth: 220, letterSpacing: -0.4 },
  darkChip: { backgroundColor: "#2B2734" },
  darkChipText: { color: "#D8D2E1", fontSize: 10, fontWeight: "800" },
  instrumentFoot: { fontSize: 12, textAlign: "center", lineHeight: 18, paddingHorizontal: spacing.sm },
  runtimeRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 10, marginBottom: spacing.sm },
  runtimeText: { flex: 1, fontSize: 12, fontWeight: "600" },
  card: { borderRadius: radii.lg, marginBottom: spacing.sm, backgroundColor: colors.surface, ...elevation.card },
  cardTitle: { fontWeight: "800", color: colors.textPrimary },
  muted: { color: colors.textMuted },
  instructions: { color: colors.textMuted, marginTop: spacing.xs, lineHeight: 21 },
  sampleRail: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.lg },
  railSegment: { flex: 1, height: 38, borderRadius: 13, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  railComplete: { backgroundColor: colors.accent, borderColor: colors.accent },
  railCurrent: { borderColor: colors.accent, backgroundColor: colors.surfaceSubtle },
  progressCopy: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  sampleRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  sampleIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  sampleIconGood: { backgroundColor: colors.successSurface },
  sampleIconWarn: { backgroundColor: colors.warningSurface },
  sampleCopy: { flex: 1 },
  primaryButton: { borderRadius: radii.lg, marginTop: spacing.lg },
  primaryButtonContent: { minHeight: 54 },
  secondaryButton: { borderRadius: radii.lg, marginTop: spacing.sm, minHeight: 48, justifyContent: "center" },
  previewNotice: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md, padding: spacing.sm, borderRadius: 14, backgroundColor: colors.surfaceSubtle },
  previewText: { color: colors.accent, flex: 1, lineHeight: 18 },
  liveCoach: { marginTop: spacing.md, backgroundColor: colors.surfaceSubtle, borderRadius: 16, padding: spacing.sm },
  liveCoachTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  liveLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#D8473F" },
  liveText: { color: "#A32A24", letterSpacing: 1.1, fontWeight: "800" },
  liveDuration: { color: colors.textPrimary },
  levelTrack: { height: 5, borderRadius: 3, backgroundColor: colors.borderSubtle, marginTop: 10, overflow: "hidden" },
  levelFill: { height: 5, borderRadius: 3, backgroundColor: colors.accent },
  coachText: { color: colors.textMuted, marginTop: 7 },
  profileSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  profileName: { flex: 1 },
  localBadge: { flexDirection: "row", gap: 5, alignItems: "center", paddingHorizontal: 9, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.successSurface },
  localBadgeText: { color: colors.success, fontWeight: "800" },
  warningPanel: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md, padding: spacing.sm, borderRadius: 14, backgroundColor: colors.warningSurface },
  warningPanelText: { color: colors.warning, flex: 1, lineHeight: 18 },
  decision: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: 16, marginTop: spacing.md },
  decisionSuccess: { backgroundColor: colors.successSurface },
  decisionWarning: { backgroundColor: colors.warningSurface },
  decisionNeutral: { backgroundColor: colors.surfaceRaised },
  decisionDanger: { backgroundColor: colors.dangerSurface },
  decisionCopy: { flex: 1 },
  score: { color: colors.textMuted, marginTop: spacing.xs },
  detailsButton: { alignSelf: "flex-start", marginTop: spacing.sm },
  technicalPanel: { padding: spacing.sm, borderRadius: 14, backgroundColor: colors.surfaceRaised, gap: 7 },
  technicalRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  technicalValue: { color: colors.textPrimary, flex: 1, textAlign: "right" },
  calibrationHeader: { flexDirection: "row", gap: spacing.sm },
  calibrationIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSubtle },
  calibrationTitle: { flex: 1 },
  trialCounts: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg, backgroundColor: colors.surfaceRaised, borderRadius: 16, paddingVertical: spacing.sm },
  trialCount: { flex: 1, alignItems: "center" },
  trialValue: { color: colors.textPrimary, fontWeight: "800" },
  countDivider: { width: StyleSheet.hairlineWidth, height: 35, backgroundColor: colors.borderSubtle },
  consentCopy: { color: colors.textMuted, lineHeight: 18, marginTop: spacing.sm },
  privacyLine: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: spacing.sm },
  exportButton: { alignSelf: "flex-start", marginTop: spacing.xs },
  deleteButton: { marginTop: spacing.sm, marginBottom: spacing.md },
  errorCard: { flexDirection: "row", gap: spacing.xs, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.dangerSurface, marginBottom: spacing.md },
  errorText: { flex: 1, color: colors.danger },
  loadingContent: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  loadingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
});
