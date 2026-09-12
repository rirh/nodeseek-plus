# NodeSeek++ 来源与功能去重矩阵

本文件依据 `references/upstream/` 下载快照进行静态审计；它是功能需求基线，不代表 NodeSeek++ 已实现或线上验证了全部条目。P=Pro 1.0.8，X=NodeSeek X 1.1.5，H=增强助手 2.6.0。快照检查日期：2026-09-12。

## 来源与授权声明

| 源脚本 | 来源 | 快照声明 | 作者信息 |
|---|---|---|---|
| P | https://update.greasyfork.org/scripts/567109/Nodeseek%20Pro.user.js | `@license GPL-3.0` | 元数据未列 `@author`，不得自行补写 |
| X | https://update.greasyfork.org/scripts/479426/NodeSeek%20X.user.js | `@license GPL-3.0` | dabao |
| H | https://update.greasyfork.org/scripts/559310/NodeSeek%20%E5%A2%9E%E5%BC%BA%E5%8A%A9%E6%89%8B.user.js | `@license MIT` | weiruankeji2025；namespace 指向其 GitHub 项目 |

保留源文件及声明作为来源证据。衍生分发应保留原有版权和许可声明，提供自身对应源代码及许可证文本；不能将 GPL 来源代码改标为仅 MIT。此处记录源声明，不对上游全部第三方依赖授权作额外推断。P、X 均加载 Layui 2.10.3；代码高亮还使用 highlight.js 资源，发布时应单独记录实际使用依赖。

## 合并需求矩阵

“合并”指只保留一套状态、监听、UI 与请求实现，不删除独有能力。

