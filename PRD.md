# ASK Mobile Application — Product and Engineering Requirements

**Version:** 2.0 draft  
**Status:** Build specification  
**Primary client:** Expo Router / React Native mobile application  
**Companion:** ASK wearable audio device  
**Initial operating mode:** Local-first, offline-capable, single user  
**Deferred:** Account authentication, multi-tenant cloud, production billing

## 1. Purpose

ASK is a voice-first personal intelligence system. It converts captured speech into attributable, evidence-backed, structured memory and safe actions.

ASK is not primarily a recording manager, generic notes app, or unconstrained LLM chat interface. Its core product loop is:

```text
audio
  -> validated speech segments
  -> transcript with timestamps
  -> anonymous speaker turns
  -> verified speaker identities where confidence permits
  -> semantic event drafts
  -> deterministic functions and guard decisions
  -> immutable canonical events
  -> local retrieval index
  -> cited answers, summaries, and confirmed actions
```

This architecture is source-backed: the notebook explicitly recommends replacing `WAV -> LLM -> summary` with `WAV -> transcript -> semantic events -> deterministic functions -> structured facts -> deterministic summary`. [S2]

## 2. Source and decision notation

- `[S#]` means the requirement is grounded in a source contained in the ASK NotebookLM notebook. The source register is in Appendix A.
- `[D]` means a proposed engineering decision needed to make the source direction implementable. It must be validated by benchmarks or an architecture decision record (ADR).
- Numeric targets marked `[D-target]` are starting gates, not claims from the cited sources.

Notebook-generated synthesis was treated as untrusted secondary material. Requirements below cite the underlying notebook source names and explicitly separate sourced direction from implementation choices.

## 3. Product principles

1. **Evidence before fluency.** Every stored fact and user-facing answer must link to transcript spans and timestamps.
2. **Biometric identity is confidence-based.** Diarization answers “who spoke when” anonymously; speaker verification maps a turn to an enrolled person only when calibrated confidence permits. [S4]
3. **Models may propose; deterministic code decides.** A model cannot directly mutate canonical state or execute an external action. [S2][S3]
4. **Local operation is the default.** Core capture, memory access, voice verification, and retrieval must function without cloud availability. [S1][S7]
5. **Canonical events are the source of truth.** Generated prose is a view over canonical state, not the stored truth. [S2][S3]
6. **Consent is observable.** Capture state must be disclosed by device signals and represented in the conversation record. [S1]
7. **No universal biometric threshold.** Development heuristics may bootstrap testing, but release thresholds must be calibrated per model/version and target device using EER and cost-sensitive evaluation. [S5]

## 4. Users and primary jobs

### 4.1 Primary user

An individual who carries an ASK companion and wants reliable memory of conversations, decisions, commitments, and follow-up work.

### 4.2 Jobs to be done

- Capture conversations without losing audio when the phone is temporarily unavailable.
- Identify the enrolled owner and known participants when evidence supports the match.
- Extract decisions, actions, commitments, questions, requirements, risks, approvals, and rejections.
- Ask questions across past conversations and receive answers with inspectable evidence.
- Turn an extracted intent into a safe proposed function, then execute only after policy and confirmation checks.
- Keep raw audio, biometric voiceprints, and personal memory local unless the user explicitly enables a scoped cloud feature.

## 5. Main product areas

### 5.1 Home — What matters now

- Recent decisions and commitments
- Open and overdue actions
- Risks, unresolved questions, and changed facts
- Device capture/transfer state
- Processing failures that require user attention
- Local/cloud sync state expressed in user language

Home must not expose model logs or infrastructure metrics as the primary experience.

### 5.2 Ask — Query structured memory

- Natural-language query input
- Hybrid local retrieval
- Evidence-backed answer
- Source cards containing conversation, speaker label, timestamp, and excerpt
- Follow-up questions within the same retrieval scope
- Optional proposed action with explicit confirmation
- “Insufficient evidence” response when support is weak or conflicting

### 5.3 Activity — Inspect the memory timeline

- Conversations and derived semantic events
- Filters by person, project/entity, event type, date, confidence, and status
- Transcript/audio evidence navigation
- Correction workflow for transcript, speaker, and event fields
- Audit trail showing superseded values instead of destructive in-place rewriting

### 5.4 Agents — Permissioned function workers

Each agent has a purpose, memory scope, trigger, allowed functions, confirmation policy, model/runtime selection, and enabled state. Agents consume canonical events; they do not consume unrestricted raw audio by default.

### 5.5 You — Local identity, devices, and privacy

- Voice-signature enrollment, quality review, calibration status, and deletion
- Known-speaker profiles
- Device pairing and transfer diagnostics
- Local/cloud processing controls
- Model/runtime versions and downloadable model packs
- Data retention, export, deletion, and sync controls
- Account authentication is a later phase and is not a blocker for the local profile.

## 6. System boundary and compute split

### 6.1 ASK wearable responsibilities

The ESP32-class prototype is responsible for:

- 16 kHz, 16-bit mono PCM capture [S1]
- wake-word or physical-button capture activation [S1]
- observable capture/consent signals such as chime, light, or haptic state [S1]
- local flash/microSD ring buffering so temporary disconnects do not lose audio [S1]
- chunk sequencing, checksums, and BLE/Wi-Fi transfer [S1]
- optional Opus encoding for transport [S1]

