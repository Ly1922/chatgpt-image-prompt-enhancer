/**
 * Sidepanel Workspace Controller
 * ChatGPT Images 2.5 Prompt Enhancer & Creative Assistant
 */

document.addEventListener('DOMContentLoaded', async () => {
  let attachedImages = []; // Array of base64 strings
  let activeMode = 'new';
  let activeStyle = 'photorealistic';
  let activeAspectRatio = '16:9';
  let activeAvoidTags = [];
  let currentOptimizedPrompt = '';
  let currentResultData = null;

  // Elements
  const modeTabs = document.querySelectorAll('.sp-mode-tab');
  const stylePills = document.querySelectorAll('#sp-style-pills .sp-pill');
  const ratioPills = document.querySelectorAll('#sp-ratio-group .sp-ratio-pill');
  const avoidPills = document.querySelectorAll('#sp-avoid-group .sp-avoid-pill');

  const dropzone = document.getElementById('sp-dropzone');
  const fileInput = document.getElementById('sp-file-input');
  const galleryWrap = document.getElementById('sp-img-gallery');
  const galleryList = document.getElementById('sp-gallery-list');
  const galleryTitle = document.getElementById('sp-gallery-title');
  const galleryClearBtn = document.getElementById('sp-gallery-clear');
  const galleryAddBtn = document.getElementById('sp-gallery-add-btn');

  // Sketch Elements
  const openSketchBtn = document.getElementById('sp-open-sketch');
  const closeSketchBtn = document.getElementById('sp-close-sketch');
  const sketchBox = document.getElementById('sp-sketch-box');
  const sketchCanvas = document.getElementById('sp-sketch-canvas');
  const sketchClearBtn = document.getElementById('sp-sketch-clear');
  const sketchConfirmBtn = document.getElementById('sp-sketch-confirm');
  const sketchColors = document.querySelectorAll('.sp-color-dot');

  const roughInput = document.getElementById('sp-rough-input');
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

  // Mode Tabs
  modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      modeTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeMode = tab.dataset.mode;
    });
  });

  // Style Pills
  stylePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      stylePills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeStyle = pill.dataset.style;
    });
  });

  // Ratio Pills
  ratioPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      ratioPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeAspectRatio = pill.dataset.ratio;
    });
  });

  // Avoid Negative Tags (Multiple toggle)
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

  // Image Drop & File Input
  dropzone.addEventListener('click', () => fileInput.click());
  galleryAddBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => handleFile(f));
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
      Array.from(e.dataTransfer.files).forEach(f => handleFile(f));
    }
  });

  // Paste image from clipboard
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) handleFile(file);
      }
    }
  });

  function handleFile(file) {
    if (attachedImages.length >= 6) {
      showToast('最多支持添加 6 张参考图');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      addAttachedImage(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  function addAttachedImage(base64) {
    attachedImages.push(base64);
    updateGalleryUI();

    if (activeMode === 'new') {
      const refTab = document.querySelector('[data-mode="reference"]');
      if (refTab) refTab.click();
    }
  }

  galleryClearBtn.addEventListener('click', () => {
    attachedImages = [];
    updateGalleryUI();
  });

  function updateGalleryUI() {
    if (attachedImages.length === 0) {
      galleryWrap.style.display = 'none';
      dropzone.style.display = 'block';
      return;
    }

    dropzone.style.display = 'none';
    galleryWrap.style.display = 'flex';
    galleryTitle.textContent = `已载入参考图 (${attachedImages.length}/6)`;

    const items = galleryList.querySelectorAll('.sp-gallery-item');
    items.forEach(it => it.remove());

    attachedImages.forEach((imgBase64, idx) => {
      const item = document.createElement('div');
      item.className = 'sp-gallery-item';
      item.innerHTML = `
        <img src="${imgBase64}" alt="参考图 ${idx + 1}" />
        <span class="sp-gallery-badge">图 ${idx + 1}</span>
        <button type="button" class="sp-gallery-del" title="删除此图">✕</button>
      `;
      item.querySelector('.sp-gallery-del').addEventListener('click', (e) => {
        e.stopPropagation();
        attachedImages.splice(idx, 1);
        updateGalleryUI();
      });
      galleryList.insertBefore(item, galleryAddBtn);
    });
  }

  // --- 2D Sketch Board Drawer Logic ---
  const sCtx = sketchCanvas.getContext('2d');
  let isDrawing = false;
  let currentColor = '#1a1a1a';
  let currentLineWidth = 4;

  function resetSketch() {
    sCtx.fillStyle = '#ffffff';
    sCtx.fillRect(0, 0, sketchCanvas.width, sketchCanvas.height);
  }
  resetSketch();

  openSketchBtn.addEventListener('click', () => {
    sketchBox.style.display = 'flex';
  });

  closeSketchBtn.addEventListener('click', () => {
    sketchBox.style.display = 'none';
  });

  sketchColors.forEach((dot) => {
    dot.addEventListener('click', () => {
      sketchColors.forEach((d) => d.classList.remove('active'));
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

  sketchClearBtn.addEventListener('click', resetSketch);

  sketchConfirmBtn.addEventListener('click', () => {
    const sketchData = sketchCanvas.toDataURL('image/png');
    if (attachedImages.length >= 6) {
      showToast('参考图已达到上限(6张)');
      return;
    }
    addAttachedImage(sketchData);
    sketchBox.style.display = 'none';
    showToast('🎨 涂鸦草图已成功导入为空间布局参考！');
  });

  // Generate Action
  btnGenerate.addEventListener('click', async () => {
    const rough = roughInput.value.trim();
    if (!rough && attachedImages.length === 0) {
      showToast('请先输入粗略想法或上传参考图');
      return;
    }

    btnGenerate.disabled = true;
    genText.textContent = attachedImages.length > 1
      ? `✨ 正在多图深度融合与构思中 (${attachedImages.length}张参考图)...`
      : '✨ 正在依据 Images 2.5 规范优化中...';

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
      genText.textContent = '重新生成提示词';
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
      favoritesList.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:30px 0;">暂无收藏提示词，点击结果卡的 ★ 即可收藏</div>';
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
    }, 2800);
  }
});
