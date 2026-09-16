# Voice identity model artifacts

Phase 1 bundles a pinned WeSpeaker ECAPA-TDNN512 candidate for on-device speaker embeddings. It is a **candidate awaiting ASK-specific evaluation**, not a production identity system.

## Bundled artifact

- file: `voxceleb_ECAPA512.onnx`
- upstream: `Wespeaker/wespeaker-voxceleb-ecapa-tdnn512`
- frozen revision: `89426e111abc9ffcc40279baf808e087693c6e9b`
- SHA-256: `f901ae3571912bad4e11e157744cb8b7d77a0b46923b83c410bdbb6c77d69736`
- ONNX opset: 14
- input: `feats`, float32 `[batch, frames, 80]`
- output: `embs`, float32 `[batch, 192]`

## Preprocessing contract

`wespeaker-kaldi-fbank80-cmn/1.0.0` matches the official WeSpeaker inference path:

- mono PCM at 16 kHz, scaled by 32768
- 25 ms frames and 10 ms shift
- DC-offset removal and pre-emphasis 0.97
- Hamming window, 512-point FFT, power spectrum
- 80 natural-log Mel filterbank bins
- dither 0
- per-recording cepstral mean normalization
- final embedding L2 normalization in the ASK adapter

The TypeScript implementation lives in `src/infrastructure/inference/preprocessing/weSpeakerFbank.ts` and is guarded by parity anchors produced with Torchaudio Kaldi compliance.

## Release gate

Before enabling identity decisions on native builds:

1. Collect consented same-speaker and different-speaker scores on target phones.
2. Export score-only CSV files; never add audio or speaker embeddings to evaluation exports.
3. Generate a versioned threshold profile with `scripts/calibrate_voice_threshold.py`.
4. Measure FAR, FRR/EER, demographic/device slices, latency, memory, size, and thermals on iOS and Android.
5. Install only a threshold whose model and preprocessing versions exactly match the bundled artifact.
6. Complete legal/security review of the upstream weights and dataset attribution.

Run `python3 scripts/verify_voice_model.py` to verify the pinned bytes. See `NOTICE.md` for provenance and attribution.
