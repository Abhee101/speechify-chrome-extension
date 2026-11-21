# 🎧 EchoRead AI — Speechify Voice Reader & Android PWA

> **A high-performance, voice-enabled text-to-speech reader that reads and speaks simultaneously with real-time synchronized word highlighting.**

Inspired directly by the **Speechify app**, **EchoRead AI** provides an effortless dual-modal reading experience (audio + visual tracking) across any website, article, PDF, or document.

---

## 🌟 Key Features

| Feature | Description |
|---|---|
| **Simultaneous Read & Speak** | Spoken words and active sentences are highlighted in real time (karaoke style) so your eyes follow the audio effortlessly. |
| **Floating Speechify Dock** | Injected on any webpage with Play/Pause, Rewind, Fast Forward, Speed adjustment (0.5x to 3.0x), and Voice selector. |
| **Selection Tooltip** | Highlight any paragraph on any site, and a sleek **"🔊 Listen"** tooltip appears immediately above your cursor. |
| **Chrome Side Panel** | Dedicated side-by-side reading companion in Chrome's native Side Panel. Click any sentence in the transcript to jump reading. |
| **Voice-Enabled Commands** | Hands-free control via Web Speech Recognition. Just say: `"play"`, `"pause"`, `"faster"`, `"slower"`, `"next"`. |
| **Fullscreen Reader App** | Dedicated study environment with file import (`.txt`, `.md`), word count, listening time, and 4 themes. |
| **Dyslexia-Friendly Fonts** | Includes the **Lexend** typeface (scientifically proven to enhance reading fluency), plus Modern Sans and Editorial Serif. |
| **Android Deployable PWA** | Installable directly to your Android home screen as a standalone full-screen application with offline caching. |

---

## 🚀 Quick Start: Load in Chrome (10 Seconds)

You can load and test the Chrome Extension right away:

1. Open **Google Chrome** (or Edge / Brave / Chromium).
2. In the address bar, navigate to:
   ```text
   chrome://extensions
   ```
3. Toggle the **"Developer mode"** switch in the top-right corner.
4. Click the **"Load unpacked"** button in the top-left corner.
5. Select the extension directory:
   ```text
   /Users/a_star/.gemini/antigravity/scratch/speechify-chrome-extension
   ```
6. **Done!** The EchoRead AI icon will appear in your browser toolbar. Pin it to your toolbar for instant access.

---

## 🕹️ How to Use

### 1. Reading Any Webpage or Article
- Navigate to any news article, blog (e.g. Medium, Substack, Wikipedia, The Verge).
- Click the **EchoRead AI** icon in your toolbar and press **"Read Page Aloud"**, or right-click anywhere and select **"📖 Read Entire Article / Page"**.
- The floating player dock will appear at the bottom of the page, automatically scrolling to keep the spoken sentence centered while highlighting words as they are pronounced.

### 2. Reading Text Selections
- Highlight any text with your mouse on any website.
- Click the floating **"🔊 Listen"** bubble that appears directly above your selection.

### 3. Using the Chrome Side Panel
- Click the Side Panel icon in the extension popup or press `Alt + O`.
- Click **"Extract & Read Page"** to view the full interactive transcript side-by-side with your webpage.
- Click on any sentence in the transcript to jump reading to that sentence instantly!

### 4. Voice Commands (Hands-Free)
- Click the **Microphone** icon in the floating dock or reader page.
- Speak naturally:
  - *"Play"* or *"Resume"* → Starts/resumes playback
  - *"Pause"* or *"Stop"* → Pauses speech
  - *"Faster"* or *"Speed up"* → Increases reading rate by 0.25x
  - *"Slower"* → Decreases reading rate
  - *"Next"* → Skips to the next sentence
  - *"Back"* or *"Previous"* → Rewinds to the previous sentence

### 5. Fullscreen Document Reader
- Click **"Launch Full Reader App"** from the popup or open `reader/reader.html`.
- Type or paste your own essays, articles, or notes, or drag-and-drop a `.txt` / `.md` file.
- Toggle between **Read Mode** (live karaoke highlighting) and **Edit Mode** (distraction-free writer).
- Customize typography: Font size slider, Themes (Dark Indigo, Warm Sepia, Crisp White, Midnight OLED), and Font families (Inter, Merriweather, Lexend).