It must not be the production host for full ASR, ECAPA-TDNN speaker embeddings, semantic parsing, or vector retrieval. Those workloads exceed the practical compute and memory envelope described in the sources. [S4]

### 6.2 Mobile responsibilities

- Transfer/session reconstruction and encrypted audio storage
- Audio validation, resampling, VAD, and optional denoising
- ASR and word timestamps
- diarization and voice-signature extraction/matching
- semantic parsing and entity normalization
- deterministic function routing and policy guards
- canonical SQLite state
- lexical/vector indexing, RRF fusion, MMR diversification, and cited answering
- local model registry and evaluation telemetry
- encrypted sync queue and receipt verification

### 6.3 Cloud responsibilities, when enabled

- Encrypted backup and multi-device replication
- Canonical-event integrity verification and signed receipts
- Optional heavier inference fallback explicitly requested by the user
- Optional vector search for opted-in team or multi-device scopes
- Model manifest/update distribution

Pinecone is not required for the mobile product. Local SQLite + FTS5 + sqlite-vec is the first source of truth; PostgreSQL with pgvector or a managed vector service is an optional later cloud implementation. [S7][D]

## 7. Current codebase baseline

The Phase 0 domain slice and the first Phase 1 implementation now contain:

- Expo Router and React Native Paper navigation/UI across Home, Ask, Activity, Agents, and You
- typed semantic-event compiler, function registry, guard engine, evidence contracts, deterministic summaries, and MMR retrieval primitives
- native 16 kHz mono PCM capture with deterministic quality gates
- a SHA-256-pinned WeSpeaker ECAPA-TDNN512 ONNX candidate and model-specific fbank preprocessing
- encrypted local voice-profile storage, three-sample enrollment, centroid/self-consistency checks, cosine scoring, and version fail-closed behavior
- target/impostor score capture, local score-only trial storage, and CSV export for EER/minDCF calibration
- an explicit native safety gate: speaker decisions remain disabled until an evaluated compatible threshold profile is installed

Still absent are canonical SQLite persistence, production ASR/diarization, BLE ingestion, a production semantic model, cloud sync/verification, authentication, and agent integrations.

Because ONNX Runtime Mobile, TensorFlow Lite, compiled SQLite extensions, and BLE GATT require native integrations, real-device work must use an Expo custom development build. Expo Go is not the target runtime for Phases 1–5. [D]

## 8. End-to-end processing lifecycle

### 8.1 Conversation states

```text
CREATED
  -> CAPTURING
  -> CAPTURED
  -> INGESTING
  -> TRANSCRIBING
  -> IDENTIFYING_SPEAKERS
  -> PARSING
  -> COMPILING
  -> INDEXING
  -> READY
```

Any processing state may transition to `FAILED_RETRYABLE`, `FAILED_FINAL`, or `AWAITING_USER_REVIEW`. Retrying must be idempotent.

### 8.2 Audio chunk states

```text
LOCAL_ON_DEVICE -> QUEUED -> TRANSFERRING -> RECEIVED -> HASH_VERIFIED
-> ENCRYPTED_AT_REST -> PROCESSING -> RETAINED | DELETED
```

Each chunk carries `conversation_id`, monotonic `sequence_no`, codec/sample format, byte count, SHA-256 digest, device timestamp, receive timestamp, and retry count. Missing or duplicate chunks are detected before transcription. [D]

### 8.3 Processing order

1. Validate container/codec, duration, sample rate, sequence, and checksum.
2. Encrypt the accepted local audio artifact and persist only its encrypted path.
3. Normalize to the inference format, initially 16 kHz mono PCM.
4. Run VAD and create speech segments.
5. Run ASR with word timestamps and language/code-switch metadata.
6. Run speaker segmentation/clustering to produce anonymous turns.
7. Extract an L2-normalized speaker embedding for eligible turns.
8. Compare the embedding against the local voiceprint registry.
9. Assign a known speaker only when the calibrated policy accepts the match; otherwise preserve `unknown`.
10. Parse transcript windows into unverified semantic event drafts.
11. Route drafts to named ASK functions.
12. Apply schema, confidence, provenance, consent, permission, conflict, and confirmation guards.
13. Commit accepted canonical events in one transaction with their evidence spans.
14. Generate deterministic display summaries.
15. Index canonical event text and evidence for hybrid retrieval.
16. Enqueue an optional encrypted sync batch and verify the returned receipt.

## 9. Core domain contracts

All identifiers are UUIDv7 or another time-sortable unique identifier. [D]

### 9.1 Conversation

```ts
type Conversation = {
  id: string;
  deviceId: string;
  startedAt: string;
  endedAt?: string;
  captureState: "capturing" | "captured" | "failed";
  processingState: ProcessingState;
  consent: {
    mode: "device_chime_light" | "manual_attestation" | "unknown";
    observedAt?: string;
  };
  languageHints: string[];
  audioArtifactId?: string;
  createdAt: string;
};
```

### 9.2 Transcript segment

```ts
type TranscriptSegment = {
  id: string;
  conversationId: string;
  startMs: number;
  endMs: number;
  text: string;
  words?: Array<{ text: string; startMs: number; endMs: number; confidence?: number }>;
  asrModelVersion: string;
  language?: string;
  anonymousSpeakerId?: string;
  resolvedSpeakerId?: string;
  speakerDecisionId?: string;
  supersedesSegmentId?: string;
};
```

