# ASK Conversation Intelligence MVP — design spec

## Reference synthesis

1. [Huthy conversational analytics](https://dribbble.com/shots/27610659-Conversational-AI-Analytics-Dashboard-UI-Design) — soft violet with concise KPI cards; borrow the restrained accent and at-a-glance counts.
2. [AI Assistance dashboard](https://dribbble.com/shots/26843333-AI-Assistance-Chatbot-Dashboard-UI) — readable modular analytics; borrow the component rhythm.
3. [Sales Call dashboard](https://dribbble.com/shots/27687299-Sales-Call-Dashboard-CRM-Conversation-Analytics-UI) — transcript plus evidence timeline; borrow the dark compiler surface with one bright signal.
4. [Verity conversational analytics](https://dribbble.com/shots/27041915-Designing-a-Conversational-Interface-for-Analytics) — grounded contextual chat; borrow concise answer cards with sources.
5. [AI analytics dashboard](https://dribbble.com/shots/25217863-AI-Chatbot-Analytics-Dashboard-UI-Design) — answer-first layout; borrow clear data-to-answer hierarchy.
6. [AI dashboard](https://dribbble.com/shots/27203380-AI-Dashboard-UI-Design) — minimal operations shell; borrow navigation restraint.
7. [AI Voice Agent dashboard](https://dribbble.com/shots/27549744-AI-Voice-Agent-Dashboard-UI-UX-Design) — conversation history and performance; borrow scan-friendly status rows.
8. [Conversational inventory](https://dribbble.com/shots/27283794-Conversational-AI-Inventory-Management-Dashboard-UI-UX) — conversational access to structured data; borrow simple query-to-result transitions.
9. [AI Meeting Assistant](https://dribbble.com/shots/27344654-AI-Meeting-Assistant-Dashboard-Design) — live transcription and speaker context; borrow speaker-coded transcript blocks.
10. [Botiva Analytics](https://dribbble.com/shots/27164897-Botiva-Analytics-AI-Assistant-Performance-Dashboard) — modular session activity; borrow compact event metrics.

## Prescriptive system

- Palette: light `#FAFAFC` canvas, `#FFFFFF` cards, `#17151F` ink, `#6F6B78` muted, `#5B3DF5` primary; dark `#17151F` canvas, `#0E0C14` compiler, `#F7F5FB` text, `#9C85FF` primary. Success `#1F7A6D`, warning `#945600`, danger `#B42318`.
- Typography: Space Grotesk 700 for display at 28–40px; Inter 400–700 for UI at 11/12/14/16/20px. Kicker labels are uppercase, 11px, tracked.
- Shape: 8/12/16/24px radii. Cards use a hairline border and almost no shadow. The compiler is the single high-contrast surface.
- Spacing: strict 8px base with 4px only for micro-gaps. Phone gutters 24px; desktop content 760–900px beside the existing 240px rail.
- Components: metric card, source selector, transcript segment, function card, guard checklist, canonical event card, timeline row, tab switcher, search/answer card, loading and empty states.
- Motion: calm 220–360ms entrances; demo state changes at 700–850ms. Progress uses opacity/translation, no ornamental loops. Respect reduced motion.
- Interaction: one primary `Understand` action; processing proceeds automatically. Minimum target 44px, explicit focus/accessibility labels, color never carries state alone.
- Premium levers: typographic contrast, one violet accent, dense evidence made calm through whitespace. No glass effects and no decorative gradients outside the compiler glow.

## Ten-step constraints

- Phone stacks compiler stages; desktop presents transcript and structure side by side.
- Both theme token sets remain valid.
- Idle, processing, complete, empty, low-confidence and ignored-statement states are explicit.
- Long transcript text wraps without clipping; unknown speakers remain unresolved.
- Animated values stay on opacity/transform or simple width; avoid expensive list animation.
- All primary controls are labelled and at least 44px.
- Completion uses a light haptic where supported.
- Existing guard, compiler, repository, Ask retrieval and tab routing stay intact.
- No remote assets or runtime network dependency.
- New choices are expressed through existing tokens and reusable cards.
