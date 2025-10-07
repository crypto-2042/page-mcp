# 发布 @page-mcp/sdk 至 npm 的步骤

1. **环境准备**
   - 安装 Node.js (>=18) 与 npm。
   - 运行 `npm login` 并确认具有 `@page-mcp` scope 的发布权限。

2. **更新版本**
   - 根据语义化版本语义运行 `npm version <patch|minor|major>`。
   - 该命令会更新 `package.json` / `package-lock.json` 并创建 git tag。

3. **安装依赖并构建**
   ```bash
   npm install
   npm run build
   npm run test
   ```
   - 确认 `dist/` 目录生成且测试全部通过。

4. **发布前验证**
   ```bash
   npm pack --dry-run
   ```
   - 检查 tarball 列出的文件与 README、license 等是否正确。

5. **正式发布**
   ```bash
   npm publish --access public
   ```
   - 若 scope 已配置为 public，可省略 `--access`。

6. **发布后操作**
   - 推送 git tag：`git push && git push --tags`
   - 在 README 或变更日志中记录版本更新。

> 提示：如需回滚，可使用 `npm unpublish @page-mcp/sdk@<version>`（24 小时内有效）。
