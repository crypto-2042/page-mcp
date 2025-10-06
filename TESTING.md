# 🧪 Page MCP SDK 测试方案

> 目标：在保障核心能力稳定的前提下，快速发现回归并覆盖主要交互路径。

---

## 测试金字塔

| 层级 | 主要覆盖模块 | 说明 |
| ---- | ------------ | ---- |
| 单元测试 | `utils/`, `managers/` | 纯函数与业务调度逻辑；使用 Vitest + ts-mockito 风格手写 mocks。 |
| 集成测试 | `createMcpRuntime` 及运行时行为 | 通过组合管理器验证资源读取、工具调用、审核日志链路。 |
| 端到端（未来） | 浏览器内容脚本 | 依赖真实 DOM/沙盒环境，暂未实施，计划使用 Playwright。 |

---

## 重点场景

1. **资源访问路径**
   - 正常读取：注册资源 → 自定义 resolver 返回内容。
   - 权限校验：`selectorsAllow` 未包含目标时抛出异常。
2. **工具调用链**
   - 输入/输出 JSON Schema 验证。
   - 同意流程（consent）允许/拒绝分支。
   - 审计日志记录成功与异常结果。
3. **MCP 发现流程**
   - Inline 描述符注册与去重。
   - 远程仓库响应归一化（含签名可选）。
4. **MCP Store 集合**
   - 集合分页、查询过滤组合逻辑。
   - 集合概览/完整 MCP 描述符返回。
5. **Prompt 管理**
   - 模板变量替换与 Schema 校验。
6. **Schema 工具函数**
   - `validateAgainstSchema` 对常见类型的通过/失败路径。

---

## 覆盖策略

- 覆盖率目标：
  - 语句 ≥ 85%
  - 分支 ≥ 80%
  - 工具执行、权限拒绝、注册流程至少一条断言。
- Mock 原则：
  - 仅对不可控依赖（`fetch`, `consentProvider`, `toolSandbox`, DOM）做 mock。
  - 通过轻量类/闭包模拟，而非引入大型 mocking 库。

---

## 工具链

- **测试框架**：Vitest（兼容 ESM + TypeScript）。
- **执行环境**：Node.js（默认），若需 DOM 行为使用 `jsdom` 环境。
- **断言**：内置 `expect`。
- **覆盖率**：Vitest 内置 Istanbul。

---

## 执行流程

```bash
npm install
npm run test        # 全量测试（含覆盖率）
npm run test:watch  # 监听模式
```

CI 建议执行顺序：

1. `npm run lint`（未来扩展）
2. `npm run check`
3. `npm run test`

---

## 未来扩展

- Playwright + 浏览器扩展模拟，实现真实 DOM 操作与 consent 弹窗交互链路。
- 覆盖远程签名校验中的 WebCrypto 失败/降级场景。
- 将端到端测试结果接入报告平台（如 Allure、GitHub Test Reporter）。
