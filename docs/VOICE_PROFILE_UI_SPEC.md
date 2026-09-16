# ASK Voice Profile UI Specification

## Product direction

**Quiet biometric confidence.** ASK should feel like a private instrument, not a neon AI toy or a diagnostics dashboard. One living voice object communicates the current state; all supporting surfaces stay calm and legible. Motion must correspond to real work or microphone energy.

## Reference set

1. [Vocal — voice-controlled mobile app](https://dribbble.com/shots/27673217-Vocal-Voice-Controlled-Mobile-App-UI-UX-Brand-Identity) — adopt the editorial hierarchy and one dominant capture action.
2. [Voice Chat AI](https://dribbble.com/shots/25321788-Voice-chat-AI) — adopt the focused listening state and low-noise chrome.
3. [libraries.dev Orb](https://libraries.dev/orbs) — recreate the semantic state idea in native code: ready, listening, analyzing, and accepted. Do not add the web package.
4. [Voice Recognition — Ronas](https://dribbble.com/shots/25640472-Voice-Recognition-App) — adopt the clear capture/result transition and generous spacing.
5. [Voice AI onboarding](https://dribbble.com/shots/26984249-Voice-AI-Mobile-App-Onboarding-Filters) — adopt short, guided steps instead of exposing a settings form.
6. [AI Assistant voice chat](https://dribbble.com/shots/27223349-AI-Assistant-Mobile-App-UI-Voice-Chat-Smart-Interaction) — adopt the calm assistant hierarchy and concise state copy.
7. [Modern profile setup](https://dribbble.com/shots/27092887-Modern-Profile-Setup-Flow-Dating-App) — adopt explicit progress and a single next action.
8. [libraries.dev Beam](https://libraries.dev/beam) — recreate one short border-light pass when a sample is accepted; never loop it at idle.
9. [libraries.dev Gooey](https://libraries.dev/gooey) — use only as inspiration for soft continuity between listening states, not as a dependency or decorative distortion.
10. [libraries.dev Metal](https://libraries.dev/metal) — borrow the premium material restraint for the hero surface, not the WebGL implementation.

## Design tokens

### Light

- background `#F7F7FA`
- surface `#FFFFFF`
- elevated/voice surface `#EEEAFD`
- line `#DDD8E8`
- primary text `#17151F`
- muted text `#6F6B78`
- primary `#5B3DF5`
- primary pressed `#4328D7`
- accent `#00A896`
- success surface `#E7F6F3`
- warning `#A96400`, warning surface `#FFF3D8`
- danger `#B42318`, danger surface `#FDECEA`

### Dark-ready contract

- background `#111015`
- surface `#1B1921`
- elevated/voice surface `#272239`
- line `#393442`
- primary text `#F7F5FB`
- muted text `#AAA5B4`
- primary `#A997FF`
- primary pressed `#8A72FF`
- accent `#52D7C6`
- success surface `#153B35`
- warning `#FFC56A`, warning surface `#3C2B13`
- danger `#FF8D85`, danger surface `#451E1D`

## Typography and spacing

- System sans; avoid another font dependency until brand typography is chosen.
- Screen title: 28/34, weight 800, tracking -0.5.
- Section title: 20/26, weight 700.
- Card title: 16/22, weight 700.
- Body: 14/21, weight 400.
- Label: 11/16, weight 800, tracking 0.8.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32.
- Card radius 20; primary action radius 16; chip radius 999.
- Minimum touch target 48 by 48.

## Voice enrollment component

- Top identity instrument: near-black hero surface, semantic status label, plain-language privacy statement, and one voice orb.
- Orb state machine: `ready -> starting -> listening -> checking -> accepted/retry`; after enrollment use `profile_ready` or `calibrating`. Listening amplitude is driven by microphone RMS.
- Progress: three explicit sample markers and `n of 3 usable samples` copy. It must not resemble a percentage confidence meter.
- Primary capture control: full-width button, microphone icon, live elapsed time while recording, 48dp minimum target.
- Recording state: the living object responds to true audio level and includes a high-contrast live label. Do not use decorative fake waveforms.
- Sample rows: sample number, duration, quality result, and actionable rejection reasons.
- Completion: default UI says profile stored locally and whether evaluation is still needed. Model, vector, cosine, and consistency values belong behind `Technical details`.
- Verification result language: `Likely you`, `Not enough evidence`, `Too close to call`, and `Sample could not be checked`. Never present a raw cosine score as a probability.
- Calibration: provide separate same-speaker and different-speaker trial actions. State that audio is discarded and only score metadata is retained. Different-speaker capture requires explicit consent copy.
- Delete profile is visually separated and always uses a confirmation dialog.

## Motion, haptics, and accessibility

- Durations: instant 90ms, fast 140ms, standard 220ms, emphasis 320ms, screen entry 360ms, toast visibility 4s.
- Easing: enter `[0.22, 1, 0.36, 1]`, standard `[0.2, 0, 0, 1]`, exit `[0.4, 0, 1, 1]`.
- Press spring: mass `0.72`, damping `18`, stiffness `260`; visual scale bottoms at `0.98` for ordinary controls and `0.97` for the hero capture action.
- Cards enter with opacity plus 8px translate over 240ms; cap stagger at four items and 35ms between items.
- Light selection haptic on recording start; success haptic on accepted sample/enrollment; warning haptic on rejected quality. Trust-sensitive states never bounce or trigger confetti.
- Do not animate continuously while idle. With Reduce Motion enabled, replace transforms with opacity changes or no animation.
- Respect reduce-motion settings.
- Never convey quality or identity outcome by color alone; pair icon, label, and explanation.
- Screen-reader announcements cover recording state, elapsed time, accepted sample count, trial saved, and destructive-action consequence.

## Premium levers

1. Restraint: one dark identity instrument, one living voice object, neutral supporting cards.
2. Truthful delight: RMS-driven response, one-shot acceptance light, precise press feedback.
3. Trust: exact language about local storage, model evaluation, calibration, and uncertainty.
4. Progressive disclosure: human language first; engineering evidence remains available but secondary.
5. State clarity: every action produces a visible status, reason, and next step.
