# 🧰 页面 MCP SDK 开发文档

**包名**：`page-mcp-sdk`
**目标**：为网页和浏览器插件提供统一接口以注册、发现与执行 MCP。

---

## 🚀 一、安装

```bash
npm install page-mcp-sdk
# 或通过 CDN
<script src="https://cdn.example.com/page-mcp-sdk/index.js"></script>
```

---

## ⚙️ 二、初始化

```ts
import { createMcpRuntime } from "page-mcp-sdk";

const runtime = createMcpRuntime({
  locale: "zh-CN",
  remote: {
    registryUrl: "https://mcp-registry.example.com",
    publicKey: "BASE64-ED25519-PUBKEY"
  },
  sourcePreference: ["inline", "wellKnown", "remote"]
});
```

---
## 🎯 三、典型使用场景

- 站点页面：使用 `runtime.mcp.register()` 或 `inlineDescriptors` 暴露本地 MCP。
- 嵌入式 AI：依据 `sourcePreference` 发现页面 MCP，或通过 `remote.collectionId` / `store` 获取远程集合。
- 浏览器插件：在内容脚本中可调用 `createBrowserExtensionRuntime`，根据站点域名自动匹配集合配置；`discover()` 后使用 `resources` / `tools`。

---

## 🧱 四、站点注册本地 MCP

```ts
runtime.mcp.register({
  version: "2025-06-18",
  api: "1.0.0",
  resources: [
    { uri: "page://selector/h1", name: "Page Title", description: "主标题" }
  ],
  tools: [
    {
      name: "search",
      description: "站内搜索",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      },
      script: `(input)=>{ const i=document.querySelector('#search-box'); if(i){i.value=input.query; document.querySelector('#search-button').click(); return 'OK';} return 'Fail'; }`
    }
  ]
});
```

---

## 📚 五、使用 API

### 1. 获取资源

```ts
const resources = await runtime.resources.list();
const title = await runtime.resources.read("page://selector/h1");
console.log(title.contents[0].text);
```

### 2. 调用工具

```ts
const result = await runtime.tools.call("search", { query: "MCP SDK" });
console.log(result);
```

### 3. 使用 Prompt

```ts
const plan = runtime.prompts.prepare("page-plan", {});
const consent = runtime.prompts.prepare("consent", {
  operation: "搜索",
  selectors: ["#search-box"],
  scope: "仅本页"
});
```

### 4. 远程 MCP 集合（Store）

```ts
const runtime = createMcpRuntime({
  store: {
    baseUrl: "https://store.example.com/api/",
    apiKey: "PUBLIC-OR-SIGNED-TOKEN"
  }
});

if (runtime.store) {
  const collections = await runtime.store.listCollections({ publisher: "example" });
  const overview = await runtime.store.getCollectionOverview(collections.items[0]!.id);
  const descriptors = await runtime.store.getCollectionDescriptors(collections.items[0]!.id);
  for (const descriptor of descriptors) {
    runtime.mcp.register(descriptor);
  }
}
```

---

## 🔐 六、安全机制

* 自动校验 `inputSchema` 与输出结构；
* 工具执行前触发 `consent` 流程；
* 仅允许访问声明的选择器；
* 远程 MCP 含签名验证；
* 沙盒执行工具脚本（无 `eval` 权限）；
* 调用记录具备 `auditId` 可追踪。

---

## 🧩 七、插件适配示例

```ts
// content-script.ts
const runtime = createBrowserExtensionRuntime({
  sourcePreference: ["inline", "remote"],
  mappings: [
    {
      match: /example\.com$/,
      remote: {
        collectionId: "store-collection-id",
        store: { baseUrl: "https://mcp-store.io/api/" }
      }
    }
  ],
  defaultRemote: { wellKnownPath: "/.well-known/mcp.json" }
});

await runtime.mcp.discover();
const pageTitle = await runtime.resources.read("page://selector/h1");
console.log("Title:", pageTitle.contents[0].text);

await runtime.tools.call("search", { query: "MCP 页面协议" });
```

---

## 🧭 八、扩展点

| 模块                              | 功能            |
| ------------------------------- | ------------- |
| `runtime.mcp.discover()`        | 自动发现本地或远程 MCP |
| `runtime.audit.log()`           | 记录工具调用日志      |
| `runtime.prompts.list()`        | 获取全部模板        |
| `runtime.permissions.check()`   | 检查执行权限        |
| `runtime.resources.subscribe()` | 订阅资源变更（可选）    |

---

## 📘 九、开发者建议

* MCP 文件应可缓存，含签名与版本；
* 工具脚本需幂等、可回退；
* 强烈建议支持国际化 Prompts；
* 调用链：**Plan → Consent → Act → Verify → Summarize**；
* 在浏览器插件中集成用户授权弹窗。

---

## 🛠️ 开发与构建

```bash
npm install
npm run build
npm run test
```

* `npm run check` 仅执行类型检查（不输出编译结果）；
* `npm run test` 使用 Vitest 执行单元/集成测试并输出覆盖率；
* 构建产物输出至 `dist/`，包含 ESM 与类型声明文件；
* `src/index.ts` 暴露 `createMcpRuntime` 与全部类型定义。
