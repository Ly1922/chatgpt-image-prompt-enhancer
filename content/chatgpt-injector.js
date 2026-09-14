/**
 * Content script injected into https://chatgpt.com/*
 * Automatically injects the "✨ 润色生图提示词" magic button and modal.
 */

(function () {
  'use strict';

  let currentModal = null;
  let attachedImages = []; // Array of base64 strings
  let activeMode = 'new';
  let activeStyle = 'photorealistic';
  let lastOptimizedPrompt = '';

  // Initialize once DOM is ready
  function init() {
    observeDOM();
    injectTriggerButton();
    setupKeyboardShortcut();
  }

  /**
   * Observe DOM changes in ChatGPT's dynamic SPA
   */
  function observeDOM() {
    const observer = new MutationObserver(() => {
      injectTriggerButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Inject trigger button near ChatGPT prompt textarea
   */
  function injectTriggerButton() {
    if (document.getElementById('pm-trigger-btn')) return;

    // Search for ChatGPT prompt textarea or its container
    const promptTextarea = document.getElementById('prompt-textarea');
    if (!promptTextarea) return;

    // Find the enclosing form or action bar container
    const form = promptTextarea.closest('form') || promptTextarea.parentElement;
    if (!form) return;

    const btn = document.createElement('button');
    btn.id = 'pm-trigger-btn';
    btn.className = 'pm-trigger-btn';
    btn.type = 'button';
    btn.title = '打开 ChatGPT Images 2.5 提示词优化 (快捷键 Alt + P)';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M7.5 5.6L10 0l2.5 5.6L18 7.5 12.5 10l-2.5 5.6L7.5 10 2 7.5l5.5-1.9zm12 9.4l1.5-3.4 1.5 3.4 3.4 1.5-3.4 1.5-1.5 3.4-1.5-3.4-3.4-1.5 3.4-1.5zm-5 4l1-2.2 1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z"/>
      </svg>
      <span>✨ 润色生图</span>
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });

    // Insert just before the form or atop the input bar
    if (form.parentNode) {
      form.parentNode.insertBefore(btn, form);
    }
  }

  /**
   * Setup Alt + P shortcut
   */
  function setupKeyboardShortcut() {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        toggleModal();
      }
    });
  }

  function toggleModal() {
    if (currentModal && currentModal.classList.contains('active')) {
      closeModal();
    } else {
      openModal();
    }
  }

  /**
   * Create and open Prompt Enhancer modal
   */
  function openModal() {
    if (!currentModal) {
      createModal();
    }

    // Auto-grab existing text in ChatGPT's prompt textarea if user typed something
    const promptTextarea = document.getElementById('prompt-textarea');
    const modalInput = document.getElementById('pm-user-rough-input');
    if (promptTextarea && modalInput) {
      const existingText = promptTextarea.innerText || promptTextarea.value || '';
      if (existingText.trim() && !modalInput.value.trim()) {
        modalInput.value = existingText.trim();
      }
    }

    currentModal.classList.add('active');
    setTimeout(() => {
      const input = document.getElementById('pm-user-rough-input');
      if (input) input.focus();
    }, 100);
  }

  function closeModal() {
    if (currentModal) {
      currentModal.classList.remove('active');
    }
  }

  /**
   * Build the in-page Assistant Modal
   */
  function createModal() {
    const backdrop = document.createElement('div');
    backdrop.id = 'pm-modal-backdrop';
    backdrop.className = 'pm-modal-backdrop';

    backdrop.innerHTML = `
      <div class="pm-modal">
        <!-- Header -->
        <div class="pm-header">
          <div class="pm-header-title">
            <span>🎨 ChatGPT Images 2.5 提示词工坊</span>
            <span class="pm-badge">官方规范</span>
          </div>
          <div class="pm-header-actions">
            <button class="pm-icon-btn" id="pm-settings-btn" title="插件配置与 API 设置">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </button>
            <button class="pm-icon-btn" id="pm-close-btn" title="关闭 (Esc)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="pm-body">
          <!-- Generation Modes -->
          <div class="pm-mode-tabs">
            <div class="pm-mode-tab active" data-mode="new">🌟 从头全新构思</div>
            <div class="pm-mode-tab" data-mode="reference">🖼️ 垫图参考风格</div>
            <div class="pm-mode-tab" data-mode="edit">🔄 保持稳定局部修改</div>
          </div>

          <!-- Image Dropzone / Multi-Image Gallery -->
          <div class="pm-dropzone" id="pm-dropzone">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>拖入多张参考图或点击上传 (支持同时多选、截图多次粘贴 Ctrl+V)</span>
            <input type="file" id="pm-file-input" accept="image/*" multiple style="display:none;" />
          </div>

          <div class="pm-img-gallery" id="pm-img-gallery">
            <div class="pm-gallery-header">
              <span id="pm-gallery-title">已添加参考图 (0/5)</span>
              <button type="button" class="pm-gallery-clear" id="pm-gallery-clear">清空全部</button>
            </div>
            <div class="pm-gallery-list" id="pm-gallery-list">
              <!-- Dynamically populated -->
              <div class="pm-gallery-add" id="pm-gallery-add-btn" title="继续添加参考图">
                <span style="font-size: 18px; line-height: 1;">+</span>
                <span>加图</span>
              </div>
            </div>
          </div>

          <!-- Rough Idea Input -->
          <div class="pm-textarea-wrap">
            <textarea
              id="pm-user-rough-input"
              class="pm-textarea"
              placeholder="输入您的简略想法，例如：一个赛博朋克风格的猫咪在雨夜面馆吃面，电影光影..."
            ></textarea>
          </div>

          <!-- Style Preset Pills -->
          <div class="pm-pills-wrap" id="pm-pills-wrap">
            <span class="pm-pill active" data-style="photorealistic">电影级写实摄影</span>
            <span class="pm-pill" data-style="3d-render">3D 盲盒渲染</span>
            <span class="pm-pill" data-style="anime">日系唯美动漫</span>
            <span class="pm-pill" data-style="cyberpunk">赛博朋克未来风</span>
            <span class="pm-pill" data-style="minimalist">现代极简艺术</span>
            <span class="pm-pill" data-style="oil-painting">古典厚涂油画</span>
            <span class="pm-pill" data-style="commercial">商业产品广告</span>
          </div>

          <!-- Generate Action -->
          <button class="pm-generate-btn" id="pm-generate-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.5 5.6L10 0l2.5 5.6L18 7.5 12.5 10l-2.5 5.6L7.5 10 2 7.5l5.5-1.9zm12 9.4l1.5-3.4 1.5 3.4 3.4 1.5-3.4 1.5-1.5 3.4-1.5-3.4-3.4-1.5 3.4-1.5z"/>
            </svg>
            <span id="pm-gen-btn-text">生成 Images 2.5 结构化提示词</span>
          </button>

          <!-- Result Output Area -->
          <div class="pm-result-container" id="pm-result-container">
            <div class="pm-result-header">
              <span id="pm-result-title">✨ 生成的生产级提示词 (Brief)</span>
              <span id="pm-result-tag" style="font-size: 11px; opacity: 0.8;"></span>
            </div>
            <div class="pm-result-text" id="pm-result-text"></div>
            <div class="pm-result-meta" id="pm-result-meta"></div>
            <div class="pm-result-actions">
              <button class="pm-fill-chatgpt-btn" id="pm-fill-chatgpt-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
                一键填入 ChatGPT 输入框
              </button>
              <button class="pm-copy-btn" id="pm-copy-btn">📋 复制</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    currentModal = backdrop;

    bindModalEvents(backdrop);
  }

  /**
   * Bind all event listeners within the modal
   */
  function bindModalEvents(modal) {
    // Backdrop click to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Close button & ESC key
    modal.querySelector('#pm-close-btn').addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });

    // Open options page
    modal.querySelector('#pm-settings-btn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
    });

    // Mode tabs
    const modeTabs = modal.querySelectorAll('.pm-mode-tab');
    modeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        modeTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        activeMode = tab.dataset.mode;
      });
    });

    // Style pills
    const pills = modal.querySelectorAll('.pm-pill');
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        activeStyle = pill.dataset.style;
      });
    });

    // Image Upload & Multi-Image Gallery
    const dropzone = modal.querySelector('#pm-dropzone');
    const fileInput = modal.querySelector('#pm-file-input');
    const galleryWrap = modal.querySelector('#pm-img-gallery');
    const galleryList = modal.querySelector('#pm-gallery-list');
    const galleryTitle = modal.querySelector('#pm-gallery-title');
    const galleryClearBtn = modal.querySelector('#pm-gallery-clear');
    const galleryAddBtn = modal.querySelector('#pm-gallery-add-btn');

    dropzone.addEventListener('click', () => fileInput.click());
    galleryAddBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach(f => handleImageFile(f));
      fileInput.value = '';
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files) {
        Array.from(e.dataTransfer.files).forEach(f => handleImageFile(f));
      }
    });

    // Paste image from clipboard anywhere inside modal
    modal.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) handleImageFile(file);
        }
      }
    });

    galleryClearBtn.addEventListener('click', () => {
      attachedImages = [];
      updateGalleryUI();
    });

    function handleImageFile(file) {
      if (attachedImages.length >= 6) {
        showToast('最多支持添加 6 张参考图');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        attachedImages.push(e.target.result);
        updateGalleryUI();
        // Auto-switch mode to reference if currently new
        if (activeMode === 'new') {
          const refTab = modal.querySelector('[data-mode="reference"]');
          if (refTab) refTab.click();
        }
      };
      reader.readAsDataURL(file);
    }

    function updateGalleryUI() {
      if (attachedImages.length === 0) {
        galleryWrap.style.display = 'none';
        dropzone.style.display = 'flex';
        return;
      }

      dropzone.style.display = 'none';
      galleryWrap.style.display = 'flex';
      galleryTitle.textContent = `已添加参考图 (${attachedImages.length}/6)`;

      // Clear existing thumbnail items except the + add button
      const items = galleryList.querySelectorAll('.pm-gallery-item');
      items.forEach(it => it.remove());

      attachedImages.forEach((imgBase64, idx) => {
        const item = document.createElement('div');
        item.className = 'pm-gallery-item';
        item.innerHTML = `
          <img src="${imgBase64}" alt="参考图 ${idx + 1}" />
          <span class="pm-gallery-badge">图 ${idx + 1}</span>
          <button type="button" class="pm-gallery-del" title="删除此图">✕</button>
        `;
        item.querySelector('.pm-gallery-del').addEventListener('click', (e) => {
          e.stopPropagation();
          attachedImages.splice(idx, 1);
          updateGalleryUI();
        });
        galleryList.insertBefore(item, galleryAddBtn);
      });
    }

    // Generate Button
    const genBtn = modal.querySelector('#pm-generate-btn');
    const genBtnText = modal.querySelector('#pm-gen-btn-text');
    const resultContainer = modal.querySelector('#pm-result-container');
    const resultText = modal.querySelector('#pm-result-text');
    const resultMeta = modal.querySelector('#pm-result-meta');
    const resultTag = modal.querySelector('#pm-result-tag');

    genBtn.addEventListener('click', async () => {
      const roughInput = modal.querySelector('#pm-user-rough-input').value.trim();
      if (!roughInput && attachedImages.length === 0) {
        showToast('请输入粗略想法或上传参考图');
        return;
      }

      genBtn.disabled = true;
      genBtnText.textContent = attachedImages.length > 1
        ? `✨ AI 正在多图深度融合与构思中 (${attachedImages.length}张参考图)...`
        : '✨ AI 正在根据 Images 2.5 官方规范构思中...';

      try {
        const result = await ApiClient.optimizePrompt({
          roughPrompt: roughInput,
          images: attachedImages,
          mode: activeMode,
          style: activeStyle
        });

        lastOptimizedPrompt = result.optimizedPrompt || '';
        resultText.textContent = lastOptimizedPrompt;
        resultTag.textContent = result.styleTag || '';

        let metaHtml = `<strong>中文解析：</strong>${result.chineseSummary || '无'}`;
        if (result.breakdown) {
          metaHtml += `<br/><span style="opacity: 0.8; font-size: 11.5px;">` +
            `🎯 主体: ${result.breakdown.subject || '-'} | 🏞️ 场景: ${result.breakdown.setting || '-'} | 💡 光影: ${result.breakdown.lighting || '-'}` +
            `</span>`;
        }
        if (result.tip) {
          metaHtml += `<br/><span style="color: #ff9800; font-size: 11.5px;">${result.tip}</span>`;
        }
        resultMeta.innerHTML = metaHtml;
        resultContainer.style.display = 'flex';
      } catch (err) {
        showToast('生成失败: ' + err.message);
      } finally {
        genBtn.disabled = false;
        genBtnText.textContent = '重新生成提示词';
      }
    });

    // Copy Button
    modal.querySelector('#pm-copy-btn').addEventListener('click', () => {
      if (!lastOptimizedPrompt) return;
      navigator.clipboard.writeText(lastOptimizedPrompt).then(() => {
        showToast('已复制提示词到剪贴板！');
      });
    });

    // Fill into ChatGPT Button
    modal.querySelector('#pm-fill-chatgpt-btn').addEventListener('click', () => {
      if (!lastOptimizedPrompt) return;
      fillPromptIntoChatGPT(lastOptimizedPrompt);
      closeModal();
      showToast('已成功填入 ChatGPT 输入框！');
    });
  }

  /**
   * Seamlessly fill text into ChatGPT's contenteditable/textarea prompt input
   */
  function fillPromptIntoChatGPT(text) {
    const el = document.getElementById('prompt-textarea');
    if (!el) {
      navigator.clipboard.writeText(text);
      showToast('未找到输入框，已为您复制到剪贴板！');
      return;
    }

    el.focus();

    if (el.tagName.toLowerCase() === 'textarea') {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // For contenteditable div
      // Use document.execCommand to preserve undo stack and trigger React listeners
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      const success = document.execCommand('insertText', false, text);
      if (!success) {
        el.innerText = text;
      }
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * Toast notification
   */
  function showToast(msg) {
    let toast = document.getElementById('pm-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pm-toast';
      toast.className = 'pm-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // Kickstart
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
