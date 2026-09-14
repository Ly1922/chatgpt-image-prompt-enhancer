/**
 * Options page logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const providerRadios = document.querySelectorAll('input[name="provider"]');
  const apiKeyInput = document.getElementById('opt-api-key');
  const toggleKeyBtn = document.getElementById('opt-toggle-key');
  const getKeyLink = document.getElementById('opt-get-key-link');

  const geminiFields = document.getElementById('opt-gemini-fields');
  const geminiModelSelect = document.getElementById('opt-gemini-model');

  const openaiFields = document.getElementById('opt-openai-fields');
  const openaiModelSelect = document.getElementById('opt-openai-model');

  const customFields = document.getElementById('opt-custom-fields');
  const customEndpointInput = document.getElementById('opt-custom-endpoint');
  const customModelInput = document.getElementById('opt-custom-model');

  const cpamcFields = document.getElementById('opt-cpamc-fields');
  const cpamcEndpointInput = document.getElementById('opt-cpamc-endpoint');
  const cpamcModelInput = document.getElementById('opt-cpamc-model');
  const cpamcModelSelect = document.getElementById('opt-cpamc-model-select');
  const btnFetchModels = document.getElementById('opt-btn-fetch-models');

  const btnSave = document.getElementById('opt-btn-save');
  const btnTest = document.getElementById('opt-btn-test');
  const testResult = document.getElementById('opt-test-result');

  // Load existing settings
  const settings = await StorageHelper.getSettings();

  // Set provider
  const activeRadio = document.querySelector(`input[name="provider"][value="${settings.provider || 'gemini'}"]`);
  if (activeRadio) activeRadio.checked = true;
  updateProviderFields(settings.provider || 'gemini');

  // Set values
  apiKeyInput.value = settings.apiKey || '';
  geminiModelSelect.value = settings.geminiModel || 'gemini-2.0-flash';
  openaiModelSelect.value = settings.openaiModel || 'gpt-4o-mini';
  customEndpointInput.value = settings.customEndpoint || 'https://api.openai.com/v1';
  customModelInput.value = settings.customModel || 'gpt-4o-mini';
  cpamcEndpointInput.value = settings.cpamcEndpoint || 'http://localhost:8000/v1';
  cpamcModelInput.value = settings.cpamcModel || 'gpt-4o';

  // Toggle API key visibility
  toggleKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleKeyBtn.textContent = '隐藏';
    } else {
      apiKeyInput.type = 'password';
      toggleKeyBtn.textContent = '显示';
    }
  });

  // Provider change listener
  providerRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      updateProviderFields(e.target.value);
    });
  });

  function updateProviderFields(provider) {
    geminiFields.style.display = provider === 'gemini' ? 'block' : 'none';
    openaiFields.style.display = provider === 'openai' ? 'block' : 'none';
    customFields.style.display = provider === 'custom' ? 'block' : 'none';
    cpamcFields.style.display = provider === 'cpamc' ? 'block' : 'none';

    if (provider === 'gemini') {
      getKeyLink.href = 'https://aistudio.google.com/app/apikey';
      getKeyLink.style.display = 'inline';
    } else if (provider === 'openai') {
      getKeyLink.href = 'https://platform.openai.com/api-keys';
      getKeyLink.style.display = 'inline';
    } else {
      getKeyLink.style.display = 'none';
    }
  }

  // Fetch models from CPAMC
  btnFetchModels.addEventListener('click', async () => {
    const endpoint = cpamcEndpointInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    if (!endpoint) {
      showStatus('⚠️ 请先输入 CPAMC API 基础地址', 'error');
      return;
    }
    btnFetchModels.disabled = true;
    btnFetchModels.textContent = '⏳ 获取中...';
    try {
      const models = await ApiClient.fetchModels(endpoint, apiKey);
      if (!models || models.length === 0) {
        showStatus('⚠️ 连接成功，但模型列表为空，请在 CPAMC 后台检查是否有绑定的模型', 'error');
      } else {
        cpamcModelSelect.innerHTML = '<option value="">-- 点击选择从 VPS 检测到的模型 --</option>';
        models.forEach((m) => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          cpamcModelSelect.appendChild(opt);
        });
        cpamcModelSelect.style.display = 'block';
        showStatus(`🎉 成功从 VPS 检索到 ${models.length} 个可用模型！请在下拉框选择。`, 'success');
      }
    } catch (err) {
      showStatus(`❌ 获取模型失败: ${err.message} (请检查 VPS 地址、端口或网络是否可访问)`, 'error');
    } finally {
      btnFetchModels.disabled = false;
      btnFetchModels.textContent = '🔍 获取可用模型列表';
    }
  });

  cpamcModelSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      cpamcModelInput.value = e.target.value;
    }
  });

  // Save Settings
  btnSave.addEventListener('click', async () => {
    const selectedProvider = document.querySelector('input[name="provider"]:checked').value;
    const newSettings = {
      provider: selectedProvider,
      apiKey: apiKeyInput.value.trim(),
      geminiModel: geminiModelSelect.value,
      openaiModel: openaiModelSelect.value,
      customEndpoint: customEndpointInput.value.trim(),
      customModel: customModelInput.value.trim(),
      cpamcEndpoint: cpamcEndpointInput.value.trim(),
      cpamcModel: cpamcModelInput.value.trim()
    };

    await StorageHelper.saveSettings(newSettings);
    showStatus('✅ 设置已成功保存到本地存储！', 'success');
  });

  // Test Connection
  btnTest.addEventListener('click', async () => {
    const selectedProvider = document.querySelector('input[name="provider"]:checked').value;
    const testSettings = {
      provider: selectedProvider,
      apiKey: apiKeyInput.value.trim(),
      geminiModel: geminiModelSelect.value,
      openaiModel: openaiModelSelect.value,
      customEndpoint: customEndpointInput.value.trim(),
      customModel: customModelInput.value.trim(),
      cpamcEndpoint: cpamcEndpointInput.value.trim(),
      cpamcModel: cpamcModelInput.value.trim()
    };

    if (!testSettings.apiKey && selectedProvider !== 'cpamc') {
      showStatus('⚠️ 请先输入 API Key 再进行测试', 'error');
      return;
    }

    btnTest.disabled = true;
    showStatus('⏳ 正在发送 Images 2.5 测试请求...', 'success');

    try {
      const res = await ApiClient.optimizePrompt({
        roughPrompt: '一只在月球表面漫步的白猫，电影光影',
        mode: 'new',
        style: 'photorealistic',
        settings: testSettings
      });

      if (res.isOffline && res.error) {
        throw new Error(res.error);
      }

      showStatus(`🎉 连接测试成功！模型返回正常：\n"${res.optimizedPrompt.substring(0, 100)}..."`, 'success');
    } catch (err) {
      showStatus(`❌ 测试失败: ${err.message}`, 'error');
    } finally {
      btnTest.disabled = false;
    }
  });

  function showStatus(text, type) {
    testResult.textContent = text;
    testResult.className = `opt-test-status ${type}`;
  }
});
