# 新动态发布完整说明

真正存放动态内容的是 `source/_moments/`。`source/moments/index.md` 只是 `/moments/` 页面入口，发布新动态时不要修改它。

本说明文件以下划线开头，动态生成器会忽略它，不会把它显示成一条动态。

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

### 1. 创建动态

```bash
npm run new:moment -- "动态的简短名称"
```

命令会按照当前北京时间创建文件，例如：

```text
source/_moments/2026-07-26-动态的简短名称.md
```

不要手动删除文件名开头的日期。文件名建议简短明确，不要包含 `/`、`\` 等路径符号。

### 2. 填写动态

最简单的纯文字动态：

```markdown
---
date: 2026-07-26 20:30:00
tags:
  - 日常
---

今天想记录的内容。
```

完整模板如下，不需要的字段可以直接删除：

```markdown
---
date: 2026-07-26 20:30:00
# 可选：text、photo、link、music；不填会根据附件自动判断
# type: text
tags:
  - 日常
# author: Jackknifer
# avatar: /images/avatar.jpg
# location: 吉林
# images:
#   - src: /images/moments/动态文件名/照片.jpg
#     alt: 照片说明
# link: https://example.com
# music: https://music.163.com/song?id=34723470
---

这里写动态正文，可以写多段，也可以使用基本的 Markdown 格式。
```

字段说明：

- `date`：必填，用于排序和显示日期。
- `type`：可选。留空时按照音乐、照片、链接、文字的顺序自动判断。
- `tags`：可选，可以填写多个。
- `author`：可选，默认使用博客作者名。
- `avatar`：可选，默认使用博客头像。
- `location`：可选，填写后显示地点。
- `images`：照片列表，最多显示九张。
- `link`：分享网页。
- `music`：分享音乐或本地音频。

正文、照片、链接和音乐可以同时存在，页面会按固定顺序完整显示这些内容。

### 3. 构建和预览

```bash
npm run clean
npm run build
npm run check:mobile
npm run server
```

打开 `http://localhost:4000/moments/` 检查：

- 日期、头像和正文是否正确；
- 照片是否完整且顺序正确；
- 分享卡片能否打开正确网页；
- 音乐标题、歌手、封面和播放按钮是否正确；
- 手机尺寸下卡片是否溢出。

预览结束后按 `Ctrl+C` 停止服务器。

### 4. 提交并推送

先检查本次改动：

```bash
git status --short
git diff --check
```

只有文字、链接或网络音乐时：

```bash
git add "source/_moments/动态文件名.md"
git commit -m "content(moment): 发布新动态"
git push origin main
```

动态包含本地图片或音频时，把对应资源一起添加：

```bash
git add "source/_moments/动态文件名.md" "source/images/moments/动态文件名" "source/media/音频文件.mp3"
git commit -m "content(moment): 发布新动态"
git push origin main
```

没有使用的资源路径不要写进 `git add`。不要使用 `git add .`，以免把无关修改一起提交。

### 5. 确认上线

推送 `main` 后，GitHub Actions 中的 `Pages` 工作流会自动构建和部署。可以在仓库的 **Actions → Pages** 页面等待绿色对勾，也可以使用：

```bash
gh run list --workflow Pages --branch main --limit 3
gh run watch 运行编号 --exit-status
```

部署成功后访问：

```text
https://jackknifer.github.io/moments/
```

如仍看到旧内容，可等待一两分钟后刷新或清除浏览器缓存。这个项目不需要运行 `hexo deploy`。

## 二、发布各种动态

### 1. 纯文字

```markdown
---
date: 2026-07-26 20:30:00
type: text
tags:
  - 随想
---

第一段文字。

第二段文字，也可以写 **加粗内容**、[链接](https://example.com) 或引用。
```

`type: text` 可以省略。

### 2. 一张或多张照片

假设动态文件是：

```text
source/_moments/2026-07-26-海边.md
```

先创建与该文件名（不含 `.md`）完全相同的图片目录：

```bash
mkdir -p "source/images/moments/2026-07-26-海边"
```

把图片放入：

