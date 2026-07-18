const fs = require("node:fs");
const path = require("node:path");
const frontMatter = require("hexo-front-matter");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value == null || value === "") return [];
  return [String(value)];
}

function dateParts(value) {
  const directMatch = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (directMatch) {
    return {
      date: `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`,
      month: `${directMatch[1]}-${directMatch[2]}`,
      timestamp: Date.parse(`${directMatch[1]}-${directMatch[2]}-${directMatch[3]}T00:00:00+08:00`),
    };
  }

  const parsedDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;

  const year = String(parsedDate.getFullYear());
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return {
    date: `${year}-${month}-${day}`,
    month: `${year}-${month}`,
    timestamp: parsedDate.getTime(),
  };
}

function monthLabel(month) {
  const [year, number] = month.split("-");
  return `${year.slice(-2)}年${Number(number)}月`;
}

function renderMomentsPage() {
  const momentsDirectory = path.join(hexo.source_dir, "_moments");
  const files = fs.existsSync(momentsDirectory)
    ? fs
        .readdirSync(momentsDirectory, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() &&
            entry.name.endsWith(".md") &&
            !entry.name.startsWith("_"),
        )
        .map((entry) => entry.name)
    : [];

  const moments = files
    .map((fileName) => {
      const filePath = path.join(momentsDirectory, fileName);
      const parsed = frontMatter.parse(fs.readFileSync(filePath, "utf8"));
      const normalizedDate = dateParts(parsed.date);
      if (!normalizedDate) {
        hexo.log.warn(`[moments] Skip ${fileName}: missing or invalid date.`);
        return null;
      }

      return {
        fileName,
        ...normalizedDate,
        tags: normalizeTags(parsed.tags),
        html: hexo.render.renderSync({
          text: parsed._content || "",
          engine: "markdown",
        }),
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.timestamp - left.timestamp ||
        right.fileName.localeCompare(left.fileName, "zh-CN"),
    );

  const months = [...new Set(moments.map((moment) => moment.month))];
  const filters = [
    '<button class="moments-filter is-active" type="button" data-moments-filter="all" aria-pressed="true">全部</button>',
    ...months.map(
      (month) =>
        `<button class="moments-filter" type="button" data-moments-filter="${escapeHtml(month)}" aria-pressed="false">${escapeHtml(monthLabel(month))}</button>`,
    ),
  ].join("");

  const cards = moments
    .map((moment) => {
      const tags = moment.tags
        .map(
          (tag, index) =>
            `<span class="moment-tag${index % 2 === 1 ? " is-blue" : ""}">${escapeHtml(tag)}</span>`,
        )
        .join("");

      return `
        <article class="moment-card" data-moment-card data-moment-month="${escapeHtml(moment.month)}">
          <span class="moment-marker" aria-hidden="true"><i class="fa-solid fa-circle"></i></span>
          <div class="moment-meta">
            <time class="moment-date" datetime="${escapeHtml(moment.date)}">${escapeHtml(moment.date)}</time>
            ${tags}
          </div>
          <div class="moment-body">${moment.html}</div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="moments-page" data-moments-page>
      <p class="moments-lead">比文章更轻一点，留下近况、灵感和一闪而过的念头。</p>
      <div class="moments-toolbar">
        <label class="moments-search">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" data-moments-search aria-label="搜索随想" placeholder="搜索随想内容…" autocomplete="off">
        </label>
        <div class="moments-filters" aria-label="按月份筛选">${filters}</div>
      </div>
      <p class="moments-summary">当前显示 <span data-moments-count>${moments.length}</span> 条记录</p>
      <div class="moments-timeline">${cards}</div>
      <div class="moments-empty" data-moments-empty hidden>没有找到相关记录，换一个关键词或月份试试。</div>
    </section>
  `;
}

hexo.extend.tag.register("moments", renderMomentsPage);
