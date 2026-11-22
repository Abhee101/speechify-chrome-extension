// EchoRead AI - Popup Script
// Communicates with Active Tab Content Script & Background Service Worker

document.addEventListener('DOMContentLoaded', async () => {
  let activeTab = null;
  let availableVoices = [];
  let currentSpeed = 1.0;
  let isRestrictedTab = false;

  // Cache DOM elements
  const tabTitleEl = document.getElementById('tab-title');
  const btnReadPage = document.getElementById('btn-read-page');
  const readBtnText = document.getElementById('read-btn-text');
  const btnStopReading = document.getElementById('btn-stop-reading');
  const voiceSelect = document.getElementById('voice-select');
  const btnTestVoice = document.getElementById('btn-test-voice');
  const speedDisplay = document.getElementById('speed-display');
  const speedChips = document.querySelectorAll('.chip-btn');
  const quickText = document.getElementById('quick-text');
  const btnClearText = document.getElementById('btn-clear-text');
  const btnReadQuickText = document.getElementById('btn-read-quick-text');
  const btnOpenFullReader = document.getElementById('btn-open-full-reader');
  const btnSidepanel = document.getElementById('btn-sidepanel');
  const btnOptions = document.getElementById('btn-options');

  // 1. Get Active Tab Info
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      activeTab = tabs[0];
      const title = activeTab.title || activeTab.url || 'Active Tab';
      tabTitleEl.textContent = title;
      tabTitleEl.title = title;

      if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.includes('chrome.google.com/webstore'))) {
        isRestrictedTab = true;
        readBtnText.textContent = 'Use Quick Reader (Chrome tab restricted)';
        btnReadPage.style.opacity = '0.7';
      }
    }
  } catch (err) {
    console.warn('[EchoRead Popup] Tab query error:', err);
    tabTitleEl.textContent = 'Active Webpage';
  }

  // 2. Load Stored Settings
  const settings = await chrome.storage.sync.get({
    rate: 1.0,
    voiceURI: ''
  });
  currentSpeed = settings.rate || 1.0;
  updateSpeedUI(currentSpeed);

  // 3. Populate Voices
  function loadVoices() {
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

    if (!voiceSelect.value && availableVoices.length > 0) {
      const best =
        availableVoices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))) ||
        availableVoices[0];
      if (best) voiceSelect.value = best.voiceURI;
    }
  }

  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // 4. Voice Change
  voiceSelect.addEventListener('change', async () => {
    const selectedURI = voiceSelect.value;
    await chrome.storage.sync.set({ voiceURI: selectedURI });
  });

  // 5. Test Voice Sample
  btnTestVoice.addEventListener('click', () => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance('Hello! EchoRead brings your words to life.');
    const selectedVoice = availableVoices.find((v) => v.voiceURI === voiceSelect.value);
    if (selectedVoice) utt.voice = selectedVoice;
    utt.rate = currentSpeed;
    window.speechSynthesis.speak(utt);
  });

  // 6. Speed Chips
  speedChips.forEach((chip) => {
    chip.addEventListener('click', async () => {
      const spd = parseFloat(chip.dataset.speed);
      currentSpeed = spd;
      updateSpeedUI(spd);
      await chrome.storage.sync.set({ rate: spd });

      if (activeTab && activeTab.id) {
        try {
          await chrome.tabs.sendMessage(activeTab.id, { action: 'change-speed', speed: spd });
        } catch (e) {}
      }
    });
  });

  function updateSpeedUI(spd) {
    speedDisplay.textContent = `${spd}x`;
    speedChips.forEach((c) => {
      c.classList.toggle('active', parseFloat(c.dataset.speed) === spd);
    });
  }

  // 7. Read Page Aloud
  btnReadPage.addEventListener('click', async () => {
    if (isRestrictedTab) {
      // Direct user to full reader
      await chrome.tabs.create({ url: chrome.runtime.getURL('reader/reader.html') });
      window.close();
      return;
    }

    if (!activeTab || !activeTab.id) return;
    try {
      await chrome.tabs.sendMessage(activeTab.id, { action: 'read-full-page' });
      window.close();
    } catch (e) {
      await chrome.runtime.sendMessage({
        action: 'forward-to-tab',
        payload: { action: 'read-full-page' }
      });
      window.close();
    }
  });

  // 8. Stop Reading
  btnStopReading.addEventListener('click', async () => {
    if (activeTab && activeTab.id) {
      try {
        await chrome.tabs.sendMessage(activeTab.id, { action: 'stop-reading' });
      } catch (e) {}
    }
    window.speechSynthesis.cancel();
  });

  // 9. Quick Text Reader
  btnClearText.addEventListener('click', () => {
    quickText.value = '';
    quickText.focus();
  });

  btnReadQuickText.addEventListener('click', async () => {
    const text = quickText.value.trim();
    if (!text) {
      quickText.focus();
      return;
    }

    if (!isRestrictedTab && activeTab && activeTab.id) {
      try {
        await chrome.tabs.sendMessage(activeTab.id, { action: 'read-selection', text });
        window.close();
        return;
      } catch (e) {}
    }

    // Direct playback in speech synthesis
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const selectedVoice = availableVoices.find((v) => v.voiceURI === voiceSelect.value);
    if (selectedVoice) utt.voice = selectedVoice;
    utt.rate = currentSpeed;
    window.speechSynthesis.speak(utt);
  });

  // 10. Open Full Reader
  btnOpenFullReader.addEventListener('click', async () => {
    const text = quickText.value.trim();
    const query = text ? `?text=${encodeURIComponent(text)}` : '';
    await chrome.tabs.create({ url: chrome.runtime.getURL(`reader/reader.html${query}`) });
  });

  // 11. Open Side Panel
  btnSidepanel.addEventListener('click', async () => {
    if (activeTab) {
      await chrome.sidePanel.open({ windowId: activeTab.windowId });
      window.close();
    }
  });

  // 12. Open Options
  btnOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
