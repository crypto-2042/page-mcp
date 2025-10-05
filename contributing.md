---

# 📘 页面 MCP 规范文档（Page Model Context Protocol Specification）

**版本**：1.0（基于 MCP 2025-06-18）
**适用范围**：网页嵌入式 AI Agent、浏览器插件
**目标**：定义网页场景下的资源、工具、提示（prompts）与交互方式，使网页内容与 AI 模型通过 MCP 标准进行安全通信。

---

## 🧩 一、概述

页面 MCP（Page MCP）是 **Model Context Protocol (MCP)** 的网页扩展版本。
它允许：

* 网页声明自身可被访问的资源（DOM 元素、元信息等）；
* 注册可由 AI 调用的页面操作（工具）；
* 提供一组 prompts（提示模板），引导模型以规范方式与页面交互；
* 支持本地（站点内置）与远程（服务端商店）两种分发方式。

---

## 🧱 二、核心结构

### 1. 顶层结构

```json
{
  "version": "2025-06-18",
  "api": "1.0.0",
  "resources": [],
  "tools": [],
  "prompts": [],
  "permissions": {},
  "metadata": {}
}
```

| 字段            | 类型     | 描述                   |
| ------------- | ------ | -------------------- |
| `version`     | string | MCP 核心版本             |
| `api`         | string | 页面 MCP 扩展版本          |
| `resources`   | array  | 页面资源声明列表             |
| `tools`       | array  | 页面可调用工具列表            |
| `prompts`     | array  | 结构化提示模板列表            |
| `permissions` | object | 资源与工具访问控制            |
| `metadata`    | object | 附加信息（签名、域名、作者、更新时间等） |

---

## 🌐 三、资源（Resources）

资源是页面暴露给 AI 的数据项（通常通过选择器获取）。

```json
{
  "uri": "page://selector/h1",
  "name": "Page Title",
  "description": "The main title of the page",
  "mimeType": "text/plain"
}
```

| 字段            | 类型     | 描述                                           |
| ------------- | ------ | -------------------------------------------- |
| `uri`         | string | 使用 `page://selector/` 或 `page://xpath/` 表示位置 |
| `name`        | string | 资源名称                                         |
| `description` | string | 说明                                           |
| `mimeType`    | string | 内容类型（如 `text/plain`、`image/png`）             |

**资源访问方式：**

* `resources/list` → 列出所有资源
* `resources/read` → 按 `uri` 获取内容

---

## 🛠️ 四、工具（Tools）

工具是可由 AI 或插件调用的操作（如点击、搜索、导航）。

```json
{
  "name": "search",
  "description": "Performs a search on the website",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    },
    "required": ["query"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "success": { "type": "boolean" },
      "message": { "type": "string" }
    }
  },
  "sideEffects": "local",
  "script": "(input) => { const s=document.querySelector('#search-box'); if(s){ s.value=input.query; document.querySelector('#search-button').click(); return {success:true,message:'Search performed.'}; } return {success:false,message:'Not found.'}; }"
}
```

| 字段             | 描述                                  |
| -------------- | ----------------------------------- |
| `name`         | 工具唯一标识                              |
| `description`  | 功能说明                                |
| `inputSchema`  | 输入参数定义                              |
| `outputSchema` | 输出结构定义                              |
| `sideEffects`  | 操作副作用（`none` / `local` / `network`） |
| `script`       | 执行逻辑（在受限沙盒中执行）                      |

---

## 💬 五、提示模板（Prompts）

Prompts 是模型调用资源与工具的指令模板集合。

```json
{
  "id": "page-plan",
  "name": "Plan Before Act",
  "role": "system",
  "language": "zh-CN",
  "description": "规划操作步骤与授权需求",
  "template": "请输出操作计划: {\"goal\":\"...\",\"steps\":[\"...\"],\"tools\":[\"...\"]}",
  "hints": { "temperature": 0.1 }
}
```

| 字段            | 描述                              |
| ------------- | ------------------------------- |
| `id`          | 唯一标识                            |
| `name`        | 模板名称                            |
| `role`        | 模型角色（system / user / developer） |
| `language`    | 模板语言                            |
| `template`    | 提示内容，可包含占位符                     |
| `inputSchema` | 变量结构定义                          |
| `hints`       | 模型参数提示                          |

**典型 Prompts：**

* `page-read`：读取页面资源
* `page-plan`：调用前规划
* `consent`：操作授权提示
* `page-act`：执行工具
* `summarize-result`：总结结果

---

## 🔒 六、安全与权限

| 项目               | 说明           |
| ---------------- | ------------ |
| `selectorsAllow` | 允许访问的选择器范围   |
| `network`        | 是否允许网络副作用    |
| `sideEffects`    | 工具是否有页面或网络影响 |
| `consent`        | 是否需要用户授权执行   |
| `sandbox`        | 工具脚本沙盒隔离     |

---

## 🧭 七、本地与远程 MCP

* **本地 MCP**：由站点自身提供（内联 JSON、`/.well-known/mcp.json`、或 SDK 注册）；
* **远程 MCP**：由注册中心分发（签名验证、按域名/路径匹配）；
* **插件或嵌入 Agent** 需优先加载本地 MCP，若无则安全地拉取远程版本。

---

## 📦 八、完整示例

```json
{
  "version": "2025-06-18",
  "api": "1.0.0",
  "resources": [
    { "uri": "page://selector/h1", "name": "Page Title", "description": "Main title", "mimeType": "text/plain" }
  ],
  "tools": [
    { "name": "search", "description": "Perform search", "inputSchema": { "type": "object", "properties": { "query": { "type": "string" } } }, "script": "(input)=>{...}" }
  ],
  "prompts": [
    { "id": "page-plan", "template": "请输出调用计划...", "role": "system", "language": "zh-CN" }
  ],
  "permissions": { "selectorsAllow": ["h1", "#search-box"], "network": false },
  "metadata": { "domain": "example.com", "author": "Example Dev", "signature": "base64..." }
}
```
