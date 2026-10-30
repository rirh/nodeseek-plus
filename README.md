# NodeSeek++

nodeseek++ 油猴插件 把之前的插件都删了把

### 先叠个甲

NodeSeek++ 只是想让逛论坛更舒服一些，，**不是**用来刷量、灌水、批量操作或做任何形式的滥用。

- 脚本只在你自己的浏览器里调整页面和交互；点赞、鸡腿、回复等操作都走论坛自己的接口，照常确认、照常消耗，不绕过登录、限流和验证。
- 请遵守 NodeSeek / DeepFlood / v2ex /liunx.do 的社区规则，合理、友善地使用。
- 如果站方或任何人认为本项目有不妥或违规的地方，请通过 [GitHub Issues](https://github.com/rirh/nodeseek-plus/issues) 或 [站内私信作者](https://www.nodeseek.com/space/17170) 联系，我们会尽快调整或删除相关内容。
- 因为收益于各位大佬的技术分享我也是把自己的用的小工具贡献出来的，所以请不要把本项目用于商业用途，或者在未经允许的情况下二次分发。
- 觉得好用的话，欢迎到点个 star 鼓励，兄弟们的鼓励是作者改bug的动力 。

[安装脚本](https://raw.githubusercontent.com/rirh/nodeseek-plus/main/dist/nodeseek-plus-plus.user.js) · [Greasy Fork](https://greasyfork.org/zh-CN/scripts/595488) · [使用说明](https://github.com/rirh/nodeseek-plus/blob/main/docs/guide.md) · [问题反馈](https://github.com/rirh/nodeseek-plus/issues)

[![GitHub Stars](https://img.shields.io/github/stars/rirh/nodeseek-plus?style=social)](https://github.com/rirh/nodeseek-plus)
[![Greasy Fork](https://img.shields.io/greasyfork/v/595488?label=Greasy%20Fork)](https://greasyfork.org/zh-CN/scripts/595488)
[![License](https://img.shields.io/badge/license-GPL--3.0--only-blue)](https://github.com/rirh/nodeseek-plus/blob/main/LICENSE)

![首页：用户资料卡、等级与信任分徽章、右侧工具栏](https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/home-user-card.webp)

## 前言

因为收益于各位大佬的技术分享我也是把自己的用的小工具贡献出来的，所以请不要把本项目用于商业用途，或者在未经允许的情况下二次分发
后来发现 V2EX 和 linux.do 我也想这么刷，就把摸鱼模式也搬了过去。
下面先说怎么装，再挨个过一遍功能，最后聊聊实现上的几点取舍。各模块的具体用法写在 [使用说明](https://github.com/rirh/nodeseek-plus/blob/main/docs/guide.md) 里。

## 安装

1. 安装用户脚本管理器，比如 [Tampermonkey](https://www.tampermonkey.net/)；iOS Safari 可以用 Userscripts。
2. 打开 [安装链接](https://raw.githubusercontent.com/rirh/nodeseek-plus/main/dist/nodeseek-plus-plus.user.js)，在脚本管理器里点「安装」。也可以从 [Greasy Fork](https://greasyfork.org/zh-CN/scripts/595488) 安装。
3. 刷新 [NodeSeek](https://www.nodeseek.com/) 或 [DeepFlood](https://www.deepflood.com/)，页面右侧出现 NodeSeek++ 的工具栏就说明装好了。[V2EX](https://www.v2ex.com/) 和 [linux.do](https://linux.do/) 上用的是同一个脚本，不用另外装。

> 如果打开链接只显示源码，可以复制完整的 `.user.js` 内容，在脚本管理器里新建脚本粘贴保存。注意 `.meta.js` 只含版本信息，不能用来安装。

### 设置

- 点右侧工具栏的设置图标，或者在脚本管理器菜单里选「设置」。
- 设置分「浏览、用户、工具、其他」四类，支持搜索；模块开启后，才会显示它的选项。
- 改完点「保存并刷新」生效。
- 导入、导出、清空缓存和恢复默认在「其他 → 数据」里，导出时密钥类字段会自动清空。
- 第一次上传图片，或者连接新的图床域名时，脚本管理器会询问是否允许跨域连接。

### 更新

- 页面打开时检查一次，之后每 6 小时检查一次；有新版本会弹窗提醒，同一版本 24 小时内只提醒一次。
- 也可以在「设置 → 其他 → 关于」点「检查更新」，或者重新打开安装链接覆盖安装。
- 不需要卸载旧版，配置会保留。

## 功能

### 阅读

| 模块     | 说明                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------- |
| 摸鱼模式 | 桌面端切换成微信式三栏，帖子列表像会话列表，帖子像群聊；V2EX 和 linux.do 也能用，见 [下文](https://github.com/rirh/nodeseek-plus#摸鱼模式) |
| 阅读增强 | 自动翻页、阅读历史与已读标记、外链直达、图片预览、代码高亮与复制、只看楼主、长文折叠                  |
| 帖子预览 | 悬停预加载、帖子卡片预览、主题帖浏览与评论数                                                          |
| 实时热榜 | 实时热榜 / 日榜 / 周榜切换，打开时按需获取，缓存 5 分钟                                               |
| 内容过滤 | 按标题关键词、用户名、等级过滤，可以隐藏、折叠或只高亮；站点黑名单一键屏蔽                            |

### 用户

| 模块       | 说明                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| 用户资料卡 | 悬停头像查看等级、加入天数、本地信任参考分和发帖统计；可以转账、关注、私信、屏蔽、备注 |
| 等级与徽章 | 帖子列表和楼层显示等级、信任分与身份徽章，配色可选彩色、单色或自定义                   |

### 消息

| 模块     | 说明                                                                            |
| -------- | ------------------------------------------------------------------------------- |
| 消息中心 | @我、回复、系统消息、私信合并到一个面板；聊天记录本地存档，支持 Markdown 与图片 |
| 通知分类 | 侧栏分别显示回复、@我、私信的未读数，已读后立即清零，新消息发系统通知           |

### 工具

| 模块        | 说明                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------ |
| 帖子监控    | 基于 NodeSeek RSS 用正则匹配标题，后台标签页持续检查，命中后发系统通知；也可以追踪抽奖帖         |
| 图片上传    | 默认 NodeImage 官方图床，登录即用；也支持 Telegraph、LskyPro、Chevereto、EasyImages 和自定义接口 |
| 快捷回复    | 回复模板一键发送，`Ctrl + Enter` 提交，手机上有悬浮回复                                          |
| AI 写作助手 | 写帖子、提纲、润色和续写，先预览，再手动采用                                                     |
| 日常        | 自动签到、回帖足迹、定时翻页、屏蔽侧栏广告                                                       |
| 一键分享    | 保存二维码，或者直接分享到 X、Telegram                                                           |

## 摸鱼模式

摸鱼模式把论坛换成类似微信桌面版的三栏布局。桌面端（窗口宽度 ≥ 1000px）在首页或版块列表点右侧工具栏的小鱼图标即可切换，再点一次恢复论坛原样。

![NodeSeek 上切换摸鱼模式，打开帖子阅读](https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/moyu-nodeseek.gif)

可以看到，界面分成三栏：

- 左侧是导航，包括消息、帖子、版块、热榜；鼠标停在版块上就会展开版块列表；NodeSeek++ 的其他工具收在左下角的菜单里。
- 中间是帖子列表，可以拖拽调整宽度。热榜的实时 / 日榜 / 周榜也在这里切换；切版块、翻页、换排序都在原位刷新，不会整页跳转。
- 右侧用聊天气泡读帖子和回复。

阅读时的操作和原帖保持一致：

- 右键楼层：点赞、加鸡腿、反对、收藏、引用、回复、复制，和原帖楼层菜单一样；加鸡腿和反对会先确认消耗。
- 底部输入框：带 Markdown 工具栏、图片上传与预览，`Ctrl / ⌘ + Enter` 直接调用论坛的评论接口发送，失败时显示论坛给出的原因。
- 消息中心：@我、回复、系统消息和私信都在同一个窗口里打开。

另外，在设置里可以选择进入摸鱼模式时默认打开首页、热榜还是某个版块；日间 / 夜间模式跟随站点。里面还藏了一个小彩蛋，这里就不剧透了。

<table>
  <tr>
    <td width="40%"><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/moyu-dark.webp" alt="摸鱼模式夜间"><p align="center">夜间模式</p></td>
    <td width="40%"><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/moyu-messages.webp" alt="摸鱼模式中的消息中心与私信"><p align="center">消息中心与私信</p></td>
    <td width="20%"><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/moyu-sections.webp" alt="版块抽屉"><p align="center">版块抽屉</p></td>
  </tr>
</table>

### 在 V2EX 和 linux.do 上摸鱼

这两个站上，NodeSeek++ 只跑摸鱼模式（V2EX 上还多一个每日签到）。其他模块读的都是 NodeSeek 自己的页面和接口，换个站就用不了，所以干脆不加载。

用法和 NodeSeek 上一样：桌面端（窗口宽度 ≥ 1000px）在列表页或帖子页点工具栏的小鱼按钮，切成三栏，再点一次恢复原样。区别主要在下面几点：

|          | V2EX                                                       | linux.do               |
| -------- | ---------------------------------------------------------- | ---------------------- |
| 左侧导航 | 通知、帖子、节点、热榜                                     | 通知、帖子、分类、热榜 |
| 帖子列表 | 按 V2EX 首页的 tab 切换                                    | 新话题 / 未读 / 日榜   |
| 右键消息 | 感谢（要花铜币，会先确认）、引用、回复；楼主那一楼还能收藏 | 点赞、引用、回复       |

另外还有几点：

- 底部输入框都可以直接回复，NodeSeek++ 的工具同样收在左下角的菜单里。
- 没登录时，通知和发帖按钮会隐藏。
- V2EX 只在刷新页面时更新未读数，所以开着摸鱼模式时，脚本每 3 分钟会自己查一次。

V2EX：

![V2EX 上的摸鱼模式](https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/moyu-v2ex.gif)

linux.do：

![linux.do 上的摸鱼模式](https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/moyu-linuxdo.gif)

## 实现上的几点取舍

既然是把几个脚本的功能合到一起，首先要控制的就是请求量和对页面的影响。这里简单记录几点。

### 模块化

每个功能只有一套实现，模块之间互不依赖，都可以在设置里单独开关。配置可以导入、导出，方便在几台电脑之间同步。

### 请求控制

脚本发往站内的请求统一排队：

1. 并发数和请求间隔都可以调，遇到 403 / 429 / 503 会自动冷却一段时间。
2. 用户资料缓存 24 小时，按需加载，屏幕外的内容接近视口时才发请求。
3. 多个标签页共用一把锁，后台轮询不会重复请求站点。

也就是说，多开几个标签页，后台轮询也只会跑一份。

### 本地优先

- 配置、阅读历史、监控结果、回复模板、私信存档都只存在本机，按站点和账号隔离。
- 图片只在你上传时发往所选的图床，文本只在你点击时发往你配置的 AI 服务。
- 不绕过站点的登录、限流和验证。

### 界面

- 所有面板用同一套样式，次要操作统一成图标按钮，尽量不抢论坛本身的风头。
- 桌面和手机都能用：手机上面板会变成底部抽屉，按钮按触控尺寸放大。
- 跟随站点的日间 / 夜间模式。

## 截图

实时热榜和帖子监控：

![实时热榜切换与帖子监控](https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/hot-and-monitor.gif)

<table>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/monitor.webp" alt="帖子监控面板"><p align="center">帖子监控：正则匹配新帖</p></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/messages.webp" alt="消息中心"><p align="center">消息中心：通知与私信合一</p></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/hot-rankings.webp" alt="NodeSeek 热榜"><p align="center">实时热榜 / 日榜 / 周榜</p></td>
    <td><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/menu.png" alt="脚本管理器菜单"><p align="center">脚本管理器菜单快捷入口</p></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/monitor-panel.webp" alt="帖子监控结果"><p align="center">监控结果：命中的新帖高亮，后台继续检查</p></td>
    <td><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/monitor-config.webp" alt="监控配置"><p align="center">监控配置：正则、刷新间隔与 AI 写正则提示</p></td>
  </tr>
</table>

手机上同样可用：

<table>
  <tr>
    <td width="33%"><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/mobile-home.webp" alt="手机首页"></td>
    <td width="33%"><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/mobile-hot.webp" alt="手机热榜"></td>
    <td width="33%"><img src="https://raw.githubusercontent.com/rirh/nodeseek-plus/main/docs/screenshots/mobile-monitor.webp" alt="手机帖子监控"></td>
  </tr>
</table>

## 说明

- 信任参考分是根据公开的注册时间、发帖数、评论数在本地算出来的，**不是**站点官方评分，也不代表交易信用。
- 抽奖追踪只提示开奖线索，有没有中奖需要自己核实。

### 使用声明

NodeSeek++ 只是想让逛论坛更舒服一些，**不是**用来刷量、灌水、批量操作或做任何形式的滥用。

- 脚本只在你自己的浏览器里调整页面和交互；点赞、鸡腿、回复等操作都走论坛自己的接口，照常确认、照常消耗，不绕过登录、限流和验证。
- 请遵守 NodeSeek / DeepFlood 的社区规则，合理、友善地使用。
- 如果站方或任何人认为本项目有不妥或违规的地方，请通过 [GitHub Issues](https://github.com/rirh/nodeseek-plus/issues) 或 [站内私信作者](https://www.nodeseek.com/space/17170) 联系，我们会尽快调整或删除相关内容。

## 文档

- [使用说明](https://github.com/rirh/nodeseek-plus/blob/main/docs/guide.md)：监控正则写法、图片上传与自定义图床、请求并发、消息中心等细节
- [开发与发布](https://github.com/rirh/nodeseek-plus/blob/main/docs/development.md)：本地开发、测试、`make deploy` 与 Greasy Fork 同步

## 许可证

[GPL-3.0-only](https://github.com/rirh/nodeseek-plus/blob/main/LICENSE)。

<p align="center"><a href="https://star-history.com/#rirh/nodeseek-plus&Date"><img src="https://api.star-history.com/svg?repos=rirh/nodeseek-plus&type=Date" alt="Star History Chart" width="640"></a></p>
