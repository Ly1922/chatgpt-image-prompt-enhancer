/**
 * Content script injected into https://chatgpt.com/*
 * ChatGPT Images 2.5 Prompt Enhancer & Creative Assistant
 */

(function () {
  'use strict';

  let currentModal = null;
  let attachedImages = []; // Array of base64 strings
  let activeMode = 'new';
  let activeStyle = 'photorealistic';
  let activeAvoidTags = [
    '无乱码文字或水印 (no text artifacts/watermarks)',
    '肢体结构正常手部精细 (anatomically correct hands and fingers)'
  ];
  let lastOptimizedPrompt = '';
  let lastResultData = null;

  // Initialize once DOM is ready
  function init() {
    observeDOM();
    injectTriggerButton();
    setupKeyboardShortcut();
    observeChatImages();
    setupGlobalPasteListener();
  }

  /**
   * Observe DOM changes in ChatGPT's dynamic SPA
   */
  function observeDOM() {
    const observer = new MutationObserver(() => {
      injectTriggerButton();
      observeChatImages();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Setup global capture-phase paste listener
   * Capture phase (true) ensures we intercept clipboard events before ChatGPT's SPA can hijack them.
   * Works anywhere in the window without needing to click or focus the modal first!
   */
  function setupGlobalPasteListener() {
    window.addEventListener('paste', handleGlobalClipboardPaste, true);
  }

  function handleGlobalClipboardPaste(e) {
    // Only capture when our modal is actively open
    if (!currentModal || !currentModal.classList.contains('active')) return;

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const imageFiles = [];

    // 1. Check clipboard items (e.g. screenshots from Snip / WeChat / QQ / PrintScreen)
    if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
    }

    // 2. Check clipboard files (for files copied directly from OS desktop or file manager)
    if (imageFiles.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type && file.type.startsWith('image/')) {
          imageFiles.push(file);
        }
      }
    }

    // If image files are detected, immediately consume and prevent ChatGPT from interfering
    if (imageFiles.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      handleImageFilesBatch(imageFiles);
    }
  }

  /**
   * Batch process image files for seamless consecutive pasting
   */
  function handleImageFilesBatch(files) {
    const fileList = Array.from(files).filter(f => f && f.type && f.type.startsWith('image/'));
    if (fileList.length === 0) return;

    const remaining = 6 - attachedImages.length;
    if (remaining <= 0) {
      showToast('⚠️ 参考图已达上限 (最多6张)，请删除不需要的图片后再粘贴');
      return;
    }

    const toProcess = fileList.slice(0, remaining);
    if (fileList.length > remaining) {
      showToast(`超出上限，本次仅添加前 ${remaining} 张参考图`);
    }

    let processedCount = 0;
    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        attachedImages.push(e.target.result);
        processedCount++;
        if (processedCount === toProcess.length) {
          if (currentModal && typeof currentModal.updateGalleryUI === 'function') {
            currentModal.updateGalleryUI();
          }
          // Switch to reference mode without stealing keyboard focus
          if (activeMode === 'new') {
            activeMode = 'reference';
            if (currentModal && typeof currentModal.updateModeDisplay === 'function') {
              currentModal.updateModeDisplay();
            }
          }
          showToast(`✅ 已连续载入参考图 (${attachedImages.length}/6)`);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Inject trigger button near ChatGPT prompt textarea
   */
  function injectTriggerButton() {
    if (document.getElementById('pm-trigger-btn')) return;

    const promptTextarea = document.getElementById('prompt-textarea');
    if (!promptTextarea) return;

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

    if (form.parentNode) {
      form.parentNode.insertBefore(btn, form);
    }
  }

  /**
   * Observe chat conversation and inject "🪄 基于此图微调" onto generated images
   */
  function observeChatImages() {
    const images = document.querySelectorAll('main img, [data-message-author-role="assistant"] img');
    images.forEach((img) => {
      if (img.closest('#pm-modal-backdrop') || img.closest('.pm-img-gallery') || img.closest('.pm-sketch-box')) return;
      if (img.width < 100 || img.height < 100) return;

      const parent = img.parentElement;
      if (!parent || parent.querySelector('.pm-inchat-btn-wrap')) return;

      const computedPos = window.getComputedStyle(parent).position;
      if (computedPos === 'static') {
        parent.style.position = 'relative';
      }

      const wrap = document.createElement('div');
      wrap.className = 'pm-inchat-btn-wrap';
      wrap.innerHTML = `
        <button class="pm-inchat-reprompt-btn" type="button" title="以此图为基准进行保持主体一致性的微调迭代">
          🪄 基于此图微调
        </button>
      `;

      wrap.querySelector('button').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleInChatRePrompt(img);
      });

      parent.appendChild(wrap);
    });
  }

  /**
   * Handle in-chat image iteration
   */
  async function handleInChatRePrompt(imgElement) {
    showToast('正在载入选中的生成图作为微调基准...');
    const src = imgElement.src;

    let base64 = '';
    if (src.startsWith('data:image')) {
      base64 = src;
    } else {
      try {
        const res = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'FETCH_IMAGE_AS_BASE64', url: src }, resolve);
        });
        if (res && res.success) {
          base64 = res.base64;
        }
      } catch (e) {
        console.warn('Direct fetch failed, falling back to canvas', e);
      }
    }

    if (!base64) {
      try {
        const c = document.createElement('canvas');
        c.width = imgElement.naturalWidth || imgElement.width || 512;
        c.height = imgElement.naturalHeight || imgElement.height || 512;
        const ctx = c.getContext('2d');
        ctx.drawImage(imgElement, 0, 0);
        base64 = c.toDataURL('image/png');
      } catch (err) {
        console.error('Failed to capture canvas image', err);
      }
    }

    openModal();

    if (base64) {
      attachedImages = [base64];
      if (currentModal && typeof currentModal.updateGalleryUI === 'function') {
        currentModal.updateGalleryUI();
      }
    }

    const editTab = currentModal.querySelector('[data-mode="edit"]');
    if (editTab) editTab.click();

    const input = currentModal.querySelector('#pm-user-rough-input');
    if (input) {
      input.value = '';
      input.placeholder = '请描述您想保持什么、修改什么（例如：保持人物面容与发型不变，将背景换成金色麦田）...';
      input.focus();
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

    const promptTextarea = document.getElementById('prompt-textarea');
    const modalInput = document.getElementById('pm-user-rough-input');
    if (promptTextarea && modalInput) {
      const existingText = promptTextarea.innerText || promptTextarea.value || '';
      if (existingText.trim() && !modalInput.value.trim()) {
        modalInput.value = existingText.trim();
      }
    }

    currentModal.classList.add('active');
    currentModal.setAttribute('tabindex', '-1');
    currentModal.focus();

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
            <span class="pm-status-beacon" id="pm-status-beacon" title="VPS API 状态在线"></span>
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
          <!-- Integrated Clean Input Card -->
          <div class="pm-input-card">
            <!-- Top Toolbar: Auto-Mode Badge & Hint -->
            <div class="pm-card-topbar">
              <div class="pm-mode-dropdown-wrap">
                <button type="button" class="pm-mode-chip" id="pm-mode-badge" title="点击切换生成模式 (默认AI自动识别)">
                  <span id="pm-mode-label">✨ 全新构思</span>
                  <span class="pm-chevron">▾</span>
                </button>
                <div class="pm-mode-menu" id="pm-mode-menu" style="display:none;">
                  <div class="pm-mode-opt active" data-mode="new">🌟 从头全新构思 (自动)</div>
                  <div class="pm-mode-opt" data-mode="reference">🖼️ 垫图参考风格</div>
                  <div class="pm-mode-opt" data-mode="edit">🔄 保持稳定局部微调</div>
                </div>
              </div>
              <span class="pm-top-tip">直接按 Ctrl+V 随时贴图</span>
            </div>

            <!-- Textarea -->
            <textarea
              id="pm-user-rough-input"
              class="pm-textarea"
              rows="2"
              placeholder="输入简略想法，或按 Ctrl+V 连续粘贴截图..."
            ></textarea>

            <!-- Reference Images Miniature Strip (Shown when images exist) -->
            <div class="pm-thumb-strip" id="pm-img-gallery" style="display:none;">
              <div class="pm-thumb-list" id="pm-gallery-list">
                <button type="button" class="pm-thumb-add" id="pm-gallery-add-btn" title="继续粘贴或选图">+</button>
              </div>
              <button type="button" class="pm-strip-clear" id="pm-gallery-clear" title="清空全部参考图">✕ 清空</button>
            </div>

            <!-- Bottom Action Bar inside Input Card -->
            <div class="pm-card-footer">
              <div class="pm-footer-btns">
                <button type="button" class="pm-tool-btn" id="pm-btn-paste-clipboard" title="直接读取剪贴板图片">
                  📋 粘贴截图
                </button>
                <button type="button" class="pm-tool-btn" id="pm-btn-browse-file" title="选择本地图片文件">
                  📁 选图
                </button>
                <input type="file" id="pm-file-input" accept="image/*" multiple style="display:none;" />
              </div>
              <span class="pm-img-count" id="pm-gallery-title" style="display:none;">(0/6)</span>
            </div>
          </div>

          <!-- Compact Parameter Capsule Strip (One Single Line!) -->
          <div class="pm-capsule-strip">
            <button type="button" class="pm-capsule-btn active" id="pm-chip-ratio" title="点击更改画幅">
              <span id="pm-chip-ratio-text">📐 16:9 宽幅</span>
              <span class="pm-chevron">▾</span>
            </button>

            <button type="button" class="pm-capsule-btn active" id="pm-chip-style" title="点击更改镜头风格">
              <span id="pm-chip-style-text">🎨 电影级写实</span>
              <span class="pm-chevron">▾</span>
            </button>

            <button type="button" class="pm-capsule-btn active" id="pm-chip-avoid" title="点击配置避坑标签">
              <span id="pm-chip-avoid-text">🚫 避坑 (2)</span>
              <span class="pm-chevron">▾</span>
            </button>
          </div>

          <!-- Popover 1: Aspect Ratio -->
          <div class="pm-popover" id="pm-popover-ratio" style="display:none;">
            <div class="pm-popover-title">
              <span>📐 画幅与景别比例</span>
              <span class="pm-popover-close">✕</span>
            </div>
            <div class="pm-popover-pills" id="pm-ratio-group">
              <button type="button" class="pm-ratio-pill" data-ratio="1:1">1:1 方形头像</button>
              <button type="button" class="pm-ratio-pill active" data-ratio="16:9">16:9 横版宽幅</button>
              <button type="button" class="pm-ratio-pill" data-ratio="9:16">9:16 竖版壁纸</button>
              <button type="button" class="pm-ratio-pill" data-ratio="4:3">4:3 经典摄影</button>
              <button type="button" class="pm-ratio-pill" data-ratio="21:9">21:9 宽银幕电影</button>
            </div>
          </div>

          <!-- Popover 2: Style Preset -->
          <div class="pm-popover" id="pm-popover-style" style="display:none;">
            <div class="pm-popover-title">
              <span>🎨 艺术与镜头风格</span>
              <span class="pm-popover-close">✕</span>
            </div>
            <div class="pm-popover-pills" id="pm-style-pills">
              <button type="button" class="pm-pill active" data-style="photorealistic">📸 电影级写实</button>
              <button type="button" class="pm-pill" data-style="3d-render">🧸 3D 盲盒渲染</button>
              <button type="button" class="pm-pill" data-style="anime">🌸 日系唯美动漫</button>
              <button type="button" class="pm-pill" data-style="cyberpunk">⚡ 赛博朋克未来</button>
              <button type="button" class="pm-pill" data-style="minimalist">🌿 现代极简艺术</button>
              <button type="button" class="pm-pill" data-style="oil-painting">🎨 古典厚涂油画</button>
              <button type="button" class="pm-pill" data-style="commercial">💎 商业广告大片</button>
            </div>
          </div>

          <!-- Popover 3: Avoid Constraints -->
          <div class="pm-popover" id="pm-popover-avoid" style="display:none;">
            <div class="pm-popover-title">
              <span>🚫 严禁与避坑约束 (多选)</span>
              <span class="pm-popover-close">✕</span>
            </div>
            <div class="pm-popover-pills" id="pm-avoid-group">
              <button type="button" class="pm-avoid-pill active" data-avoid="无乱码文字或水印 (no text artifacts/watermarks)">🔤 无乱码文字水印</button>
              <button type="button" class="pm-avoid-pill active" data-avoid="肢体结构正常手部精细 (anatomically correct hands and fingers)">✋ 规避手指畸形</button>
              <button type="button" class="pm-avoid-pill" data-avoid="背景纯净无杂乱干扰 (clean uncluttered background)">🧹 纯净不杂乱</button>
              <button type="button" class="pm-avoid-pill" data-avoid="避免廉价塑料CG质感 (avoid cheap plastic 3d gloss)">✨ 拒绝塑料CG假感</button>
              <button type="button" class="pm-avoid-pill" data-avoid="画面清晰拒绝低分辨率模糊 (no blurry or pixelated details)">🔍 拒绝低清模糊</button>
            </div>
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
              <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" class="pm-star-btn" id="pm-star-btn" title="收藏此提示词">
                  <span class="pm-star-icon">★</span>
                  <span class="pm-star-text">收藏</span>
                </button>
                <span id="pm-result-tag" style="font-size: 11px; opacity: 0.8;"></span>
              </div>
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

    modal.querySelector('#pm-close-btn').addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });

    modal.querySelector('#pm-settings-btn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
    });

    // Mode Badge & Dropdown
    const modeBadge = modal.querySelector('#pm-mode-badge');
    const modeLabel = modal.querySelector('#pm-mode-label');
    const modeMenu = modal.querySelector('#pm-mode-menu');
    const modeOpts = modal.querySelectorAll('.pm-mode-opt');

    // Capsule Chips & Popovers
    const chipRatio = modal.querySelector('#pm-chip-ratio');
    const chipRatioText = modal.querySelector('#pm-chip-ratio-text');
    const popoverRatio = modal.querySelector('#pm-popover-ratio');
    const ratioPills = modal.querySelectorAll('#pm-ratio-group .pm-ratio-pill');

    const chipStyle = modal.querySelector('#pm-chip-style');
    const chipStyleText = modal.querySelector('#pm-chip-style-text');
    const popoverStyle = modal.querySelector('#pm-popover-style');
    const stylePills = modal.querySelectorAll('#pm-style-pills .pm-pill');

    const chipAvoid = modal.querySelector('#pm-chip-avoid');
    const chipAvoidText = modal.querySelector('#pm-chip-avoid-text');
    const popoverAvoid = modal.querySelector('#pm-popover-avoid');
    const avoidPills = modal.querySelectorAll('#pm-avoid-group .pm-avoid-pill');

    function closeAllPopovers() {
      if (popoverRatio) popoverRatio.style.display = 'none';
      if (popoverStyle) popoverStyle.style.display = 'none';
      if (popoverAvoid) popoverAvoid.style.display = 'none';
      if (modeMenu) modeMenu.style.display = 'none';
    }

    function togglePopover(target) {
      const isVisible = target.style.display === 'block';
      closeAllPopovers();
      if (!isVisible) {
        target.style.display = 'block';
      }
    }

    chipRatio?.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePopover(popoverRatio);
    });

    chipStyle?.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePopover(popoverStyle);
    });

    chipAvoid?.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePopover(popoverAvoid);
    });

    modeBadge?.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePopover(modeMenu);
    });

    modal.querySelectorAll('.pm-popover-close').forEach((closeBtn) => {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllPopovers();
      });
    });

    modal.querySelector('.pm-modal')?.addEventListener('click', (e) => {
      if (
        !e.target.closest('.pm-popover') &&
        !e.target.closest('.pm-capsule-btn') &&
        !e.target.closest('.pm-mode-dropdown-wrap')
      ) {
        closeAllPopovers();
      }
    });

    modeOpts.forEach((opt) => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        modeOpts.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        activeMode = opt.dataset.mode;
        updateModeDisplay();
        closeAllPopovers();
      });
    });

    function updateModeDisplay() {
      if (activeMode === 'new') {
        if (attachedImages.length > 0) {
          modeLabel.textContent = `🖼️ 垫图参考 (${attachedImages.length}张)`;
        } else {
          modeLabel.textContent = '✨ 全新构思';
        }
      } else if (activeMode === 'reference') {
        modeLabel.textContent = `🖼️ 垫图参考 (${attachedImages.length}张)`;
      } else if (activeMode === 'edit') {
        modeLabel.textContent = '🔄 保持稳定微调';
      }
    }

    function updateChipTexts() {
      const ratioMap = {
        '1:1': '📐 1:1 方形',
        '16:9': '📐 16:9 宽幅',
        '9:16': '📐 9:16 壁纸',
        '4:3': '📐 4:3 经典',
        '21:9': '📐 21:9 宽影'
      };
      if (chipRatioText) chipRatioText.textContent = ratioMap[activeAspectRatio] || `📐 ${activeAspectRatio}`;

      const activeStyleEl = modal.querySelector('#pm-style-pills .pm-pill.active');
      if (chipStyleText) chipStyleText.textContent = activeStyleEl ? activeStyleEl.textContent.trim() : '🎨 风格';

      if (chipAvoidText) chipAvoidText.textContent = activeAvoidTags.length > 0 ? `🚫 避坑 (${activeAvoidTags.length})` : '🚫 避坑 (无)';
    }

    ratioPills.forEach((pill) => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        ratioPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        activeAspectRatio = pill.dataset.ratio;
        updateChipTexts();
        closeAllPopovers();
      });
    });

    stylePills.forEach((pill) => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        stylePills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        activeStyle = pill.dataset.style;
        updateChipTexts();
        closeAllPopovers();
      });
    });

    avoidPills.forEach((pill) => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        pill.classList.toggle('active');
        const tag = pill.dataset.avoid;
        if (pill.classList.contains('active')) {
          if (!activeAvoidTags.includes(tag)) activeAvoidTags.push(tag);
        } else {
          activeAvoidTags = activeAvoidTags.filter(t => t !== tag);
        }
        updateChipTexts();
      });
    });

    // Inputs and File Handling
    const fileInput = modal.querySelector('#pm-file-input');
    const galleryWrap = modal.querySelector('#pm-img-gallery');
    const galleryList = modal.querySelector('#pm-gallery-list');
    const galleryTitle = modal.querySelector('#pm-gallery-title');
    const galleryClearBtn = modal.querySelector('#pm-gallery-clear');
    const galleryAddBtn = modal.querySelector('#pm-gallery-add-btn');

    const btnPasteClipboard = modal.querySelector('#pm-btn-paste-clipboard');
    const btnBrowseFile = modal.querySelector('#pm-btn-browse-file');

    async function pasteFromClipboardDirectly() {
      if (attachedImages.length >= 6) {
        showToast('⚠️ 参考图已达上限 (最多6张)');
        return;
      }
      try {
        if (!navigator.clipboard || !navigator.clipboard.read) {
          showToast('请直接按下键盘 Ctrl+V 连续粘贴截图');
          return;
        }
        const clipboardItems = await navigator.clipboard.read();
        const imageFiles = [];
        for (const item of clipboardItems) {
          const imgType = item.types.find(t => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            imageFiles.push(blob);
          }
        }
        if (imageFiles.length > 0) {
          handleImageFilesBatch(imageFiles);
        } else {
          showToast('⚠️ 剪贴板未检测到截图，请先截图 (Win+Shift+S / 复制图片) 再点击');
        }
      } catch (err) {
        console.warn('Direct clipboard read error:', err);
        showToast('请直接按下键盘 Ctrl+V 粘贴截图');
      }
    }

    btnPasteClipboard?.addEventListener('click', (e) => {
      e.stopPropagation();
      pasteFromClipboardDirectly();
    });

    btnBrowseFile?.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    galleryAddBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (navigator.clipboard && navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          const hasImg = items.some(it => it.types.some(t => t.startsWith('image/')));
          if (hasImg) {
            await pasteFromClipboardDirectly();
            return;
          }
        } catch (_) {}
      }
      fileInput.click();
    });

    modal.addEventListener('mouseenter', () => {
      modal.focus();
    });

    fileInput.addEventListener('change', (e) => {
      handleImageFilesBatch(e.target.files);
      fileInput.value = '';
    });

    galleryClearBtn?.addEventListener('click', () => {
      attachedImages = [];
      updateGalleryUI();
      showToast('已清空所有参考图');
    });

    function updateGalleryUI() {
      if (attachedImages.length === 0) {
        galleryWrap.style.display = 'none';
        galleryTitle.style.display = 'none';
        updateModeDisplay();
        return;
      }

      galleryWrap.style.display = 'flex';
      galleryTitle.style.display = 'inline';
      galleryTitle.textContent = `(${attachedImages.length}/6)`;

      const existingItems = galleryList.querySelectorAll('.pm-thumb-item');
      existingItems.forEach(el => el.remove());

      attachedImages.forEach((dataUrl, idx) => {
        const item = document.createElement('div');
        item.className = 'pm-thumb-item';
        item.innerHTML = `
          <img src="${dataUrl}" alt="参考图 ${idx + 1}" />
          <button type="button" class="pm-thumb-del" data-idx="${idx}" title="删除此图">✕</button>
        `;
        item.querySelector('.pm-thumb-del').addEventListener('click', (e) => {
          e.stopPropagation();
          attachedImages.splice(idx, 1);
          updateGalleryUI();
        });
        galleryList.insertBefore(item, galleryAddBtn);
      });

      updateModeDisplay();
    }

    modal.updateGalleryUI = updateGalleryUI;
    modal.updateModeDisplay = updateModeDisplay;
    modal.updateChipTexts = updateChipTexts;

    updateChipTexts();
    updateModeDisplay();
    updateGalleryUI();

    // Generate Button
    const genBtn = modal.querySelector('#pm-generate-btn');
    const genBtnText = modal.querySelector('#pm-gen-btn-text');
    const resultContainer = modal.querySelector('#pm-result-container');
    const resultText = modal.querySelector('#pm-result-text');
    const resultMeta = modal.querySelector('#pm-result-meta');
    const resultTag = modal.querySelector('#pm-result-tag');
    const starBtn = modal.querySelector('#pm-star-btn');

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
          style: activeStyle,
          aspectRatio: activeAspectRatio,
          avoidTags: activeAvoidTags
        });

        lastResultData = result;
        lastOptimizedPrompt = result.optimizedPrompt || '';
        resultText.textContent = lastOptimizedPrompt;
        resultTag.textContent = result.styleTag || '';

        starBtn.classList.remove('starred');
        starBtn.querySelector('.pm-star-text').textContent = '收藏';

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

    // Star Favorite Button
    starBtn.addEventListener('click', async () => {
      if (!lastOptimizedPrompt) return;
      try {
        const isAdded = await StorageHelper.toggleFavorite({
          optimizedPrompt: lastOptimizedPrompt,
          chineseSummary: lastResultData?.chineseSummary || '',
          styleTag: lastResultData?.styleTag || activeStyle,
          mode: activeMode,
          aspectRatio: activeAspectRatio
        });
        if (isAdded) {
          starBtn.classList.add('starred');
          starBtn.querySelector('.pm-star-text').textContent = '已收藏';
          showToast('★ 已成功添加到收藏夹！');
        } else {
          starBtn.classList.remove('starred');
          starBtn.querySelector('.pm-star-text').textContent = '收藏';
          showToast('已取消收藏');
        }
      } catch (e) {
        showToast('收藏操作异常: ' + e.message);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
