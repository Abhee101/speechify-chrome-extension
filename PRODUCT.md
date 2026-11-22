# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Students, knowledge workers, and readers with ADHD or dyslexia who seek faster comprehension, deeper retention, and reduced cognitive fatigue when reading articles, academic documents, news, and web content.

## Product Purpose
EchoRead AI transforms written text into a simultaneous audiovisual reading experience (speech paired with synchronized visual tracking). It empowers users to read faster, stay focused, and comprehend complex material without subscription barriers or privacy sacrifices.

## Positioning
100% local, on-device browser speech synthesis and dual-modal karaoke word highlighting with zero subscriptions, zero trackers, and zero cloud data transmission. While commercial alternatives lock playback speeds, dyslexia fonts, and natural voices behind expensive paywalls, EchoRead AI provides full playback speed control (0.5x to 3.0x), native Chrome Side Panel reading, and hands-free voice commands completely free and private.

## Operating Context
- Web browsing across diverse page layouts (articles, blogs, research documentation, Wikipedia, Substack).
- Side-by-side reading in the Chrome Side Panel while taking notes or researching in the main viewport.
- Deep reading and study sessions in the distraction-free Fullscreen Reader via text paste or file imports (.txt, .md).
- Mobile reading via an installable full-screen Progressive Web App (PWA) on Android devices.

## Capabilities and Constraints
- Dual-modal playback: simultaneous speech synthesis and real-time word-by-word visual highlighting powered by the modern CSS Custom Highlight API.
- Manifest V3 Chrome Extension architecture: floating player dock, context menus, selection "Listen" tooltip, and keyboard shortcuts (`Alt+P`, `Alt+S`, `Alt+O`, `Alt+R`).
- Chrome Side Panel integration providing an interactive, clickable transcript synchronized with the active webpage.
- Resilient audio pipeline: sentence chunking and heartbeat keep-alive to circumvent Chromium's 15-second speech synthesis pause quirk.
- Hands-free voice recognition controls via Web Speech Recognition (`webkitSpeechRecognition`).
- Fullscreen Reader web app with 4 themes (Dark, Sepia, Light, OLED), 3 font systems (Inter, Merriweather, Lexend), and responsive mobile touch controls.
- Technical constraint: 100% client-side operation using Web Speech API; no external backend servers or proprietary voice APIs required.

## Brand Commitments
- Name: EchoRead AI
- Tone: Focused, empowering, clear, distraction-free.
- Visual Identity: Electric indigo/violet accent (`#6366f1`), warm gold word highlight (`#ffd54f`), dark glassmorphic UI with high-contrast accessibility.

## Evidence on Hand
- Complete Manifest V3 extension codebase in `manifest.json`, `background/`, `content/`, `popup/`, `sidepanel/`, `options/`.
- Fullscreen reader PWA and service worker in `reader/`.
- Verified Chrome Web Store single source of truth in `CHROMEWEBSTORE.md`.
- Automated extension packaging script in `scripts/package-extension.js` and build artifact in `dist/echoread-ai-v1.0.0.zip`.
- Live GitHub repository at https://github.com/Abhee101/speechify-chrome-extension.

## Product Principles
1. **Dual-Modal Synchronization First**: Visual word highlighting must strictly match spoken audio in real-time to preserve reading flow and eye tracking.
2. **Absolute Privacy & Zero Cost**: All speech synthesis and text parsing occur strictly on-device without telemetry, accounts, or cloud reliance.
3. **Frictionless In-Flow Access**: Reading controls must be accessible wherever the user is—via the floating dock, selection tooltip, keyboard shortcuts, or side panel.
4. **Accessible by Default**: Designed with high-contrast themes, variable typography, and dyslexia-friendly letterforms (Lexend) to support diverse cognitive and learning styles.

## Accessibility & Inclusion
- Built-in support for the scientifically designed **Lexend** typeface to improve reading fluency for dyslexic readers.
- Customizable font sizing (15px to 32px), line height, letter spacing, and high-contrast color palettes (Dark, Sepia, Light, OLED).
- Keyboard-accessible playback with global browser hotkeys.
- Synchronized audiovisual tracking specifically beneficial for neurodivergent users (ADHD, dyslexia, visual tracking fatigue).
