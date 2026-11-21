// EchoRead AI - Side Panel Script
// Provides synchronized transcript reader side-by-side with any webpage

document.addEventListener('DOMContentLoaded', async () => {
  // State
  let activeTab = null;
  let sentences = [];
  let currentIndex = 0;
  let isPlaying = false;
  let isPaused = false;
  let speed = 1.0;
  let availableVoices = [];
  let currentVoice = null;
  const SPEEDS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

  // DOM elements
  const pageTitleEl = document.getElementById('panel-page-title');
  const btnSyncPage = document.getElementById('btn-sync-page');
  const btnOpenTab = document.getElementById('btn-open-tab');
  const btnExtractRead = document.getElementById('btn-extract-read');
  const transcriptEl = document.getElementById('panel-transcript');
  const btnClearTranscript = document.getElementById('btn-clear-transcript');
  const btnPlay = document.getElementById('panel-btn-play');
  const playIcon = document.getElementById('panel-play-icon');
  const pauseIcon = document.getElementById('panel-pause-icon');
  const btnPrev = document.getElementById('panel-btn-prev');
  const btnNext = document.getElementById('panel-btn-next');
  const btnSpeed = document.getElementById('panel-speed-btn');
  const voiceSelect = document.getElementById('panel-voice-select');
  const scrubTrack = document.getElementById('panel-scrub');
  const scrubFill = document.getElementById('panel-scrub-fill');

  // Load Settings
  const settings = await chrome.storage.sync.get({
    rate: 1.0,
    voiceURI: ''
  });
  speed = settings.rate || 1.0;
  btnSpeed.textContent = `${speed}x`;

  // Voices
  function populateVoices() {
    availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length === 0) return;

    voiceSelect.innerHTML = '';
    availableVoices.forEach((voice) => {
      const opt = document.createElement('option');
      opt.value = voice.voiceURI;
      opt.textContent = `${voice.name} (${voice.lang})`;
      if (settings.voiceURI && voice.voiceURI === settings.voiceURI) {
        opt.selected = true;
      }
      voiceSelect.appendChild(opt);
    });

    if (settings.voiceURI) {
      currentVoice = availableVoices.find((v) => v.voiceURI === settings.voiceURI);
    }
    if (!currentVoice && availableVoices.length > 0) {
      currentVoice =
        availableVoices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))) ||
        availableVoices[0];
      if (currentVoice) voiceSelect.value = currentVoice.voiceURI;
    }
  }

  populateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  voiceSelect.addEventListener('change', async () => {
    const selectedURI = voiceSelect.value;
    currentVoice = availableVoices.find((v) => v.voiceURI === selectedURI);
    await chrome.storage.sync.set({ voiceURI: selectedURI });
    if (isPlaying && !isPaused) {
      window.speechSynthesis.cancel();
      speakSentence(currentIndex);
    }
  });

  // Query Active Tab
  async function refreshActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        activeTab = tabs[0];
        pageTitleEl.textContent = activeTab.title || activeTab.url || 'Active Tab';
      }
    } catch (e) {
      console.warn('[SidePanel] Failed to query tab:', e);
    }
  }

  await refreshActiveTab();

  // Extract Page Content
  async function extractContent() {
    await refreshActiveTab();
    if (!activeTab || !activeTab.id) return;

    pageTitleEl.textContent = 'Extracting article...';
    try {
      let resp = null;
      try {
        resp = await chrome.tabs.sendMessage(activeTab.id, { action: 'get-page-text' });
      } catch (err) {
        // Fallback: inject content script
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content/content-script.js']
        });
        await new Promise((r) => setTimeout(r, 150));
        resp = await chrome.tabs.sendMessage(activeTab.id, { action: 'get-page-text' });
      }

      if (resp && resp.text) {
        pageTitleEl.textContent = resp.title || activeTab.title;
        loadTextIntoTranscript(resp.text);
        startReading();
      } else {
        pageTitleEl.textContent = 'No text extracted. Try another page.';
      }
    } catch (e) {
      console.error('[SidePanel Extract Error]:', e);
      pageTitleEl.textContent = 'Unable to extract text from this page.';
    }
  }

  btnExtractRead.addEventListener('click', extractContent);
  btnSyncPage.addEventListener('click', extractContent);

  // Parse and Load Text
  function loadTextIntoTranscript(rawText) {
    stopReading();
    transcriptEl.innerHTML = '';

    const matches = rawText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [rawText];
    sentences = matches.map((s) => s.trim()).filter((s) => s.length > 2);

    if (sentences.length === 0) {
      transcriptEl.innerHTML = '<div class="empty-state"><p>No text found.</p></div>';
      return;
    }

    sentences.forEach((s, idx) => {
      const span = document.createElement('span');
      span.className = 'transcript-sentence';
      span.dataset.index = idx;
      span.textContent = s + ' ';

      // Click to jump reading directly to this sentence
      span.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        currentIndex = idx;
        speakSentence(idx);
      });

      transcriptEl.appendChild(span);
    });

    currentIndex = 0;
    updateProgressUI();
  }

  // Playback Engine
  function startReading() {
    if (sentences.length === 0) return;
    isPlaying = true;
    isPaused = false;
    updatePlayStateUI();
    speakSentence(currentIndex);
  }

  function speakSentence(idx) {
    if (idx >= sentences.length) {
      stopReading();
      return;
    }

    const textToSpeak = sentences[idx];
    highlightSentenceInTranscript(idx);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (currentVoice) utterance.voice = currentVoice;
    utterance.rate = speed;

    // Real-time word highlighting in transcript
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIndex = event.charIndex;
        let wordLength = event.charLength;
        if (!wordLength || wordLength === 0) {
          const match = textToSpeak.substring(charIndex).match(/^\w+/);
          wordLength = match ? match[0].length : 4;
        }
        highlightWordInSentence(idx, charIndex, wordLength);
      }
    };

    utterance.onstart = () => {
      isPlaying = true;
      isPaused = false;
      updatePlayStateUI();
      updateProgressUI();
    };

    utterance.onend = () => {
      currentIndex++;
      if (isPlaying) {
        speakSentence(currentIndex);
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('[SidePanel Utterance Error]:', e.error);
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function highlightSentenceInTranscript(idx) {
    const all = transcriptEl.querySelectorAll('.transcript-sentence');
    all.forEach((el) => {
      el.classList.remove('active');
      // restore clean text without temporary inner tags
      const original = sentences[el.dataset.index];
      if (original) el.textContent = original + ' ';
    });

    const activeSpan = transcriptEl.querySelector(`[data-index="${idx}"]`);
    if (activeSpan) {
      activeSpan.classList.add('active');
      activeSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function highlightWordInSentence(idx, charIndex, length) {
    const activeSpan = transcriptEl.querySelector(`[data-index="${idx}"]`);
    if (!activeSpan) return;

    const fullSentence = sentences[idx];
    const before = fullSentence.substring(0, charIndex);
    const word = fullSentence.substring(charIndex, charIndex + length);
    const after = fullSentence.substring(charIndex + length);

    activeSpan.innerHTML = `${escapeHtml(before)}<span class="word-highlight">${escapeHtml(word)}</span>${escapeHtml(after)} `;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function togglePlay() {
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      isPaused = true;
      updatePlayStateUI();
    } else if (isPaused) {
      window.speechSynthesis.resume();
      isPaused = false;
      updatePlayStateUI();
    } else {
      startReading();
    }
  }

  function stopReading() {
    window.speechSynthesis.cancel();
    isPlaying = false;
    isPaused = false;
    updatePlayStateUI();
  }

  function skipNext() {
    if (currentIndex < sentences.length - 1) {
      window.speechSynthesis.cancel();
      currentIndex++;
      speakSentence(currentIndex);
    } else {
      stopReading();
    }
  }

  function skipPrev() {
    window.speechSynthesis.cancel();
    currentIndex = Math.max(0, currentIndex - 1);
    speakSentence(currentIndex);
  }

  function updatePlayStateUI() {
    if (isPlaying && !isPaused) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  function updateProgressUI() {
    if (sentences.length === 0) {
      scrubFill.style.width = '0%';
      return;
    }
    const pct = Math.round(((currentIndex + 1) / sentences.length) * 100);
    scrubFill.style.width = `${pct}%`;
  }

  // Scrub bar click
  scrubTrack.addEventListener('click', (e) => {
    if (sentences.length === 0) return;
    const rect = scrubTrack.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    currentIndex = Math.floor(ratio * sentences.length);
    window.speechSynthesis.cancel();
    speakSentence(currentIndex);
  });

  // Speed Cycle
  btnSpeed.addEventListener('click', async () => {
    let curr = SPEEDS.indexOf(speed);
    if (curr === -1) curr = 1;
    curr = (curr + 1) % SPEEDS.length;
    speed = SPEEDS[curr];
    btnSpeed.textContent = `${speed}x`;
    await chrome.storage.sync.set({ rate: speed });

    if (isPlaying && !isPaused) {
      window.speechSynthesis.cancel();
      speakSentence(currentIndex);
    }
  });

  btnPlay.addEventListener('click', togglePlay);
  btnPrev.addEventListener('click', skipPrev);
  btnNext.addEventListener('click', skipNext);

  btnClearTranscript.addEventListener('click', () => {
    stopReading();
    sentences = [];
    transcriptEl.innerHTML = '<div class="empty-state"><p>Transcript cleared.</p></div>';
    updateProgressUI();
  });

  btnOpenTab.addEventListener('click', async () => {
    const raw = sentences.join('\n\n');
    const query = raw ? `?text=${encodeURIComponent(raw)}` : '';
    await chrome.tabs.create({ url: chrome.runtime.getURL(`reader/reader.html${query}`) });
  });
});
