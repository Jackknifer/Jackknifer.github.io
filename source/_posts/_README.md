# 新文章发布完整说明

本目录 `source/_posts/` 存放正式博文。本文档文件名以下划线开头，Hexo 会忽略它，不会把它当成文章发布。

这份说明以 Finder 和 VS Code 图形界面为主。只有构建和预览需要使用 VS Code 终端。

## 一、发布一篇新文章

### 第一步：在 VS Code 中创建文章文件

1. 用 VS Code 打开整个 `Jackknifer.github.io` 博客项目。
2. 在左侧“资源管理器”中依次展开 `source`、`_posts`。
3. 右键 `_posts` 文件夹，选择“新建文件”。
4. 输入文件名，例如 `文章标题.md`。
5. 打开新文件，粘贴后文的文章模板并填写内容。

最终文件位置应为：

```text
source/_posts/文章标题.md
```

不要在 `source/posts/` 或 `public/` 中创建文章。文件名可以使用中文，必须以 `.md` 结尾。

### 第二步：用 Finder 或 VS Code 创建图片文件夹

文章没有图片时可以跳过。

1. 找到 `source/images/posts/`。
2. 在 `posts` 中新建一个与文章标题完全相同的文件夹。
3. 把封面和正文图片拖进这个文件夹。

目录示例：

```text
source/images/posts/文章标题/封面.jpg
source/images/posts/文章标题/照片一.jpg
source/images/posts/文章标题/示意图.png
```

不要把图片放进 `public/`；该目录由构建命令自动生成。

### 第三步：填写文章

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

### 第四步：在终端构建和预览

在 VS Code 顶部选择“终端 → 新建终端”。确认终端当前位于博客项目根目录，然后依次运行：

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

如果前三条命令出现红色错误，先不要提交。`npm run server` 会一直运行本地预览，检查完成后必须先按 `Ctrl+C`，再进行下一步。

### 第五步：使用 VS Code 提交并同步

1. 点击 VS Code 左侧的“源代码管理”图标。
2. 展开“更改”，确认里面只有本次文章、图片以及你确实想发布的文件。
3. 如果出现无关文件，先不要提交；不要直接选择“全部暂存”。
4. 在截图所示的“消息”输入框填写提交说明，例如：`发布文章：文章标题`。
5. 点击“提交”按钮。若 VS Code 询问是否暂存全部更改，只有在列表全部属于本次文章时才选择“是”。
6. 提交完成后，点击“同步更改”；某些 VS Code 版本显示为“推送”或云朵箭头。
7. 如果弹出 GitHub 登录或授权窗口，按提示登录自己的 GitHub 账号。
8. 等待 VS Code 提示同步完成，左下角分支应继续显示 `main`。

建议在开始写作前也先点击一次“同步更改”，把 GitHub 上的最新代码同步到本地。

### 第六步：确认上线

推送 `main` 后，GitHub Actions 中的 `Pages` 工作流会自动执行：

1. 安装依赖；
2. 运行 `npm run build`；
3. 发布 `public/` 到 GitHub Pages。

打开 GitHub 仓库网页，点击顶部 **Actions**，再打开最新的 **Pages** 记录。出现绿色对勾后才表示部署完成；黄色圆点表示仍在运行，红色叉号表示部署失败。

文章地址通常是：

```text
https://jackknifer.github.io/年/月/日/文章标题/
```

部署成功后如仍看到旧页面，可等待一两分钟再刷新，或清除浏览器缓存后重试。整个部署由 GitHub Actions 自动完成，不需要再输入部署命令。

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

1. 在 VS Code 左侧展开 `source/_drafts/`。
2. 右键 `_drafts`，新建 `文章标题.md`。
3. 按照正式文章模板写作。
4. 草稿完成后，直接在 VS Code 左侧把文件从 `_drafts` 拖到 `_posts`。
5. 再按照前面的四条命令进行构建和预览。
6. 最后在“源代码管理”中提交并同步。

```text
source/_drafts/文章标题.md
```

`_drafts` 中的文件不会出现在正常构建的网站里；移动到 `_posts` 后才会作为正式文章发布。

## 四、发布前检查清单

- [ ] 文件位于 `source/_posts/`，不是 `source/posts/` 或 `public/`。
- [ ] `title`、`date`、`tags`、`categories` 和 `description` 已填写。
- [ ] 封面及正文图片均存在，路径和大小写正确。
- [ ] 正文没有私人信息、密钥或不应公开的文件。
- [ ] `npm run build` 成功。
- [ ] `npm run check:mobile` 成功。
- [ ] 本地预览正常。
- [ ] VS Code“更改”列表中没有无关文件。
- [ ] 已在 VS Code 中提交并同步到 `main`。
- [ ] GitHub Actions 中最新的 Pages 工作流显示绿色对勾。