---

## 📱 Deploying as an Android App

You have two simple ways to run EchoRead AI on Android:

### Method A: 1-Click Progressive Web App (PWA)
1. Serve the `reader/` directory on a local network or deploy it to any static host (Vercel, Netlify, GitHub Pages, or Firebase Hosting).
   ```bash
   npx serve reader -l 3000
   ```
2. Open Chrome on your Android device and visit the URL.
3. Tap the three dots menu (⋮) in Chrome and select **"Install App"** (or **"Add to Home screen"**).
4. EchoRead AI is now installed as a standalone, full-screen app on your Android home screen with offline support!

### Method B: Native Android APK with Capacitor
To compile into a native Android Studio project and generate an `.apk`:
```bash
cd /Users/a_star/.gemini/antigravity/scratch/speechify-chrome-extension

# 1. Initialize Capacitor
npm run android:init

# 2. Add Android platform
npm run android:add

# 3. Open in Android Studio to build APK
npm run android:build
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + P` | Play / Pause reading current page or selection |
| `Alt + S` | Stop audio playback |
| `Alt + O` | Open Chrome Side Panel reader |
| `Alt + R` | Launch Fullscreen Reader App tab |
| `Space` | Play / Pause (Inside Reader App) |
| `Left Arrow` | Rewind to previous sentence |
| `Right Arrow` | Skip to next sentence |

---

## 📦 Publishing to the Chrome Web Store

1. A pre-built distribution archive is ready:
   ```text
   dist/echoread-ai-v1.0.0.zip
   ```
2. Re-generate at any time by running:
   ```bash
   npm run build:zip
   ```
3. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
4. Click **"New Item"** and upload `dist/echoread-ai-v1.0.0.zip`.
5. Refer to [`CHROMEWEBSTORE.md`](./CHROMEWEBSTORE.md) in this directory for all exact copy, permissions justifications, and privacy disclosures.

---

## 📂 Project Architecture

```text
speechify-chrome-extension/
├── manifest.json              # Chrome Manifest V3 configuration
├── CHROMEWEBSTORE.md          # Chrome Web Store single source of truth
├── README.md                  # Complete documentation and setup guide
├── package.json               # Scripts for packaging and Android Capacitor build
├── dist/
│   └── echoread-ai-v1.0.0.zip # Ready-to-upload Chrome Web Store archive
├── icons/                     # Crisp icons at 16, 32, 48, 128, 192, 512 px
├── background/
│   └── service-worker.js      # MV3 service worker for shortcuts, menus, badges
├── content/
│   ├── content-script.js      # DOM extractor, speech engine, dual-modal highlight
│   └── floating-widget.css    # Scoped styles for floating dock & highlight API
├── popup/
│   ├── popup.html             # Toolbar popup interface
│   ├── popup.css              # Glassmorphic modern dark styling
│   └── popup.js               # Quick playback, voice picker, speed chips
├── sidepanel/
│   ├── sidepanel.html         # Native Chrome Side Panel reader
│   ├── sidepanel.css          # Responsive transcript styling
│   └── sidepanel.js           # Live synchronized sentence & word highlighting
├── reader/
│   ├── reader.html            # Speechify-style full reader web app
│   ├── reader.css             # Themes (Dark, Sepia, White, OLED) & typography
│   ├── reader.js              # Karaoke audio engine & voice commands
│   ├── manifest.webmanifest   # PWA manifest for Android installability
│   └── sw.js                  # Service worker for offline mobile support
├── options/
│   ├── options.html           # Settings & color customizer page
│   ├── options.css
│   └── options.js
└── scripts/
    └── package-extension.js   # Automated store zip packager
```

---

## 🔒 Privacy & Local Processing

EchoRead AI works **100% locally on your machine**. It uses your browser's built-in Web Speech API and Speech Synthesis engine. No text, reading activity, or personal documents are ever transmitted to external servers.
