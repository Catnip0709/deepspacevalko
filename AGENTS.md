# Valkophone 后续 Agent 开发指南

## 1. 项目定位

Valkophone 是一个纯前端同人手机网站，部署在 GitHub Pages。用户拿到的是“猎人小姐自己的 iPhone”，互动对象是敖尹，也可称为 `valko`、`oi`、`小狼`。

后续开发要优先维护“私人手机”的沉浸感：用户打开后应直接看到手机桌面，而不是产品介绍页、营销页或管理后台。

## 2. 产品边界

默认保持纯前端架构，除非用户明确要求，否则不要加入后端、数据库、登录账号、云端同步或服务端支付。

当前产品边界：

- 首屏是猎人小姐手机桌面。
- 桌面 App 包含：微信、波万、他的手机、便签、设置。
- 桌面 App 上方有“临空市天气”小组件。
- 微信属于猎人小姐。
- 微信底部 tab 只有：`聊天`、`朋友圈`。
- 聊天列表只有一个联系人：敖尹。
- 敖尹头像统一使用 `🐺`。
- 敖尹称呼猎人小姐为“小铃兰”。
- 天气组件中的提醒署名使用 `oi：`，不要写成 `敖尹：`。
- 不在 UI 中展示系统提示词或代码实现说明；设置页允许编辑结构化人设字段，但不开放底层 Prompt 和工具协议。

## 3. 技术栈

当前技术栈：

```text
React
TypeScript
Vite
lucide-react
GitHub Pages
localStorage
DeepSeek OpenAI-compatible API
```

常用命令：

```bash
npm run dev
npm run dev:host
npm run build
npm run preview
```

手机本地调试使用：

```bash
npm run dev:host
```

然后用手机访问电脑局域网 IP，不要让用户在手机上访问 `127.0.0.1`。

## 4. 当前代码结构

当前结构：

```text
src/
  main.tsx
  styles.css
  config/
    aoyinPersona.ts
    redemptionCodes.ts
  harness/
    deepseekClient.ts
```

目前 `src/main.tsx` 仍然包含多数 UI 组件。这对 MVP 小改动可以接受，但后续新增 App 或较大功能时，应逐步拆分。

推荐目标结构：

```text
src/
  app/
    App.tsx
    types.ts
    storageKeys.ts
  components/
    PhoneFrame.tsx
    StatusBar.tsx
    avatars.tsx
    IconButton.tsx
  desktop/
    Desktop.tsx
    WeatherWidget.tsx
    stickyNote.ts
  apps/
    wechat/
      WechatApp.tsx
      ChatList.tsx
      ConversationShell.tsx
      MomentsFeed.tsx
      momentsData.ts
      momentPrompts.ts
    settings/
      SettingsApp.tsx
      UnlockSettings.tsx
      DeepSeekSettings.tsx
    his-phone/
      HisPhoneApp.tsx
    pet/
      PetApp.tsx
      PetScene.tsx
      CareLog.tsx
      petData.ts
      petEngine.ts
  config/
    aoyinPersona.ts
    redemptionCodes.ts
  harness/
    deepseekClient.ts
    messageBuilders.ts
  storage/
    apiKeyStore.ts
    chatStore.ts
    unlockStore.ts
```

拆分原则：

- 小修可以在现有文件里完成。
- 新增一个 App 时，优先新建 `src/apps/<app-name>/`。
- 新增桌面小组件时，优先新建 `src/desktop/<WidgetName>.tsx`。
- 新增跨 App 复用 UI 时，放到 `src/components/`。
- 新增模型请求、Prompt 构造、流式解析时，放到 `src/harness/`。
- 新增本地存储读写时，放到 `src/storage/`。

## 5. 状态管理原则

当前项目不引入全局状态库。默认使用 React state 和 localStorage。

顶层状态适合放：

- 当前打开的 App / screen。
- 手机是否解锁。
- DeepSeek API Key。
- 当前模型。
- 跨 App 共享的数据。

App 内部状态适合放：

- 微信内部 tab。
- 微信聊天列表/对话页面状态。
- 设置页当前子页面。
- 表单输入草稿。
- 小组件点击状态。
- 波万养宠状态与动作菜单。

不要把所有状态都塞进顶层 `App`。如果一个状态只服务某个组件，就留在该组件内部。

## 6. 文案维护位置

文案要按职责放置，不要到处散落。

推荐规则：

