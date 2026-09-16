# ASK — App Base v0.2

Local-first React Native and Expo Router foundation for ASK.

## Run

```bash
npm install
npm start
```

## Verify

```bash
npm run check
npm test
npx expo export --platform ios
```

## Implemented capabilities

- Typed transcript, evidence, semantic-draft, guard-decision, and canonical-event contracts
- Closed ASK function registry
- Ordered deterministic guard engine
- Idempotent canonical-event compiler
- In-memory repository behind a persistence interface
- Demo memories projected from guarded canonical events
- Deterministic lexical answers with confidence and transcript evidence
- Home, Ask, and Activity screens consuming canonical-memory projections
- Unit tests for evidence integrity, review/deny outcomes, idempotency, and grounded retrieval
- Raw 16 kHz mono PCM capture for enrollment and verification
- Voice-sample quality gates for duration, loudness, speech ratio, and clipping
- Three-sample voice enrollment with template self-consistency checks
- Versioned cosine matching with explicit verified, unknown, ambiguous, and rejected-quality outcomes
- Protected local template storage through Expo SecureStore
- Manifest-driven ONNX Runtime speaker-embedding adapter
- Offline threshold-calibration script reporting FAR, FRR, EER, and minDCF candidates
- Voice identity enrollment and verification UI under the You tab

## Current boundary

Phase 0 still uses transcript and parser fixtures. SQLite, ASR, BLE, cloud sync, and authentication are not implemented yet.

Phase 1 is underway. The capture, quality, enrollment, storage, matching, calibration, ONNX adapter, and UI seams are implemented. The app deliberately uses a non-biometric prototype vector until an audited 192-dimensional speaker model is bundled and thresholds are calibrated on representative device recordings. Do not use the prototype result as identity verification.

Native voice work requires an Expo custom development build; Expo Go remains useful only for screens that do not depend on custom native modules. See [Phase 1 status](./docs/PHASE_1_STATUS.md) for the acceptance boundary and next work.

See [PRD.md](./PRD.md) for the phased build specification.
