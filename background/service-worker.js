/**
 * Background Service Worker for ChatGPT Image Prompt Enhancer
 */

// Configure side panel behavior on installation
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
      console.error('Error setting side panel behavior:', error);
    });
  }

  // Create Context Menu for Images
  chrome.contextMenus.create({
    id: 'enhance-image-prompt',
    title: '✨ 提取此图灵感并生成 ChatGPT 生图提示词',
    contexts: ['image']
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'enhance-image-prompt' && info.srcUrl) {
    // Open side panel in current window
    if (chrome.sidePanel && tab && tab.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      // Notify side panel about the selected image
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'LOAD_IMAGE_FROM_URL',
          imageUrl: info.srcUrl
        }).catch(() => {
          // In case side panel was just opened and listener is not ready, store in storage
          chrome.storage.local.set({ pendingImageUrl: info.srcUrl });
        });
      }, 500);
    }
  }
});

// General message listener for cross-context communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'FETCH_IMAGE_AS_BASE64') {
    // Helper to bypass CORS when downloading image from web for vision analysis
    fetch(request.url)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ success: true, base64: reader.result });
        };
        reader.readAsDataURL(blob);
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep message channel open for async response
  }
});
