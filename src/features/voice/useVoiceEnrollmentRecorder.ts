import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from "expo-audio";
import { PcmAudioSample } from "@/domain/identity/model";

export type EnrollmentRecorderState = {
  isRecording: boolean;
  durationMs: number;
  level: number;
  peak: number;
  error?: string;
};

export function useVoiceEnrollmentRecorder() {
  const chunks = useRef<Float32Array[]>([]);
  const sampleRate = useRef(16_000);
  const startedAt = useRef(0);
  const totalSamples = useRef(0);
  const lastUiUpdate = useRef(0);
  const smoothedLevel = useRef(0);
  const captureFailed = useRef(false);
  const [state, setState] = useState<EnrollmentRecorderState>({
    isRecording: false,
    durationMs: 0,
    level: 0,
    peak: 0,
  });

  const onBuffer = useCallback((buffer: { data: ArrayBuffer; sampleRate: number; channels: number }) => {
    if (buffer.channels !== 1) {
      if (!captureFailed.current) {
        captureFailed.current = true;
        setState((current) => ({ ...current, error: "Expected mono microphone input" }));
      }
      return;
    }
    sampleRate.current = buffer.sampleRate;
    const chunk = new Float32Array(buffer.data.slice(0));
    chunks.current.push(chunk);
    totalSamples.current += chunk.length;

    let sumSquares = 0;
    let peak = 0;
    for (const value of chunk) {
      sumSquares += value * value;
      peak = Math.max(peak, Math.abs(value));
    }
    const rms = Math.sqrt(sumSquares / Math.max(chunk.length, 1));
    smoothedLevel.current = smoothedLevel.current * 0.72 + rms * 0.28;

    const now = Date.now();
    if (now - lastUiUpdate.current < 100) return;
    lastUiUpdate.current = now;
    setState((current) => ({
      ...current,
      durationMs: totalSamples.current / buffer.sampleRate * 1_000,
      level: Math.min(smoothedLevel.current / 0.16, 1),
      peak,
    }));
  }, []);

  const options = useMemo(() => ({
    sampleRate: 16_000,
    channels: 1,
    encoding: "float32" as const,
    onBuffer,
  }), [onBuffer]);
  const { stream, isStreaming } = useAudioStream(options);

  const start = useCallback(async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setState({ isRecording: false, durationMs: 0, level: 0, peak: 0, error: "Microphone permission is required" });
        return false;
      }

      chunks.current = [];
      totalSamples.current = 0;
      sampleRate.current = 16_000;
      startedAt.current = Date.now();
      lastUiUpdate.current = 0;
      smoothedLevel.current = 0;
      captureFailed.current = false;
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: "doNotMix",
      });
      await stream.start();
      setState({ isRecording: true, durationMs: 0, level: 0, peak: 0 });
      return true;
    } catch {
      setState({
        isRecording: false,
        durationMs: 0,
        level: 0,
        peak: 0,
        error: "The microphone could not start. Check permission and try again.",
      });
      return false;
    }
  }, [stream]);

  const stop = useCallback((): PcmAudioSample | undefined => {
    if (!isStreaming && !state.isRecording) return undefined;
    stream.stop();
    const length = totalSamples.current;
    const samples = new Float32Array(length);
    let offset = 0;
    for (const chunk of chunks.current) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }

    const capturedAt = new Date(startedAt.current || Date.now()).toISOString();
    const sample: PcmAudioSample = {
      id: `voice_sample_${startedAt.current || Date.now()}`,
      samples,
      sampleRate: sampleRate.current,
      channels: 1,
      capturedAt,
    };
    chunks.current = [];
    totalSamples.current = 0;
    setState({
      isRecording: false,
      durationMs: samples.length / sampleRate.current * 1_000,
      level: 0,
      peak: 0,
    });
    return sample;
  }, [isStreaming, state.isRecording, stream]);

  const reset = useCallback(() => {
    if (isStreaming) stream.stop();
    chunks.current = [];
    totalSamples.current = 0;
    setState({ isRecording: false, durationMs: 0, level: 0, peak: 0 });
  }, [isStreaming, stream]);

  useEffect(() => () => {
    if (stream.isStreaming) stream.stop();
    chunks.current = [];
    totalSamples.current = 0;
  }, [stream]);

  return { ...state, start, stop, reset };
}