### 9.3 Voice profile and template

```ts
type VoiceProfile = {
  id: string;
  displayName: string;
  owner: boolean;
  status: "enrolling" | "calibrating" | "active" | "needs_reenrollment" | "deleted";
  modelVersion: string;
  thresholdProfileId?: string;
  createdAt: string;
};

type VoiceTemplate = {
  id: string;
  profileId: string;
  encryptedVector: Uint8Array;
  dimensions: number;
  l2Normalized: true;
  sourceDurationMs: number;
  quality: { speechRatio: number; snrEstimate?: number; clippingRate: number };
  modelVersion: string;
};
```

Raw embeddings are biometric data. They remain encrypted locally by default and are never written to logs, analytics events, or generic text/vector indexes. [D]

### 9.4 Speaker decision

```ts
type SpeakerDecision = {
  id: string;
  segmentId: string;
  candidateProfileId?: string;
  cosineScore?: number;
  thresholdProfileId: string;
  outcome: "verified" | "unknown" | "ambiguous" | "rejected_quality";
  topAlternatives: Array<{ profileId: string; score: number }>;
  modelVersion: string;
  createdAt: string;
};
```

### 9.5 Semantic event draft

```ts
type SemanticEventDraft = {
  id: string;
  conversationId: string;
  proposedType: EventType;
  proposedFunction: FunctionName;
  fields: Record<string, unknown>;
  parserConfidence: number;
  evidence: EvidenceSpan[];
  parserModelVersion: string;
  warnings: string[];
};
```

### 9.6 Evidence span

```ts
type EvidenceSpan = {
  transcriptSegmentId: string;
  startChar: number;
  endChar: number;
  startMs: number;
  endMs: number;
  quotedText: string;
};
```

### 9.7 Canonical event

```ts
type EventType =
  | "decision" | "action" | "commitment" | "question" | "requirement"
  | "issue" | "risk" | "approval" | "rejection" | "note" | "fact";

type CanonicalEvent = {
  id: string;
  conversationId: string;
  type: EventType;
  functionName: FunctionName;
  subjectEntityId?: string;
  actorEntityId?: string;
  objectText: string;
  deadlineAt?: string;
  status: "open" | "done" | "cancelled" | "superseded" | "informational";
  confidence: { parser: number; speaker?: number; aggregate: number };
  evidence: EvidenceSpan[];
  guardDecisionId: string;
  schemaVersion: number;
  parserModelVersion: string;
  createdAt: string;
  supersedesEventId?: string;
};
```

Canonical events are append-only. Corrections create a new event or revision that references the superseded record. [D]

### 9.8 Guard decision

```ts
type GuardDecision = {
  id: string;
  draftId: string;
  outcome: "allow_commit" | "require_review" | "deny";
  ruleResults: Array<{
    ruleId: string;
    result: "pass" | "fail" | "warn";
    reasonCode: string;
  }>;
  normalizedFields: Record<string, unknown>;
  requiredConfirmation?: "none" | "user_before_commit" | "user_before_external_action";
  policyVersion: string;
  createdAt: string;
};
```

### 9.9 Sync batch and receipt

```ts
type SyncBatch = {
  id: string;
  deviceId: string;
  sequence: number;
  previousBatchHash?: string;
  payloadCiphertext: Uint8Array;
  payloadSha256: string;
  idempotencyKey: string;
  state: "queued" | "uploading" | "uploaded" | "verified" | "retry" | "failed";
};

type CloudVerificationReceipt = {
  batchId: string;
  payloadSha256: string;
  serverSequence: number;
  acceptedAt: string;
  serverSignature: string;
  result: "accepted" | "duplicate" | "rejected";
};
```

Cloud verification means verifying encrypted payload integrity, ordering, idempotency, and server acknowledgement. It does not mean uploading raw voice embeddings by default. [D]

## 10. Voice-signature engine

Voice signature is a Phase 1 feature, before full device ingestion.

### 10.1 Correct conceptual split

- **Diarization:** segments a conversation and clusters turns into anonymous speakers. [S4]
- **Verification:** answers whether a sample matches a claimed enrolled speaker.
- **Identification:** ranks a sample against several enrolled speakers and may return unknown.
- **Voiceprint:** an embedding representation produced by a versioned speaker model; it is not a password or immutable biological truth.

### 10.2 Candidate implementation

- Selected Phase 1 candidate: WeSpeaker VoxCeleb ECAPA-TDNN512 at frozen revision `89426e111abc9ffcc40279baf808e087693c6e9b`. [D]
- Mobile inference artifact: the upstream ONNX artifact executed by ONNX Runtime Mobile with a pinned SHA-256 and immutable tensor/preprocessing manifest. [D]
- Input: 16 kHz mono PCM transformed to 80-bin Kaldi-compatible log Mel filterbanks, followed by per-recording mean normalization.
- Output: 192-dimensional embedding, L2-normalized by the ASK adapter.
- Alternative benchmark: compatible TensorFlow Lite speaker embedding model. [D]

SpeechBrain remains a relevant reference ecosystem, but its official ECAPA checkpoint does not define a stable, supported ONNX mobile-export contract. ASK therefore uses the reviewed WeSpeaker artifact rather than an undocumented conversion path. [D]

