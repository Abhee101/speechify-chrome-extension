// EchoRead AI - Options JavaScript

document.addEventListener('DOMContentLoaded', async () => {
  let availableVoices = [];

  const DEFAULTS = {
    voiceURI: '',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoScroll: true,
    showSelectionButton: true,
    voiceCommandsEnabled: true,
    highlightWordColor: '#ffd54f',
    highlightSentenceColor: '#6366f1'
  };

  // DOM elements
  const optVoice = document.getElementById('opt-voice');
  const optBtnTestVoice = document.getElementById('opt-btn-test-voice');
  const optRate = document.getElementById('opt-rate');
  const rateValue = document.getElementById('rate-value');
  const optPitch = document.getElementById('opt-pitch');
  const pitchValue = document.getElementById('pitch-value');
  const optWordColor = document.getElementById('opt-word-color');
  const wordColorHex = document.getElementById('word-color-hex');
  const optSentenceColor = document.getElementById('opt-sentence-color');
  const sentenceColorHex = document.getElementById('sentence-color-hex');
  const previewSentence = document.getElementById('preview-text');
  const previewWord = document.getElementById('preview-word');
  const optAutoscroll = document.getElementById('opt-autoscroll');
  const optSelectionBubble = document.getElementById('opt-selection-bubble');
  const optVoiceCommands = document.getElementById('opt-voice-commands');
  const btnSave = document.getElementById('btn-save');
  const btnReset = document.getElementById('btn-reset');
  const saveToast = document.getElementById('save-toast');

  // Load Settings
  const settings = await chrome.storage.sync.get(DEFAULTS);

  // Populate Voice List
  function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length === 0) return;

    optVoice.innerHTML = '';
    availableVoices.forEach((voice) => {
      const opt = document.createElement('option');
      opt.value = voice.voiceURI;
      opt.textContent = `${voice.name} (${voice.lang})`;
      if (settings.voiceURI && voice.voiceURI === settings.voiceURI) {
        opt.selected = true;
      }
      optVoice.appendChild(opt);
    });

    if (!optVoice.value && availableVoices.length > 0) {
      const best =
        availableVoices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))) ||
        availableVoices[0];
      if (best) optVoice.value = best.voiceURI;
    }
  }

  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function applySettingsToUI(cfg) {
    optRate.value = cfg.rate;
    rateValue.textContent = `${cfg.rate}x`;
    optPitch.value = cfg.pitch;
    pitchValue.textContent = cfg.pitch;
    optAutoscroll.checked = cfg.autoScroll !== false;
    optSelectionBubble.checked = cfg.showSelectionButton !== false;
    optVoiceCommands.checked = cfg.voiceCommandsEnabled !== false;

    optWordColor.value = cfg.highlightWordColor || '#ffd54f';
    wordColorHex.textContent = optWordColor.value;
    optSentenceColor.value = cfg.highlightSentenceColor.startsWith('#') ? cfg.highlightSentenceColor : '#6366f1';
    sentenceColorHex.textContent = optSentenceColor.value;

    updatePreview();
  }

  applySettingsToUI(settings);

  // Range Listeners
  optRate.addEventListener('input', () => {
    rateValue.textContent = `${optRate.value}x`;
  });

  optPitch.addEventListener('input', () => {
    pitchValue.textContent = optPitch.value;
  });

  // Color Pickers
  optWordColor.addEventListener('input', () => {
    wordColorHex.textContent = optWordColor.value;
    updatePreview();
  });

  optSentenceColor.addEventListener('input', () => {
    sentenceColorHex.textContent = optSentenceColor.value;
    updatePreview();
  });

  function updatePreview() {
    previewWord.style.backgroundColor = optWordColor.value;
    previewSentence.style.backgroundColor = hexToRgba(optSentenceColor.value, 0.18);
  }

  function hexToRgba(hex, alpha) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16) || 99;
    const g = parseInt(c.substring(2, 4), 16) || 102;
    const b = parseInt(c.substring(4, 6), 16) || 241;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Voice Test
  optBtnTestVoice.addEventListener('click', () => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance('EchoRead audio preview. Everything sounds crystal clear!');
    const v = availableVoices.find((x) => x.voiceURI === optVoice.value);
    if (v) utt.voice = v;
    utt.rate = parseFloat(optRate.value);
    utt.pitch = parseFloat(optPitch.value);
    window.speechSynthesis.speak(utt);
  });

  // Save Settings
  btnSave.addEventListener('click', async () => {
    await chrome.storage.sync.set({
      voiceURI: optVoice.value,
      rate: parseFloat(optRate.value),
      pitch: parseFloat(optPitch.value),
      autoScroll: optAutoscroll.checked,
      showSelectionButton: optSelectionBubble.checked,
      voiceCommandsEnabled: optVoiceCommands.checked,
      highlightWordColor: optWordColor.value,
      highlightSentenceColor: hexToRgba(optSentenceColor.value, 0.18)
    });

    showSaveToast('Settings saved successfully!');
  });

  // Reset to Defaults
  btnReset.addEventListener('click', async () => {
    await chrome.storage.sync.set(DEFAULTS);
    applySettingsToUI(DEFAULTS);
    showSaveToast('Reset to default settings!');
  });

  function showSaveToast(msg) {
    saveToast.textContent = msg;
    saveToast.classList.add('visible');
    setTimeout(() => {
      saveToast.classList.remove('visible');
    }, 2500);
  }
});
