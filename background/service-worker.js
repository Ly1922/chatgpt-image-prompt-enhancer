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

  // Create Context Menus for Images
  chrome.contextMenus.create({
    id: 'reverse-image-prompt',
    title: '🔍 识图反推生图提示词 (Reverse Prompt)',
    contexts: ['image']
  });

  chrome.contextMenus.create({
    id: 'add-reference-image',
    title: '🖼️ 导入为生图参考图 (Add Reference)',
    contexts: ['image']
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.srcUrl && (info.menuItemId === 'reverse-image-prompt' || info.menuItemId === 'add-reference-image' || info.menuItemId === 'enhance-image-prompt')) {
    const isDescribe = info.menuItemId === 'reverse-image-prompt' || info.menuItemId === 'enhance-image-prompt';
    // Open side panel in current window
    if (chrome.sidePanel && tab && tab.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      // Notify side panel about the selected image
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'LOAD_IMAGE_FROM_URL',
          imageUrl: info.srcUrl,
          autoDescribe: isDescribe
        }).catch(() => {
          // In case side panel was just opened and listener is not ready, store in storage
          chrome.storage.local.set({
            pendingImageUrl: info.srcUrl,
            pendingAutoDescribe: isDescribe
          });
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
