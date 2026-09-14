# 🎨 ChatGPT 生图提示词大师 (ChatGPT Images 2.5 官方规范)

专为 **ChatGPT Images 2.5** 打造的谷歌浏览器（Chrome）扩展程序。
解决在 ChatGPT 生图时“词穷、生不出满意的画风细节、多图难以融合、垫图微调改走样”的核心痛点！

---

## ✨ 核心特色与痛点解决

1. **深度对齐 OpenAI 官方 Images 2.5 生产级规范**：
   - **摒弃无效口水词**：不再堆砌 "8k, masterpiece, trending on artstation" 等空洞词汇；自动构思包含**主体材质、动态细节、环境纵深、镜头规格 (如 50mm f/1.8 / 85mm)、电影级布光 (体积光/冷暖边缘光)**的专业结构化简报 (The Brief)。
   - **严格遵循“稳定与变更”法则 (Stability vs Change)**：基于旧图或参考图微调时，严谨叙述“保留角色面容、服装与构图基准不变，仅修改特定目标”。
   - **多图融合 (Multi-Image Synthesis)**：支持同时上传多达 6 张参考图，AI 智能提炼角色主体、艺术画风、配色光影并进行有机融合。

2. **6 大专业高阶辅助创作功能**：
   - 📐 **画幅景别比例自适应**：支持 `1:1 (方形头像)`、`16:9 (横版宽画幅)`、`9:16 (竖版手机壁纸)`、`4:3 (经典摄影)`、`21:9 (变形宽银幕电影)`，自动融入符合该画幅的景别焦段与空间张力叙述。
   - 🚫 **严禁与避坑约束 (负向叙事化过滤)**：一键启用 `🔤 无乱码文字水印`、`✋ 规避手指畸形`、`🧹 纯净不杂乱`、`✨ 拒绝塑料CG假感`、`🔍 拒绝低清模糊`，以官方偏好的严谨自然语言织入 Brief。
   - ✏️ **2D 空间涂鸦构图板**：内置轻量画板，随手涂鸦主体站位、地平线与空间轮廓，一键转换为参考图让 AI 解析空间布局。
   - 🪄 **消息流浮动微调按钮**：在 ChatGPT 对话流中，鼠标悬停在 AI 生成的图片上直接出现 `🪄 基于此图微调`，一键拉取图片作为稳定基准开始下一轮迭代。
   - ⭐ **提示词精选收藏夹**：一键收藏满意的生产级提示词，随时在侧边栏或主界面查阅与一键复用。
   - 🟢 **API 健康状态指示灯**：实时监测本地或远程 VPS 服务连通性。

3. **3 种便捷使用形态**：
   - **形态一：ChatGPT 页面内原生注入**
     - 打开 `chatgpt.com`，在输入框上方自动注入 `✨ 润色生图` 按钮（支持全局快捷键 `Alt + P`）。
     - 输入完毕点击后，支持**一键回填到 ChatGPT 原生输入框**，省去来回复制粘贴！
   - **形态二：全局常驻侧边栏 (Chrome Side Panel)**
     - 浏览任意图片网站、寻找设计灵感时，点击浏览器右上角插件图标即开即用。
   - **形态三：任意网页右键搜图生词**
     - 右键任意网页图片 -> 选择 `✨ 提取此图灵感并生成 ChatGPT 生图提示词`，秒级开启动态灵感分析。

4. **全面灵活的 AI 驱动接入**：
   - **🖥️ 自建 VPS / CPAMC (CLI Proxy API)**：专为个人专属中转代理深度适配，支持 Claude 3.7 Sonnet / GPT-4o 等多模态模型。
   - **⚡ Google Gemini**：支持 `gemini-2.0-flash` / `gemini-1.5-flash`，看图敏锐、响应迅速。
   - **🤖 OpenAI 官方**：支持 `gpt-4o` / `gpt-4o-mini`。
   - **🌐 自定义中转**：兼容 OneAPI、SiliconFlow 等标准接口。
   - **🛡️ 离线智能降级**：即便离线或未配置 Key，内置官方模版库也能直接扩写输出高品质 Brief。

---

## 🚀 极速安装指南 (只需 3 步)

1. 打开谷歌浏览器（Google Chrome），在地址栏访问：
   ```text
   chrome://extensions/
   ```
2. 开启右上角 **“开发者模式” (Developer mode)** 开关。
3. 点击左上角 **“加载已解压的扩展程序” (Load unpacked)**，选择本项目根目录：
   ```text
   chatgpt-image-prompt-enhancer
   ```
4. 安装完成！点击浏览器右上角的“拼图”图标，将本插件图钉固定在工具栏上。

---

## ⚙️ 模型配置说明

1. 右键插件图标点击 **“选项”**，或在侧边栏点击顶部齿轮按钮。
2. 选择您的 AI 服务商（如自建的 **CPAMC**、**Google Gemini** 或 **OpenAI**），填入对应的 API 地址与密钥。
3. 点击 **“🔌 测试连接”** 验证连通性，点击 **“💾 保存设置”** 即可！

---

## 📂 项目结构

```text
chatgpt-image-prompt-enhancer/
├── manifest.json            # Chrome 扩展配置文件 (Manifest V3)
├── background/
│   └── service-worker.js    # 后台进程：右键菜单、跨域请求代理、侧边栏控制
├── content/
│   ├── chatgpt-injector.js  # ChatGPT 页面注入：输入框捕获、浮动微调按钮、涂鸦板、回填
│   └── chatgpt-injector.css # 页面注入界面样式（深浅色主题适配）
├── sidepanel/
│   ├── sidepanel.html       # 全局侧边栏提示词工作室
│   ├── sidepanel.js         # 侧边栏交互逻辑、画板、画幅与收藏夹系统
│   └── sidepanel.css        # 侧边栏现代化设计规范
├── options/
│   ├── options.html         # 配置中心：CPAMC / Gemini / OpenAI 切换与模型拉取
│   ├── options.js           # 设置持久化与连通性测试
│   └── options.css          # 设置页样式
├── lib/
│   ├── prompt-engine.js     # 对齐 OpenAI 官方 Images 2.5 Brief 结构与规则
│   ├── api-client.js        # 多模态（多参考图+文本）API 请求与自适应封装
│   └── storage.js           # Chrome Storage 安全本地存储与收藏夹管理
└── icons/                   # 扩展应用图标 (16x16, 48x48, 128x128)
```

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源发布。
