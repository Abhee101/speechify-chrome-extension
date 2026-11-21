# Chrome Web Store Listing — EchoRead AI

> Last Updated: 2026-11-22

## Store Listing

**Extension Name** [REQUIRED]
EchoRead AI - Speechify Voice Reader

**Short Description** [REQUIRED]
Listen to any webpage, article or PDF with real-time word highlighting, voice controls, and natural speech.

**Detailed Description** [REQUIRED]
EchoRead AI transforms any text, article, or document into an immersive listening and reading experience. 

Read faster, comprehend more, and stay focused with synchronized audio and real-time word-by-word visual highlighting that guides your eyes as you listen.

KEY FEATURES
- Simultaneous Read & Speak: Highlights each sentence and word in real time as it is spoken so your eyes and ears stay locked together.
- One-Click Webpage Reading: Instantly extract and listen to clean article text on any blog, news site, or documentation page without ads or clutter.
- Selection Tooltip: Highlight any sentence on any webpage and click the floating Listen button to hear it immediately.
- Floating Interactive Player: Full playback controls with play/pause, rewind, skip, scrubbing, and speed adjustment from 0.5x up to 3.0x.
- Chrome Side Panel Integration: Open the reader side-by-side with your active browser tab to read along without leaving your page.
- Voice-Controlled Playback: Hands-free control with built-in voice commands. Simply say "play", "pause", "faster", or "next".
- Dedicated Fullscreen Reader App: A distraction-free study environment where you can paste text, upload documents, and adjust font sizes.
- Dyslexia-Friendly Fonts & Themes: Choose between clean sans-serif, editorial serif, or the Lexend typeface, alongside Sepia, Dark, and OLED themes.

HOW TO USE IT
1. Click the EchoRead AI icon in your browser toolbar or right-click any page to begin listening.
2. Highlight any text on a page and click the floating "Listen" button.
3. Use the floating player or side panel to adjust playback speed and voice preferences.
4. Press Alt+P anytime to quickly play or pause reading.

PRIVACY & SECURITY
EchoRead AI processes text-to-speech directly in your browser using standard browser speech synthesis. Your personal text, browsing history, and documents are never sent to external servers or sold to third parties.

SUPPORT & FEEDBACK
Questions, feedback, or feature requests? Contact our team via our GitHub repository or support portal.

**Category** [REQUIRED]
Accessibility

**Single Purpose** [REQUIRED]
Reads web pages, articles, and documents aloud while highlighting words and sentences synchronously in real time.

**Primary Language** [REQUIRED]
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon128.png` |
| Small Icon | 16×16 PNG | ✅ Ready | `icons/icon16.png` |
| Medium Icon | 32×32 PNG | ✅ Ready | `icons/icon32.png` |
| Large Icon | 48×48 PNG | ✅ Ready | `icons/icon48.png` |
| Android / PWA Icon | 192×192 PNG | ✅ Ready | `icons/icon192.png` |
| Android / High-Res Icon | 512×512 PNG | ✅ Ready | `icons/icon512.png` |
| Screenshot 1 [REQUIRED] | 1280×800 | 🟡 Prepared | Webpage with floating player & word highlighting |
| Screenshot 2 [RECOMMENDED] | 1280×800 | 🟡 Prepared | Chrome Side Panel synchronized reading |
| Screenshot 3 [RECOMMENDED] | 1280×800 | 🟡 Prepared | Fullscreen Reader with Lexend dyslexia font |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Saves user preferences including default reading speed, chosen voice, dyslexia font preference, and highlight colors. |
| `contextMenus` | permissions | Adds right-click menu items allowing users to quickly listen to selected text or read entire web pages. |
| `tabs` | permissions | Allows the side panel and popup to identify the active webpage title and send text extraction commands to the current article. |
| `scripting` | permissions | Injects the reading assistant, floating player, and word highlighting stylesheets into web pages when initiated by the user. |
| `sidePanel` | permissions | Enables the dedicated reading companion panel in Chrome's side panel for side-by-side reading. |
| `<all_urls>` | host_permissions | Allows users to listen to and highlight text across any website, article, blog, or online document they visit. |

---

## Privacy & Data Use

**Does the extension collect user data?** No

All text processing, voice synthesis, and word boundary highlighting happen locally in the user's browser. No reading data, text excerpts, or personal information are collected or transmitted off-device.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | N/A | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | No | No | N/A | No |
| Personal communications | No | No | N/A | No |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | No | No | N/A | No |
| Website content | No | No | N/A | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
`https://echoread.app/privacy` (or project GitHub repository privacy section)

---

## Distribution

**Visibility**: Public  
**Regions**: All regions  

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-11-22 | Initial release with simultaneous read & speak, word-by-word karaoke highlight, floating dock, Chrome Side Panel, voice commands, and Android PWA support | Ready for Store Review |