The winning runtime/model is selected by an on-device benchmark covering accuracy, latency, peak memory, binary size, thermals, and battery. It is not selected by framework preference.

### 10.3 Enrollment

1. Capture at least three prompted samples across different phrases and positions. [D]
2. Reject clipped, too-short, low-speech-ratio, or excessively noisy samples.
3. Generate one embedding per accepted sample.
4. Store encrypted templates and a derived centroid.
5. Run self-consistency checks; request re-enrollment if samples disagree.
6. Show that voice identity is probabilistic and can be deleted.

### 10.4 Scoring and calibration

For L2-normalized embeddings `q` and `v`:

```text
cosine(q, v) = q dot v
```

A development threshold such as 0.75 may be used only as a visibly marked bootstrap heuristic when using the cited setup. [S4] Production release uses a frozen evaluation set with target and impostor trials:

```text
theta_EER = argmin_theta |FAR(theta) - FRR(theta)|

C_det(theta) = C_FR * FRR(theta) * P_target
             + C_FA * FAR(theta) * (1 - P_target)

theta_minDCF = argmin_theta C_det(theta)
```

The selected threshold profile is versioned by model, preprocessing pipeline, platform, and operating policy. [S5]

### 10.5 Decision policy

- Return `verified` only if the top score clears the calibrated threshold and the margin over the second-best candidate clears a calibrated ambiguity margin. [D]
- Return `unknown` when no profile clears the threshold.
- Return `ambiguous` when multiple profiles are too close.
- A voice match may attribute a memory; it must not by itself authorize a sensitive external action. [D]
- User corrections become labeled evaluation examples, not silent threshold changes.

### 10.6 Cloud handling

Default: verification happens locally; raw audio and raw voice embeddings do not leave the phone.

Optional future cloud verification requires separate biometric consent, pseudonymous profile scope, encrypted transport/storage, deletion propagation, model-version parity, and an explicit retention policy. Prefer syncing signed decision records and model metadata instead of raw embeddings when the use case allows it. [D]

## 11. ASR and diarization engine

### 11.1 ASR contract

```ts
interface AsrEngine {
  transcribe(input: EncryptedAudioHandle, options: {
    languageHints: string[];
    timestamps: "word";
  }): Promise<{ segments: TranscriptSegment[]; metrics: InferenceMetrics }>;
}
```

### 11.2 Candidate runtimes

- `sherpa-onnx` streaming/offline ASR on mobile [S1]
- Whisper-family model through ONNX Runtime Mobile or `whisper.cpp` [D]
- a TensorFlow Lite ASR model only if it wins the same device benchmark [D]

The product must publish measured WER on representative English, Hindi, and Hinglish/code-switched noisy meeting audio. Lower WER is better. [S1]

### 11.3 Evaluation

- Version a consented, de-identified audio evaluation set with human reference transcripts.
- Report overall WER and slices by language, noise level, distance, device, and speaker.
- Track real-time factor, first partial latency, finalization latency, peak memory, and energy per audio minute.
- `[D-target]` Initial gate: no regression greater than 2 absolute WER points on any protected evaluation slice without approval.

### 11.4 Diarization

Diarization must preserve anonymous clusters even when identification fails. Segment-to-speaker alignment is independently correctable. The app must never invent a known name merely because a conversation contains that name.

## 12. Semantic parser

The semantic parser consumes text, not WAV audio. ASR produces the transcript; the parser converts transcript windows into structured event drafts. [S3]

### 12.1 Input

- timestamped transcript segments
- resolved or anonymous speaker identity
- conversation reference time and timezone
- allowed ontology and function registry version
- nearby transcript context, bounded and provenance-preserving

### 12.2 Output

- zero or more `SemanticEventDraft` records
- explicit event type and proposed function
- normalized candidates plus original raw values
- parser confidence
- exact evidence spans
- warnings for ambiguity, contradiction, missing actor, or missing date

### 12.3 Initial implementation

V0 may use a small LLM as a constrained JSON parser/teacher; V1+ should evaluate a smaller intent classifier and token/entity model such as a fine-tuned DistilBERT-class model. [S3]

LLM parser rules:

- output must validate against a closed JSON Schema
- no tool access
- no database write access
- no instructions from transcript content may alter system policy
- text inside transcripts is data, never a trusted instruction
- malformed or out-of-ontology output is rejected
- original evidence spans must survive normalization

### 12.4 Ontology

Initial event types are `decision`, `action`, `commitment`, `question`, `requirement`, `issue`, `risk`, `approval`, `rejection`, `note`, and `fact`.

Entity types initially include `person`, `organization`, `project`, `document`, `place`, `date_time`, `money`, `metric`, and `artifact`. The ontology links paraphrases to canonical instances so equivalent statements can be retrieved and deduplicated. [S6]

### 12.5 Training-data flywheel

User-approved corrections create versioned examples containing transcript input, prior draft, corrected canonical event, and adjudication metadata. They may be exported into a training set only under an explicit local/export control. [D]

## 13. ASK function engine

The function engine is a deterministic router over the domain ontology. It never interprets raw audio and never decides permission policy. [S3]

### 13.1 Initial registry