- 默认角色人设、不可修改的敖尹核心设定、Prompt 构造：`src/config/aoyinPersona.ts`
- 用户自定义人设存储：`src/storage/personaStore.ts`
- 波万状态读写：`src/storage/petStore.ts`
- 初始朋友圈内容：后续应迁移到 `src/apps/wechat/momentsData.ts`
- 朋友圈 AI 回复 prompt：后续应迁移到 `src/apps/wechat/momentPrompts.ts`
- 桌面便签内容：后续应迁移到 `src/desktop/stickyNote.ts`
- 天气状态和 oi 提醒：后续应迁移到 `src/desktop/WeatherWidget.tsx` 或 `src/desktop/weatherData.ts`
- 设置页说明文案：`src/apps/settings/` 下对应子页面
- 错误提示：靠近触发错误的业务逻辑，但不要重复写很多份

文案风格：

- 不要解释“这是 AI”“这是 prompt”“这是功能说明”。
- 文案应像手机里的真实内容。
- 敖尹语气：克制、直接、黏人但成熟，有保护欲，不强迫、不威胁、不越界。
- 猎人小姐不是弱者，文案中不要把她写成完全被保护的被动角色。

## 7. DeepSeek 接入准则

DeepSeek 由浏览器前端直连。用户已确认 CORS 可用。

统一通过：

```text
src/harness/deepseekClient.ts
```

不要在 UI 组件里直接写：

```ts
fetch('https://api.deepseek.com/...')
```

当前模型：

```text
deepseek-v4-flash
deepseek-v4-pro
```

API Key 规则：

- 用户自己填写。
- 保存在当前浏览器 localStorage。
- 不上传到自有服务器。
- 不写入日志。
- 不展示完整 Key，只展示脱敏状态。

Prompt 规则：

- 默认人设和敖尹不可修改的姓名、年龄、身份、能力写在 `src/config/aoyinPersona.ts`。
- 用户可在设置页编辑结构化人设字段，配置仅保存在当前浏览器；不允许直接编辑或展示 system prompt。
- 人设 Prompt 必须通过 `buildAoyinSystemPrompt` 构造，不要在 UI 或业务组件中拼接。
- 不要在界面展示 system prompt。
- 微信聊天使用人设 + 完整聊天上下文；达到模型上下文上限前不要自行截断。
- 朋友圈回复使用场景化短 prompt，只生成一条短评论。
- 不要让模型输出“敖尹：”这种前缀，UI 会负责展示说话人。
- 定位、红包等微信能力统一通过 `src/harness/` 下的伪工具注册、结构化协议和参数校验实现，不要在 UI 或 `App.tsx` 中解析特殊文本标记。

## 8. 买断兑换码维护

当前买断解锁是纯前端弱保护，适合小范围使用。

文件职责：

```text
src/config/redemptionCodes.ts
private/redemption-codes.txt
```

规则：

- `src/config/redemptionCodes.ts` 只放兑换码 hash，可以提交。
- `private/redemption-codes.txt` 只给运营者保存明文码，不要提交。
- `private/` 必须保持在 `.gitignore` 里。
- 删除 `private/redemption-codes.txt` 不影响线上匹配。
- 当前 salt 是 `valkophone:v1`，不要随意修改；修改会导致旧 hash 全部失效。
- 兑换成功后，解锁状态保存在 localStorage。
- 兑换码如果需要在设置页回显，可以存在 localStorage；但不要把明文码提交进源码。

新增兑换码流程：

1. 生成新的明文兑换码。
2. 用同一个 salt 计算 SHA-256。
3. 把 hash 追加到 `redemptionCodeHashes`。
4. 明文码只交给运营者保存或发给用户。
5. 运行 `npm run build`。

## 9. UI 与样式规范

整体视觉方向：

- 清新森林风
- 磨砂玻璃风
- iPhone 风
- 可爱但不幼稚
- 私密、轻盈、日常

颜色规则：

- 优先使用 `src/styles.css` 里的 CSS 变量。
- 不要把页面做成单一绿色色块。
- 用奶油白、薄雾绿、柔和阴影和低饱和点缀增加层次。
- 不使用紫蓝渐变、营销风大色块、过度装饰背景。

组件规则：

- 不要在页面里新增落地页式 hero。
- 不要把整个页面做成卡片套卡片。
- 卡片只用于明确的功能块、重复列表项、弹层。
- 图标按钮优先使用 `lucide-react`。
- 图标按钮必须有 `aria-label`。
- 按钮、标签、输入框在手机宽度下不能文字溢出。
- 不要重新加入底部 iPhone home indicator；它曾经遮挡微信 tab。
- 移动端高度继续使用 `100dvh`，并保留 `100vh` fallback。

