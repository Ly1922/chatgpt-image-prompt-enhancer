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
  let activeAspectRatio = '16:9';
  let activeAvoidTags = [];
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
            if (currentModal) {
              const tabs = currentModal.querySelectorAll('.pm-mode-tab');
              tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === 'reference'));
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
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
              <span style="font-weight:600;">参考图上传与融合 (最多 6 张)</span>
              <div style="display:flex; gap:8px;">
                <button type="button" class="pm-btn-sm pm-btn-sm-primary" id="pm-btn-paste-clipboard" title="直接从剪贴板读取截图并上传">📋 点击粘贴截图</button>
                <button type="button" class="pm-btn-sm" id="pm-btn-browse-file" title="打开电脑文件选择">📁 选择本地图片</button>
              </div>
              <span style="font-size:11px; opacity:0.65;">或直接按 <strong>Ctrl+V</strong> 随时连续粘贴截图</span>
            </div>
            <input type="file" id="pm-file-input" accept="image/*" multiple style="display:none;" />
          </div>

          <div class="pm-img-gallery" id="pm-img-gallery">
            <div class="pm-gallery-header">
              <span id="pm-gallery-title">已添加参考图 (0/6)</span>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" class="pm-btn-sm pm-btn-sm-primary" id="pm-gallery-paste-btn" title="点击继续粘贴剪贴板截图">📋 粘贴截图</button>
                <button type="button" class="pm-btn-sm" id="pm-gallery-browse-btn" title="选择本地文件">📁 选图</button>
                <button type="button" class="pm-btn-sm" id="pm-open-sketch-btn" title="随手涂鸦空间布局">✏️ 涂鸦草图</button>
                <button type="button" class="pm-gallery-clear" id="pm-gallery-clear">清空全部</button>
              </div>
            </div>
            <div class="pm-gallery-list" id="pm-gallery-list">
              <div class="pm-gallery-add" id="pm-gallery-add-btn" title="点击粘贴截图或选择图片 (支持直接按 Ctrl+V)">
                <span style="font-size: 18px; line-height: 1;">+</span>
                <span>粘贴/加图</span>
              </div>
            </div>
          </div>

          <!-- 2D Sketch Board Drawer -->
          <div class="pm-sketch-box" id="pm-sketch-box">
            <div class="pm-sketch-header">
              <span>✏️ 快速构图涂鸦板 (帮助 Images 2.5 定位空间布局)</span>
              <button type="button" class="pm-btn-sm" id="pm-close-sketch-btn">✕ 关闭</button>
            </div>
            <div class="pm-sketch-canvas-wrap">
              <canvas id="pm-sketch-canvas" class="pm-sketch-canvas" width="460" height="230"></canvas>
            </div>
            <div class="pm-sketch-tools">
              <div class="pm-sketch-colors">
                <span style="font-size: 11px; opacity: 0.7;">画笔:</span>
                <div class="pm-color-dot active" data-color="#1a1a1a" style="background:#1a1a1a;"></div>
                <div class="pm-color-dot" data-color="#64748b" style="background:#64748b;"></div>
                <div class="pm-color-dot" data-color="#2563eb" style="background:#2563eb;"></div>
                <div class="pm-color-dot" data-color="#ef4444" style="background:#ef4444;"></div>
                <div class="pm-color-dot" data-color="#10a37f" style="background:#10a37f;"></div>
                <div class="pm-color-dot" data-color="#ffffff" style="background:#ffffff; border:1px solid #ccc;" title="橡皮擦"></div>
              </div>
              <div class="pm-sketch-actions">
                <button type="button" class="pm-btn-sm" id="pm-sketch-clear">清空画布</button>
                <button type="button" class="pm-btn-sm pm-btn-sm-primary" id="pm-sketch-confirm">✓ 导入为参考图</button>
              </div>
            </div>
          </div>

          <!-- Rough Idea Input -->
          <div class="pm-textarea-wrap">
            <textarea
              id="pm-user-rough-input"
              class="pm-textarea"
              placeholder="输入您的粗略想法，例如：一个赛博朋克猫咪在雨夜面馆吃拉面，胶片质感，电影级逆光..."
            ></textarea>
          </div>

          <!-- Aspect Ratio Selector -->
          <div class="pm-feature-row">
            <div class="pm-feature-title">
              <span>📐 画幅画质比例</span>
              <span style="font-size: 10.5px; opacity: 0.65;">自动融入官方景别与镜头语言</span>
            </div>
            <div class="pm-ratio-group" id="pm-ratio-group">
              <span class="pm-ratio-pill" data-ratio="1:1">1:1 方形头像</span>
              <span class="pm-ratio-pill active" data-ratio="16:9">16:9 横版宽画幅</span>
              <span class="pm-ratio-pill" data-ratio="9:16">9:16 竖版手机壁纸</span>
              <span class="pm-ratio-pill" data-ratio="4:3">4:3 经典摄影</span>
              <span class="pm-ratio-pill" data-ratio="21:9">21:9 电影变形宽银幕</span>
            </div>
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

          <!-- Negative Constraints / Avoid Tags -->
          <div class="pm-feature-row">
            <div class="pm-feature-title">
              <span>🚫 严禁与避坑约束 (负向剔除)</span>
              <span style="font-size: 10.5px; opacity: 0.65;">点击激活，权威叙事化过滤</span>
            </div>
            <div class="pm-avoid-group" id="pm-avoid-group">
              <span class="pm-avoid-pill" data-avoid="无乱码文字或水印 (no text artifacts/watermarks)">🔤 无乱码文字水印</span>
              <span class="pm-avoid-pill" data-avoid="肢体结构正常手部精细 (anatomically correct hands and fingers)">✋ 规避手指畸形</span>
              <span class="pm-avoid-pill" data-avoid="背景纯净无杂乱干扰 (clean uncluttered background)">🧹 纯净不杂乱</span>
              <span class="pm-avoid-pill" data-avoid="避免廉价塑料CG质感 (avoid cheap plastic 3d gloss)">✨ 拒绝塑料CG假感</span>
              <span class="pm-avoid-pill" data-avoid="画面清晰拒绝低分辨率模糊 (no blurry or pixelated details)">🔍 拒绝低清模糊</span>
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

    const modeTabs = modal.querySelectorAll('.pm-mode-tab');
    modeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        modeTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        activeMode = tab.dataset.mode;
      });
    });

    const pills = modal.querySelectorAll('.pm-pill');
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        activeStyle = pill.dataset.style;
      });
    });

    const ratioPills = modal.querySelectorAll('.pm-ratio-pill');
    ratioPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        ratioPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        activeAspectRatio = pill.dataset.ratio;
      });
    });

    const avoidPills = modal.querySelectorAll('.pm-avoid-pill');
    avoidPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pill.classList.toggle('active');
        const tag = pill.dataset.avoid;
        if (pill.classList.contains('active')) {
          if (!activeAvoidTags.includes(tag)) activeAvoidTags.push(tag);
        } else {
          activeAvoidTags = activeAvoidTags.filter(t => t !== tag);
        }
      });
    });

    const dropzone = modal.querySelector('#pm-dropzone');
    const fileInput = modal.querySelector('#pm-file-input');
    const galleryWrap = modal.querySelector('#pm-img-gallery');
    const galleryList = modal.querySelector('#pm-gallery-list');
    const galleryTitle = modal.querySelector('#pm-gallery-title');
    const galleryClearBtn = modal.querySelector('#pm-gallery-clear');
    const galleryAddBtn = modal.querySelector('#pm-gallery-add-btn');
    const openSketchBtn = modal.querySelector('#pm-open-sketch-btn');

    const btnPasteClipboard = modal.querySelector('#pm-btn-paste-clipboard');
    const btnBrowseFile = modal.querySelector('#pm-btn-browse-file');
    const galleryPasteBtn = modal.querySelector('#pm-gallery-paste-btn');
    const galleryBrowseBtn = modal.querySelector('#pm-gallery-browse-btn');

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

    galleryPasteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      pasteFromClipboardDirectly();
    });

    btnBrowseFile?.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    galleryBrowseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      fileInput.click();
    });

    galleryAddBtn.addEventListener('click', async (e) => {
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
        handleImageFilesBatch(e.dataTransfer.files);
      }
    });

    galleryClearBtn.addEventListener('click', () => {
      attachedImages = [];
      updateGalleryUI();
      showToast('已清空所有参考图');
    });

    function updateGalleryUI() {
      if (attachedImages.length === 0) {
        galleryWrap.style.display = 'none';
        dropzone.style.display = 'flex';
        return;
      }

      dropzone.style.display = 'none';
      galleryWrap.style.display = 'flex';
      galleryTitle.textContent = `已添加参考图 (${attachedImages.length}/6)`;

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

    modal.updateGalleryUI = updateGalleryUI;

    // --- 2D Sketch Board Logic ---
    const sketchBox = modal.querySelector('#pm-sketch-box');
    const closeSketchBtn = modal.querySelector('#pm-close-sketch-btn');
    const sketchCanvas = modal.querySelector('#pm-sketch-canvas');
    const sketchClearBtn = modal.querySelector('#pm-sketch-clear');
    const sketchConfirmBtn = modal.querySelector('#pm-sketch-confirm');
    const colorDots = modal.querySelectorAll('.pm-color-dot');

    const sCtx = sketchCanvas.getContext('2d');
    let isDrawing = false;
    let currentColor = '#1a1a1a';
    let currentLineWidth = 4;

    function resetCanvasBackground() {
      sCtx.fillStyle = '#ffffff';
      sCtx.fillRect(0, 0, sketchCanvas.width, sketchCanvas.height);
    }
    resetCanvasBackground();

    openSketchBtn.addEventListener('click', () => {
      sketchBox.style.display = 'flex';
    });

    closeSketchBtn.addEventListener('click', () => {
      sketchBox.style.display = 'none';
    });

    colorDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        colorDots.forEach((d) => d.classList.remove('active'));
        dot.classList.add('active');
        currentColor = dot.dataset.color;
        currentLineWidth = currentColor === '#ffffff' ? 14 : 4;
      });
    });

    function getCanvasCoords(e) {
      const rect = sketchCanvas.getBoundingClientRect();
      const scaleX = sketchCanvas.width / rect.width;
      const scaleY = sketchCanvas.height / rect.height;
      let clientX = e.clientX;
      let clientY = e.clientY;
      if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    function startDraw(e) {
      isDrawing = true;
      const coords = getCanvasCoords(e);
      sCtx.beginPath();
      sCtx.moveTo(coords.x, coords.y);
      sCtx.strokeStyle = currentColor;
      sCtx.lineWidth = currentLineWidth;
      sCtx.lineCap = 'round';
      sCtx.lineJoin = 'round';
    }

    function moveDraw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const coords = getCanvasCoords(e);
      sCtx.lineTo(coords.x, coords.y);
      sCtx.stroke();
    }

    function endDraw() {
      if (isDrawing) {
        sCtx.closePath();
        isDrawing = false;
      }
    }

    sketchCanvas.addEventListener('mousedown', startDraw);
    sketchCanvas.addEventListener('mousemove', moveDraw);
    sketchCanvas.addEventListener('mouseup', endDraw);
    sketchCanvas.addEventListener('mouseleave', endDraw);

    sketchCanvas.addEventListener('touchstart', startDraw, { passive: false });
    sketchCanvas.addEventListener('touchmove', moveDraw, { passive: false });
    sketchCanvas.addEventListener('touchend', endDraw);

    sketchClearBtn.addEventListener('click', () => {
      resetCanvasBackground();
    });

    sketchConfirmBtn.addEventListener('click', () => {
      const sketchDataUrl = sketchCanvas.toDataURL('image/png');
      if (attachedImages.length >= 6) {
        showToast('参考图已达到上限(6张)，请先删除部分参考图');
        return;
      }
      attachedImages.push(sketchDataUrl);
      updateGalleryUI();
      sketchBox.style.display = 'none';
      if (activeMode === 'new') {
        activeMode = 'reference';
        const tabs = modal.querySelectorAll('.pm-mode-tab');
        tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === 'reference'));
      }
      showToast('🎨 涂鸦草图已成功导入为空间布局参考！');
    });

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
