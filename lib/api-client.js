/**
 * Multi-Provider API Client (Gemini, OpenAI, Custom Endpoint)
 * Supports Vision (Base64 reference image) + Structured JSON Output
 */

const ApiClient = {
  /**
   * Main optimize method
   * @param {Object} params
   * @param {string} params.roughPrompt - User rough input
   * @param {string} [params.imageBase64] - Data URL or base64 string of reference image
   * @param {string} [params.mode] - 'new' | 'reference' | 'edit'
   * @param {string} [params.style] - Style key
   * @param {Object} [params.settings] - User settings override
   */
  async optimizePrompt(params) {
    const settings = params.settings || await StorageHelper.getSettings();
    const provider = settings.provider || 'gemini';
    const apiKey = (settings.apiKey || '').trim();

    // If no API Key configured and provider is not cpamc, gracefully degrade to smart offline template
    if (!apiKey && provider !== 'cpamc') {
      console.warn('No API key configured, using offline template generator.');
      const offlineResult = PromptEngine.generateOfflinePrompt(params.roughPrompt, {
        style: params.style,
        mode: params.mode
      });
      offlineResult.isOffline = true;
      offlineResult.tip = '（当前未配置 API Key，已使用内置离线 Images 2.5 规则库生成。如需 AI 智能视觉分析，请前往插件设置配置 Key）';
      return offlineResult;
    }

    try {
      if (provider === 'gemini') {
        return await this.callGemini(params, settings);
      } else {
        return await this.callOpenAICompatible(params, settings);
      }
    } catch (err) {
      console.error('API call failed:', err);
      // If network/API error, return offline fallback with error note
      const fallback = PromptEngine.generateOfflinePrompt(params.roughPrompt, {
        style: params.style,
        mode: params.mode
      });
      fallback.isOffline = true;
      fallback.error = err.message || 'API 请求失败';
      return fallback;
    }
  },

  /**
   * Google Gemini Multimodal API Call
   */
  async callGemini(params, settings) {
    const model = settings.geminiModel || 'gemini-2.0-flash';
    const apiKey = settings.apiKey.trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const rawImages = params.images || (params.imageBase64 ? (Array.isArray(params.imageBase64) ? params.imageBase64 : [params.imageBase64]) : []);
    const isDescribe = params.mode === 'describe' || params.isDescribe;
    const parts = [];

    // Add Reference Images if provided
    rawImages.forEach((imgBase64, idx) => {
      const match = imgBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inline_data: {
            mime_type: match[1],
            data: match[2]
          }
        });
      }
    });

    const multiImageNote = rawImages.length > 1
      ? `【多图融合指导】：用户共提供了 ${rawImages.length} 张参考图。请综合分析各图要素（如主体造型、艺术风格、色彩氛围、环境构图），并根据用户的意图进行有机融合。`
      : (rawImages.length === 1 ? `【参考图分析】：用户提供了 1 张参考图，请结合其构图与风格。` : '');

    const ratioNote = params.aspectRatio ? `Target Aspect Ratio: "${params.aspectRatio}" (Weave matching composition and framing description).` : '';
    const avoidNote = (params.avoidTags && params.avoidTags.length > 0) ? `Elements to Strictly Avoid: "${params.avoidTags.join(', ')}".` : '';

    const compInfo = (PromptEngine.COMPOSITIONS && params.composition) ? PromptEngine.COMPOSITIONS[params.composition] : null;
    const compNote = compInfo ? `Spatial Composition Requirement: "${compInfo.promptSnippet}".` : '';

    // User prompt request with context
    let userInstruction = '';
    if (isDescribe) {
      userInstruction = `
[REVERSE PROMPT TASK]: Meticulously analyze the visual elements of the uploaded image. Reverse-engineer it into a world-class production prompt for ChatGPT Images 2.5.
Extract artistic medium, lighting setup, color grade, camera focal length & optics, and spatial composition.
${ratioNote}
${compNote}
Output Language Requirement: The "optimizedPrompt" MUST be in detailed, natural English. Provide Chinese breakdown in "chineseSummary" and provide a reusable "promptTemplate" with [Your Subject] placeholder.`;
    } else {
      userInstruction = `
User Rough Prompt: "${params.roughPrompt || '(No text prompt, create prompt purely based on reference images)'}"
Selected Generation Mode: "${params.mode || 'new'}" (new=全新构思, reference=垫图参考提取风格与构图, edit=基于原图局部修改保持主体稳定)
Preferred Style Preset: "${params.style || 'photorealistic'}"
${ratioNote}
${compNote}
${avoidNote}
${multiImageNote}
Output Language Requirement: The final "optimizedPrompt" MUST be in detailed, natural English (for maximum fidelity in ChatGPT Images 2.5). Provide Chinese translation and breakdown in "chineseSummary" and "breakdown".

Please produce the structured JSON prompt following the Images 2.5 Brief format instructions.`;
    }

    parts.push({ text: userInstruction });

    const systemPrompt = isDescribe ? PromptEngine.REVERSE_SYSTEM_PROMPT : PromptEngine.SYSTEM_PROMPT;

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: 'user',
          parts: parts
        }
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.7
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API 错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Gemini 返回内容为空');
    }

    return this.parseJSON(candidate);
  },

  /**
   * OpenAI or OpenAI-Compatible API Call (GPT-4o, CPAMC, OneAPI, SiliconFlow)
   */
  async callOpenAICompatible(params, settings) {
    let endpoint = '';
    let model = '';

    if (settings.provider === 'cpamc') {
      endpoint = (settings.cpamcEndpoint || 'http://localhost:8000/v1').trim();
      model = (settings.cpamcModel || 'gpt-4o').trim();
    } else if (settings.provider === 'openai') {
      endpoint = 'https://api.openai.com/v1';
      model = (settings.openaiModel || 'gpt-4o-mini').trim();
    } else {
      endpoint = (settings.customEndpoint || 'https://api.openai.com/v1').trim();
      model = (settings.customModel || 'gpt-4o-mini').trim();
    }

    if (!endpoint.endsWith('/chat/completions')) {
      endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
    }

    const apiKey = (settings.apiKey || '').trim();

    const rawImages = params.images || (params.imageBase64 ? (Array.isArray(params.imageBase64) ? params.imageBase64 : [params.imageBase64]) : []);

    const userContent = [];

    // Add Images if present
    rawImages.forEach((imgBase64) => {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imgBase64
        }
      });
    });

    const multiImageNote = rawImages.length > 1
      ? `\nMulti-Reference Instructions: User provided ${rawImages.length} reference images. Analyze the visual elements of each image (e.g. subject likeness, character styling, color harmony, atmosphere, environment), integrate them according to user prompt, and synthesize into a single cohesive ChatGPT Images 2.5 brief.`
      : (rawImages.length === 1 ? `\nReference Image Instructions: Analyze the reference image and incorporate its visual style/subject into the prompt.` : '');

    const isDescribe = params.mode === 'describe' || params.isDescribe;
    const systemPrompt = isDescribe ? PromptEngine.REVERSE_SYSTEM_PROMPT : PromptEngine.SYSTEM_PROMPT;

    const compInfo = (PromptEngine.COMPOSITIONS && params.composition) ? PromptEngine.COMPOSITIONS[params.composition] : null;
    const compNote = compInfo ? `\nSpatial Composition Requirement: "${compInfo.promptSnippet}".` : '';

    if (isDescribe) {
      userContent.push({
        type: 'text',
        text: `[REVERSE PROMPT TASK]: Meticulously analyze the visual elements of the uploaded reference image. Reverse-engineer it into a world-class production prompt for ChatGPT Images 2.5.
Extract artistic medium, lighting setup, color grade, camera focal length & optics, and spatial composition.${ratioNote}${compNote}
Requirement: The "optimizedPrompt" MUST be in English. Provide Chinese breakdown in "chineseSummary" and provide a reusable "promptTemplate" with [Your Subject] placeholder. Output strictly valid JSON.`
      });
    } else {
      userContent.push({
        type: 'text',
        text: `User Rough Prompt: "${params.roughPrompt || '(Based entirely on reference images)'}"
Selected Generation Mode: "${params.mode || 'new'}"
Preferred Style Preset: "${params.style || 'photorealistic'}"${ratioNote}${compNote}${avoidNote}${multiImageNote}
Requirement: The "optimizedPrompt" must be in English. Provide Chinese analysis in "chineseSummary". Output strictly valid JSON.`
      });
    }

    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Try first with response_format, fallback if proxy rejects response_format
    let response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok && response.status === 400) {
      // Retry without response_format in case proxy/model doesn't support json_object
      response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: PromptEngine.SYSTEM_PROMPT },
            { role: 'user', content: userContent }
          ],
          temperature: 0.7
        })
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;
    if (!messageContent) {
      throw new Error('API 返回消息为空');
    }

    return this.parseJSON(messageContent);
  },

  /**
   * Fetch model list from OpenAI-compatible endpoint (like CPAMC)
   */
  async fetchModels(endpoint, apiKey) {
    let url = (endpoint || 'http://localhost:8000/v1').trim();
    url = url.replace(/\/chat\/completions\/?$/, '');
    if (!url.endsWith('/models')) {
      url = url.replace(/\/+$/, '') + '/models';
    }

    const headers = {};
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`获取模型失败 (${res.status}): ${err}`);
    }
    const data = await res.json();
    if (Array.isArray(data.data)) {
      return data.data.map(m => m.id);
    }
    return [];
  },

  /**
   * Robust JSON parsing helper
   */
  parseJSON(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      // Try stripping markdown ```json ... ``` wrapper
      const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        return JSON.parse(match[1]);
      }
      throw new Error('无法解析模型输出的 JSON 格式：' + text.substring(0, 100));
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
