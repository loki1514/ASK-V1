# ASK Architecture

## Implemented semantic-event flow

```text
Transcript fixture
  -> SemanticEventDraft
  -> closed FunctionRegistry lookup
  -> ordered GuardEngine rules
  -> CanonicalEventCompiler
  -> CanonicalEventRepository
  -> MemoryView projection
  -> LexicalRetrievalEngine
  -> MemoryAnswer with evidence
  -> Expo Router UI
```

The semantic parser is currently represented by typed fixtures. This is deliberate: parser output is untrusted input to the deterministic boundary.

## Implemented Phase 1 voice flow

```text
Expo Audio PCM buffers
  -> VoiceSampleQuality policy
  -> SpeakerEmbeddingEngine
       -> PrototypeFeatureEmbeddingEngine (current wiring only)
       -> OnnxSpeakerEmbeddingEngine (production seam)
  -> enrollment self-consistency gate
  -> normalized template centroid
  -> VoiceProfileRepository
       -> SecureStoreVoiceProfileRepository (native)
       -> InMemoryVoiceProfileRepository (tests/web)
  -> cosine ranking + threshold + ambiguity margin
  -> verified | unknown | ambiguous | rejected_quality
```

The current runtime stops at an explicit safety gate: the prototype engine is non-biometric. A reviewed ONNX artifact, preprocessing parity tests, and a device-calibrated threshold profile are required before speaker decisions can be treated as identity evidence.

## Dependency direction

```text
UI -> application use cases -> domain interfaces <- infrastructure adapters
```

- `src/domain`: canonical types, function registry, guards, compiler, voice quality, vector math, matching, and repository contracts
- `src/application`: semantic-event orchestration plus voice enrollment and verification use cases
- `src/infrastructure`: in-memory repositories, protected local voice templates, and ONNX inference adapter; SQLite and sync later
- `src/data`: demo transcript/draft fixtures and UI projections
- `src/lib`: retrieval adapter used by the current UI

UI modules must not import a database, BLE driver, or model runtime directly.

## Invariants already enforced

- No canonical event without transcript evidence
- Evidence text and character/time bounds must match the source transcript
- Function and event types must agree with the closed registry
- Required fields must be present
- Low-confidence or unresolved inputs go to review
- Duplicate idempotency keys cannot create duplicate events
- Only an `allow_commit` guard decision reaches the compiler
- Answers return the exact canonical memories used as sources
- Poor-quality voice samples cannot enter enrollment or verification
- Voice templates and probes must share model, preprocessing, and embedding versions
- A top cosine score must clear both the calibrated threshold and ambiguity margin
- Model/calibration metadata travels with every stored voice template

## Next boundary: production voice model

Bundle and validate the chosen ECAPA-family ONNX artifact, generate representative device score data, and replace the development threshold profile with a versioned calibration result. A future TensorFlow Lite adapter can implement the same `SpeakerEmbeddingEngine` contract without changing domain or UI code.
