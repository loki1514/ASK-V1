import { PcmAudioSample, VoiceSampleQuality } from "@/domain/identity/model";

export type VoiceQualityPolicy = {
  minimumDurationMs: number;
  minimumRms: number;
  minimumSpeechRatio: number;
  maximumClippingRate: number;
  speechFrameRms: number;
  frameDurationMs: number;
};

export const DEVELOPMENT_VOICE_QUALITY_POLICY: VoiceQualityPolicy = {
  minimumDurationMs: 8_000,
  minimumRms: 0.01,
  minimumSpeechRatio: 0.55,
  maximumClippingRate: 0.01,
  speechFrameRms: 0.012,
  frameDurationMs: 20,
};

export function analyzeVoiceSample(
  sample: PcmAudioSample,
  policy: VoiceQualityPolicy = DEVELOPMENT_VOICE_QUALITY_POLICY,
): VoiceSampleQuality {
  if (!sample.samples.length || sample.sampleRate <= 0) {
    return {
      accepted: false,
      durationMs: 0,
      rms: 0,
      peak: 0,
      speechRatio: 0,
      clippingRate: 0,
      reasons: ["too_short", "too_quiet", "too_much_silence"],
    };
  }

  let sumSquares = 0;
  let peak = 0;
  let clipped = 0;
  for (const value of sample.samples) {
    const absolute = Math.abs(value);
    sumSquares += value * value;
    peak = Math.max(peak, absolute);
    if (absolute >= 0.99) clipped += 1;
  }

  const frameSize = Math.max(1, Math.round(sample.sampleRate * policy.frameDurationMs / 1_000));
  let speechFrames = 0;
  let totalFrames = 0;
  for (let offset = 0; offset < sample.samples.length; offset += frameSize) {
    const end = Math.min(sample.samples.length, offset + frameSize);
    let frameSquares = 0;
    for (let index = offset; index < end; index += 1) {
      frameSquares += sample.samples[index] * sample.samples[index];
    }
    const frameRms = Math.sqrt(frameSquares / (end - offset));
    if (frameRms >= policy.speechFrameRms) speechFrames += 1;
    totalFrames += 1;
  }

  const durationMs = sample.samples.length / sample.sampleRate * 1_000;
  const rms = Math.sqrt(sumSquares / sample.samples.length);
  const speechRatio = totalFrames ? speechFrames / totalFrames : 0;
  const clippingRate = clipped / sample.samples.length;
  const reasons: VoiceSampleQuality["reasons"] = [];

  if (durationMs < policy.minimumDurationMs) reasons.push("too_short");
  if (rms < policy.minimumRms) reasons.push("too_quiet");
  if (speechRatio < policy.minimumSpeechRatio) reasons.push("too_much_silence");
  if (clippingRate > policy.maximumClippingRate) reasons.push("clipped");

  return {
    accepted: reasons.length === 0,
    durationMs,
    rms,
    peak,
    speechRatio,
    clippingRate,
    reasons,
  };
}