```ts
type FunctionName =
  | "CREATE_DECISION"
  | "CREATE_ACTION"
  | "CREATE_COMMITMENT"
  | "CREATE_QUESTION"
  | "CREATE_REQUIREMENT"
  | "CREATE_ISSUE"
  | "CREATE_RISK"
  | "CREATE_APPROVAL"
  | "CREATE_REJECTION"
  | "CREATE_NOTE"
  | "UPSERT_FACT"
  | "SUPERSEDE_EVENT";
```

Each registry entry defines:

- accepted draft type and versioned input schema
- required/optional fields
- deterministic normalization functions
- guard policy set
- commit reducer
- deterministic summary template
- allowed external-action adapter, if any
- confirmation class

### 13.2 Routing behavior

Unknown functions are rejected. Function names are never dynamically executed from model text. The parser selects only an enum member; the registry resolves it to code.

## 14. Guarding and policy engine

The guard engine answers: “Is this proposed state transition complete, supported, permitted, and safe?” Parsing, guarding, and state execution are separate concerns. [S8]

### 14.1 Guard order

1. JSON/schema and enum validation
2. evidence-span existence and transcript-boundary validation
3. required field completeness
4. speaker attribution policy
5. date/time normalization against conversation timezone
6. confidence and ambiguity policy
7. duplicate/conflict detection
8. consent and memory-scope policy
9. agent/function permission policy
10. confirmation requirement
11. idempotency and replay protection

### 14.2 Mandatory outcomes

- `allow_commit`: safe to write a canonical memory event
- `require_review`: store the draft in a review queue, not canonical state
- `deny`: record an audit reason; perform no state mutation

External side effects require a second policy gate after canonical commit. Creating an action memory and sending a calendar invitation are distinct functions.

## 15. Canonical event store

### 15.1 Database

Initial database: SQLite with migrations and foreign keys enabled.

Minimum tables:

- `conversations`
- `audio_artifacts`
- `audio_chunks`
- `transcript_segments`
- `anonymous_speakers`
- `voice_profiles`
- `voice_templates`
- `threshold_profiles`
- `speaker_decisions`
- `semantic_event_drafts`
- `guard_decisions`
- `canonical_events`
- `event_evidence`
- `entities`
- `event_entities`
- `functions`
- `action_executions`
- `memory_documents`
- `embedding_records`
- `sync_jobs`
- `cloud_receipts`
- `model_manifests`
- `audit_log`

### 15.2 Commit invariants

- An event cannot commit without at least one valid evidence span.
- An event references the parser model and guard-policy versions.
- An external action cannot execute without a committed event and required confirmation.
- Reprocessing the same draft/function/idempotency key cannot create a duplicate event.
- Deletion and supersession remain auditable without retaining deleted biometric/audio payloads.

## 16. Retrieval, MMR, and cited answering

### 16.1 Indexing unit

Index canonical events and bounded evidence text. Do not treat arbitrary raw transcript chunks as equal to validated events. Transcript chunks may remain a secondary recall index with lower trust weighting. [D]

### 16.2 Candidate generation

In parallel:

- FTS5 BM25 lexical retrieval
- sqlite-vec cosine vector retrieval using an on-device sentence embedding model
- metadata filters for person, project/entity, event type, time range, status, and consent scope

The notebook suggests `all-MiniLM-L6-v2` as a practical 384-dimensional starting model for semantic-search experiments. [S7] Model choice remains benchmark-driven for multilingual/Hinglish performance. [D]

### 16.3 Rank fusion

Use Reciprocal Rank Fusion as the first deterministic merge strategy. [D]

```text
RRF(d) = sum_r 1 / (k + rank_r(d))
```

Starting value: `k = 60` `[D-target]`. Retrieve 50 lexical and 50 vector candidates, fuse, then retain the top 30 for diversification/reranking. `[D-target]`

### 16.4 Maximal Marginal Relevance

MMR balances query relevance with redundancy. [S6]

```text
next = argmax(d in R - S) [
  lambda * sim(query, d)
  - (1 - lambda) * max(sim(d, selected))
]
```

Starting value: `lambda = 0.7` `[D-target]`. Query relevance uses normalized fused/re-ranker score; redundancy uses document-embedding cosine similarity. Do not use raw BM25 and cosine scores in one weighted sum without normalization.

### 16.5 Optional reranker

After retrieval is measurable, evaluate a compact cross-encoder over the fused candidate set. Two-stage bi-encoder retrieval plus cross-encoder reranking is source-supported, but is not required for the first correct local implementation. [S7]

### 16.6 Answer contract

```ts
type MemoryAnswer = {
  answer: string;
  answerMode: "deterministic" | "extractive" | "local_model" | "cloud_model";
  evidence: Array<{
    eventId: string;
    conversationId: string;
    transcriptSegmentId: string;
    timestampMs: number;
    excerpt: string;
    relevance: number;
  }>;
  confidence: "high" | "medium" | "insufficient";
  conflicts: string[];
};
```

No answer may claim a fact absent from returned evidence. The fallback is an explicit insufficient-evidence result.

## 17. Local ML model registry

Every model artifact has:

- logical role (`asr`, `vad`, `speaker_embedding`, `semantic_parser`, `text_embedding`, `reranker`)
- semantic version and content hash
- runtime (`onnxruntime`, `tflite`, `whisper_cpp`, other)
- input/output tensor contract
- preprocessing version
- quantization and supported architectures
- minimum RAM/storage requirements
- evaluation report ID
- rollout/rollback state

