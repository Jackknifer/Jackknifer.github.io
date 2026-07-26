# 新文章发布完整说明

本目录 `source/_posts/` 存放正式博文。本文档文件名以下划线开头，Hexo 会忽略它，不会把它当成文章发布。

下面的命令都要在博客项目根目录执行：

```bash
cd "/Users/apple/Workspace/github/Jackknifer/Jackknifer.github.io"
```

## 一、最快发布流程

### 0. 确认并同步仓库

```bash
git status --short
git pull --ff-only origin main
```

只有在工作区没有未处理改动时再拉取；如果 `git status` 显示了其他工作，应先确认它们的用途，不要覆盖或误提交。

### 1. 创建文章

```bash
npm run new:post -- "文章标题"
```

命令会创建：

```text
source/_posts/文章标题.md
```

### 2. 创建图片文件夹

文章没有图片时可以跳过。推荐让图片文件夹名与文章标题完全一致：

```bash
mkdir -p "source/images/posts/文章标题"
```

把封面和正文图片复制到这个文件夹，例如：

```text
source/images/posts/文章标题/封面.jpg
source/images/posts/文章标题/照片一.jpg
source/images/posts/文章标题/示意图.png
```

不要把图片放进 `public/`；该目录由构建命令自动生成。

### 3. 填写文章

可直接使用下面的完整模板：

```markdown
---
title: 文章标题
date: 2026-07-26 20:30:00
tags:
  - 标签一
  - 标签二
categories:
  - 分类名
description: 用一两句话概括文章，首页文章卡片会使用这段摘要。
cover: /images/posts/文章标题/封面.jpg
thumbnail:
sticky:
---

这里写正文第一段。

## 二级标题

这里继续写正文。

![图片说明](/images/posts/文章标题/照片一.jpg)
```

Front Matter 字段说明：

- `title`：文章标题。
- `date`：发布时间，建议写完整的北京时间。
- `tags`：可以写多个标签。
- `categories`：通常写一个主要分类。
- `description`：首页摘要，建议手动填写。
- `cover`：首页和文章页使用的封面；没有封面时留空。
- `thumbnail`：当前一般留空。
- `sticky`：当前一般留空；只有需要置顶时再填写主题支持的排序值。

Front Matter 的开头和结尾必须是单独一行 `---`，缩进统一使用空格，不要使用 Tab。

### 4. 构建和预览

```bash
npm run clean
npm run build
npm run check:mobile
npm run server
```

打开 `http://localhost:4000/` 检查：

- 首页标题、摘要、日期和封面是否正确；
- 文章页段落、图片、链接和代码是否正确；
- 标签页、分类页和归档页是否出现这篇文章；
- 手机尺寸下是否存在横向滚动或图片溢出。

预览结束后按 `Ctrl+C` 停止服务器。

### 5. 提交并推送

先检查将要提交的文件：

```bash
git status --short
git diff --check
```

只添加本次文章和图片：

```bash
git add "source/_posts/文章标题.md" "source/images/posts/文章标题"
git commit -m "content(post): 发布《文章标题》"
git push origin main
```

如果文章没有图片，只添加 Markdown 文件：

```bash
git add "source/_posts/文章标题.md"
```

不要使用 `git add .`，以免把无关的本地修改一起提交。

### 6. 确认上线

推送 `main` 后，GitHub Actions 中的 `Pages` 工作流会自动执行：

1. 安装依赖；
2. 运行 `npm run build`；
3. 发布 `public/` 到 GitHub Pages。

可以在仓库的 **Actions → Pages** 页面等待绿色对勾，也可以使用：

```bash
gh run list --workflow Pages --branch main --limit 3
gh run watch 运行编号 --exit-status
```

文章地址通常是：

```text
https://jackknifer.github.io/年/月/日/文章标题/
```

部署成功后如仍看到旧页面，可等待一两分钟再刷新，或清除浏览器缓存后重试。这个项目由 GitHub Actions 部署，不需要运行 `hexo deploy`。

## 二、正文各种内容的写法

### 普通文字和标题

```markdown
普通段落之间空一行。

## 二级标题

### 三级标题
```

文章正文不要再使用一级标题 `#`，页面已经会显示 Front Matter 中的 `title`。

### 加粗、斜体和删除线

```markdown
**加粗文字**
*斜体文字*
~~删除线文字~~
```

### 列表

```markdown
- 第一项
- 第二项

1. 第一步
2. 第二步
```

### 引用

```markdown
> 这里是一段引用。
>
> 引用中的第二段。
```

### 链接

```markdown
[显示文字](https://example.com)
```

外部链接会按照博客现有设置在新页面打开。

### 正文图片

```markdown
![准确描述这张图片的文字](/images/posts/文章标题/照片一.jpg)
```

建议：

- 使用 JPG、PNG 或 WebP；
- 图片文件名简短明确，避免特殊符号；
- 每张图片都填写有意义的说明；
- 大图可先压缩，减少移动网络下的加载时间；
- 路径必须以 `/images/` 开头，并注意大小写完全一致。

构建时会为本地图片补充延迟加载等保护；如果项目中已有对应的响应式副本，也会自动使用。不要为了发布文章直接修改构建产物 `public/`。

### 代码

````markdown
```python
def hello():
    print("Hello")
```
````

把 `python` 换成 `javascript`、`bash`、`json` 等语言名称即可获得对应高亮。

### 表格

```markdown
| 项目 | 内容 |
| --- | --- |
| 日期 | 2026-07-26 |
| 状态 | 已完成 |
```

### 只分享一个网页

```markdown
推荐阅读：[网页标题](https://example.com)
```

## 三、先写草稿，之后再发布

创建草稿：

```bash
npm run new:draft -- "文章标题"
```

草稿位于：

```text
source/_drafts/文章标题.md
```

预览草稿：

```bash
npm run server:drafts
```

正式发布草稿：

```bash
npm run publish -- "文章标题"
```

发布后文件会移动到 `source/_posts/`。然后按照前面的构建、检查、提交和推送流程操作。

## 四、导入已有文章和多张本地图片

如果文章已经整理成一个 Markdown 文件夹，也可以先放到 `pending-posts/`，再使用项目的导入脚本。详细格式见 `pending-posts/README.md`。

先预览，不改正式内容：

```bash
npm run import:pending:dry
```

确认无误后正式导入：

```bash
npm run import:pending
```

导入完成后仍要运行构建、检查、提交和推送。

## 五、发布前检查清单

- [ ] 文件位于 `source/_posts/`，不是 `source/posts/` 或 `public/`。
- [ ] `title`、`date`、`tags`、`categories` 和 `description` 已填写。
- [ ] 封面及正文图片均存在，路径和大小写正确。
- [ ] 正文没有私人信息、密钥或不应公开的文件。
- [ ] `npm run build` 成功。
- [ ] `npm run check:mobile` 成功。
- [ ] 本地预览正常。
- [ ] 只暂存了本次文章相关文件。
- [ ] 已推送到 `main`，Pages 工作流成功。
