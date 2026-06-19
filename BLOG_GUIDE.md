# Jackknifer 博客使用说明

这个仓库是 `Jackknifer.github.io` 的源码仓库，使用 GitHub Pages、Hexo 和 Theme Redefine 发布。站点内容写在 `source` 目录里，主题外观主要改 `_config.redefine.yml`。

## 1. 常用命令

第一次在本地使用：

```bash
npm install
```

本地预览：

```bash
npm run server
```

包含草稿的本地预览：

```bash
npm run server:drafts
```

生成静态文件：

```bash
npm run build
```

新建正式文章：

```bash
npm run new:post -- "文章标题"
```

新建草稿：

```bash
npm run new:draft -- "文章标题"
```

发布草稿：

```bash
npm run publish -- "草稿文件名"
```

## 2. 文件说明

`_config.yml` 是 Hexo 的主配置。这里控制站点标题、站点地址、永久链接格式、语言、时区、文章生成规则和当前主题。

`_config.redefine.yml` 是 Theme Redefine 的主题配置。以后想改首页大图、导航栏、侧边栏、文章样式、代码块、目录、评论、页脚、注入 CSS，优先改这个文件。

`source/_posts` 存放正式文章。每一篇 Markdown 文件都会生成一个公开页面。

这个目录是已发布文章的正式管理区，会同步到 GitHub。文章发布后，后续更新可以直接修改这里的 Markdown 和对应图片，再提交推送。

`source/_drafts` 存放草稿。草稿默认不会发布，只有 `npm run server:drafts` 本地预览时能看到。

`source/images` 存放图片。文章里引用图片时使用 `/images/文件名`，例如 `![海面](/images/hero-sea-level.jpg)`。

`source/about/index.md` 是“关于”页面。

`source/now/index.md` 是“近况”页面，可以写最近在做什么。

`source/tags/index.md` 和 `source/categories/index.md` 是标签、分类页面。

`scaffolds/post.md` 是新建正式文章时使用的模板。

`scaffolds/draft.md` 是新建草稿时使用的模板。

`.github/workflows/pages.yml` 是 GitHub Actions 发布流程。推送到 `main` 分支后，它会自动安装依赖、构建 Hexo、发布到 GitHub Pages。

`public` 是构建产物。本地 `npm run build` 会生成它，但平时主要改 `source`、配置文件和模板。

## 3. 文章写作和上传流程

推荐流程：

```bash
npm run new:post -- "我的文章标题"
```

生成的文件在 `source/_posts`。打开后先改文件顶部的 Front Matter：

```yaml
---
title: 我的文章标题
date: 2020-05-03
tags:
  - 标签一
  - 标签二
categories:
  - 分类名
description: 这是一句话摘要，会出现在首页列表和搜索结果里。
cover: /images/my-cover.jpg
thumbnail:
sticky:
---
```

`date` 可以手动改成旧文章的真实写作时间，所以你可以补发以前的文章。格式建议统一使用 `YYYY-MM-DD`。博客页面只显示年月日，不显示具体时间，也不显示文件上传或更新时间。

`tags` 是标签，可以有多个。

`categories` 是分类，建议一篇文章只放一个主分类，后期更好整理。

`description` 是摘要，建议控制在一两句话。

`cover` 是文章头图或列表图，Theme Redefine 会读取它。

写完后本地检查：

```bash
npm run server
```

确认没问题后构建：

```bash
npm run build
```

最后提交并推送：

```bash
git add .
git commit -m "Add post: 我的文章标题"
git push origin main
```

推送后 GitHub Actions 会自动发布。发布进度在仓库的 Actions 页面查看。

## 4. 草稿工作流

如果一篇文章还没写完，先建草稿：

```bash
npm run new:draft -- "未完成文章"
```

草稿在 `source/_drafts`，默认不会上线。本地预览草稿：

```bash
npm run server:drafts
```

写完后发布草稿：

```bash
npm run publish -- "未完成文章"
```

发布后文件会进入 `source/_posts`。发布前仍然可以手动修改 `date`，适合迁移旧文。

## 5. 待上传文章收件箱

如果你已经有一批 Markdown 文章，推荐先放到 `pending-posts`，之后我可以直接读取这个文件夹并帮你导入博客。

`pending-posts` 是本地待发布收件箱，里面的实际文章默认不会同步到 GitHub。导入后的正式文章会复制到 `source/_posts`，图片会复制到 `source/images/posts`；这两个正式目录才会跟随提交发布。

推荐结构：

```text
pending-posts/
  article-slug/
    index.md
    cover.jpg
    images/
      photo-1.jpg
```

`article-slug` 会作为导入后的文章文件名，也会影响文章 URL，建议使用简短英文、拼音或日期前缀，例如 `2020-reading-note`。

文章里的图片使用相对路径：

```markdown
![图片说明](./images/photo-1.jpg)
```

文章封面也可以写相对路径：

```yaml
cover: ./cover.jpg
```

导入前可以先预览：

```bash
npm run import:pending:dry
```

正式导入：

```bash
npm run import:pending
```

如果你在 `pending-posts` 里修改了已经导入过的文章，并希望覆盖 `source/_posts` 里的正式版本：

```bash
npm run import:pending:force
```

导入脚本会做三件事：

