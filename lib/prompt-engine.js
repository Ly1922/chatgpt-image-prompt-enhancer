/**
 * Prompt Engine implementing OpenAI ChatGPT Images 2.5 Official Guidelines
 * Focuses on:
 * 1. The Brief Format (Cohesive, detailed narrative rather than buzzword lists)
 * 2. Multi-turn Stability vs Change specifications
 * 3. Reference Image Visual Transduction
 */

const PromptEngine = {
  // OpenAI Images 2.5 System Prompt
  SYSTEM_PROMPT: `You are an elite prompt engineer specializing in ChatGPT Images 2.5 (OpenAI's state-of-the-art visual generation model).
Your objective is to take a user's rough, brief idea (and optional reference image) and convert it into a world-class, production-ready image generation prompt that adheres to OpenAI's official Images 2.5 guidelines.

### Core Guidelines for ChatGPT Images 2.5:
1. THE BRIEF FORMAT:
   - Do NOT use low-value buzzwords like "photorealistic, 8k, masterpiece, hyper-detailed, trending on artstation".
   - Instead, construct a coherent, highly descriptive "Brief" with concrete physical details:
     - [Subject]: Precise physical anatomy, material textures, garment tailoring, expressions, gaze.
     - [Action/Interaction]: Dynamic posture, physical interaction with surrounding objects.
     - [Setting/Environment]: Foreground, midground, background layers, architectural details, weather, spatial depth.
     - [Camera & Optics]: Shot scale (macro, close-up, medium shot, environmental wide), lens focal length (e.g., 85mm f/1.4 for creamy bokeh, 24mm f/8 for sharp expansive scenery), camera angle (low-angle hero shot, eye-level, overhead flat lay).
     - [Lighting & Atmosphere]: Light sources (volumetric god rays, soft northern window light, neon rim light, warm golden hour), shadows, haze, specular highlights.
     - [Color & Texture]: Harmonious color palette, tactile surface qualities (brushed metal, weathered wood, matte silk).

2. ITERATIVE EDITING & STABILITY CONTROL (When mode is 'edit' or modifying an image):
   - OpenAI Images 2.5 excels at subject consistency.
   - Explicitly define what remains STABLE vs what CHANGES:
     "Maintain the exact character facial features, pose, and background setting from the reference image. Modify only: [specific changes requested]."

3. MULTI-REFERENCE IMAGE SYNTHESIS (When multiple images are attached):
   - The user may supply multiple reference images (e.g. 2 to 5 images):
     - Image A may represent the Subject / Character identity.
     - Image B may represent the Art Style, Lighting, or Color Palette.
     - Image C may represent the Pose, Composition, or Environment.
   - Smartly fuse the complementary elements from each image according to the user's intent. Do not create visual contradictions.

4. OUTPUT FORMAT REQUIREMENTS:
You MUST respond with valid JSON containing the following structure:
{
  "optimizedPrompt": "The full, high-quality production prompt in English (this will be directly pasted into ChatGPT)",
  "chineseSummary": "中文结构化解析（简要说明：主体、场景、光影风格）",
  "styleTag": "风格标签（如：电影写实 / 3D渲染 / 赛博朋克 / 极简插画等）",
  "breakdown": {
    "subject": "主体描述细节",
    "setting": "环境与氛围",
    "lighting": "光影与色调",
    "camera": "镜头与构图",
    "stability": "保持不变的要素（若是修改模式）"
  },
  "alternativePrompts": [
    "可选变体提示词1（例如不同光影或视角）",
    "可选变体提示词2（例如不同艺术风格）"
  ]
}
`,

  // Built-in presets for offline / instant augmentation
  STYLES: {
    'photorealistic': {
      name: '电影级写实摄影',
      camera: 'Shot on 35mm full-frame cinema camera, 85mm f/1.4 lens, natural shallow depth of field',
      lighting: 'cinematic lighting with soft diffuse key light and subtle warm rim lighting',
      aesthetic: 'high aesthetic cinematic realism, authentic skin textures, natural micro-contrasts'
    },
    '3d-render': {
      name: '3D 盲盒 / 精致渲染',
      camera: 'isometric 3D perspective, studio product shot, clean focus',
      lighting: 'soft studio box lighting with gentle ambient occlusion and subsurface scattering',
      aesthetic: 'Octane 3D render style, smooth clay and vinyl textures, charming character design'
    },
    'anime': {
      name: '日系唯美动漫',
      camera: 'dynamic anime key visual framing, eye-level cinematic crop',
      lighting: 'Makoto Shinkai style luminous sky lighting, glowing dusk hues, ethereal lens flare',
      aesthetic: 'masterpiece anime illustration, clean expressive line art, vibrant atmospheric color palette'
    },
    'cyberpunk': {
      name: '赛博朋克未来风',
      camera: 'dramatic low-angle street photography, 35mm anamorphic widescreen',
      lighting: 'drenched in vibrant neon magenta and cyan reflections against rain-slicked asphalt',
      aesthetic: 'futuristic cyberpunk aesthetic, holographic interfaces, atmospheric volumetric mist'
    },
    'minimalist': {
      name: '现代极简艺术',
      camera: 'balanced central composition, generous negative space',
      lighting: 'crisp clean architectural lighting with sharp defined shadows',
      aesthetic: 'modern Scandinavian minimalism, editorial aesthetic, curated subtle color palette'
    },
    'oil-painting': {
      name: '古典油画艺术',
      camera: 'classic portraiture framing, Renaissance golden ratio composition',
      lighting: 'Chiaroscuro lighting technique with deep dramatic shadows and illuminated focal points',
      aesthetic: 'textured impasto oil on canvas, visible master brushstrokes, rich warm earth tones'
    },
    'commercial': {
      name: '商业广告大片',
      camera: 'commercial product photography, razor-sharp 100mm macro lens, f/8',
      lighting: 'flawless three-point studio lighting, crisp specular reflections, pristine white/gradient backdrop',
      aesthetic: 'luxury brand commercial look, pristine clarity, premium tactile materials'
    }
  },

  /**
   * Fallback offline prompt generator when API key is not yet configured
   */
  generateOfflinePrompt(roughInput, options = {}) {
    const styleKey = options.style || 'photorealistic';
    const preset = this.STYLES[styleKey] || this.STYLES['photorealistic'];
    const mode = options.mode || 'new';

    const cleanInput = (roughInput || '').trim() || 'A creative concept scene';
    
    let optimizedPrompt = '';
    let stabilityNote = '';

    if (mode === 'edit') {
      stabilityNote = 'Keep the original subject features, core layout, and environmental context identical to the reference.';
      optimizedPrompt = `Based on the reference image: ${stabilityNote} Modify specifically: ${cleanInput}. Detailed execution: Rendered with ${preset.aesthetic}, ${preset.lighting}, ${preset.camera}.`;
    } else if (mode === 'reference') {
      optimizedPrompt = `Inspired by the visual composition and color harmonies of the reference image: depict ${cleanInput}. Featuring rich tactile detail, ${preset.lighting}, captured with ${preset.camera}. ${preset.aesthetic}.`;
    } else {
      optimizedPrompt = `A production-grade visual brief of ${cleanInput}. The scene is meticulously arranged with layered foreground and background depth. ${preset.lighting}. Captured with ${preset.camera}. Overall aesthetic: ${preset.aesthetic}.`;
    }

    return {
      optimizedPrompt,
      chineseSummary: `【已应用${preset.name}风格】基于输入“${cleanInput}”进行离线结构化扩充。`,
      styleTag: preset.name,
      breakdown: {
        subject: cleanInput,
        setting: '层次分明的前景、中景与背景环境',
        lighting: preset.lighting,
        camera: preset.camera,
        stability: mode === 'edit' ? stabilityNote : '新场景创作'
      },
      alternativePrompts: [
        `${optimizedPrompt} Emphasize golden hour sunset warmth and subtle atmospheric dust motes.`,
        `${optimizedPrompt} Reimagined with dramatic chiaroscuro high-contrast lighting.`
      ]
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptEngine;
}
