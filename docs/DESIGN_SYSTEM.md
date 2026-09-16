# Design System — ASK

The design uplift brief is implemented as a tokenized system. This document is the single reference for what was built, what is deliberate, and the states matrix for every key component.

## 1. Tokens

Everything in `src/theme/tokens.ts`:

- **Violet ramp** (50–900) anchored on `#5B3DF5`, neutral gray ramp (0–950).
- **Semantic tokens** instead of raw colors: `--surface`, `--surface-raised`, `--text-primary`, `--text-muted`, `--border-subtle`, `--accent`, `--accent-soft`, `--glow`, plus per-type decision / action / commitment / issue.
- **Light and dark themes** (`themes.light`, `themes.dark`). Dark surfaces signal "the machine is thinking"; light surfaces are the calm workspace.
- **Radius scale** 8 / 12 / 16 / 24; **8px spacing grid**; **elevation** = hairline border + barely-there shadow (never hard drop shadows).
- **Type scale** 11 / 12 / 14 / 16 / 20 / 28 / 40 / 56, with `Inter` (UI) + `Space Grotesk` (display) loaded with `font-display: swap`.
- **Motion** durations and spring constants centralised; every animation is *only* transform + opacity and capped below ~400ms except ambient loops.

## 2. Icon system

- Single lightweight set: **Lucide** (`lucide-react-native`), tree-shakeable, consistent 1.75 stroke.
- One wrapper: `src/components/AppIcon.tsx`. Sizes: 20 nav / 16 inline / 24 card / 18 button. Color inherits from props.
- The broken Nerd Font / MDI glyph font is gone. No tofu boxes remain anywhere.
- Memory type markers pair **icon + label + color** (never color alone) so types stay distinguishable without color.

## 3. Screens and templates

| Screen | Template | Notes |
|---|---|---|
| Home | hero card + section header + memory list + device flow | Hero glow parallax; memory cards show type badge; device flow is an animated connected timeline |
| Ask | section header + search + answer card + evidence sources | Empty state with example questions; evidence cards reuse MemoryCard |
| Activity | section header + list rows | Icon-per-type rows; empty state present |
| Agents | section header + agent cards with weighty toggles | Toggle animates with spring + slight overshoot |
| You | section header + voice identity instrument (dark) + device/privacy list | Orb is the signature object: concentric rings, breathing pulse, enrolled indicator |

All screens share: `SectionHeader` (kicker + title + description), `MemoryCard`, the same nav component, the same spacing/type rules.

Navigation: bottom tab bar on mobile (active tab has accent color + indicator), side rail on desktop (`>=1024px`).

## 4. Motion

| Element | Behavior | Reduced-motion |
|---|---|---|
| Mic orb | Idle breathing rings (2.8s loop); listening reacts to level; acceptance beam | Loops killed; springs still settle |
| Hero glow | Parallax translateY on scroll (a few px) | Static |
| Device flow | Connector + node opacity progresses on a loop | Progress jumps instead of animating |
| Memory lists | (staggered fade/rise on entry is implemented per screen where lists mount) | Static |
| Toggles | Spring with slight overshoot | Settles without overshoot |

Only `transform` and `opacity` are animated; 60fps target.

## 5. Copy voice

Calm, precise, privacy-first. No em dashes. Engineering details ("Phase 0 uses deterministic lexical retrieval…") moved out of user-facing surfaces into the plain-language "How it works" note on Ask. Hero, memory intro, and privacy lines rewritten:

- Hero subhead: "Every conversation becomes searchable. Decisions, actions, and commitments you can actually find."
- Privacy: "Your identity, your devices, your data. All under your control."
- Memory intro: "Talk normally. ASK keeps the decisions, actions, and commitments, and forgets the noise." (Home hero body)
- Page title + meta description set in `app.json` (`ASK: What matters now`).

## 6. States matrix

| Component | default | hover | focus | active | disabled | loading | empty | error |
|---|---|---|---|---|---|---|---|---|
| Tab (nav) | muted icon | icon tints toward accent | focus ring on icon | accent + indicator / rail marker | n/a | n/a | n/a | n/a |
| MemoryCard | white card, hairline border | shadow lifts (future) | n/a (not interactive) | n/a | n/a | n/a | n/a | n/a |
| Ask input | surface bg, hairline border | border strongens | soft glow border | n/a | n/a | n/a | example chips | no-hits panel |
| Send button | accent bg | accent-pressed | focus ring | n/a | gray bg, muted icon | n/a | n/a | n/a |
| Agent toggle | gray track / accent track | slight scale | focus ring | knob spring | n/a | n/a | empty agents list | n/a |
| Answer card | surface + border | n/a | n/a | n/a | n/a | skeleton (future) | n/a | confidence chip colors |
| Orb | idle rings | n/a | n/a | listening / accepted / retry / calibrating | n/a | checking | n/a | retry tone |

Purple is reserved for the "intelligence" state only (mic, current answer accent, primary action). Everything else stays neutral so the accent means something.

## 7. Definition of done

- No missing-glyph boxes anywhere; one icon library (`lucide-react-native`) via `AppIcon`.
- All color/type/spacing/radius/shadow values come from tokens. No raw hexes in screens.
- Light and dark themes both exist and are deliberate.
- Every screen shares card / header / nav templates.
- Parallax, orb animation, device-flow sequence, and toggle springs are live and respect `prefers-reduced-motion`.
- Copy is calm, privacy-first, no em dashes, no raw engineering jargon on user-facing surfaces.

## 8. Verification

```bash
npm run check   # tsc --noEmit
npm test        # vitest (22 tests)
npx expo export --platform web   # production bundle builds
```
