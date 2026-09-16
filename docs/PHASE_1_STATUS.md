# Phase 1 — Voice Signature Status

## Objective

Create a local-first voice-signature pipeline that records enrollment samples, rejects poor audio, produces versioned speaker embeddings, stores protected templates, and makes conservative cosine-similarity decisions.

## Implemented

- Expo development-client and native audio configuration
- User-triggered microphone permission and raw 16 kHz mono PCM capture
- Deterministic sample-quality analysis: duration, RMS, active-speech ratio, and clipping ratio
- Three accepted samples per enrollment
- Per-sample embeddings, self-consistency gate, normalized centroid, and template metadata
- SecureStore repository for local owner templates, with a 192-dimension storage ceiling
- In-memory repository for tests and web preview
- Manifest-driven ONNX Runtime adapter with input/output and dimension validation
- Bundled, revision-pinned WeSpeaker ECAPA-TDNN512 ONNX candidate (`[B,T,80] -> [B,192]`)
- TypeScript Kaldi-compatible 80-bin fbank + CMN preprocessing with Torchaudio parity anchors
- SHA-256 and tensor-contract verification script, model manifest, license notice, and attribution
- Cosine matcher with model/version compatibility filtering, an acceptance threshold, and ambiguity margin
- Explicit outcomes: `verified`, `unknown`, `ambiguous`, and `rejected_quality`
- Offline calibration CLI for FAR, FRR, EER, and minDCF threshold selection
- Score-only target/impostor calibration capture with consent copy, local storage, CSV export, and deletion
- Calibration-aware native runtime: enrollment is `calibrating`; verification remains disabled until a compatible evaluated threshold exists
- Premium three-step enrollment UI with an RMS-driven voice object, live level coaching, restrained haptics, accessible state copy, and progressive technical disclosure
- Tests for audio-quality policy, enrollment, matching, preprocessing, score capture/serialization, and calibration

## Safety boundary

Native builds now use the bundled WeSpeaker ECAPA candidate through ONNX Runtime. The web build remains an explicitly labeled, in-memory non-biometric preview and disables microphone capture because Expo's PCM stream is not implemented there.

The candidate model is not yet a production identity verifier. Native verification is deliberately locked because no ASK-device evaluation threshold has been released.

No result may be presented as biometric identity verification until all of these gates pass:

1. Collect consented target and impostor scores across supported phones, rooms, distances, accents, and noise conditions.
2. Produce and version a real threshold profile from those scores.
3. Pass physical-device tests for latency, memory, repeatability, enrollment failure handling, and template deletion.
4. Complete dataset/license review and spoof/replay threat review; voice similarity alone must not unlock high-risk actions.

## Next implementation slice

- Run same-speaker and different-speaker score generation on physical iOS and Android devices.
- Calibrate operating thresholds by environment cohort and record model/calibration versions in every stored template.
- Add replay/spoof fixtures and a physical-device benchmark report.
- Add encrypted SQLite storage only when profile payloads or multi-speaker scale exceed the small SecureStore envelope.

## Verification commands

```bash
npm run check
npm test
npm run test:calibration
npx expo prebuild --clean --no-install
npx expo export --platform ios
```