- 把 Markdown 复制到 `source/_posts/<article-slug>.md`。
- 把图片复制到 `source/images/posts/<article-slug>/`。
- 把正文和 `cover` 里的相对图片路径改成博客可访问的 `/images/posts/...` 路径。
- 如果文件名末尾带日期，例如 `我的文章 3.6.md`，脚本会自动写成 `date: 2026-03-06`，并把标题整理成 `我的文章`。
- 如果正式文章已经存在，普通导入会跳过；需要覆盖时使用 `npm run import:pending:force`。
- 如果文章引用的图片缺失，脚本会跳过这篇文章，避免发布破图。

为了避免未发布草稿误传到公开仓库，`pending-posts` 里的实际文章默认被 `.gitignore` 忽略。导入后的正式文章在 `source/_posts`，才需要提交。

导入并检查后发布：

```bash
npm run build
git add source/_posts source/images/posts
git commit -m "Add post: 文章标题"
git push origin main
```

## 6. 图片使用建议

把图片放到 `source/images`，文章中这样引用：

```markdown
![图片说明](/images/example.jpg)
```

如果是文章封面，在 Front Matter 里写：

```yaml
cover: /images/example.jpg
```

Redefine 文档也建议把常用图片放在 Hexo 根目录下的 `source/images`，再用 `/images/...` 引用。

## 7. 怎么使用 Redefine 文档改这个博客

可以。这个博客已经使用 Theme Redefine，官方文档里的大部分配置都可以用在这里。

Redefine 官方文档：https://redefine-docs.ohevan.com/zh/docs

常用对应关系：

| 想修改的内容 | 修改文件 | 位置 |
| --- | --- | --- |
| 首页大图、标题、打字字幕 | `_config.redefine.yml` | `home_banner` |
| 顶部导航 | `_config.redefine.yml` | `navbar.links` |
| 侧边栏公告 | `_config.redefine.yml` | `home.sidebar.announcement` |
| 首页文章摘要长度 | `_config.redefine.yml` | `home.excerpt_length` |
| 文章字号、行高、图片圆角 | `_config.redefine.yml` | `articles.style` |
| 代码块复制按钮和高亮主题 | `_config.redefine.yml` | `articles.code_block` |
| 目录深度 | `_config.redefine.yml` | `articles.toc` |
| 评论系统 | `_config.redefine.yml` | `comment` |
| 页脚运行时间和文案 | `_config.redefine.yml` | `footer` |
| 自定义 CSS 或脚本 | `_config.redefine.yml` | `inject` |
| 全站字号微调 | `_config.redefine.yml` | `inject.footer` 里的 Typography polish |

一个重要原则：尽量不要直接改 `node_modules/hexo-theme-redefine` 里的主题源码。主题升级后这些改动容易丢。日常改动优先放在 `_config.redefine.yml`，少量样式可以放在 `inject.head` 的 `<style>` 里。

目前标签页、分类页、归档页、普通页面标题和文章封面标题的字号收敛都放在 `_config.redefine.yml` 的 `inject.footer`。如果以后觉得某个页面字号仍然偏大，优先改这一段，而不是去改主题源码。

## 8. GitHub 仓库能否设置成私密

可以把仓库设置成私密，但 GitHub Pages 对私有仓库有计划限制。GitHub 官方说明是：GitHub Free 支持公开仓库的 GitHub Pages；GitHub Pro、Team、Enterprise 支持公开和私有仓库的 GitHub Pages。

所以建议先确认账号计划。如果是 GitHub Free，把 `Jackknifer.github.io` 改成私有仓库可能导致 Pages 站点无法继续发布或被取消发布。

如果确认账号计划支持私有仓库 Pages，可以在 GitHub 仓库页面进入：

`Settings` -> `General` -> `Danger Zone` -> `Change repository visibility`

然后选择 `Make private`。

注意：即使仓库是私有的，已经发布出来的网站页面本身通常仍是面向访问者的公开网页。不要把密码、身份证、密钥、未公开资料写进博客文章或构建产物。

## 9. 推荐后续优化

短期可以继续做：

- 给每篇文章补 `description` 和 `cover`。
- 用 `tags` 管主题，用 `categories` 管文章类型。
- 给旧文统一补真实 `date`。
- 增加评论系统，例如 Giscus 或 Waline。
- 绑定自定义域名。
- 定期更新依赖并本地运行 `npm run build` 检查。

这个站点现在已经可以进入正常写作状态。后续美化时，优先围绕内容可读性、首页第一眼、文章页面阅读体验来改，不要一次加太多装饰功能。

## 10. 分享、访问统计和加载页

博客已启用以下功能：

- 文章末尾显示当前文章链接，并提供“复制链接”和系统“转发”按钮。支持系统分享的浏览器会显示“转发”，其他浏览器仍可复制链接。
- 分享到支持 Open Graph 的平台时，优先使用文章的 `cover`；如果没有 `cover`，会尝试使用正文第一张图片；都没有时使用主题默认分享图。
- 文章标题信息区显示单篇浏览量，页脚显示全站访问人数和总访问量。统计由 Theme Redefine 集成的 Vercount 提供，从启用后开始累计。
- 首次打开站点时显示 Jackknifer 加载页；站内页面切换继续使用轻量顶部进度条。

相关文件：

- `_config.redefine.yml`：功能开关和资源注入。
- `source/css/blog-enhancements.css`：分享、统计和加载状态样式。
- `source/js/blog-share.js`：文章分享交互。
- `scripts/post-share-meta.js`：自动选择文章分享图片。
