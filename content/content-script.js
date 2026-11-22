// EchoRead AI - Content Script
// Real-time synchronized text-to-speech with dual-modal word/sentence highlighting

(function () {
  // Prevent duplicate injection
  if (window.__echoread_initialized) return;
  window.__echoread_initialized = true;

  console.log('[EchoRead AI] Content script loaded on:', window.location.href);

  // State Management
  const state = {
    isPlaying: false,
    isPaused: false,
    sentences: [], // Array of { text, element, offsetInElement }
    currentIndex: 0,
    currentUtterance: null,
    currentVoice: null,
    availableVoices: [],
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoScroll: true,
    highlightWordColor: '#ffd54f',
    highlightSentenceColor: 'rgba(99, 102, 241, 0.18)',
    recognition: null,
    isListeningVoiceCommands: false,
    keepAliveInterval: null,
    playerElement: null,
    selectionBubble: null
  };

  const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

  // Initialize
  async function init() {
    await loadSettings();
    initSpeechSynthesis();
    createFloatingPlayer();
    createSelectionBubble();
    setupSelectionListener();
    setupVoiceRecognition();
  }

  // Load user settings
  async function loadSettings() {
    try {
      const data = await chrome.storage.sync.get({
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        voiceURI: '',
        autoScroll: true,
        highlightWordColor: '#ffd54f',
        highlightSentenceColor: 'rgba(99, 102, 241, 0.18)'
      });
      state.speed = data.rate || 1.0;
      state.pitch = data.pitch || 1.0;
      state.volume = data.volume || 1.0;
      state.autoScroll = data.autoScroll !== false;
      state.savedVoiceURI = data.voiceURI;
      state.highlightWordColor = data.highlightWordColor;
      state.highlightSentenceColor = data.highlightSentenceColor;
    } catch (e) {
      console.warn('[EchoRead] Error loading settings:', e);
    }
  }

  // Initialize speech voices
  function initSpeechSynthesis() {
    if (!('speechSynthesis' in window)) return;

    function populateVoices() {
      state.availableVoices = window.speechSynthesis.getVoices();
      if (state.availableVoices.length > 0) {
        if (state.savedVoiceURI) {
          state.currentVoice = state.availableVoices.find((v) => v.voiceURI === state.savedVoiceURI);
        }
        if (!state.currentVoice) {
          state.currentVoice =
            state.availableVoices.find(
              (v) =>
                v.lang.startsWith('en') &&
                (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Premium'))
            ) ||
            state.availableVoices.find((v) => v.lang.startsWith('en')) ||
            state.availableVoices[0];
        }
        updateVoiceSelectUI();
      }
    }

    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }
  }

  // Voice Command Recognition
  function setupVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      state.recognition = new SpeechRecognition();
      state.recognition.continuous = true;
      state.recognition.interimResults = false;
      state.recognition.lang = 'en-US';

      state.recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (!lastResult.isFinal) return;

        const transcript = lastResult[0].transcript.trim().toLowerCase();
        console.log('[EchoRead Voice Command]:', transcript);
        showToast(`🎙️ Command: "${transcript}"`);

        if (transcript.includes('play') || transcript.includes('start') || transcript.includes('resume')) {
          resumeOrPlay();
        } else if (transcript.includes('pause') || transcript.includes('stop') || transcript.includes('wait')) {
          pauseReading();
        } else if (transcript.includes('faster') || transcript.includes('speed up')) {
          changeSpeed(1);
        } else if (transcript.includes('slower') || transcript.includes('slow down')) {
          changeSpeed(-1);
        } else if (transcript.includes('next') || transcript.includes('skip')) {
          skipNext();
        } else if (transcript.includes('back') || transcript.includes('previous') || transcript.includes('rewind')) {
          skipPrev();
        }
      };

      state.recognition.onerror = (e) => {
        if (e.error === 'not-allowed') {
          showToast('Mic access denied');
          toggleVoiceCommands(false);
        }
      };

      state.recognition.onend = () => {
        if (state.isListeningVoiceCommands) {
          try {
            state.recognition.start();
          } catch (err) {}
        }
      };
    } catch (e) {
      console.warn('[EchoRead] Recognition init warning:', e);
    }
  }

  function toggleVoiceCommands(forceState) {
    if (!state.recognition) {
      showToast('Voice commands not supported in this tab');
      return;
    }

    const shouldListen = forceState !== undefined ? forceState : !state.isListeningVoiceCommands;
    state.isListeningVoiceCommands = shouldListen;

    const micBtn = document.getElementById('echoread-mic-toggle');
    if (micBtn) {
      micBtn.classList.toggle('active', shouldListen);
    }

    if (shouldListen) {
      try {
        state.recognition.start();
        showToast('🎙️ Say: "pause", "play", "faster", "next"');
      } catch (err) {}
    } else {
      try {
        state.recognition.stop();
        showToast('🎙️ Voice control stopped');
      } catch (err) {}
    }
  }

  // Smart Article Content Extractor
  async function extractPageSentences() {
    const articleRoot =
      document.querySelector('article') ||
      document.querySelector('main') ||
      document.querySelector('[role="main"]') ||
      document.querySelector('.post-content, .article-content, .entry-content, #content') ||
      document.body;

    const candidateTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'];
    const elements = Array.from(articleRoot.querySelectorAll(candidateTags.join(','))).filter((el) => {
      if (el.closest('#echoread-player-container, #echoread-selection-bubble, nav, footer, header, script, style, noscript, aside')) return false;
      const text = el.innerText?.trim();
      const style = window.getComputedStyle(el);
      return text && text.length > 15 && style.display !== 'none' && style.visibility !== 'hidden';
    });

    const parsedSentences = [];

    // Batch process to prevent blocking main thread
    const BATCH_SIZE = 25;
    for (let i = 0; i < elements.length; i += BATCH_SIZE) {
      const batch = elements.slice(i, i + BATCH_SIZE);
      await new Promise((resolve) =>
        requestAnimationFrame(() => {
          batch.forEach((el) => {
            const rawText = el.innerText;
            // Split by sentence terminators (. ! ?) avoiding common abbreviations
            const sentenceMatches = rawText.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
            if (sentenceMatches) {
              sentenceMatches.forEach((s) => {
                const clean = s.trim();
                if (clean.length > 2) {
                  const offset = rawText.indexOf(clean);
                  parsedSentences.push({
                    text: clean,
                    element: el,
                    offsetInElement: Math.max(0, offset)
                  });
                }
              });
            }
          });
          resolve();
        })
      );
      if (typeof scheduler !== 'undefined' && scheduler.yield) {
        await scheduler.yield();
      }
    }

    return parsedSentences;
  }

  // Read full page
  async function readFullPage() {
    showToast('📖 Analyzing article content...');
    const list = await extractPageSentences();
    if (!list || list.length === 0) {
      showToast('⚠️ No readable article content found.');
      return;
    }

    stopReading();
    state.sentences = list;
    state.currentIndex = 0;
    openPlayer();
    playCurrentSentence();
  }

  // Read selection
  function readSelectedText(text) {
    if (!text || text.trim().length === 0) return;

    stopReading();
    const sentences = text
      .trim()
      .match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text.trim()];

    state.sentences = sentences.map((s) => ({
      text: s.trim(),
      element: null,
      offsetInElement: 0
    }));
    state.currentIndex = 0;

    openPlayer();
    playCurrentSentence();
  }

  // Playback & Dual-Modal Karaoke Highlight
  function playCurrentSentence() {
    if (state.currentIndex >= state.sentences.length) {
      stopReading();
      showToast('🎉 Finished reading!');
      return;
    }

    const item = state.sentences[state.currentIndex];
    const textToSpeak = item.text;

    clearAllHighlights();

    // Soft sentence highlight & auto-scroll
    if (item.element) {
      item.element.classList.add('echoread-active-sentence');
      if (state.autoScroll) {
        item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (state.currentVoice) utterance.voice = state.currentVoice;
    utterance.rate = state.speed;
    utterance.pitch = state.pitch;
    utterance.volume = state.volume;

    // Real-time word boundary highlight
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIndex = event.charIndex;
        let wordLength = event.charLength;
        if (!wordLength || wordLength === 0) {
          const match = textToSpeak.substring(charIndex).match(/^\w+/);
          wordLength = match ? match[0].length : 4;
        }

        highlightWordAtBoundary(item, charIndex, wordLength);
      }
    };

    utterance.onstart = () => {
      state.isPlaying = true;
      state.isPaused = false;
      updatePlayerUI();
      notifyServiceWorker('playing');
      startKeepAlive();
    };

    utterance.onend = () => {
      stopKeepAlive();
      state.currentIndex++;
      if (state.isPlaying) {
        playCurrentSentence();
      }
    };

    utterance.onerror = (e) => {
      stopKeepAlive();
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('[EchoRead] Utterance error:', e.error);
      }
    };

    state.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // Real-time Word Highlighting
  function highlightWordAtBoundary(item, charIndex, wordLength) {
    if (!item.element) {
      updateCurrentWordInPlayer(item.text, charIndex, wordLength);
      return;
    }

    if ('highlights' in CSS) {
      try {
        const globalTargetStart = (item.offsetInElement || 0) + charIndex;
        const range = findRangeForCharOffset(item.element, globalTargetStart, wordLength);
        if (range) {
          const highlight = new Highlight(range);
          CSS.highlights.set('echoread-word', highlight);
        }
        return;
      } catch (err) {}
    }

    updateCurrentWordInPlayer(item.text, charIndex, wordLength);
  }

  function findRangeForCharOffset(element, targetStart, length) {
    const treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    let currentOffset = 0;
    let startNode = null;
    let startOffsetInNode = 0;
    let endNode = null;
    let endOffsetInNode = 0;

    const targetEnd = targetStart + length;

    let node;
    while ((node = treeWalker.nextNode())) {
      const nodeLength = node.textContent.length;
      if (!startNode && currentOffset + nodeLength >= targetStart) {
        startNode = node;
        startOffsetInNode = Math.max(0, targetStart - currentOffset);
      }
      if (startNode && currentOffset + nodeLength >= targetEnd) {
        endNode = node;
        endOffsetInNode = Math.min(nodeLength, targetEnd - currentOffset);
        break;
      }
      currentOffset += nodeLength;
    }

    if (startNode && endNode) {
      try {
        const range = document.createRange();
        range.setStart(startNode, startOffsetInNode);
        range.setEnd(endNode, endOffsetInNode);
        return range;
      } catch (e) {}
    }
    return null;
  }

  function clearAllHighlights() {
    if ('highlights' in CSS) {
      CSS.highlights.delete('echoread-word');
      CSS.highlights.delete('echoread-sentence');
    }
    document.querySelectorAll('.echoread-active-sentence').forEach((el) => {
      el.classList.remove('echoread-active-sentence');
    });
  }

  // Keep-alive heartbeat for Chrome speech synthesis
  function startKeepAlive() {
    stopKeepAlive();
    state.keepAliveInterval = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 12000);
  }

  function stopKeepAlive() {
    if (state.keepAliveInterval) {
      clearInterval(state.keepAliveInterval);
      state.keepAliveInterval = null;
    }
  }

  // Playback Control Handlers
  function togglePlay() {
    if (state.isPlaying && !state.isPaused) {
      pauseReading();
    } else if (state.isPaused) {
      resumeOrPlay();
    } else {
      if (state.sentences.length > 0) {
        playCurrentSentence();
      } else {
        readFullPage();
      }
    }
  }

  function pauseReading() {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      state.isPlaying = true;
      state.isPaused = true;
      updatePlayerUI();
      notifyServiceWorker('paused');
      showToast('❚❚ Paused');
    }
  }

  function resumeOrPlay() {
    if (state.isPaused) {
      window.speechSynthesis.resume();
      state.isPlaying = true;
      state.isPaused = false;
      updatePlayerUI();
      notifyServiceWorker('playing');
      showToast('▶ Playing');
    } else {
      togglePlay();
    }
  }

  function stopReading() {
    stopKeepAlive();
    window.speechSynthesis.cancel();
    state.isPlaying = false;
    state.isPaused = false;
    clearAllHighlights();
    updatePlayerUI();
    notifyServiceWorker('idle');
  }

  function skipNext() {
    if (state.currentIndex < state.sentences.length - 1) {
      window.speechSynthesis.cancel();
      state.currentIndex++;
      playCurrentSentence();
    } else {
      stopReading();
    }
  }

  function skipPrev() {
    window.speechSynthesis.cancel();
    state.currentIndex = Math.max(0, state.currentIndex - 1);
    playCurrentSentence();
  }

  function changeSpeed(step) {
    let currIdx = SPEEDS.indexOf(state.speed);
    if (currIdx === -1) currIdx = 2;
    let nextIdx = currIdx + step;
    if (nextIdx >= SPEEDS.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = SPEEDS.length - 1;

    setSpeed(SPEEDS[nextIdx]);
  }

  function setSpeed(newSpeed) {
    state.speed = newSpeed;
    chrome.storage.sync.set({ rate: newSpeed });
    updatePlayerUI();
    showToast(`Speed: ${newSpeed}x`);

    if (state.isPlaying && !state.isPaused) {
      window.speechSynthesis.cancel();
      playCurrentSentence();
    }
  }

  // Build Floating Player Dock
  function createFloatingPlayer() {
    if (document.getElementById('echoread-player-container')) return;

    const container = document.createElement('div');
    container.id = 'echoread-player-container';
    container.style.display = 'none';

    container.innerHTML = `
      <div class="echoread-player-card">
        <div class="echoread-bar-top">
          <div class="echoread-brand-group">
            <div id="echoread-eq" class="echoread-equalizer" title="Audio Activity">
              <div class="echoread-wave-bar"></div>
              <div class="echoread-wave-bar"></div>
              <div class="echoread-wave-bar"></div>
            </div>
            <span class="echoread-brand-name">EchoRead AI</span>
            <span id="echoread-progress-count" class="echoread-progress-text">Sentence 1/1</span>
          </div>
          <div class="echoread-window-actions">
            <button id="echoread-btn-fullscreen" class="echoread-icon-btn" aria-label="Open Fullscreen Reader Tab" title="Open Fullscreen Reader">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </button>
            <button id="echoread-btn-minimize" class="echoread-icon-btn" aria-label="Minimize player" title="Minimize">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/></svg>
            </button>
            <button id="echoread-btn-close" class="echoread-icon-btn" aria-label="Close and stop" title="Close">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div id="echoread-progress-bar" class="echoread-progress-track" title="Click to seek sentence">
          <div id="echoread-progress-fill" class="echoread-progress-fill"></div>
        </div>

        <div class="echoread-controls-row">
          <div class="echoread-playback-group">
            <button id="echoread-btn-prev" class="echoread-control-btn" aria-label="Previous sentence" title="Previous sentence">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button id="echoread-btn-play-pause" class="echoread-control-btn echoread-play-pause-btn" aria-label="Play or Pause" title="Play / Pause">
              <svg id="echoread-icon-play" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              <svg id="echoread-icon-pause" style="display:none;" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <button id="echoread-btn-next" class="echoread-control-btn" aria-label="Next sentence" title="Next sentence">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>

          <div class="echoread-settings-group">
            <button id="echoread-speed-toggle" class="echoread-speed-btn" aria-label="Change Speed" title="Click to cycle speed">1.0x</button>
            <select id="echoread-voice-picker" class="echoread-voice-select" aria-label="Select voice" title="Choose voice"></select>
            <button id="echoread-mic-toggle" class="echoread-mic-btn" aria-label="Voice commands" title="Toggle voice command recognition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div id="echoread-mini-bubble" class="echoread-mini-bubble" aria-label="Expand EchoRead player" title="Click to expand EchoRead">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
      </div>
    `;

    document.documentElement.appendChild(container);
    state.playerElement = container;

    // Attach listeners
    document.getElementById('echoread-btn-play-pause').addEventListener('click', togglePlay);
    document.getElementById('echoread-btn-prev').addEventListener('click', skipPrev);
    document.getElementById('echoread-btn-next').addEventListener('click', skipNext);
    document.getElementById('echoread-speed-toggle').addEventListener('click', () => changeSpeed(1));

    document.getElementById('echoread-voice-picker').addEventListener('change', (e) => {
      const selectedURI = e.target.value;
      state.currentVoice = state.availableVoices.find((v) => v.voiceURI === selectedURI);
      chrome.storage.sync.set({ voiceURI: selectedURI });
      showToast(`Voice: ${state.currentVoice ? state.currentVoice.name : 'Default'}`);
      if (state.isPlaying && !state.isPaused) {
        window.speechSynthesis.cancel();
        playCurrentSentence();
      }
    });

    document.getElementById('echoread-mic-toggle').addEventListener('click', () => toggleVoiceCommands());

    document.getElementById('echoread-btn-fullscreen').addEventListener('click', () => {
      const activeText = state.sentences.map((s) => s.text).join('\n\n');
      chrome.runtime.sendMessage({ action: 'open-reader-tab', text: activeText });
    });

    document.getElementById('echoread-btn-minimize').addEventListener('click', () => {
      container.classList.add('minimized');
    });

    document.getElementById('echoread-mini-bubble').addEventListener('click', () => {
      container.classList.remove('minimized');
    });

    document.getElementById('echoread-btn-close').addEventListener('click', () => {
      stopReading();
      container.style.display = 'none';
    });

    // Seek via progress bar
    const progressBar = document.getElementById('echoread-progress-bar');
    progressBar.addEventListener('click', (e) => {
      if (state.sentences.length === 0) return;
      const rect = progressBar.getBoundingClientRect();
      const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetIndex = Math.floor(clickRatio * state.sentences.length);
      window.speechSynthesis.cancel();
      state.currentIndex = targetIndex;
      playCurrentSentence();
    });

    updateVoiceSelectUI();
  }

  function openPlayer() {
    if (state.playerElement) {
      state.playerElement.style.display = 'block';
      state.playerElement.classList.remove('minimized');
    }
  }

  function updatePlayerUI() {
    const playIcon = document.getElementById('echoread-icon-play');
    const pauseIcon = document.getElementById('echoread-icon-pause');
    const speedBtn = document.getElementById('echoread-speed-toggle');
    const countText = document.getElementById('echoread-progress-count');
    const fillBar = document.getElementById('echoread-progress-fill');
    const eq = document.getElementById('echoread-eq');

    const activePlay = state.isPlaying && !state.isPaused;

    if (playIcon && pauseIcon) {
      playIcon.style.display = activePlay ? 'none' : 'block';
      pauseIcon.style.display = activePlay ? 'block' : 'none';
    }

    if (eq) {
      eq.classList.toggle('playing', activePlay);
    }

    if (speedBtn) speedBtn.textContent = `${state.speed}x`;

    if (countText) {
      const total = state.sentences.length;
      const curr = total > 0 ? state.currentIndex + 1 : 0;
      countText.textContent = `Sentence ${curr} / ${total}`;
    }

    if (fillBar && state.sentences.length > 0) {
      const pct = Math.round(((state.currentIndex + 1) / state.sentences.length) * 100);
      fillBar.style.width = `${pct}%`;
    }
  }

  function updateVoiceSelectUI() {
    const select = document.getElementById('echoread-voice-picker');
    if (!select || state.availableVoices.length === 0) return;

    select.innerHTML = '';
    state.availableVoices.forEach((voice) => {
      const opt = document.createElement('option');
      opt.value = voice.voiceURI;
      opt.textContent = `${voice.name} (${voice.lang})`;
      if (state.currentVoice && voice.voiceURI === state.currentVoice.voiceURI) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  }

  function updateCurrentWordInPlayer(fullText, charIndex, length) {
    const word = fullText.substr(charIndex, length);
    const countText = document.getElementById('echoread-progress-count');
    if (countText && word) {
      countText.textContent = `"${word}"`;
    }
  }

  // Floating Selection Tooltip
  function createSelectionBubble() {
    if (document.getElementById('echoread-selection-bubble')) return;

    const bubble = document.createElement('div');
    bubble.id = 'echoread-selection-bubble';
    bubble.style.display = 'none';
    bubble.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
      <span>Listen</span>
    `;

    document.documentElement.appendChild(bubble);
    state.selectionBubble = bubble;

    bubble.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const selection = window.getSelection();
      const text = selection ? selection.toString() : '';
      hideSelectionBubble();
      if (text) {
        readSelectedText(text);
      }
    });
  }

  function setupSelectionListener() {
    document.addEventListener('mouseup', (e) => {
      if (e.target.closest('#echoread-player-container, #echoread-selection-bubble')) return;

      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : '';

        if (text && text.length >= 3) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            showSelectionBubble(rect.left + rect.width / 2, rect.top - 10 + window.scrollY);
          }
        } else {
          hideSelectionBubble();
        }
      }, 60);
    });

    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('#echoread-selection-bubble')) {
        hideSelectionBubble();
      }
    });
  }

  function showSelectionBubble(x, y) {
    if (!state.selectionBubble) return;
    state.selectionBubble.style.left = `${Math.max(10, x - 40)}px`;
    state.selectionBubble.style.top = `${Math.max(10, y - 35)}px`;
    state.selectionBubble.style.display = 'flex';
  }

  function hideSelectionBubble() {
    if (state.selectionBubble) {
      state.selectionBubble.style.display = 'none';
    }
  }

  // Toast
  function showToast(message) {
    let toast = document.getElementById('echoread-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'echoread-toast';
      document.documentElement.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('visible');

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2800);
  }

  function notifyServiceWorker(status) {
    try {
      chrome.runtime.sendMessage({
        action: 'update-badge',
        status: status
      });
    } catch (e) {}
  }

  // Messaging from Background or Popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
      try {
        if (request.action === 'read-selection') {
          readSelectedText(request.text || window.getSelection().toString());
          sendResponse({ success: true });
        } else if (request.action === 'read-full-page') {
          await readFullPage();
          sendResponse({ success: true });
        } else if (request.action === 'toggle-play') {
          togglePlay();
          sendResponse({ success: true, isPlaying: state.isPlaying && !state.isPaused });
        } else if (request.action === 'stop-reading') {
          stopReading();
          sendResponse({ success: true });
        } else if (request.action === 'change-speed') {
          setSpeed(request.speed);
          sendResponse({ success: true });
        } else if (request.action === 'get-status') {
          sendResponse({
            isPlaying: state.isPlaying,
            isPaused: state.isPaused,
            speed: state.speed,
            sentenceCount: state.sentences.length,
            currentIndex: state.currentIndex
          });
        } else if (request.action === 'get-page-text') {
          const list = await extractPageSentences();
          const fullText = list.map((item) => item.text).join('\n\n');
          sendResponse({ text: fullText, title: document.title });
        } else {
          sendResponse({ received: true });
        }
      } catch (err) {
        console.error('[EchoRead Error]:', err);
        sendResponse({ error: err.message });
      }
    })();
    return true;
  });

  init();
})();
