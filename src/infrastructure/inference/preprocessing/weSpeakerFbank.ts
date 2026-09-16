import { PcmAudioSample } from "@/domain/identity/model";

export const WESPEAKER_FBANK_CONFIG = {
  sampleRate: 16_000,
  frameLengthSamples: 400,
  frameShiftSamples: 160,
  fftSize: 512,
  melBins: 80,
  lowFrequencyHz: 20,
  highFrequencyHz: 8_000,
  preemphasisCoefficient: 0.97,
  waveformScale: 32_768,
} as const;

export type FbankFeatures = {
  values: Float32Array;
  frames: number;
  bins: 80;
};

const FLOAT32_EPSILON = 1.1920928955078125e-7;
const { frameLengthSamples, frameShiftSamples, fftSize, melBins } = WESPEAKER_FBANK_CONFIG;

const hammingWindow = Float64Array.from(
  { length: frameLengthSamples },
  (_, index) => 0.54 - 0.46 * Math.cos((2 * Math.PI * index) / (frameLengthSamples - 1)),
);

const bitReversal = (() => {
  const values = new Uint16Array(fftSize);
  const bits = Math.log2(fftSize);
  for (let index = 0; index < fftSize; index += 1) {
    let source = index;
    let reversed = 0;
    for (let bit = 0; bit < bits; bit += 1) {
      reversed = (reversed << 1) | (source & 1);
      source >>= 1;
    }
    values[index] = reversed;
  }
  return values;
})();

type SparseMelBank = { indices: Uint16Array; weights: Float64Array };

const melScale = (frequency: number) => 1127 * Math.log(1 + frequency / 700);

const melBanks: SparseMelBank[] = (() => {
  const lowMel = melScale(WESPEAKER_FBANK_CONFIG.lowFrequencyHz);
  const highMel = melScale(WESPEAKER_FBANK_CONFIG.highFrequencyHz);
  const delta = (highMel - lowMel) / (melBins + 1);
  const fftBinWidth = WESPEAKER_FBANK_CONFIG.sampleRate / fftSize;

  return Array.from({ length: melBins }, (_, bin) => {
    const left = lowMel + bin * delta;
    const center = lowMel + (bin + 1) * delta;
    const right = lowMel + (bin + 2) * delta;
    const indices: number[] = [];
    const weights: number[] = [];

    // Kaldi builds weights for fftSize / 2 bins and pads the Nyquist bin with zero.
    for (let fftBin = 0; fftBin < fftSize / 2; fftBin += 1) {
      const mel = melScale(fftBinWidth * fftBin);
      const up = (mel - left) / (center - left);
      const down = (right - mel) / (right - center);
      const weight = Math.max(0, Math.min(up, down));
      if (weight > 0) {
        indices.push(fftBin);
        weights.push(weight);
      }
    }

    return {
      indices: Uint16Array.from(indices),
      weights: Float64Array.from(weights),
    };
  });
})();

function fftInPlace(real: Float64Array, imaginary: Float64Array): void {
  for (let index = 0; index < fftSize; index += 1) {
    const reversed = bitReversal[index];
    if (reversed > index) {
      [real[index], real[reversed]] = [real[reversed], real[index]];
      [imaginary[index], imaginary[reversed]] = [imaginary[reversed], imaginary[index]];
    }
  }

  for (let size = 2; size <= fftSize; size *= 2) {
    const half = size / 2;
    const angle = (-2 * Math.PI) / size;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);

    for (let offset = 0; offset < fftSize; offset += size) {
      let twiddleReal = 1;
      let twiddleImaginary = 0;
      for (let index = 0; index < half; index += 1) {
        const even = offset + index;
        const odd = even + half;
        const oddReal = real[odd] * twiddleReal - imaginary[odd] * twiddleImaginary;
        const oddImaginary = real[odd] * twiddleImaginary + imaginary[odd] * twiddleReal;
        const evenReal = real[even];
        const evenImaginary = imaginary[even];

        real[even] = evenReal + oddReal;
        imaginary[even] = evenImaginary + oddImaginary;
        real[odd] = evenReal - oddReal;
        imaginary[odd] = evenImaginary - oddImaginary;

        const nextReal = twiddleReal * stepReal - twiddleImaginary * stepImaginary;
        twiddleImaginary = twiddleReal * stepImaginary + twiddleImaginary * stepReal;
        twiddleReal = nextReal;
      }
    }
  }
}

/**
 * WeSpeaker-compatible Kaldi filterbanks:
 * 25 ms / 10 ms, 80 mel bins, Hamming, dither 0, DC removal, preemphasis 0.97,
 * power spectrum, natural log, followed by per-recording cepstral mean normalization.
 */
export function computeWeSpeakerFbank(sample: PcmAudioSample): FbankFeatures {
  if (sample.channels !== 1 || sample.sampleRate !== WESPEAKER_FBANK_CONFIG.sampleRate) {
    throw new Error("WeSpeaker preprocessing requires mono 16 kHz PCM");
  }
  if (sample.samples.length < frameLengthSamples) {
    throw new Error("WeSpeaker preprocessing requires at least one complete 25 ms frame");
  }

  const frames = 1 + Math.floor((sample.samples.length - frameLengthSamples) / frameShiftSamples);
  const features = new Float64Array(frames * melBins);
  const means = new Float64Array(melBins);
  const real = new Float64Array(fftSize);
  const imaginary = new Float64Array(fftSize);
  const power = new Float64Array(fftSize / 2 + 1);

  for (let frame = 0; frame < frames; frame += 1) {
    real.fill(0);
    imaginary.fill(0);
    const start = frame * frameShiftSamples;
    let mean = 0;
    for (let index = 0; index < frameLengthSamples; index += 1) {
      mean += sample.samples[start + index] * WESPEAKER_FBANK_CONFIG.waveformScale;
    }
    mean /= frameLengthSamples;

    let previous = sample.samples[start] * WESPEAKER_FBANK_CONFIG.waveformScale - mean;
    real[0] = previous * (1 - WESPEAKER_FBANK_CONFIG.preemphasisCoefficient) * hammingWindow[0];
    for (let index = 1; index < frameLengthSamples; index += 1) {
      const current = sample.samples[start + index] * WESPEAKER_FBANK_CONFIG.waveformScale - mean;
      real[index] = (
        current - WESPEAKER_FBANK_CONFIG.preemphasisCoefficient * previous
      ) * hammingWindow[index];
      previous = current;
    }

    fftInPlace(real, imaginary);
    for (let bin = 0; bin <= fftSize / 2; bin += 1) {
      power[bin] = real[bin] * real[bin] + imaginary[bin] * imaginary[bin];
    }

    for (let melBin = 0; melBin < melBins; melBin += 1) {
      const bank = melBanks[melBin];
      let energy = 0;
      for (let index = 0; index < bank.indices.length; index += 1) {
        energy += power[bank.indices[index]] * bank.weights[index];
      }
      const value = Math.log(Math.max(energy, FLOAT32_EPSILON));
      features[frame * melBins + melBin] = value;
      means[melBin] += value;
    }
  }

  for (let bin = 0; bin < melBins; bin += 1) means[bin] /= frames;
  const normalized = new Float32Array(features.length);
  for (let frame = 0; frame < frames; frame += 1) {
    for (let bin = 0; bin < melBins; bin += 1) {
      const index = frame * melBins + bin;
      normalized[index] = features[index] - means[bin];
    }
  }

  return { values: normalized, frames, bins: melBins };
}