ONNX Runtime Mobile and TensorFlow Lite are candidate execution runtimes, not product features. Models must be interchangeable behind stable TypeScript/native interfaces.

## 18. Security, privacy, and deletion

### 18.1 Local encryption

- Per-artifact authenticated encryption using AES-256-GCM `[D]`
- Master wrapping key held in iOS Keychain/Secure Enclave or Android Keystore `[D]`
- Unique nonce per encryption operation
- No plaintext audio or embeddings in logs, crash reports, or unencrypted caches
- Database encryption strategy selected by ADR and device threat-model test

### 18.2 Consent

The conversation stores how capture consent/notice was signaled. Device chime/light is source-backed; app UX must expose incomplete or unknown consent state. [S1]

### 18.3 Model and transcript isolation

- Transcript content is untrusted data.
- Models cannot call functions directly.
- Prompt-injection strings inside captured speech cannot change policy, function registry, memory scope, or sync settings.
- Every generated draft must pass closed-schema validation and evidence checks.

### 18.4 Deletion

Deleting a voice profile:

1. deletes encrypted templates and centroids;
2. invalidates threshold/profile caches;
3. changes historical resolved labels to a tombstoned/unknown display mapping without falsifying transcript history;
4. enqueues deletion for any explicitly opted-in cloud replica;
5. records a non-biometric deletion audit event;
6. prevents future matching immediately.

Deleting a conversation removes its audio, transcript, events, embeddings, indexes, and cloud replicas according to retention policy. Deletion tests must prove that data is not returned by retrieval afterward.

## 19. Sync and cloud verification

### 19.1 Default

Sync is disabled. The app remains fully useful offline.

### 19.2 When enabled

- Build a deterministic manifest of records and content hashes.
- Encrypt the payload before upload.
- Use a stable idempotency key for retries of the same logical batch.
- The server validates ordering, duplicate status, and payload hash.
- The server returns a signed verification receipt.
- The client verifies the signature and stores the receipt before marking the batch `verified`.
- A hash mismatch or invalid signature never advances sync state.

### 19.3 Vector policy

- Conversational text embeddings may be uploaded only for an enabled cloud retrieval scope.
- Voice embeddings require a separate biometric-cloud opt-in and must use a dedicated namespace/table, encryption policy, and deletion path.
- Raw audio is never stored in a vector database. [S7]
- “Upload cosine to cloud” is implemented as uploading an explicitly permitted embedding or a signed local match decision—not a cosine value without its model, threshold, and provenance metadata. [D]

## 20. Observability and evaluation

Local structured metrics may include durations, state transitions, model versions, error codes, and aggregate performance. They must exclude raw audio, transcript text, voice vectors, names, and evidence excerpts unless the user exports a diagnostic bundle.

Required evaluation suites:

- audio corruption/sequence fixtures
- multilingual ASR reference set and WER report
- speaker target/impostor trials with FAR, FRR, EER, minDCF, ROC/DET curves
- semantic parser golden set with event-type F1, entity span F1, schema validity, and evidence accuracy
- guard adversarial set with injection, missing fields, ambiguous dates, conflicts, and replay
- retrieval relevance set with Recall@K, MRR/nDCG, diversity, and citation precision
- offline and interrupted-sync integration suite

## 21. Phase-by-phase build plan

### Phase 0 — Contracts and deterministic vertical slice

**Goal:** Replace mock answer logic with a testable, database-shaped domain core while retaining fixture data.

**Build**

- `src/domain/` types and JSON Schemas from Section 9
- function registry with at least `CREATE_ACTION`, `CREATE_DECISION`, and `CREATE_NOTE`
- guard engine with schema, provenance, confidence, and confirmation rules
- in-memory repository adapters plus migration-ready repository interfaces
- deterministic event templates
- evidence-aware retrieval response contract
- fixtures for transcripts, drafts, guard outcomes, events, and conflicts
- unit-test runner, formatting, linting, and CI

**Exit gates**

- `[D-target]` 100% of canonical commits have valid evidence spans.
- `[D-target]` Replaying the same input/idempotency key creates exactly one event.
- `[D-target]` No model output path can directly invoke an action adapter.
- Existing five-tab UI renders domain fixtures through repository interfaces.

**Do not build yet:** BLE, real ASR, cloud auth, vector database, or agent integrations.

### Phase 1 — Voice enrollment, calibration, and verification

**Goal:** Prove the key biometric feature on the phone using imported/recorded samples before device streaming.

**Build**

- custom Expo development builds for iOS and Android
- native audio capture/import adapter
- VAD/preprocessing module
- ONNX Runtime Mobile speaker-embedding adapter; TFLite benchmark adapter optional
- encrypted voice-profile repository
- enrollment quality checks and UI
- cosine scorer, multi-template centroid, unknown/ambiguous outcomes
- Python/off-device calibration harness for EER and minDCF; generated threshold profile imported by the app
- consented target/impostor evaluation fixtures

**Exit gates**

- Model produces deterministic-dimension, L2-normalized vectors on both target platforms.
- Release threshold is generated from a versioned evaluation set, not hard-coded.
- FAR/FRR/EER/minDCF report exists for the candidate model and preprocessing version.
- `[D-target]` P95 embedding latency and peak memory meet device-class budgets recorded in an ADR.
- Deleting a profile makes all subsequent identification return unknown for that profile.

