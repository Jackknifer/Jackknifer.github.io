import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const title = process.argv.slice(2).join(" ").trim();
if (!title) {
  console.error('用法：npm run new:moment -- "这条动态的简短名称"');
  process.exitCode = 1;
} else {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  const date = `${year}-${month}-${day}`;
  const slug = title
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 80);

  if (!slug) {
    console.error("名称不能只包含路径符号或控制字符。");
    process.exitCode = 1;
  } else {
    const momentsDirectory = path.join(process.cwd(), "source", "_moments");
    const filePath = path.join(momentsDirectory, `${date}-${slug}.md`);
    const content = `---
date: ${date} ${hour}:${minute}:${second}
# 可选：text、photo、link、music；留空会按附件自动判断
# type: text
tags:
  - 动态
# 可选：发布照片
# images:
#   - src: /images/moments/照片.jpg
#     alt: 照片说明
# 可选：分享普通链接
# link: https://example.com
# 可选：分享音乐
# music: https://music.163.com/song?id=123456
---

在这里写下这条动态。
`;

    await fs.mkdir(momentsDirectory, { recursive: true });
    try {
      await fs.writeFile(filePath, content, { encoding: "utf8", flag: "wx" });
      console.log(`已创建 ${path.relative(process.cwd(), filePath)}`);
    } catch (error) {
      if (error?.code === "EEXIST") {
        console.error(`文件已存在：${path.relative(process.cwd(), filePath)}`);
        process.exitCode = 1;
      } else {
        throw error;
      }
    }
  }
}
