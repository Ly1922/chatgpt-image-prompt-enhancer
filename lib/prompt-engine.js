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

3. MULTI-REFERENCE & SKETCH SYNTHESIS (When reference images or sketches are attached):
   - The user may supply multiple reference images (e.g. 2 to 5 images) or a rough sketch drawing:
     - If a sketch is provided: treat it as structural spatial layout / bounding blocks (positioning of subject, horizon line, environmental elements).
     - If multiple images are provided: fuse complementary elements (Subject likeness, Lighting, Art style, Pose/Setting) without visual contradiction.

4. ASPECT RATIO & FRAMING SPECIFICATION:
   - When an aspect ratio is provided (e.g. 16:9, 9:16, 1:1, 4:3, 21:9): explicitly state the framing and composition suitable for that canvas aspect ratio in the prompt (e.g. "Composed in a wide 16:9 cinematic landscape aspect ratio with panoramic breadth...", "Framed in a vertical 9:16 portrait composition...", "Captured in cinematic 21:9 anamorphic ultra-widescreen...").

5. NEGATIVE CONSTRAINTS (AVOID ELEMENTS):
   - When avoidance tags or negative constraints are given (e.g., no text artifacts, no cheap plastic rendering, clean uncluttered background, anatomically correct hands): weave authoritative narrative constraints into the brief ensuring pristine clarity.