**Do not build yet:** production diarization, cloud biometric storage, or voice-authorized payments/actions.

### Phase 2 — Real audio ingestion, ASR, and anonymous diarization

**Goal:** Turn WAV/PCM from files and then the prototype device into timestamped, attributable transcript segments.

**Build**

- audio artifact/chunk migrations
- file-import ingestion first, then BLE GATT transfer
- sequence/checksum/retry reconstruction
- encrypted-at-rest audio repository
- ASR adapter benchmark: sherpa-onnx versus selected Whisper implementation
- word timestamps, language hints, Hinglish evaluation
- anonymous diarization/turn segmentation
- speaker-decision alignment using Phase 1 verification
- processing state machine and retry UI

**Exit gates**

- `[D-target]` A known fixture transferred twice produces one audio artifact and one transcript.
- Missing/corrupt chunks are detected before ASR.
- WER, latency, memory, and energy reports exist by evaluation slice; lower WER is treated as better.
- Unknown speakers remain unknown; no forced identity assignment.
- Airplane-mode file import and processing complete without cloud access.

**Do not build yet:** custom PCB, all-day battery claims, or automatic external actions.

### Phase 3 — Semantic compiler, functions, guards, and canonical memory

**Goal:** Compile transcripts into trustworthy structured memory.

**Build**

- SQLite migrations for drafts, guards, events, evidence, entities, and audit
- constrained parser adapter with closed JSON Schema
- ontology/entity normalizers
- full initial function registry
- ordered guard pipeline
- transactional event compiler and supersession workflow
- correction/review UI
- deterministic summaries
- golden parser and adversarial guard datasets

**Exit gates**

- `[D-target]` 100% schema validity after parser boundary; invalid drafts never commit.
- `[D-target]` 100% committed events resolve to existing transcript evidence.
- Parser evaluation reports event-type F1, entity F1, and evidence-span accuracy.
- Injection text in transcripts cannot alter policy or invoke a function.
- Ambiguous/high-risk drafts enter review instead of canonical state.

**Do not build yet:** learned autonomous agent execution or model-driven permissions.

### Phase 4 — Hybrid memory retrieval, MMR, and cited answers

**Goal:** Answer real memory questions locally with diverse, inspectable evidence.

**Build**

- SQLite/FTS5 memory document index
- sqlite-vec integration in the custom native build
- local text-embedding adapter and versioned embedding migration
- parallel lexical/vector search
- metadata scopes, RRF, and MMR
- evaluation queries with graded relevance
- deterministic/extractive answerer first; optional local generative answerer behind the same evidence contract
- source cards and conflict/insufficient-evidence UX

**Exit gates**

- `[D-target]` Hybrid Recall@10 exceeds both lexical-only and vector-only baselines on the frozen evaluation set.
- MMR reduces duplicate evidence without decreasing answer-support precision below the approved baseline.
- `[D-target]` 100% factual answer sentences are supported by at least one returned evidence item in the citation audit set.
- Airplane-mode queries return the same ranked IDs as connected mode for local scope.

**Do not build yet:** cloud-only RAG dependency or uncited global chat.

### Phase 5 — Encrypted sync, cloud receipts, and hardware hardening

**Goal:** Add optional verified replication and production-oriented device transport without weakening local-first behavior.

**Build**

- sync job/receipt migrations and state machine
- encrypted manifest/batch protocol
- idempotent upload endpoint and signed receipt verification
- deletion propagation and reconciliation
- optional PostgreSQL/pgvector cloud replica selected by ADR
- device ring-buffer recovery, transfer backpressure, and reconnect tests
- battery/thermal measurement harness
- capture consent signals and device status integration

**Exit gates**

- Retry of the same batch creates no duplicate remote records.
- Tampered payloads and forged receipts are rejected.
- Local changes remain accessible during cloud outage and reconcile after recovery.
- Deletion is verified locally and remotely within the documented service target.
- Hardware publishes measured transfer reliability and battery runtime; no unmeasured all-day claim.

**Do not build yet:** broad multi-tenant authentication, enterprise administration, or default cloud biometric storage.

## 22. Acceptance-test matrix

| Capability | Minimum acceptance test | Required evidence |
|---|---|---|
| Audio ingestion | Detect duplicate, missing, reordered, and corrupt chunks; reconstruct valid fixture once | Chunk manifest, final hash, state trace |
| Encryption | Plaintext fixture is absent from app files/logs after commit; ciphertext tamper fails authentication | Storage scan and negative decrypt test |
| ASR | Transcribe frozen English/Hindi/Hinglish fixtures with word timestamps | Versioned WER and latency report |
| Diarization | Preserve correct anonymous turn boundaries within labeled tolerance | Turn-level evaluation report |
| Enrollment | Reject bad samples; create encrypted templates from accepted samples | Quality decisions and vector metadata |
| Verification | Evaluate target/impostor pairs and unknown/ambiguous paths | FAR, FRR, EER, minDCF, threshold profile |
| Semantic parsing | Produce valid drafts with exact evidence spans for golden transcripts | Event/entity/evidence metrics |
| Function routing | Map only allowed enum functions; reject unknown function strings | Registry unit tests |
| Guarding | Block missing evidence, ambiguous dates, injection, unauthorized action, and replay | Rule-result audit records |
| Canonical commit | Commit event + evidence + audit atomically; retry remains idempotent | Transaction integration test |
| RRF/MMR retrieval | Beat single-channel baselines and avoid redundant top results | Recall@K, nDCG/MRR, diversity report |
| Cited answer | Every factual statement opens the supporting transcript span | Citation precision audit |
| Offline operation | Capture/import, process, search, and inspect memory in airplane mode | End-to-end device test |
| Sync | Resume after interruption without duplicates | Sync state trace and remote counts |
| Cloud receipt | Reject wrong hash, sequence, signature, and device scope | Cryptographic negative tests |
| Deletion | Deleted audio/profile/event is absent from storage, indexes, retrieval, and enabled replica | Deletion conformance report |

