# dsh-session-tabs（DSH 会话标签页）

[English](README.en.md) ｜ 中文

浏览器式会话标签页导航栏 for DeepSeek Harness (DSH)：每打开一个会话就多一个顶部标签——像浏览器那样点击切换、关闭、新建。当前会话高亮，运行状态一目了然。

## 界面预览

<img src="assets/overview.png" width="720" alt="标签栏总览：顶部标签条位于侧边栏右缘，支持多会话并行">

<img src="assets/tab-bar.png" width="720" alt="标签条特写：激活下划线、运行状态点、以及合并进同一行的会话头部（模式 / Session log）">

## 会话历史导航

标签历史是一份**激活日志**：每次切换（点标签、关闭激活标签、新建会话）都截断前进链并把当前会话追加到栈尾；关闭标签只移除标签条上的条目，**不**从历史中删除——回退落在已关闭的标签上时会把它重新打开。

```mermaid
flowchart LR
    HOME(("首页<br/>navIndex = −1"))
    A["会话 A"]
    B["会话 B"]
    C["会话 C"]
    CUR["会话 B*<br/>（当前）"]
    A --- B --- C
    A -. "后退越过第一条 → 首页" .-> HOME
    HOME -. "前进恢复第一条（不会回到首页）" .-> A
    C -. "关闭激活 C → 右邻 B 追加（普通切换）" .-> CUR
    classDef current fill:#eef2ff,stroke:#3964fe,stroke-width:2px;
    class CUR current
```

不同操作的结果：

```mermaid
flowchart TD
    OP{"对标签的操作"} -->|"关闭激活标签"| S1["切到右邻标签并记入历史<br/>（与普通切换一致）"]
    OP -->|"关闭未激活标签"| S2["当前会话不动<br/>不记录历史"]
    OP -->|"关闭全部标签"| S3["进入终结性首页<br/>后退恢复最近一条历史 · 前进无响应"]
    OP -->|"打开会话 / 新建"| S4["截断前进链 · 追加到栈尾"]
    S1 --> TIP["首页（navIndex = −1）始终在栈外：<br/>从首页回退到某个标签后按前进，<br/>只会回到历史条目，永远不会回到首页"]
    S3 --> TIP
    classDef tip fill:#fff7e6,stroke:#f7ad31,stroke-width:1px;
    class TIP tip
```

## 与既有布局的关系

标签栏位于**侧边栏旁边**（从侧边栏右缘开始，`position: fixed` 顶部条），**不会挤占侧边栏位置**：

- 侧边栏列保持原位（可拖拽 264–420px，折叠 rail 56px 时标签栏自动跟随）；
- 仅中心列内容下移 34px 为标签栏让位；
- 主题感知：使用 DSH 主题 token（`--dsw-alias-*`），亮/暗色自动适配。

## 功能

- 每个打开的会话一个标签（按打开顺序，MRU）
- 当前会话高亮（品牌色下划线，`data-active`）
- 状态点：运行中（品牌色脉冲）/ 等待交互（琥珀）/ 已完成（绿）
- × 关闭标签：
  - 关闭激活标签 = 普通切换——跳到**右邻标签**（最右则左邻），并按正常切换记入标签历史；
  - 关闭未激活标签：当前激活不动，**不记录历史**（关闭的会话仍可经历史回退恢复）；
  - 关闭最后一个标签：进入首页（无选中会话），回退键恢复最近的历史条目，前进键无响应。
- 鼠标中键：标签上 = 关闭该标签；侧边栏会话行上 = 后台打开为标签（不切换当前会话）
- 鼠标侧键：浏览器式会话历史导航——后退/前进在历史中逐条移动（回退时落在已关闭的标签上会重新打开为标签）；首页具有特殊性：从首页回退到某个标签后，前进键**不会**回到首页
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
- 依赖仅 `react`（shell 种子）与 Cordis 运行时；`sessions.clear()`（列表 store 的"清除选择到无会话视图"）仅在关闭最后一个标签时使用。

## License

MIT