| 功能模块 | P | X | H | 合并要求及差异 |
|---|---|---|---|---|
| 自动签到 | 随机/固定5 | 随机/固定5 | 随机 | 同站点、同账号、同日单次状态；手动和自动共用请求 |
| 签到提示/手动入口 | 有 | 有 | 成功通知 | 保留可见结果、两种奖励选择 |
| 帖子连续加载 | 有 | 有 | 无 | 下一页 HTML 追加、分页和去重、保留头像及菜单行为 |
| 评论连续加载 | 有 | 有 | 无 | 不能只插 HTML：原版同步评论配置并挂载站点菜单 |
| 定时跳下一页 | 无 | 无 | 倒计时/启停/间隔 | 与连续加载不同；保留独立能力，不猜测不存在下一页 |
| 关键词过滤 | 隐藏/折叠 | 隐藏 | 无 | 一套规则执行器，保留展开入口 |
| 关键词高亮/管理 | 多色、关键词组、编辑管理 | 简单关键词文本 | 两组监控词 | 保留颜色/多词组；监控和过滤动作独立 |
| 权限帖过滤 | 根据自身等级隐藏锁定帖 | 同 | 无 | 标题虽称“低等级”，实际检查帖子要求等级大于用户 rank |
| 用户屏蔽 | 本地黑名单 + 官方屏蔽 | 官方添加 | 无 | 保留本地折叠/标记与官方远端操作的区别 |
| 好友管理/高亮 | 本地好友、按钮、列表 | 无 | 无 | 不是站点关注 API；本地状态明确标识 |
| 用户等级/详情 | 等级、注册天数、主题/评论/鸡腿/星尘等 | 等级或详情、新用户警告、缓存 | 无 | 共用按 UID 缓存请求，楼主/评论独立开关 |
| 名望诊断展示 | 额外诊断、简洁色、资料面板 | 注册天数警告 | 无 | 展示规则属于脚本推导，不冒充站点官方信用评级 |
| 浏览历史 | 搜索/分组/删除/最近关闭恢复/保留限制 | 同 | 14天已读 | 共用历史存储；保留历史面板与最近关闭 |
| 已读颜色 | 明暗配置 | 明暗配置 | 红色和已浏览标记 | 使用同一访问记录，不重复 CSS 标记 |
| 回帖足迹 | 无 | 按账号同步个人历史评论、缓存/统计/重置 | 无 | 与浏览历史不同；保留楼层跳转及增量同步 |
| 快捷评论 | 浮动评论编辑入口 | 同 | 无 | 复用站点编辑器，避免复制 Vue/CodeMirror 实例 |
| 快捷回复模板 | 分组、标题/正文、增删、导入导出 | 无 | 无 | 保留模板管理，插入不等于自动提交 |
| 快捷键提交 | 有 | 有 | 无 | 同一快捷键监听，尊重站点提交与验证 |
| Callout | 渲染与两种风格 | 编辑器插入模板 | 无 | 渲染和插入是互补功能，两者保留 |
| Tabs/Details 模板 | 无 | 有 | 无 | 编辑器插入，不能以 Callout 替代 |
| 代码高亮/复制 | 有 | 有 | 无 | 单次高亮、同一复制按钮和主题 |
| 图片预览 | 图片组预览 | 图片组预览 | 无 | 保留大图和前后切换，不重复拦截 |
| 图床上传 | NodeImage 登录/Key、上传/粘贴等 | NodeImage、Chevereto、LskyPro、EasyImages、Telegraph、Telegraph v2 | 无 | 共用队列/插入；六种协议不能缩为只 NodeImage |
| AI 美化 | 自定义 URL/Key/model/prompt、连接测试 | 无 | 无 | 用户触发文本发送和回填，明确发送内容；不会自动发帖 |
| 外链跳转 | 中转页自动跳转 | 去包装/规则净化 | 无 | 同一 URL 处理器，安全协议限制 |
| 短链接展开与净化规则 | 无 | 短链域名、规则编辑、允许/阻止参数/路径规则 | 无 | 不能用固定删除 utm 参数替代完整规则能力 |
| 外链标记/新标签页 | 帖子新标签页 | 外链标记、外链与帖子新标签页 | 面板新标签页 | 保留内外链开关，避免破坏编辑或站点操作链接 |
| 悬停预加载 | 有 | 有 | 无 | 单一预加载策略和去重，不预取产生副作用的路径 |
| 平滑滚动 | 有 | 有 | 无 | 尊重减少动画偏好 |
| 明暗同步 | 跟随站点皮肤 | 跟随站点皮肤 | 跟随系统 CSS | 以站点 `dark-layout` 优先，设置面板统一主题 |
| 未读卡片/提醒 | 回复/@/私信，标题/通知，多标签协调 | 回复/@/私信、滚动标题，多标签协调 | 无 | 单一轮询，保留分类入口；失败不能清零 |
| 邮箱导航 | 有 | 无 | 无 | 独立可关入口，源脚本目的地址需保留核验 |
| 相对时间中文化 | 有 | 无 | 无 | 只转换时间节点，不改整段帖子元信息 |
| 最新交易 | 无 | 无 | 出售/求购，排除已成交/版规 | 交易页 HTML 标题推断，不能宣称实时库存 |
| 最新抽奖 | 无 | 无 | 首页识别、排除结束、时间/楼层提取 | 保留列表与开奖提示信息 |
| 参与抽奖追踪 | 无 | 无 | 通过 DOM 猜测参与 | 建议显式收藏追踪，原判断不是可靠参赛证据 |
| 开奖/中奖提醒 | 无 | 无 | 每10分钟抓帖、文本猜测、结束清理 | 保留检查与提示，但只能称“疑似开奖，待核实”；不得直接断言中奖 |
| 关键词监控通知 | 无 | 无 | 首页轮询、每日去重、最多3条提醒 | 两组词源码实际同为不区分大小写 includes；新实现若改精确匹配须明确 |
| 设置与操作面板 | 分组设置、主题、移动布局 | 分组设置 | 固定侧栏、折叠记忆 | 单一可搜索模块开关入口；移动端不可沿用 H 的小于1400px全部隐藏 |

## 源码中实际使用的站点契约

这些是上游实现依据，未经当前登录页面验证；遇到缺失应降级并可见提示，不猜造接口。

