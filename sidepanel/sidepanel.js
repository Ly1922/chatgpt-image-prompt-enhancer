/**
 * Sidepanel Workspace Controller
 * ChatGPT Images 2.5 Prompt Enhancer - Ultra Clean Edition
 */

document.addEventListener('DOMContentLoaded', async () => {
  let attachedImages = []; // Array of base64 strings
  let activeMode = 'new';
  let activeStyle = 'photorealistic';
  let activeAspectRatio = '16:9';
  let activeAvoidTags = [
    '无乱码文字或水印 (no text artifacts/watermarks)',
    '肢体结构正常手部精细 (anatomically correct hands and fingers)'
  ];
  let currentOptimizedPrompt = '';
  let currentResultData = null;

  // Elements
  const modeBadge = document.getElementById('sp-mode-badge');
  const modeLabel = document.getElementById('sp-mode-label');
  const modeMenu = document.getElementById('sp-mode-menu');
  const modeOpts = document.querySelectorAll('.sp-mode-opt');

  const roughInput = document.getElementById('sp-rough-input');
  const fileInput = document.getElementById('sp-file-input');
  const btnPasteClipboard = document.getElementById('sp-btn-paste-clipboard');
  const btnBrowseFile = document.getElementById('sp-btn-browse-file');

  const galleryWrap = document.getElementById('sp-img-gallery');
  const galleryList = document.getElementById('sp-gallery-list');
  const galleryClearBtn = document.getElementById('sp-gallery-clear');
  const galleryAddBtn = document.getElementById('sp-gallery-add-btn');
  const galleryTitle = document.getElementById('sp-gallery-title');

  // Capsule Chips & Popovers
  const chipRatio = document.getElementById('sp-chip-ratio');
  const chipRatioText = document.getElementById('sp-chip-ratio-text');
  const popoverRatio = document.getElementById('sp-popover-ratio');
  const ratioPills = document.querySelectorAll('#sp-ratio-group .sp-ratio-pill');

  const chipStyle = document.getElementById('sp-chip-style');
  const chipStyleText = document.getElementById('sp-chip-style-text');
  const popoverStyle = document.getElementById('sp-popover-style');
  const stylePills = document.querySelectorAll('#sp-style-pills .sp-pill');

  const chipAvoid = document.getElementById('sp-chip-avoid');
  const chipAvoidText = document.getElementById('sp-chip-avoid-text');
  const popoverAvoid = document.getElementById('sp-popover-avoid');
  const avoidPills = document.querySelectorAll('#sp-avoid-group .sp-avoid-pill');

  // Generate & Result
  const btnGenerate = document.getElementById('sp-btn-generate');
  const genText = document.getElementById('sp-gen-text');
  const resultCard = document.getElementById('sp-result-card');
  const promptOutput = document.getElementById('sp-prompt-output');
  const btnCopyMain = document.getElementById('sp-btn-copy-main');
  const btnStar = document.getElementById('sp-btn-star');
  const breakdownBody = document.getElementById('sp-breakdown-body');
  const variationsCard = document.getElementById('sp-variations');
  const variationsList = document.getElementById('sp-variations-list');
  const toast = document.getElementById('sp-toast');

  // History & Favorites & Settings
  const btnHistoryToggle = document.getElementById('sp-btn-history-toggle');
  const btnCloseHistory = document.getElementById('sp-btn-close-history');
  const historyView = document.getElementById('sp-history-view');
  const historyList = document.getElementById('sp-history-list');
  const btnClearHistory = document.getElementById('sp-btn-clear-history');

  const btnFavoritesToggle = document.getElementById('sp-btn-favorites-toggle');
  const btnCloseFavorites = document.getElementById('sp-btn-close-favorites');
  const favoritesView = document.getElementById('sp-favorites-view');
  const favoritesList = document.getElementById('sp-favorites-list');

  const btnSettings = document.getElementById('sp-btn-settings');

  // Check for pending image sent from right-click context menu
  checkPendingImage();
  chrome.runtime.onMessage.addListener((req) => {
    if (req.action === 'LOAD_IMAGE_FROM_URL' && req.imageUrl) {
      loadImageFromUrl(req.imageUrl);
    }
  });

  async function checkPendingImage() {
    chrome.storage.local.get(['pendingImageUrl'], (res) => {
      if (res.pendingImageUrl) {
        loadImageFromUrl(res.pendingImageUrl);
        chrome.storage.local.remove(['pendingImageUrl']);
      }
    });
  }

  function loadImageFromUrl(url) {
    chrome.runtime.sendMessage({ action: 'FETCH_IMAGE_AS_BASE64', url }, (response) => {
      if (response && response.success && response.base64) {
        addAttachedImage(response.base64);
        showToast('已载入网页选中的参考图片！');
      }
    });
  }

  // --- Mode Dropdown Logic ---
  modeBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllPopovers();
    modeMenu.style.display = modeMenu.style.display === 'none' ? 'block' : 'none';
  });

  modeOpts.forEach((opt) => {
    opt.addEventListener('click', () => {
      modeOpts.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      activeMode = opt.dataset.mode;
      updateModeUI();
      modeMenu.style.display = 'none';
    });
  });

  function updateModeUI() {
    if (activeMode === 'new') {
      modeLabel.textContent = '✨ 全新构思';
    } else if (activeMode === 'reference') {
      modeLabel.textContent = `🖼️ 垫图参考 (${attachedImages.length}张)`;
    } else if (activeMode === 'edit') {
      modeLabel.textContent = '🔄 局部微调 (稳定)';
    }
  }

  // --- Capsule Chips & Popover Toggles ---
  function closeAllPopovers() {
    if (popoverRatio) popoverRatio.style.display = 'none';
    if (popoverStyle) popoverStyle.style.display = 'none';
    if (popoverAvoid) popoverAvoid.style.display = 'none';
    if (modeMenu) modeMenu.style.display = 'none';
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sp-popover') && !e.target.closest('.sp-capsule-btn') && !e.target.closest('.sp-mode-dropdown-wrap')) {
      closeAllPopovers();
    }
  });

  document.querySelectorAll('.sp-popover-close').forEach((btn) => {
    btn.addEventListener('click', () => closeAllPopovers());
  });

  chipRatio.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = popoverRatio.style.display === 'block';
    closeAllPopovers();
    if (!isOpen) popoverRatio.style.display = 'block';
  });

  chipStyle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = popoverStyle.style.display === 'block';
    closeAllPopovers();
    if (!isOpen) popoverStyle.style.display = 'block';
  });

  chipAvoid.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = popoverAvoid.style.display === 'block';
    closeAllPopovers();
    if (!isOpen) popoverAvoid.style.display = 'block';
  });

  // Ratio Pills
  ratioPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      ratioPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeAspectRatio = pill.dataset.ratio;
      chipRatioText.textContent = `📐 ${pill.textContent.trim()}`;
      closeAllPopovers();
    });
  });

  // Style Pills
  stylePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      stylePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeStyle = pill.dataset.style;
      chipStyleText.textContent = `🎨 ${pill.textContent.trim()}`;
      closeAllPopovers();
    });
  });

  // Avoid Pills (Multiple toggle)
  avoidPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('active');
      const tag = pill.dataset.avoid;
      if (pill.classList.contains('active')) {
        if (!activeAvoidTags.includes(tag)) activeAvoidTags.push(tag);
      } else {
        activeAvoidTags = activeAvoidTags.filter(t => t !== tag);
      }
      chipAvoidText.textContent = activeAvoidTags.length > 0 ? `🚫 避坑 (${activeAvoidTags.length})` : '🚫 避坑 (无)';
    });
  });

  // --- Image Upload & Direct Clipboard Paste ---
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
      console.warn('Direct clipboard read failed:', err);
      showToast('请直接按下键盘 Ctrl+V 粘贴截图');
    }
  }

  btnPasteClipboard.addEventListener('click', (e) => {
    e.stopPropagation();
    pasteFromClipboardDirectly();
  });

  btnBrowseFile.addEventListener('click', (e) => {
    e.stopPropagation();
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

  fileInput.addEventListener('change', (e) => {
    handleImageFilesBatch(e.target.files);
    fileInput.value = '';
  });

  // Drag & drop into input card
  const inputCard = document.querySelector('.sp-input-card');
  inputCard.addEventListener('dragover', (e) => {
    e.preventDefault();
    inputCard.style.borderColor = 'var(--primary)';
  });
  inputCard.addEventListener('dragleave', () => {
    inputCard.style.borderColor = '';
  });
  inputCard.addEventListener('drop', (e) => {
    e.preventDefault();
    inputCard.style.borderColor = '';
    if (e.dataTransfer.files) {
      handleImageFilesBatch(e.dataTransfer.files);
    }
  });

  // Global Capture-Phase Paste
  window.addEventListener('paste', (e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const imageFiles = [];

    // 1. Check clipboard items
    if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
    }

    // 2. Check clipboard files
    if (imageFiles.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type && file.type.startsWith('image/')) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      handleImageFilesBatch(imageFiles);
    }
  }, true);

  // Auto focus on mouseenter so Ctrl+V works immediately without manual clicking
  window.addEventListener('mouseenter', () => {
    window.focus();
  });

  function handleImageFilesBatch(files) {
    const fileList = Array.from(files).filter(f => f && f.type && f.type.startsWith('image/'));
    if (fileList.length === 0) return;

    const remaining = 6 - attachedImages.length;
    if (remaining <= 0) {
      showToast('⚠️ 参考图已达上限 (最多6张)');
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
          updateGalleryUI();
          if (activeMode === 'new') {
            activeMode = 'reference';
            updateModeUI();
          }
          showToast(`✅ 已连续载入参考图 (${attachedImages.length}/6)`);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function addAttachedImage(base64) {
    if (attachedImages.length >= 6) {
      showToast('参考图已达到上限 (6/6)');
      return;
    }
    attachedImages.push(base64);
    updateGalleryUI();

    if (activeMode === 'new') {
      activeMode = 'reference';
      updateModeUI();
    }
    showToast(`✅ 已载入参考图 (${attachedImages.length}/6)`);
  }

  galleryClearBtn.addEventListener('click', () => {
    attachedImages = [];
    updateGalleryUI();
    if (activeMode === 'reference') {
      activeMode = 'new';
      updateModeUI();
    }
    showToast('已清空所有参考图');
  });

  function updateGalleryUI() {
    if (attachedImages.length === 0) {
      galleryWrap.style.display = 'none';
      galleryTitle.style.display = 'none';
      return;
    }

    galleryWrap.style.display = 'flex';
    galleryTitle.style.display = 'inline';
    galleryTitle.textContent = `(${attachedImages.length}/6)`;

    const items = galleryList.querySelectorAll('.sp-thumb-item');
    items.forEach(it => it.remove());

    attachedImages.forEach((imgBase64, idx) => {
      const item = document.createElement('div');
      item.className = 'sp-thumb-item';
      item.innerHTML = `
        <img src="${imgBase64}" alt="参考图 ${idx + 1}" />
        <button type="button" class="sp-thumb-del" title="删除此图">✕</button>
      `;
      item.querySelector('.sp-thumb-del').addEventListener('click', (e) => {
        e.stopPropagation();
        attachedImages.splice(idx, 1);
        updateGalleryUI();
        if (attachedImages.length === 0 && activeMode === 'reference') {
          activeMode = 'new';
          updateModeUI();
        }
      });
      galleryList.insertBefore(item, galleryAddBtn);
    });
  }

  // --- Generate Action ---
  btnGenerate.addEventListener('click', async () => {
    const rough = roughInput.value.trim();
    if (!rough && attachedImages.length === 0) {
      showToast('请先输入想法或粘贴参考图');
      return;
    }

    btnGenerate.disabled = true;
    genText.textContent = attachedImages.length > 1
      ? `✨ 正在多图深度融合 (${attachedImages.length}张)...`
      : '✨ 正在依据 Images 2.5 规范构思...';

    try {
      const result = await ApiClient.optimizePrompt({
        roughPrompt: rough,
        images: attachedImages,
        mode: activeMode,
        style: activeStyle,
        aspectRatio: activeAspectRatio,
        avoidTags: activeAvoidTags
      });

      currentResultData = result;
      currentOptimizedPrompt = result.optimizedPrompt;
      promptOutput.textContent = currentOptimizedPrompt;

      // Reset star button state
      btnStar.classList.remove('starred');
      btnStar.querySelector('.sp-star-text').textContent = '收藏';

      // Render Breakdown
      renderBreakdown(result);

      // Render Variations
      if (result.alternativePrompts && result.alternativePrompts.length > 0) {
        variationsList.innerHTML = '';
        result.alternativePrompts.forEach((alt) => {
          const item = document.createElement('div');
          item.className = 'sp-variation-item';
          item.textContent = alt;
          item.title = '点击选用此变体';
          item.addEventListener('click', () => {
            currentOptimizedPrompt = alt;
            promptOutput.textContent = alt;
            showToast('已选用此变体版本！');
          });
          variationsList.appendChild(item);
        });
        variationsCard.style.display = 'block';
      } else {
        variationsCard.style.display = 'none';
      }

      resultCard.style.display = 'flex';

      // Save to history
      await StorageHelper.addHistory({
        roughPrompt: rough,
        optimizedPrompt: currentOptimizedPrompt,
        styleTag: result.styleTag,
        mode: activeMode,
        aspectRatio: activeAspectRatio,
        hasImage: attachedImages.length > 0,
        imageCount: attachedImages.length
      });

      if (result.tip) {
        showToast(result.tip);
      }
    } catch (err) {
      showToast('生成异常: ' + err.message);
    } finally {
      btnGenerate.disabled = false;
      genText.textContent = '一键生成 Images 2.5 提示词';
    }
  });

  function renderBreakdown(result) {
    let html = '';
    if (result.chineseSummary) {
      html += `<div class="sp-breakdown-item"><span class="sp-breakdown-tag">📌 核心意图:</span>${result.chineseSummary}</div>`;
    }
    if (result.breakdown) {
      const b = result.breakdown;
      if (b.subject) html += `<div class="sp-breakdown-item"><span class="sp-breakdown-tag">🎯 主体:</span>${b.subject}</div>`;
      if (b.setting) html += `<div class="sp-breakdown-item"><span class="sp-breakdown-tag">🏞️ 场景:</span>${b.setting}</div>`;
      if (b.lighting) html += `<div class="sp-breakdown-item"><span class="sp-breakdown-tag">💡 光影:</span>${b.lighting}</div>`;
      if (b.camera) html += `<div class="sp-breakdown-item"><span class="sp-breakdown-tag">📷 镜头:</span>${b.camera}</div>`;
      if (b.stability) html += `<div class="sp-breakdown-item"><span class="sp-breakdown-tag">🔒 稳定项:</span>${b.stability}</div>`;
    }
    breakdownBody.innerHTML = html;
  }

  // Star Favorite
  btnStar.addEventListener('click', async () => {
    if (!currentOptimizedPrompt) return;
    try {
      const isAdded = await StorageHelper.toggleFavorite({
        optimizedPrompt: currentOptimizedPrompt,
        chineseSummary: currentResultData?.chineseSummary || '',
        styleTag: currentResultData?.styleTag || activeStyle,
        mode: activeMode,
        aspectRatio: activeAspectRatio
      });
      if (isAdded) {
        btnStar.classList.add('starred');
        btnStar.querySelector('.sp-star-text').textContent = '已收藏';
        showToast('★ 已成功添加到收藏夹！');
      } else {
        btnStar.classList.remove('starred');
        btnStar.querySelector('.sp-star-text').textContent = '收藏';
        showToast('已取消收藏');
      }
    } catch (e) {
      showToast('收藏失败: ' + e.message);
    }
  });

  // Copy Main
  btnCopyMain.addEventListener('click', () => {
    if (!currentOptimizedPrompt) return;
    navigator.clipboard.writeText(currentOptimizedPrompt).then(() => {
      showToast('✨ 生产级提示词已复制！可直接在 ChatGPT 中粘贴');
    });
  });

  // History Drawer
  btnHistoryToggle.addEventListener('click', async () => {
    await renderHistory();
    historyView.style.display = 'flex';
  });

  btnCloseHistory.addEventListener('click', () => {
    historyView.style.display = 'none';
  });

  btnClearHistory.addEventListener('click', async () => {
    if (confirm('确定清空所有历史记录吗？')) {
      await StorageHelper.clearHistory();
      renderHistory();
      showToast('历史记录已清空');
    }
  });

  async function renderHistory() {
    const history = await StorageHelper.getHistory();
    if (history.length === 0) {
      historyList.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:30px 0;">暂无历史记录</div>';
      return;
    }

    historyList.innerHTML = '';
    history.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'sp-history-card';
      const timeStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      card.innerHTML = `
        <div class="sp-history-meta">
          <span>${item.styleTag || '自定风格'} · ${item.mode === 'edit' ? '局部修改' : (item.mode === 'reference' ? '垫图参考' : '全新构思')}</span>
          <span>${timeStr}</span>
        </div>
        <div class="sp-history-text">${item.optimizedPrompt}</div>
      `;
      card.addEventListener('click', () => {
        currentOptimizedPrompt = item.optimizedPrompt;
        promptOutput.textContent = item.optimizedPrompt;
        resultCard.style.display = 'flex';
        historyView.style.display = 'none';
        navigator.clipboard.writeText(item.optimizedPrompt);
        showToast('已载入并复制选中的历史提示词！');
      });
      historyList.appendChild(card);
    });
  }

  // Favorites Drawer
  btnFavoritesToggle.addEventListener('click', async () => {
    await renderFavorites();
    favoritesView.style.display = 'flex';
  });

  btnCloseFavorites.addEventListener('click', () => {
    favoritesView.style.display = 'none';
  });

  async function renderFavorites() {
    const favs = await StorageHelper.getFavorites();
    if (favs.length === 0) {
      favoritesList.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:30px 0;">暂无收藏提示词，点击结果卡片的 ★ 即可收藏</div>';
      return;
    }

    favoritesList.innerHTML = '';
    favs.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'sp-history-card';
      const timeStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';
      card.innerHTML = `
        <div class="sp-history-meta">
          <span style="color:#f59e0b; font-weight:600;">★ ${item.styleTag || '精选'} ${item.aspectRatio ? '· ' + item.aspectRatio : ''}</span>
          <span>${timeStr}</span>
        </div>
        <div class="sp-history-text">${item.optimizedPrompt}</div>
        ${item.chineseSummary ? `<div style="font-size:11px; opacity:0.75; margin-top:4px;">${item.chineseSummary}</div>` : ''}
      `;
      card.addEventListener('click', () => {
        currentOptimizedPrompt = item.optimizedPrompt;
        promptOutput.textContent = item.optimizedPrompt;
        resultCard.style.display = 'flex';
        favoritesView.style.display = 'none';
        navigator.clipboard.writeText(item.optimizedPrompt);
        showToast('已载入并复制收藏的提示词！');
      });
      favoritesList.appendChild(card);
    });
  }

  // Open Settings
  btnSettings.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }
});
