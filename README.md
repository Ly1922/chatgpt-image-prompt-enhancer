 🎨 ChatGPT 生图提示词大师 (ChatGPT Images 2.5 官方规范)

专为 **ChatGPT Images 2.5** 打造的谷歌浏览器（Chrome）扩展程序。
解决生图时“词穷、生不出满意图片、缺乏细节掌控、垫图修改不听话”的痛点！

---

## ✨ 核心特色与痛点解决

1. **深度对齐 OpenAI 官方 Images 2.5 生产级规范**：
   - **摒弃无效口水词**：不再使用 "8k, masterpiece, hyper-realistic" 等低效词，而是生成包含**主体材质、动态交互、多层环境、镜头光圈 (85mm/35mm)、电影布光 (体积光/轮廓光)**的专业结构化简报 (The Brief)。
   - **支持 2.5 核心的“稳定性控制” (Stability vs Change)**：修改旧图时，明确约束哪部分保持稳定（如面部、服装、布局），哪部分发生变化。
   - **支持视觉垫图分析**：上传参考图，AI 视觉解析构图与光影，秒级转译为风格迁移提示词。

2. **极致方便、快捷的 3 种使用形态**：
   - **形态一：ChatGPT 页面内原生注入**
     - 打开 `chatgpt.com`，在输入框上方自动出现 `✨ 润色生图` 按钮（支持快捷键 `Alt + P`）。
     - 随手写几个粗略词或拖入参考图，点击生成后，支持**一键回填到 ChatGPT 原生输入框**，省去来回复制粘贴！
   - **形态二：全局侧边栏独立工坊 (Chrome Side Panel)**
     - 在任何网页（浏览图片网站、寻找灵感时），点击浏览器右上角插件图标即可唤起常驻侧边栏。
     - 支持拖拽、粘贴截图、预设风格标签（电影写实、3D盲盒、日系动漫、极简等）一键选择、历史记录管理。
   - **形态三：任意网页图片右键**
     - 在任意网页右键任意图片 -> 选择 `✨ 提取此图灵感并生成 ChatGPT 生图提示词`，自动唤起工坊并载入该图。

3. **灵活强大的模型接入**：
   - **Google Gemini (推荐)**：支持 `gemini-2.0-flash` / `gemini-1.5-flash`，多模态看图精准、响应极速、拥有充裕的免费额度。
   - **OpenAI 官方**：支持 `gpt-4o` / `gpt-4o-mini`。
   - **自定义中转与兼容接口**：支持 OneAPI、SiliconFlow 等任意 OpenAI 兼容 Base URL。
   - **离线安全降级**：即便一时未配置 API Key，内置的官方规则模版库也能直接扩写高品质提示词，永不报错中断。

---

## 🚀 极速安装指南 (只需 3 步)

1. 打开谷歌浏览器（Google Chrome），在地址栏输入并回车访问：
   ```text
   chrome://extensions/
   ```
2. 在右上角开启 **开发者模式 (Developer mode)** 开关。
3. 点击左上角的 **“加载已解压的扩展程序” (Load unpacked)** 按钮，选择以下文件夹：
   ```text
   j:\gemini AI\chatgpt-image-prompt-enhancer
   ```
4. 安装完成！点击浏览器右上角的“拼图”图标，将本插件图钉固定在工具栏上。

---

## ⚙️ 首次配置说明

1. 右键点击插件图标选择 **“选项” (Options)**，或在侧边栏点击齿轮图标。
2. 选择 AI 服务商（例如 **Google Gemini** 或 **OpenAI**），填入您的 API Key。
   - *Gemini 免费 Key 获取*：[Google AI Studio](https://aistudio.google.com/app/apikey)
   - *OpenAI Key 获取*：[OpenAI Platform](https://platform.openai.com/api-keys)
3. 点击 **“🔌 测试连接”**，看到测试成功提示后点击 **“💾 保存设置”** 即可！

---

## 💡 使用模式演示

| 模式 | 适用场景 | 官方 2.5 规则体现 |
| :--- | :--- | :--- |
| **🌟 从头全新构思** | 只有粗略脑洞（如“吃面的猫咪”） | 自动扩写为完整 Brief：主体形态、光影氛围、相机焦段与光圈 |
| **🖼️ 垫图参考重绘** | 看到一张喜欢的图想借鉴其风格或构图 | 提取原图配色系统与构图语言，融合用户新需求 |
| **🔄 局部修改 (稳定)** | 已有一张图，只想改部分细节 | 明确标注 `Keep ... identical, modify only ...`，精准保真 |

---

## 📂 项目结构

```text
chatgpt-image-prompt-enhancer/
├── manifest.json            # Chrome 扩展配置文件 (Manifest V3)
├── background/
│   └── service-worker.js    # 后台进程：右键菜单、跨域请求代理、侧边栏控制
├── content/
│   ├── chatgpt-injector.js  # ChatGPT 页面注入：捕获输入框、一键回填、悬浮模态窗
│   └── chatgpt-injector.css # 适配 ChatGPT 深浅色主题的现代毛玻璃 UI
├── sidepanel/
│   ├── sidepanel.html       # 全局侧边栏提示词工作室
│   ├── sidepanel.js         # 侧边栏交互逻辑与历史记录存储
│   └── sidepanel.css        # 侧边栏现代化设计
├── options/
│   ├── options.html         # 配置中心：模型切换与连接测试
│   ├── options.js           # 配置持久化与测试请求
│   └── options.css          # 设置页美化
├── lib/
│   ├── prompt-engine.js     # 对齐 OpenAI 官方 Images 2.5 的核心 Prompt 规范
│   ├── api-client.js        # 多模态（图片+文本）API 请求封装
│   └── storage.js           # Chrome Storage 安全本地存储
└── icons/                   # 扩展图标 (16x16, 48x48, 128x128)
```