## 10. App 扩展规范

新增桌面 App 时：

1. 在桌面 App 注册列表中增加入口。
2. 新建 `src/apps/<app-name>/`。
3. App 内部视图状态放在该 App 组件内。
4. 只把必要的全局状态通过 props 传入。
5. 样式命名使用 App 前缀，避免污染其它 App。

推荐命名：

```text
PhotoApp
CalendarApp
VoiceMailApp
MoodApp
GiftBoxApp
```

不要为了一个小功能引入路由库。当前手机内 App 切换用枚举状态即可。

## 11. 存储规范

当前使用 localStorage。

规则：

- 存储 key 要集中定义。
- key 命名要带项目或功能前缀，避免和其它网站冲突。
- 读取 localStorage 必须 try/catch，避免隐私模式或浏览器限制导致白屏。
- 存储结构变更时要兼容旧数据。
- API Key、兑换码、聊天记录都只存在用户本机。

适合 localStorage 的数据：

- 解锁状态
- API Key
- 模型选择
- 聊天记录
- 波万状态与照料记录
- 简单 UI 偏好

不适合 localStorage 的数据：

- 大量图片
- 大量长文本记录
- 多用户共享数据
- 需要防篡改的授权数据

## 12. 部署规范

GitHub Pages 必须发布 Vite 构建产物 `dist`，不能发布仓库根目录。

正确 workflow：

```text
.github/workflows/deploy.yml
```

错误模式：

```yaml
with:
  path: '.'
```

这个错误会把源码直接发布出去，线上 HTML 会引用 `/src/main.tsx`，导致白屏。

正确的线上 HTML 应引用构建后的资源：

```html
<script type="module" crossorigin src="/deepspacevalko/assets/index-xxxx.js"></script>
```

不应该出现：

```html
<script type="module" src="/src/main.tsx"></script>
```

Vite base 规则：

- 本地构建可使用相对路径。
- GitHub Actions 构建时应使用仓库名路径，例如 `/deepspacevalko/`。
- 修改 `vite.config.ts` 后要做 GitHub Actions 模拟构建检查。

## 13. 验证清单

每次代码改动后至少运行：

```bash
npm run build
```

涉及 GitHub Pages、Vite base、workflow 时额外运行：

```bash
GITHUB_ACTIONS=true GITHUB_REPOSITORY=Catnip0709/deepspacevalko npm run build
```

然后检查：

```bash
sed -n '1,40p' dist/index.html
```

确认资源路径是 `/deepspacevalko/assets/...`。

涉及 UI 改动时检查：

- 桌面手机尺寸是否正常。
- 手机端是否有横向滚动。
- 微信底部 tab 是否被遮挡。
- 设置页长内容是否可滚动。
- 输入框、按钮文字是否溢出。
- 未解锁状态是否能正确跳转设置。
- 已解锁状态是否能进入微信和他的手机。

涉及 DeepSeek 时检查：

- 未填 Key 时不发请求。
- Key 无效时错误提示清楚。
- 请求中不包含不必要的敏感信息。
- 不用真实 Key 做自动化测试，除非用户明确要求。

## 14. 常见问题

线上白屏：

- 先查看网页源代码。
- 如果看到 `/src/main.tsx`，说明 Pages 发布了源码根目录，不是 `dist`。
- 检查 `.github/workflows/` 下是否有其它 Pages workflow。
- 删除会上传 `path: '.'` 的 workflow。

手机打不开但电脑能打开：

- 先确认线上 HTML 是否为构建产物。
- 再看是否有 `viewport` meta。
- 再检查 Vite base 是否匹配 GitHub Pages 路径。
- 最后才排查 CSS 移动端布局。

兑换码匹配失败：

- 确认用户输入的码没有漏字符。
- 确认新增 hash 使用当前 salt：`valkophone:v1`。
- 确认 hash 已提交到 `src/config/redemptionCodes.ts`。

朋友圈 AI 不回复：

- 先检查是否已填写 DeepSeek API Key。
- 再检查浏览器控制台网络请求。
- 再检查 DeepSeek 模型名是否仍为当前支持模型。

## 15. 开发态度

这个项目的核心不是功能数量，而是关系感、沉浸感和稳定性。

后续 Agent 开发时优先：

- 小步改动。
- 保持纯前端。
- 保护现有手机氛围。
- 避免把 `main.tsx` 继续扩大。
- 每次改动都跑构建。
- 不提交明文兑换码、API Key 或其它私密内容。
