# ASK Device Protocol + Ingestion Architecture

The ESP32 device streams audio as small sequential frames over the network.
This document is the reference for the device → transport → gateway →
processing split, so firmware and app layers can evolve independently (per the
device/transport architecture review).

## Principle

- **Never send random packets.** Every frame follows the ASK Device Protocol.
- **Small sequential chunks**, not one giant HTTP upload: `SESSION_START →
  AUDIO_CHUNK* → SESSION_END`.
- **Don't put AI behind the ESP32.** The device only captures + frames audio.
  ASR, diarization, voice identity, semantic compilation, memory, and agents
  all live behind the gateway.

```
ASK DEVICE                     ASK GATEWAY                     PROCESSING
6× MEMS MIC                    Device API                     ASR / Diarization
   │ audio                        │                              │
Packetizer / ESP32-S3   WS/TLS →  │  Event Bus / Object Store →  Voice Identity
   │ (control: MQTT)              │                              │
   └─── frames ───► ingestion ────┘                              Semantic Compiler
                                                                  │
                                                                 Memory / Actions
```

## ASK Device Protocol

### Frame

```
HEADER (text, one line):
  ASK/1 <deviceId> <sessionId> <type> <seq> <tsMs> <codec> <payloadLen> <flags>

TYPE tokens:  SS=SESSION_START  AC=AUDIO_CHUNK  SE=SESSION_END
              DS=DEVICE_STATUS  CA=DEVICE_COMMAND_ACK

PAYLOAD:      raw bytes (<= 16 KB)
CHECKSUM:     CRC32 (hex) over header + payload
```

### Integrity gates (before any ASR/processing)

| Rule | Behaviour |
|---|---|
| Protocol version | reject `BAD_PROTOCOL_VERSION` |
| Header shape | reject `MALFORMED_HEADER` |
| Payload bounds | reject `PAYLOAD_TOO_LARGE` |
| CRC32 | reject `CHECKSUM_MISMATCH` — chunk is dropped, never forwarded |
| Sequence | missing/duplicate → `OUT_OF_ORDER` / `DUPLICATE_SEQUENCE` |
| Session lifecycle | chunk before `SESSION_START` or after `SESSION_END` → `UNEXPECTED_PACKET_TYPE` |

A session only emits to processing when it reaches `SESSION_END` with every
frame verified. Corrupt or missing chunks therefore surface before ASR.

## Transports

| Transport | Where used | Implementation |
|---|---|---|
| WebSocket/TLS | live audio streaming | `InMemoryDeviceTransport` (seam; swap in real WSS server) |
| HTTPS | completed audio, metadata, firmware | future adapter |
| MQTT/TLS | device control + events (battery, status, commands) | future adapter |

The app layer depends only on `DeviceTransport` + `AskPacket`, so swapping
ESP32-S3 → ESP32-P4 or WebSocket → BLE requires no protocol change (the
ESP32 Wi-Fi stack already separates app / LwIP / Wi-Fi / hardware).

## Code map

| File | Role |
|---|---|
| `src/domain/device/protocol.ts` | frame/packet types, errors, constants |
| `src/domain/device/crc32.ts` | CRC32 (IEEE) for frame checksums |
| `src/domain/device/framing.ts` | encode/decode/verify frames |
| `src/domain/device/sessionAssembler.ts` | session state machine + integrity gates |
| `src/domain/device/transport.ts` | transport + session interfaces |
| `src/application/device/InMemoryDeviceTransport.ts` | in-memory transport seam |
| `src/application/device/DeviceIngestionService.ts` | gateway ingestion → `AskSession` |

## Verified

- 32 unit tests pass (6 new: framing round-trip, checksum tamper, sequence
  rejection, complete-session emission, corrupt-chunk-isolaiton, CRC32 ref).
- `tsc --noEmit` clean.
- `npx expo export --platform web` builds.

## Next (not built, behind the seam)

- Real WSS/HTTPS adapter in the gateway (Node/Deno service).
- Audio bytes → ASR adapter (sherpa-onnx vs Whisper benchmark, PRD Phase 2).
- Firmware-side packetizer matching this exact header layout.