## 23. Initial repository architecture

```text
src/
  app/                         # Expo Router screens only
  domain/
    audio/
    identity/
    transcript/
    semantic/
    functions/
    guards/
    events/
    retrieval/
    sync/
  application/                 # use cases and orchestration
  infrastructure/
    database/
    crypto/
    audio/
    ble/
    inference/
      onnx/
      tflite/
    sync/
  features/                    # UI-facing feature modules
  evaluation/                  # fixture runners and local reports
native/                        # generated/custom native modules as required
models/                        # manifests only; large artifacts excluded from git
docs/adr/
```

UI code depends on application interfaces, never directly on SQLite, BLE, or a particular model runtime.

## 24. Definition of the first coding milestone

The first coding milestone is complete when the current mock app can ingest a transcript fixture, parse a deterministic fixture draft, route it through a real function registry and guard engine, commit an evidence-backed canonical event through a repository interface, and answer a fixture question with a clickable source span—all without an LLM or cloud.

This milestone deliberately establishes trustworthy contracts before native ML and device complexity.

## 25. Product-level success criteria

- A user can understand what ASK captured, how it interpreted it, and which evidence supports the interpretation.
- Unknown or uncertain speakers are represented honestly.
- A parser or model failure cannot silently corrupt canonical memory or execute an action.
- Voice-signature quality is measured with biometric evaluation, not demo anecdotes.
- Retrieval is measured against lexical-only and vector-only baselines.
- The app remains useful offline.
- Optional cloud sync is verifiable and reversible.
- Every high-risk claim in release notes links to a benchmark or acceptance report.

## 26. Non-goals through Phase 5

- Generic social feed or generic notes product
- Raw recording log as the primary UX
- Runtime dependence on a cloud LLM
- Full CRM/workflow platform
- Unconstrained autonomous agents
- Voiceprint as sole authorization for sensitive actions
- Default raw-audio or biometric-vector cloud upload
- Custom wake word in the first hardware demonstration [S1]
- Production custom PCB before the phone-side pipeline is validated
- Full account authentication before local single-user correctness

---

## Appendix A — Notebook source register

These references identify sources inside the connected NotebookLM notebook **ASK — AI Meeting Companion Build Plan**.

- **[S1]** `AI_Meeting_Companion_BOM_Challenge_and_Plan.pdf` — prototype hardware, 16 kHz capture/streaming, ring buffer, sherpa-onnx suggestion, consent signals, device power limits, Hinglish WER measurement, and seven-day prototype constraints.
- **[S2]** `Yes. This is actually a much stronger architecture...` — conversation-to-event compiler, canonical structured facts, deterministic summaries, and LLM-as-optional-teacher direction.
- **[S3]** `No, the raw .wav file is NOT converted to text...` — separation of ASR, semantic parser, structured event drafts, ASK function engine, canonical JSON, summary engine, and action engine.
- **[S4]** `First, a clarification: Diarization by itself...` — diarization versus speaker identification/verification, voice embeddings, cosine matching, candidate ECAPA-TDNN/CAM++ models, and ESP32 compute constraints.
- **[S5]** `Finding the mathematically optimal cosine similarity...` — speaker-threshold calibration using FAR, FRR, EER, and Detection Cost Function.
- **[S6]** `Construct the Domain Ontology & Instances...` — ontology/instance mapping and Maximal Marginal Relevance concepts for relevance versus redundancy.
- **[S7]** `Yes. And this is a very good project for you to...` and `Yes. I would turn this into a real product/engineering...` — local SQLite/FTS5/sqlite-vec direction, MiniLM starting point, two-stage retrieval/reranking, optional Pinecone/PostgreSQL cloud roles, and separation of source audio from vector stores.
- **[S8]** `In software architectures and state machines...` — separation of semantic parsing, guarding/rules, and state execution.

## Appendix B — Open ADRs

1. ONNX Runtime Mobile versus TensorFlow Lite for speaker embeddings
2. sherpa-onnx versus Whisper runtime for mobile ASR
3. diarization implementation and turn-alignment strategy
4. SQLCipher versus encrypted columns/files plus platform-protected keys
5. sqlite-vec packaging and migration strategy in Expo custom builds
6. multilingual text-embedding model for English/Hindi/Hinglish
7. local parser model versus constrained development-time teacher
8. cloud database choice only after a real multi-device/team requirement
9. biometric evaluation dataset collection and consent protocol
10. device GATT protocol and chunk-recovery specification