| 用途 | 契约 |
|---|---|
| 路由 | 列表 `^/(categories/|page|award|search|$)`；帖子 `^/post-`；编辑 `/new-discussion` |
| 当前账号 | `unsafeWindow.__config__.user`；UID `member_id`；自身等级 `rank`；初始未读 `unViewedCount` |
| 当前主题 | `__config__.postData`，`title`、`op.uid`/`op.name`、`comments` |
| 列表与下一页 | `ul.post-list:not(.topic-carousel-panel)`、`.post-list-item`、`.post-title>a`、`.nsk-pager a.pager-next` |
| 评论与分页 | `ul.comments`、`.content-item`、`.comment-menu-mount`；顶部/底部 `.nsk-pager` |
| 加载页数据 | `#temp-script` 文本是 Base64 编码 JSON；上游解码 `postData.comments`，并依赖站点 Vue 私有实例挂载评论菜单 |
| 用户与权限 | `.avatar-normal[data-uid]`；`.nsk-content-meta-info .author-info>a`，个人页 `/space/{uid}`；`use[href="#lock"]` 周围数字为要求等级 |
| 编辑器 | `.CodeMirror.CodeMirror` 实例；`getCursor`/`replaceRange`；`.md-editor`、`.mde-toolbar` |
| 主题 | `body.dark-layout` |
| 签到 | `POST /api/attendance?random=true|false`；响应 `success`、`message`。H 使用 form body `random=true` |
| 用户资料 | `GET /api/account/getInfo/{uid}` → `{success,detail}`；detail 包含 `created_at,coin,nPost,nComment,stardust,fans` |
| 评论足迹 | `GET /api/content/list-comments?uid={uid}&page={page}` → `{success,comments}`；每条 `post_id,floor_id`；原版逐页同步间隔1秒 |
| 官方屏蔽 | `POST /api/block-list/add` JSON `{block_member_name}`；删除 `/api/block-list/del` JSON `{block_member_id:Number}` |
| 未读 | `GET /api/notification/unread-count` → `{success,unreadCount:{atMe,message,reply}}` |
| 通知入口 | `/notification#/atMe`、`/notification#/message?mode=list`、`/notification#/reply` |
| 监控页面 | `GET /categories/trade`、`GET /`、`GET /post-{id}.html`；解析标题，不存在经验证的交易/抽奖 API |
| AI | 用户配置服务 `POST .../v1/chat/completions`，Bearer Key，`model/messages/stream:false`，读取 `choices[0].message.content` |

## 图床协议矩阵

| Provider | 请求 | 响应图片 URL |
|---|---|---|
| NodeImage | `https://api.nodeimage.com/api/upload`；FormData `image`；`X-API-Key` | `links.direct` |
| NodeImage 登录取 Key | `GET https://api.nodeimage.com/api/user/api-key`；带凭据 | 上游专用 token 解析；需要真实登录验证 |
| LskyPro | `{base}/api/v1/upload`；`file`；Bearer | `data.links.url` |
| Chevereto | `{base}/api/1/upload`；`source`；`X-API-Key` | `image.url` |
| EasyImages 有 token | `{base}/api/index.php`；`image,token` | `url` |
| EasyImages 无 token | `{base}/app/upload.php`；`file,sign` | `url` |
| Telegraph | `{base}/upload`；`file` | `[0].src`，相对路径补 base |
| Telegraph v2 | `{base}/upload`；`file` | `data` |

原 X 允许自定义请求头与 Fetch/GM 通道。若遵循本项目原生 Fetch 约束，跨域图床和 AI 服务必须允许 CORS；不能声称与 GM 跨域请求完全等价。服务地址和 Key 必须用户配置，不把 Key 写入日志或普通配置导出。

## 已识别的上游问题与去重边界

