# 开发与发布

[← 返回 README](../README.md)

## 本地开发

使用支持当前 Vite 与 TypeScript 工具链的 Node.js 环境，并安装 pnpm。

```bash
pnpm install
pnpm dev
```

按开发服务器输出的地址安装开发脚本，在目标论坛页面调试。

```bash
pnpm typecheck
pnpm build
pnpm test
```

测试会读取构建产物，应先执行 `pnpm build`。本地测试通过不等于浏览器权限、站点验证和第三方图床已通过实站验证。

| 文件 / 目录 | 用途 |
| --- | --- |
| `src/features/` | 独立功能模块 |
| `src/settings/` | 设置面板 |
| `src/core/` | 配置、运行时与功能类型 |
| `src/views/` | 预览、互动与快捷回复视图 |
| `tests/` | 单元及构建产物测试 |
| `dist/nodeseek-plus-plus.user.js` | 正式安装脚本 |
| `dist/nodeseek-plus-plus.meta.js` | 更新检查用元信息 |
| `references/` | 上游参考代码与许可材料 |

隔离构建阶段版本：

```bash
pnpm build --mode stage
```

产物位于 `dist-stage/`，脚本名称为 `NodeSeek++ (Stage)`，不要作为正式版本上传。开发版与 Stage 版不自动检查更新。

## 一键发布

```bash
make deploy
```

要求位于 `main` 且没有未解决的合并冲突。命令依次检查远端、类型检查、递增版本、构建、测试，把全部未忽略的源码修改、版本号及两个 dist 文件一起提交，再推送 `origin/main`。不会强制推送或自动合并远端修改；同一分钟连续发布也会递增版本。

- `make deploy SKIP_CHECKS=1`：跳过类型检查和测试，仍检查分支与远端并重新构建。
- `make deploy-local`：只生成本地产物。

发布中途失败会保留文件和提交，处理后重试；若只是推送失败，直接重试 `git push origin main`。

更新检查只读取 `.meta.js` 中的版本号，不下载执行远程代码。默认安装与更新使用 GitHub 分发文件；Greasy Fork 通过 Webhook 异步同步，可能稍有延迟。

## Greasy Fork 同步（一次性绑定）

1. 在脚本的管理/同步页面设置代码同步地址：
   `https://raw.githubusercontent.com/rirh/nodeseek-plus/main/dist/nodeseek-plus-plus.user.js`
2. 在油叉账户的 Webhook 同步页面取得专属接收地址。
3. 在 GitHub 仓库 Settings → Webhooks 中添加该地址，订阅 push 事件。
4. 发布后检查 GitHub Webhook 的最近投递，以及油叉脚本页的版本号与同步错误。

Webhook 接收地址可能包含账户凭据，不要提交到仓库。`make deploy` 推送成功只代表 GitHub 已更新，油叉同步需另行确认。

## 手动发布到 Greasy Fork

1. 修改 `package.json` 的 `version`，保持脚本名称和 namespace 稳定。
2. 执行 `pnpm typecheck`、`pnpm build` 和 `pnpm test`。
3. 在 [Greasy Fork](https://greasyfork.org/zh-CN) 原脚本页面提交新版本，上传 `dist/nodeseek-plus-plus.user.js` 的完整内容并填写变更说明。
4. 用发布后的安装链接验证安装与升级。

构建使用非压缩输出，并把第三方说明与 highlight.js 许可证写入脚本。请保留 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) 和 [references/highlight.js.LICENSE](../references/highlight.js.LICENSE)，构建时会读取它们。发布前查看 [油叉代码规则](https://greasyfork.org/zh-CN/help/code-rules) 和 [元信息说明](https://greasyfork.org/zh-CN/help/meta-keys)。