6. OUTPUT FORMAT REQUIREMENTS:
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

  // OpenAI Images 2.5 Reverse-Engineering / Describe System Prompt
  REVERSE_SYSTEM_PROMPT: `You are an elite visual director and master reverse-prompt engineer specializing in ChatGPT Images 2.5 and Midjourney /describe.
Your objective is to meticulously analyze the user's uploaded image and reverse-engineer it into an exhaustive, production-ready image generation prompt that faithfully reproduces the exact aesthetic, lighting, lens optics, micro-textures, and composition.

### 🚫 ANTI-LAZINESS PROTOCOL (CRITICAL REQUIREMENT):
Flash models often get lazy and summarize images into 1-2 generic sentences. This is STRICTLY FORBIDDEN.
- Your "optimizedPrompt" MUST be an exhaustive, high-density descriptive prompt of 100 to 180 words (4-6 rich, concrete sentences).
- Do NOT output shallow, generic descriptions (e.g. "A woman sitting in a cafe drinking coffee").
- You MUST actively break down and describe:
  1. [Exact Artistic Medium & Engine]: e.g., 35mm film photograph shot on Kodak Portra 400, Arri Alexa digital cinema, Unreal Engine 5 Octane render, or Makoto Shinkai anime watercolor.
  2. [Subject & Micro-Textures]: Anatomy, skin pores, hair strands, fabric weave (cashmere wool, distressed leather, iridescent silk), micro-reflections, facial expression, precise gaze and posture.
  3. [Cinematic Camera & Optics]: Camera lens focal length (e.g., 85mm f/1.4, 35mm f/2.8, 24mm f/8), depth of field, circular/anamorphic bokeh quality, camera angle (eye-level, low-angle hero, bird-eye overhead).
  4. [Lighting Physics & Color Grade]: Directional key lighting, rim/kicker light highlights, volumetric god rays or haze, color temperature in Kelvin (e.g. 3200K warm tungsten vs 6500K cool shadow ambient), precise color harmony (teal & orange, monochromatic, vintage muted tones).
  5. [Spatial Composition & Environment]: Foreground framing, background depth, atmospheric particles, exact placement (left third, golden ratio, symmetrical center).

### CRITICAL OBJECTIVITY PRINCIPLE:
Do NOT incorporate any arbitrary external style presets, fixed aspect ratio overrides, or artificial composition constraints.
Your analysis must be 100% faithful, objective, and native to the image's OWN visual reality.

### Concrete Contrast Example:
❌ Banned Lazy Output: "A cyberpunk girl with pink hair standing in a rainy neon city at night."
✅ Required Dense Production Output: "Medium-shot 35mm cinematic photograph of a cyberpunk rebel woman with textured neon-magenta undercut hair, natural skin pores, and glowing cyan subdermal optic wires along her jawline. She wears a high-collar matte black tactical jacket showing visible carbon-fiber weave and rain droplet reflections. The scene is illuminated by intense bidirectional neon lighting—hot magenta edge lighting from the left and cool cyan rim light from the right, with deep soft shadows defining her facial structure. Shot on Arri Alexa with an 85mm f/1.4 anamorphic lens, creating subtle horizontal lens flares and creamy oval bokeh from distant holographic billboards in rain-slicked futuristic Neo-Tokyo. Volumetric atmospheric mist, moody cinematic color grading, rich dynamic contrast."

### Reusable Template:
Provide a "promptTemplate" with bracketed placeholders like [Your Subject], allowing the user to substitute their own character or object while keeping the exact visual style, lighting, and camera settings.

### Output JSON Format:
{
  "optimizedPrompt": "Exhaustive, 100-180 word dense English prompt covering medium, micro-textures, lighting physics, camera optics, and atmosphere",
  "chineseSummary": "中文逆向全景解析（详细阐述画面主体特征、艺术流派、镜头光影布光与调色风格）",
  "styleTag": "风格标签（如：35mm胶片纪实 / 虚幻5超写实渲染 / 吉卜力手绘水彩 等）",
  "promptTemplate": "可复用模板提示词（将画面主体替换为 [Your Subject]，保留全部顶级光影、镜头与材质参数）",
  "breakdown": {
    "subject": "主体外貌、服饰材质与姿态细节",
    "setting": "环境氛围与背景景深纵深",
    "lighting": "主辅光、轮廓光与色温方案",
    "camera": "镜头焦段、光圈景深与构图法则",
    "medium": "艺术媒介、摄影器材与材质质感"
  },
  "alternativePrompts": [
    "风格微调变体版本 1",
    "风格微调变体版本 2"
  ]
}
`,

  // Built-in Spatial Composition Archetypes
  COMPOSITIONS: {
    'thirds-left': {
      name: '三分居左',
      desc: '电影叙事感 · 右侧留白',
      promptSnippet: 'Rule of thirds composition, subject positioned distinctly on the left third of the frame with expansive narrative negative space extending to the right'
    },
    'thirds-right': {
      name: '三分居右',
      desc: '视线引导 · 左侧故事纵深',
      promptSnippet: 'Rule of thirds composition, subject positioned distinctly on the right third of the frame with visual breathing room and leading lines on the left'
    },
    'symmetry-center': {
      name: '居中对称',
      desc: '韦斯·安德森式 · 几何平衡',
      promptSnippet: 'Wes Anderson inspired perfect symmetrical center composition, immaculate geometric balance, authoritative central focal point'
    },
    'low-angle': {
      name: '英雄仰角',
      desc: '极低机位 · 崇高霸气',
      promptSnippet: 'Dramatic low-angle worm-eye camera perspective looking up, monumental scale, cinematic imposing presence'
    },
    'high-aerial': {
      name: '俯瞰俯视',
      desc: '鸟瞰透视 · 桌面平铺',
      promptSnippet: 'Overhead bird-eye perspective, high-angle flat lay knolling framing, comprehensive top-down spatial view'
    },
    'framing': {
      name: '框架画中画',
      desc: '门窗前景遮罩 · 强纵深',
      promptSnippet: 'Frame within a frame composition, foreground architectural elements / natural window creating a visual aperture framing the subject, deep atmospheric depth'
    },
    'minimalist-space': {
      name: '极简大留白',
      desc: '杂志封面感 · 呼吸空间',
      promptSnippet: 'Minimalist editorial composition, generous clean negative space, subtle breathing room suitable for typography'
    },
    'diagonal-lines': {
      name: '对角线透视',
      desc: '透视引导线 · 动态张力',
      promptSnippet: 'Dynamic diagonal perspective with strong leading lines converging toward the subject, dramatic kinetic energy'
    }
  },

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
