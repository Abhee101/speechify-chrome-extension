// EchoRead AI - Background Service Worker (Manifest V3)
// Adheres strictly to Chrome Manifest V3 service worker lifecycle rules

const DEFAULT_SETTINGS = {
  voiceURI: '',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoScroll: true,
  highlightWordColor: '#ffd54f', // Warm golden yellow
  highlightSentenceColor: 'rgba(99, 102, 241, 0.18)', // Indigo highlight
  voiceCommandsEnabled: true,
  showSelectionButton: true,
  dyslexicFont: false
};

// Initialize settings and context menus on install / update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[EchoRead AI] Service worker initialized. Reason:', details.reason);

  // Set default settings if not already present
  const stored = await chrome.storage.sync.get(null);
  const newSettings = Object.assign({}, DEFAULT_SETTINGS, stored);
  await chrome.storage.sync.set(newSettings);

  // Clear and recreate context menus
  chrome.contextMenus.removeAll(async () => {
    chrome.contextMenus.create({
      id: 'echoread-read-selection',
      title: '🔊 Read Selection with EchoRead',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'echoread-read-page',
      title: '📖 Read Entire Article / Page',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'echoread-sidepanel',
      title: '📑 Open in Side Panel Reader',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'echoread-stop',
      title: '⏹ Stop Reading',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'echoread-open-reader',
      title: '🚀 Open Fullscreen Reader App',
      contexts: ['all']
    });
  });
});

// Handle Context Menu item clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'echoread-read-selection') {
    await sendMessageToTab(tab.id, {
      action: 'read-selection',
      text: info.selectionText
    });
    await flashBadge(tab.id, '▶', '#6366F1');
  } else if (info.menuItemId === 'echoread-read-page') {
    await sendMessageToTab(tab.id, {
      action: 'read-full-page'
    });
    await flashBadge(tab.id, '▶', '#6366F1');
  } else if (info.menuItemId === 'echoread-sidepanel') {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } else if (info.menuItemId === 'echoread-stop') {
    await sendMessageToTab(tab.id, {
      action: 'stop-reading'
    });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
  } else if (info.menuItemId === 'echoread-open-reader') {
    const url = chrome.runtime.getURL('reader/reader.html');
    await chrome.tabs.create({ url });
  }
});

// Handle manifest keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  if (command === 'toggle-play') {
    await sendMessageToTab(tab.id, { action: 'toggle-play' });
  } else if (command === 'stop-reading') {
    await sendMessageToTab(tab.id, { action: 'stop-reading' });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
  } else if (command === 'open-side-panel') {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } else if (command === 'open-reader') {
    const url = chrome.runtime.getURL('reader/reader.html');
    await chrome.tabs.create({ url });
  }
});

// Message listener for popup, sidepanel, and content script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Use async self-invoking function and return true to keep message channel open
  (async () => {
    try {
      if (request.action === 'update-badge') {
        const tabId = sender.tab ? sender.tab.id : (request.tabId || undefined);
        if (tabId) {
          if (request.status === 'playing') {
            await chrome.action.setBadgeText({ tabId, text: '▶' });
            await chrome.action.setBadgeBackgroundColor({ tabId, color: '#6366F1' });
          } else if (request.status === 'paused') {
            await chrome.action.setBadgeText({ tabId, text: '❚❚' });
            await chrome.action.setBadgeBackgroundColor({ tabId, color: '#F59E0B' });
          } else {
            await chrome.action.setBadgeText({ tabId, text: '' });
          }
        }
        sendResponse({ success: true });
      } else if (request.action === 'open-side-panel') {
        const windowId = sender.tab?.windowId || (await chrome.windows.getLastFocused()).id;
        await chrome.sidePanel.open({ windowId });
        sendResponse({ success: true });
      } else if (request.action === 'open-reader-tab') {
        const query = request.text ? `?text=${encodeURIComponent(request.text)}` : '';
        const url = chrome.runtime.getURL(`reader/reader.html${query}`);
        await chrome.tabs.create({ url });
        sendResponse({ success: true });
      } else if (request.action === 'forward-to-tab') {
        // Forward command from popup/sidepanel to active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          await sendMessageToTab(tab.id, request.payload);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No active tab' });
        }
      } else {
        sendResponse({ received: true });
      }
    } catch (err) {
      console.error('[EchoRead Service Worker Error]:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep channel open for async response
});

// Helper: send message to tab with automatic content-script injection fallback
async function sendMessageToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    console.log('[EchoRead] Content script not detected, programmatically injecting...', err);
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content/floating-widget.css']
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content-script.js']
      });

      // Small pause to let script attach listener
      await new Promise((r) => setTimeout(r, 120));
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (injErr) {
      console.error('[EchoRead] Unable to inject content script (tab might be chrome:// or restricted):', injErr);
    }
  }
}

// Helper: quick visual badge flash for user feedback
async function flashBadge(tabId, text, color) {
  try {
    await chrome.action.setBadgeText({ tabId, text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color });
    setTimeout(async () => {
      try {
        const current = await chrome.action.getBadgeText({ tabId });
        if (current === text) {
          await chrome.action.setBadgeText({ tabId, text: '' });
        }
      } catch (e) {}
    }, 2500);
  } catch (err) {
    console.warn('[EchoRead] flashBadge ignored:', err);
  }
}