- H 缓存的是 `Response` Promise，但多功能共享后重复 `.text()` 会遇到 body 已消费；应缓存解析后的 HTML/条目，而不是同一 Response 对象。
- H 的30秒监控和5分钟缓存不等于30秒新数据；轮询、TTL 应协调。
- H 的“当前用户名”取任意 `data-username`，无法可靠确认当前账号；HTML 上 `@name` 也可能只是回复提及。
- H 猜测 `.pagination a:last-child` 和 `?page=N` 会误跳；应只跟随经验证的下一页链接。
- 连续加载复制 DOM 并不自动恢复站点 Vue 行为，必须单独验证回复、引用、头像卡片、评分等菜单。
- 不执行抓取 HTML 中的脚本，不将上游 HTML 直接作为新设置界面的可信内容。
- 账号相关签到、黑名单、回帖缓存、监控提醒必须按站点和账号隔离；上游同名 GM 键不是三个脚本间可直接共享或自动读取的存储。
- 不能以“精简”为由默默删除任何矩阵条目。未完成项须在交付文档明确列出，与已实现能力分开。

## 当前源码覆盖与保留边界

本节是当前文件的静态实现状态，不是线上验证结论。上表仍是完整需求基线。

| 当前实现文件 | 已实现范围 | 仍有差异/未实现 |
|---|---|---|
| `reading.ts` | 连续翻页、历史与已读、外链直达/新标签、图片预览、代码复制、Callout、时间中文化、夜间与阅读导航 | 新增评论菜单只提供原页操作入口；最近关闭恢复和全部 Callout 风格尚未等价实现；历史已支持搜索、删除、清空和撤销；图片支持分组前后切换 |
| `filtering.ts` / `relationships.ts` | 标题/用户过滤、可展开折叠/高亮、权限过滤、备注、等级注册信息、本地好友、手动官方屏蔽和解除 | 上游复杂名望诊断并未整体移植 |
| `code-highlight.ts` | 代码语法高亮 | 具体语言支持随打包语言集合 |
| `actions.ts` | 签到、分组/标题/多行回复模板、草稿、快捷键 | 模板使用纯文本或 JSON 配置，随统一配置导入导出；没有照搬原版逐条编辑管理界面 |
| `actions-upload.ts` / `actions-upload-protocol.ts` | 图床配置与六类上传协议 | 外部服务可用性仍需用户服务的 CORS/凭据验证 |
| `monitoring.ts` | 交易/抽奖/关键词共用抓取、显式抽奖追踪与开奖线索、定时翻页 | 不把文本提及判定为确定中奖；不通过任意用户名 DOM 猜测参赛 |
| `extras.ts` | 邮箱导航、Tabs/Details 模板、账号隔离回帖足迹、链接规则和手动短链解析 | 足迹在弹窗展示并标记列表标题；每批最多10页可继续，显示最多100个主题入口 |
| `services.ts` | 60秒可见页面未读分类检查及跨标签互斥、AI连接测试/发送/预览/手动采用、同站帖子悬停预取 | 未读增加跨标签互斥与共享缓存，但没有原版滚动标题；AI已有固定文本连接测试，未实现SSE兼容回退 |

链接规则支持 X 的 `scope >> 参数`、宏、允许规则优先、参数通配符、hash query、路径正则，另接受 `host 参数名` 简写。解析纯函数已有测试；没有宣称短链联网兼容性等价。解析只采用用户点击触发的 Fetch HEAD，20秒超时；不支持 CORS 或 HEAD 的服务会保留原链接并提示失败。

AI仅发送用户点击时的编辑器文本。输出先显示为可编辑纯文本；只有用户再次选择采用才替换编辑器，且生成期间编辑器发生变化时拒绝覆盖。Key不可进入公开日志或普通配置导出。

AI和六类图床不是仅凭配置字段即可声称线上可用。原生 Fetch 不能复刻上游 GM 跨域请求权限；服务登录、CORS和接口版本必须在用户实际服务上验证。

## 黑名单查询补充

查询采用 `GET /api/block-list/list`，要求 `{success:true,data:[{block_member_id:...}]}`。来源为[原作者公开插件代码](https://www.5yyx.com/?p=662)，当前开发页面已查询成功并显示单个操作按钮；添加/解除的写操作使用模拟接口验证，未操作实际账号黑名单。空列表与查询失败严格区分；每页共用一次读取、同用户操作互斥并同步所有按钮，操作前过期状态重新查询。

管理员/创建者/拥有者沿用论坛原生 `.role-tag` 身份，不以积分、注册天数或用户名猜测身份。
