# Design System — EchoRead AI

<!-- impeccable:design-schema 1 -->

## Design Philosophy

EchoRead AI delivers an **unobtrusive, high-focus reading companion**. The interface recedes when the user is reading and steps forward cleanly with tactile, responsive controls when needed.

- **Primary Metaphor**: The physical reading desk meets an audio mastering console. Soft background sentence illumination paired with energetic gold word tracking.
- **Surface Strategy**:
  - Webpage Injected Surface: Minimalist floating pill/dock with isolated styling that avoids collision with host website styles.
  - Companion Surface (Side Panel): Vertical readable transcript with real-time synchronized sentence jumps.
  - Dedicated Surface (Fullscreen Reader): Distraction-free typographic haven featuring warm paper sepia, crisp light, modern slate, and true OLED black.

---

## Color Palette & Themes

### Core Accents
- **Primary Brand / Accent**: `#6366f1` (Indigo-500)
- **Accent Hover**: `#4f46e5` (Indigo-600)
- **Active Spoken Word**: `#ffd54f` (Warm Gold, high-legibility dark text `#111827`)
- **Active Sentence Illumination**: `rgba(99, 102, 241, 0.18)`
- **Success / Play State**: `#10b981` (Emerald-500)
- **Voice Control Active**: `#ef4444` (Rose-500 pulsating aura)

### Reading Themes
1. **Dark Modern (Default)**
   - Background Canvas: `#0b0f19`
   - Card / Bar Background: `#111827` (with `backdrop-filter: blur(16px)`)
   - Text Primary: `#f8fafc`
   - Text Secondary: `#94a3b8`
   - Border: `rgba(255, 255, 255, 0.08)`

2. **Warm Sepia (Book & Eye Comfort)**
   - Background Canvas: `#f4ecd8`
   - Card Background: `#e8dec4`
   - Text Primary: `#2e2316` (contrast ≥ 7:1)
   - Text Secondary: `#63503a`
   - Accent: `#c25e00`

3. **Crisp White (Daylight Editorial)**
   - Background Canvas: `#f8fafc`
   - Card Background: `#ffffff`
   - Text Primary: `#0f172a`
   - Text Secondary: `#475569`
   - Accent: `#4f46e5`

4. **Midnight OLED (True Black)**
   - Background Canvas: `#000000`
   - Card Background: `#0a0a0a`
   - Text Primary: `#f5f5f5`
   - Text Secondary: `#a3a3a3`
   - Accent: `#6366f1`

---

## Typography

### Font Families
- **Dyslexia-Optimized & Rapid Scanning**: `'Lexend', sans-serif` (increased x-height, intentional character spacing)
- **Modern Clean Interface**: `'Inter', -apple-system, sans-serif`
- **Editorial Literature**: `'Merriweather', Georgia, serif`

### Type Hierarchy
- Display / Headers: 16px – 22px, `font-weight: 700`, `letter-spacing: -0.3px`
- Body Reading Text: Adjustable from `15px` to `32px` (default `19px`), `line-height: 1.85`
- Controls & Badges: 11px – 13px, `font-weight: 600`
- Meta & Shortcuts: 10px – 11px, `font-weight: 500`, uppercase tracking `0.5px`

---

## Micro-Interactions & Motion

- **Audio Wave Equalizer**: Dynamic 3-bar waveform pulsating during active speech synthesis (`echoread-wave` 0.8s - 1.1s).
- **Floating Dock Transitions**: Smooth cubic-bezier spring (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Word Tracking**: Seamless non-DOM-destructive rendering via modern `::highlight(echoread-word)` with zero reflow.
- **Focus Rings**: Accessible 2px solid focus rings (`#818cf8`) on all interactive controls.
