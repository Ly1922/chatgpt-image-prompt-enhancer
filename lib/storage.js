/**
 * Storage management helper for ChatGPT Image Prompt Enhancer
 */
const StorageHelper = {
  DEFAULT_SETTINGS: {
    provider: 'cpamc', // 'cpamc' | 'gemini' | 'openai' | 'custom'
    apiKey: '',
    customEndpoint: 'https://api.openai.com/v1',
    customModel: 'gpt-4o-mini',
    cpamcEndpoint: 'http://localhost:8317/v1',
    cpamcModel: 'claude-3-7-sonnet',
    geminiModel: 'gemini-2.0-flash',
    openaiModel: 'gpt-4o-mini',
    promptLanguage: 'english', // 'english' (recommended for ChatGPT Images 2.5) | 'bilingual' | 'chinese'
    defaultMode: 'new', // 'new' | 'reference' | 'edit'
    defaultStyle: 'photorealistic', // 'photorealistic' | '3d-render' | 'anime' | 'cinematic' | 'cyberpunk' | 'minimalist'
    defaultAspectRatio: '16:9', // '1:1' | '16:9' | '9:16' | '4:3' | '21:9'
    historyLimit: 30
  },

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(this.DEFAULT_SETTINGS, (items) => {
        // Also retrieve API key from local storage for higher capacity / security if needed
        chrome.storage.local.get({ apiKey: items.apiKey || '' }, (localItems) => {
          resolve({
            ...items,
            apiKey: localItems.apiKey || items.apiKey || ''
          });
        });
      });
    });
  },

  async saveSettings(settings) {
    return new Promise((resolve) => {
      // Split apiKey to local storage to avoid sync quota
      const { apiKey, ...syncSettings } = settings;
      chrome.storage.local.set({ apiKey: apiKey || '' }, () => {
        chrome.storage.sync.set(syncSettings, () => {
          resolve(true);
        });
      });
    });
  },

  async getHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ promptHistory: [] }, (res) => {
        resolve(res.promptHistory || []);
      });
    });
  },

  async addHistory(item) {
    const history = await this.getHistory();
    const newEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      ...item
    };
    history.unshift(newEntry);
    if (history.length > 50) history.pop();
    return new Promise((resolve) => {
      chrome.storage.local.set({ promptHistory: history }, () => {
        resolve(newEntry);
      });
    });
  },

  async clearHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ promptHistory: [] }, () => {
        resolve(true);
      });
    });
  },

  // Favorites System
  async getFavorites() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ promptFavorites: [] }, (res) => {
        resolve(res.promptFavorites || []);
      });
    });
  },

  async toggleFavorite(item) {
    const favorites = await this.getFavorites();
    const existingIndex = favorites.findIndex(f => f.optimizedPrompt === item.optimizedPrompt);
    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1);
      await new Promise(r => chrome.storage.local.set({ promptFavorites: favorites }, r));
      return false; // Removed
    } else {
      favorites.unshift({
        id: 'fav_' + Date.now().toString(36),
        createdAt: new Date().toISOString(),
        ...item
      });
      await new Promise(r => chrome.storage.local.set({ promptFavorites: favorites }, r));
      return true; // Added
    }
  },

  async isFavorite(promptText) {
    const favorites = await this.getFavorites();
    return favorites.some(f => f.optimizedPrompt === promptText);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageHelper;
}