```text
source/images/moments/2026-07-26-海边/第一张.jpg
source/images/moments/2026-07-26-海边/第二张.jpg
```

动态文件写成：

```markdown
---
date: 2026-07-26 20:30:00
type: photo
tags:
  - 海边
images:
  - src: /images/moments/2026-07-26-海边/第一张.jpg
    alt: 海边的第一张照片
  - src: /images/moments/2026-07-26-海边/第二张.jpg
    alt: 海边的第二张照片
---

今天看到的海。
```

注意：

- 最多显示九张照片；
- 显示顺序与 `images` 中的书写顺序一致；
- 每张图片都应填写准确的 `alt`；
- 路径和文件名大小写必须完全一致；
- 图片较大时建议先压缩，避免移动端加载缓慢。

### 3. 只分享一个网页链接

平时只需要粘贴链接：

```markdown
---
date: 2026-07-26 20:30:00
link: https://example.com/article
---

推荐阅读这篇文章。
```

页面会显示真实域名并链接到原网页。

如果希望自己指定标题、简介和封面：

```yaml
link:
  url: https://example.com/article
  title: 链接标题
  description: 一句话介绍这条链接。
  image: /images/moments/2026-07-26-链接分享/封面.jpg
```

本地封面也要放在对应动态的图片文件夹里，并与动态文件一起提交。

### 4. 分享网易云音乐

最简单的方式是只粘贴歌曲链接：

```markdown
---
date: 2026-07-26 20:30:00
music: https://music.163.com/song?id=34723470
---

今天在听这首歌。
```

链接中多余的分享参数可以保留，但推荐只保留 `song?id=歌曲编号`。构建时会读取歌曲名、歌手和封面，并生成可播放的音乐卡。

为了避免构建时的网络波动导致歌曲资料不完整，常用歌曲可以提前写入 `source/_data/netease-songs.json`：

```json
{
  "34723470": {
    "title": "东京不太热",
    "artist": "封茗囧菌",
    "cover": "https://p1.music.126.net/封面地址.jpg"
  }
}
```

编辑缓存时要保留文件中已有歌曲，并保证 JSON 最后一项后面没有多余逗号。提交动态时一并添加该文件：

```bash
git add "source/_moments/动态文件名.md" "source/_data/netease-songs.json"
```

也可以在动态里手动指定完整资料：

```yaml
music:
  title: 歌曲名
  artist: 歌手
  url: https://music.163.com/song?id=34723470
  cover: /images/moments/动态文件名/音乐封面.jpg
```

### 5. 分享本地音频

把音频放进：

```text
source/media/歌曲.mp3
```

最简写法：

```yaml
music: /media/歌曲.mp3
```

完整写法：

```yaml
music:
  title: 歌曲名
  artist: 歌手
  audio: /media/歌曲.mp3
  cover: /images/moments/动态文件名/音乐封面.jpg
```

支持 `.mp3`、`.m4a`、`.ogg`、`.wav`、`.flac` 和 `.aac`。发布前应确认自己有权公开该音频；体积过大的文件不适合直接托管在 GitHub Pages。

### 6. 同时发布文字、照片和链接

```markdown
---
date: 2026-07-26 20:30:00
tags:
  - 旅行
images:
  - src: /images/moments/2026-07-26-旅行/照片.jpg
    alt: 旅行照片
link:
  url: https://example.com
  title: 相关网页
  description: 这次记录所提到的网页。
---

先写这次动态的文字内容。
```

不必强行填写 `type`；页面会同时显示正文、照片和链接。

## 三、发布前检查清单

- [ ] 动态位于 `source/_moments/`，不是 `source/moments/`。
- [ ] `date` 有效，Front Matter 的两个 `---` 完整。
- [ ] 图片目录名与动态文件名（不含 `.md`）一致。
- [ ] 图片、链接、音乐及头像路径可以访问。
- [ ] 内容没有私人信息、密钥或不应公开的文件。
- [ ] `npm run build` 成功。
- [ ] `npm run check:mobile` 成功。
- [ ] `/moments/` 本地预览正常。
- [ ] 只暂存了本次动态相关文件。
- [ ] 已推送到 `main`，Pages 工作流成功。
