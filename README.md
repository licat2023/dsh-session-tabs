# dsh-session-tabs（DSH 会话标签页）

浏览器式会话标签页导航栏 for DeepSeek Harness (DSH)：每打开一个会话就多一个顶部标签——像浏览器那样点击切换、关闭、新建。当前会话高亮，运行状态一目了然。

## 与既有布局的关系

标签栏位于**侧边栏旁边**（从侧边栏右缘开始，`position: fixed` 顶部条），**不会挤占侧边栏位置**：

- 侧边栏列保持原位（可拖拽 264–420px，折叠 rail 56px 时标签栏自动跟随）；
- 仅中心列内容下移 34px 为标签栏让位；
- 主题感知：使用 DSH 主题 token（`--dsw-alias-*`），亮/暗色自动适配。

## 功能

- 每个打开的会话一个标签（按打开顺序，MRU）
- 当前会话高亮（品牌色下划线，`data-active`）
- 状态点：运行中（品牌色脉冲）/ 等待交互（琥珀）/ 已完成（绿）
- × 关闭标签：关闭当前标签自动切到相邻标签
- ＋ 新建会话（`workspaces.startSession()`）
- 标签过多时横向滚动（隐藏滚动条）
- 纯客户端实现，无 Host 依赖，无持久化写入

## 安装（部署级，刷新后自动加载）

```sh
dsh plugin --profile web add D:\Project\2025-2026-02\dsh-session-tabs
```

或手动：在 profile 的 `package.json` 加入依赖、在 `cordis.patch.yml` 插入：

```yaml
- insert:
    - id: dsh-session-tabs
      name: dsh-session-tabs
```

然后 `pnpm install` 并重启 DSH（或触发 profile patch 热重载后刷新页面）。之后每次页面加载标签栏自动出现，无需批准、无需手动激活。

## 卸载

```sh
dsh plugin --profile web remove dsh-session-tabs
```

## 开发说明

- `lib/client.js` 是 `__ModuleLoader__.load` 格式的浏览器 bundle（与已安装社区插件一致），经 `exports["./client"]` 由 web shell 的模块系统加载；
- `package.json` 声明 `dsh.client`（`platform: 'web'`）；
- 依赖仅 `react`（shell 种子）与 Cordis 运行时；不依赖 `sessions.clear()`（当前版本无此方法）。

## License

MIT
