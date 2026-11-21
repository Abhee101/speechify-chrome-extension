// EchoRead AI - Speechify Fullscreen Reader & PWA Engine
// Dual-modal real-time audio and word-by-word visual reading

document.addEventListener('DOMContentLoaded', async () => {
  // Register PWA service worker for Android/mobile installability
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.log('SW Note:', e));
  }

  // App State
  const state = {
    paragraphs: [], // Array of sentence arrays
    flatSentences: [],
    currentIndex: 0,
    isPlaying: false,
    isPaused: false,
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
    currentVoice: null,
    availableVoices: [],
    recognition: null,
    isListeningVoiceCommands: false,
    theme: 'dark',
    fontFamily: 'Inter',
    fontSize: 19,
    keepAliveTimer: null
  };

  const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

  const SAMPLE_TEXT = `Welcome to EchoRead AI, your high-performance reading assistant inspired by Speechify.

Listening while reading simultaneously supercharges comprehension, focus, and retention. As words are spoken, each sentence and word is highlighted in real time so your eyes and ears stay locked in complete harmony.

You can paste any article, upload a document, or use our Chrome extension directly on any website or PDF. Try pressing the microphone button to command playback using your voice, or switch to the Lexend dyslexia-friendly font for effortless scanning.

Experience the freedom of listening at your own pace, from 1x up to 3x speed. Happy reading!`;

  // DOM Elements
  const readerDisplay = document.getElementById('reader-display');
  const textEditor = document.getElementById('text-editor');
  const editorWrap = document.getElementById('reader-editor-wrap');
  const btnViewRead = document.getElementById('btn-view-read');
  const btnViewEdit = document.getElementById('btn-view-edit');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('dock-play-icon');
  const pauseIcon = document.getElementById('dock-pause-icon');
  const btnSkipPrev = document.getElementById('btn-skip-prev');
  const btnSkipNext = document.getElementById('btn-skip-next');
  const btnSpeedPill = document.getElementById('btn-speed-pill');
  const voicePicker = document.getElementById('voice-picker');
  const btnMicCommand = document.getElementById('btn-mic-command');
  const dockScrub = document.getElementById('dock-scrub');
  const dockScrubFill = document.getElementById('dock-scrub-fill');
  const sentenceStatus = document.getElementById('dock-sentence-status');
  const statWords = document.getElementById('stat-words');
  const statTime = document.getElementById('stat-time');
  const readerToast = document.getElementById('reader-toast');
  const btnFontSettings = document.getElementById('btn-font-settings');
  const fontPopup = document.getElementById('font-popup');
  const fontSizeSlider = document.getElementById('font-size-slider');
  const fontSizeVal = document.getElementById('font-size-val');
  const fileUploader = document.getElementById('file-uploader');
  const btnLoadSample = document.getElementById('btn-load-sample');

  // 1. Initialize Settings
  await initSettings();
  initSpeech();
  initVoiceCommands();
  checkURLParamsOrSample();

  // Load preferences from storage
  async function initSettings() {
    try {
      let saved = {};
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        saved = await chrome.storage.sync.get(['theme', 'fontFamily', 'fontSize', 'rate', 'voiceURI']);
      } else {
        saved = {
          theme: localStorage.getItem('echoread_theme'),
          fontFamily: localStorage.getItem('echoread_font'),
          fontSize: localStorage.getItem('echoread_fontsize'),
          rate: parseFloat(localStorage.getItem('echoread_rate')) || 1.0,
          voiceURI: localStorage.getItem('echoread_voiceURI')
        };
      }

      if (saved.theme) setTheme(saved.theme);
      if (saved.fontFamily) setFontFamily(saved.fontFamily);
      if (saved.fontSize) setFontSize(saved.fontSize);
      if (saved.rate) state.speed = saved.rate;
      state.savedVoiceURI = saved.voiceURI;
      btnSpeedPill.textContent = `${state.speed}x`;
    } catch (e) {
      console.warn('Settings init note:', e);
    }
  }

  // 2. Speech Synthesis Setup
  function initSpeech() {
    if (!('speechSynthesis' in window)) {
      showToast('⚠️ Speech Synthesis not supported in this browser.');
      return;
    }

    function populate() {
      state.availableVoices = window.speechSynthesis.getVoices();
      if (state.availableVoices.length === 0) return;

      voicePicker.innerHTML = '';
      state.availableVoices.forEach((voice) => {
        const opt = document.createElement('option');
        opt.value = voice.voiceURI;
        opt.textContent = `${voice.name} (${voice.lang})`;
        if (state.savedVoiceURI && voice.voiceURI === state.savedVoiceURI) {
          opt.selected = true;
        }
        voicePicker.appendChild(opt);
      });

      if (state.savedVoiceURI) {
        state.currentVoice = state.availableVoices.find((v) => v.voiceURI === state.savedVoiceURI);
      }
      if (!state.currentVoice && state.availableVoices.length > 0) {
        state.currentVoice =
          state.availableVoices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))) ||
          state.availableVoices.find((v) => v.lang.startsWith('en')) ||
          state.availableVoices[0];
        if (state.currentVoice) voicePicker.value = state.currentVoice.voiceURI;
      }
    }

    populate();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populate;
    }

    voicePicker.addEventListener('change', () => {
      const selectedURI = voicePicker.value;
      state.currentVoice = state.availableVoices.find((v) => v.voiceURI === selectedURI);
      saveSetting('voiceURI', selectedURI);
      showToast(`Voice: ${state.currentVoice ? state.currentVoice.name : 'Default'}`);

      if (state.isPlaying && !state.isPaused) {
        window.speechSynthesis.cancel();
        speakSentence(state.currentIndex);
      }
    });
  }

  // Check URL parameters for text payload
  function checkURLParamsOrSample() {
    const params = new URLSearchParams(window.location.search);
    const passedText = params.get('text');
    if (passedText) {
      loadText(decodeURIComponent(passedText));
    } else {
      loadText(SAMPLE_TEXT);
    }
  }

  // Load and Parse Text
  function loadText(raw) {
    textEditor.value = raw;
    parseAndRenderText(raw);
  }

  function parseAndRenderText(raw) {
    stopPlayback();
    readerDisplay.innerHTML = '';
    state.paragraphs = [];
    state.flatSentences = [];

    const rawParagraphs = raw.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    let globalIndex = 0;

    rawParagraphs.forEach((pText) => {
      const pEl = document.createElement('p');
      pEl.className = 'reader-paragraph';

      const sMatches = pText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [pText];
      const pSentences = [];

      sMatches.forEach((s) => {
        const clean = s.trim();
        if (clean.length === 0) return;

        const sIdx = globalIndex++;
        const sSpan = document.createElement('span');
        sSpan.className = 'reader-sentence';
        sSpan.dataset.index = sIdx;
        sSpan.textContent = clean + ' ';

        sSpan.addEventListener('click', () => {
          window.speechSynthesis.cancel();
          state.currentIndex = sIdx;
          speakSentence(sIdx);
        });

        pEl.appendChild(sSpan);
        const item = { text: clean, element: sSpan, index: sIdx };
        pSentences.push(item);
        state.flatSentences.push(item);
      });

      readerDisplay.appendChild(pEl);
      state.paragraphs.push(pSentences);
    });

    state.currentIndex = 0;
    updateStats(raw);
    updateProgressUI();
  }

  function updateStats(text) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    statWords.textContent = `${words} words`;

    // Standard reading speed is ~200 WPM, audio speed adjusts listening time
    const minutes = Math.max(1, Math.round(words / (180 * state.speed)));
    statTime.textContent = `${minutes} min listen`;
  }

  // Playback Logic
  function togglePlayPause() {
    if (state.isPlaying && !state.isPaused) {
      pausePlayback();
    } else if (state.isPaused) {
      resumePlayback();
    } else {
      startPlayback();
    }
  }

  function startPlayback() {
    if (state.flatSentences.length === 0) return;
    state.isPlaying = true;
    state.isPaused = false;
    updateDockPlayState();
    speakSentence(state.currentIndex);
  }

  function pausePlayback() {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      state.isPaused = true;
      updateDockPlayState();
      showToast('❚❚ Paused');
    }
  }

  function resumePlayback() {
    if (state.isPaused) {
      window.speechSynthesis.resume();
      state.isPaused = false;
      updateDockPlayState();
      showToast('▶ Playing');
    } else {
      startPlayback();
    }
  }

  function stopPlayback() {
    stopKeepAlive();
    window.speechSynthesis.cancel();
    state.isPlaying = false;
    state.isPaused = false;
    clearSentenceHighlights();
    updateDockPlayState();
  }

  function speakSentence(idx) {
    if (idx >= state.flatSentences.length) {
      stopPlayback();
      showToast('🎉 Finished reading!');
      return;
    }

    const item = state.flatSentences[idx];
    const sentenceText = item.text;

    highlightSentence(idx);

    const utterance = new SpeechSynthesisUtterance(sentenceText);
    if (state.currentVoice) utterance.voice = state.currentVoice;
    utterance.rate = state.speed;
    utterance.pitch = state.pitch;
    utterance.volume = state.volume;

    // Real-time word highlighting
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIndex = event.charIndex;
        let wordLength = event.charLength;
        if (!wordLength || wordLength === 0) {
          const match = sentenceText.substring(charIndex).match(/^\w+/);
          wordLength = match ? match[0].length : 4;
        }
        highlightWordInActiveSentence(item, charIndex, wordLength);
      }
    };

    utterance.onstart = () => {
      state.isPlaying = true;
      state.isPaused = false;
      updateDockPlayState();
      updateProgressUI();
      startKeepAlive();
    };

    utterance.onend = () => {
      stopKeepAlive();
      state.currentIndex++;
      if (state.isPlaying) {
        speakSentence(state.currentIndex);
      }
    };

    utterance.onerror = (e) => {
      stopKeepAlive();
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('Utterance error:', e.error);
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function highlightSentence(idx) {
    clearSentenceHighlights();

    const item = state.flatSentences[idx];
    if (item && item.element) {
      item.element.classList.add('active');
      item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateProgressUI();
  }

  function highlightWordInActiveSentence(item, charIndex, length) {
    if (!item.element) return;
    const full = item.text;
    const before = full.substring(0, charIndex);
    const word = full.substring(charIndex, charIndex + length);
    const after = full.substring(charIndex + length);

    item.element.innerHTML = `${escapeHtml(before)}<span class="word-glow">${escapeHtml(word)}</span>${escapeHtml(after)} `;
  }

  function clearSentenceHighlights() {
    state.flatSentences.forEach((item) => {
      if (item.element) {
        item.element.classList.remove('active');
        item.element.textContent = item.text + ' ';
      }
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function updateDockPlayState() {
    if (state.isPlaying && !state.isPaused) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  function updateProgressUI() {
    const total = state.flatSentences.length;
    const curr = total > 0 ? state.currentIndex + 1 : 0;
    sentenceStatus.textContent = `Sentence ${curr} of ${total}`;

    if (total > 0) {
      const pct = Math.round((curr / total) * 100);
      dockScrubFill.style.width = `${pct}%`;
    } else {
      dockScrubFill.style.width = '0%';
    }
  }

  function skipNext() {
    if (state.currentIndex < state.flatSentences.length - 1) {
      window.speechSynthesis.cancel();
      state.currentIndex++;
      speakSentence(state.currentIndex);
    } else {
      stopPlayback();
    }
  }

  function skipPrev() {
    window.speechSynthesis.cancel();
    state.currentIndex = Math.max(0, state.currentIndex - 1);
    speakSentence(state.currentIndex);
  }

  // Scrub bar interaction
  dockScrub.addEventListener('click', (e) => {
    if (state.flatSentences.length === 0) return;
    const rect = dockScrub.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    state.currentIndex = Math.floor(ratio * state.flatSentences.length);
    window.speechSynthesis.cancel();
    speakSentence(state.currentIndex);
  });

  // Speed Cycle
  btnSpeedPill.addEventListener('click', () => {
    let curr = SPEEDS.indexOf(state.speed);
    if (curr === -1) curr = 2;
    curr = (curr + 1) % SPEEDS.length;
    setSpeed(SPEEDS[curr]);
  });

  function setSpeed(spd) {
    state.speed = spd;
    btnSpeedPill.textContent = `${spd}x`;
    saveSetting('rate', spd);
    updateStats(textEditor.value);
    showToast(`Speed: ${spd}x`);

    if (state.isPlaying && !state.isPaused) {
      window.speechSynthesis.cancel();
      speakSentence(state.currentIndex);
    }
  }

  // Voice Command Recognition
  function initVoiceCommands() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      state.recognition = new SpeechRecognition();
      state.recognition.continuous = true;
      state.recognition.interimResults = false;
      state.recognition.lang = 'en-US';

      state.recognition.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        if (!last.isFinal) return;

        const cmd = last[0].transcript.trim().toLowerCase();
        console.log('[Voice Command]:', cmd);
        showToast(`🎙️ Voice: "${cmd}"`);

        if (cmd.includes('play') || cmd.includes('start') || cmd.includes('resume')) {
          resumePlayback();
        } else if (cmd.includes('pause') || cmd.includes('stop')) {
          pausePlayback();
        } else if (cmd.includes('faster') || cmd.includes('speed up')) {
          let idx = Math.min(SPEEDS.length - 1, SPEEDS.indexOf(state.speed) + 1);
          setSpeed(SPEEDS[idx]);
        } else if (cmd.includes('slower') || cmd.includes('slow down')) {
          let idx = Math.max(0, SPEEDS.indexOf(state.speed) - 1);
          setSpeed(SPEEDS[idx]);
        } else if (cmd.includes('next') || cmd.includes('skip')) {
          skipNext();
        } else if (cmd.includes('back') || cmd.includes('previous')) {
          skipPrev();
        }
      };

      state.recognition.onerror = (e) => {
        if (e.error === 'not-allowed') {
          showToast('Mic access denied');
          toggleVoiceControl(false);
        }
      };

      state.recognition.onend = () => {
        if (state.isListeningVoiceCommands) {
          try {
            state.recognition.start();
          } catch (e) {}
        }
      };
    } catch (e) {
      console.warn('Voice command init warning:', e);
    }
  }

  function toggleVoiceControl(force) {
    if (!state.recognition) {
      showToast('Voice control not supported in this browser');
      return;
    }

    const nextState = force !== undefined ? force : !state.isListeningVoiceCommands;
    state.isListeningVoiceCommands = nextState;
    btnMicCommand.classList.toggle('active', nextState);

    if (nextState) {
      try {
        state.recognition.start();
        showToast('🎙️ Voice active: Say "pause", "play", "faster", "next"');
      } catch (e) {}
    } else {
      try {
        state.recognition.stop();
        showToast('🎙️ Voice control stopped');
      } catch (e) {}
    }
  }

  btnMicCommand.addEventListener('click', () => toggleVoiceControl());

  // View Toggle (Read vs Edit)
  btnViewRead.addEventListener('click', () => {
    btnViewRead.classList.add('active');
    btnViewEdit.classList.remove('active');
    editorWrap.classList.add('hidden');
    readerDisplay.style.display = 'block';
    parseAndRenderText(textEditor.value);
  });

  btnViewEdit.addEventListener('click', () => {
    stopPlayback();
    btnViewEdit.classList.add('active');
    btnViewRead.classList.remove('active');
    readerDisplay.style.display = 'none';
    editorWrap.classList.remove('hidden');
    textEditor.focus();
  });

  // Appearance & Themes
  btnFontSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    fontPopup.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!fontPopup.contains(e.target) && e.target !== btnFontSettings) {
      fontPopup.classList.add('hidden');
    }
  });

  document.querySelectorAll('.font-pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.font-pill-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      setFontFamily(btn.dataset.font);
    });
  });

  function setFontFamily(font) {
    state.fontFamily = font;
    document.documentElement.style.setProperty('--reader-font', `'${font}', sans-serif`);
    saveSetting('fontFamily', font);
  }

  fontSizeSlider.addEventListener('input', (e) => {
    setFontSize(e.target.value);
  });

  function setFontSize(size) {
    state.fontSize = size;
    fontSizeSlider.value = size;
    fontSizeVal.textContent = `${size}px`;
    document.documentElement.style.setProperty('--reader-font-size', `${size}px`);
    saveSetting('fontSize', size);
  }

  document.querySelectorAll('.theme-circle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-circle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      setTheme(btn.dataset.theme);
    });
  });

  function setTheme(thm) {
    state.theme = thm;
    document.documentElement.setAttribute('data-theme', thm);
    saveSetting('theme', thm);
  }

  // Document File Import
  fileUploader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      loadText(content);
      btnViewRead.click();
      showToast(`📄 Loaded "${file.name}"`);
    };
    reader.readAsText(file);
  });

  btnLoadSample.addEventListener('click', () => {
    loadText(SAMPLE_TEXT);
    btnViewRead.click();
    showToast('Loaded demo article!');
  });

  // Core Dock Controls
  btnPlayPause.addEventListener('click', togglePlayPause);
  btnSkipPrev.addEventListener('click', skipPrev);
  btnSkipNext.addEventListener('click', skipNext);

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Don't hijack if user is typing in editor
    if (e.target === textEditor) return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      skipNext();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      skipPrev();
    }
  });

  // Chrome keep-alive
  function startKeepAlive() {
    stopKeepAlive();
    state.keepAliveTimer = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 12000);
  }

  function stopKeepAlive() {
    if (state.keepAliveTimer) {
      clearInterval(state.keepAliveTimer);
      state.keepAliveTimer = null;
    }
  }

  function showToast(msg) {
    readerToast.textContent = msg;
    readerToast.classList.add('visible');
    clearTimeout(readerToast._t);
    readerToast._t = setTimeout(() => {
      readerToast.classList.remove('visible');
    }, 2500);
  }

  async function saveSetting(key, val) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set({ [key]: val });
      } else {
        localStorage.setItem(`echoread_${key}`, val);
      }
    } catch (e) {}
  }
});
