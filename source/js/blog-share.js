(function () {
  const PANEL_CLASS = "blog-share-panel";
  const STATUS_RESET_DELAY = 2400;

  function getMetaContent(selector) {
    return document.querySelector(selector)?.getAttribute("content")?.trim() || "";
  }

  function getShareData() {
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const articleTitle = document.querySelector(
      ".post-page-container h1",
    )?.textContent?.trim();
    const firstParagraph = document.querySelector(
      ".post-page-container .article-content.markdown-body p",
    )?.textContent?.trim();

    let url = window.location.href;
    if (canonical) {
      try {
        const canonicalOrigin = new URL(canonical).origin;
        url = new URL(
          `${window.location.pathname}${window.location.search}`,
          canonicalOrigin,
        ).href;
      } catch {
        url = window.location.href;
      }
    }

    const title = articleTitle
      || getMetaContent('meta[property="og:title"]')
      || document.title;
    const text = firstParagraph?.slice(0, 160)
      || getMetaContent('meta[property="og:description"]')
      || getMetaContent('meta[name="description"]');

    return {
      title,
      text,
      url,
    };
  }

  function setStatus(panel, message) {
    const status = panel.querySelector(".blog-share-status");
    if (!status) return;

    window.clearTimeout(Number(status.dataset.resetTimer || 0));
    status.textContent = message;

    const timer = window.setTimeout(() => {
      status.textContent = "";
      delete status.dataset.resetTimer;
    }, STATUS_RESET_DELAY);

    status.dataset.resetTimer = String(timer);
  }

  async function copyText(text, visibleInput) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Some browsers expose Clipboard API but deny it by permission policy.
        // Continue with the selection-based fallback below.
      }
    }

    const input = visibleInput || document.createElement("textarea");
    const isTemporary = !visibleInput;

    if (isTemporary) {
      input.value = text;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
    }

    input.focus();
    input.select();
    input.setSelectionRange?.(0, input.value.length);

    const copied = document.execCommand("copy");
    input.blur();

    if (isTemporary) {
      input.remove();
    }

    if (!copied) {
      throw new Error("copy_failed");
    }
  }

  function createPanel() {
    const shareData = getShareData();
    const panel = document.createElement("section");
    panel.className = PANEL_CLASS;
    panel.setAttribute("aria-labelledby", "blog-share-title");

    panel.innerHTML = `
      <div class="blog-share-heading" id="blog-share-title">
        <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
        <span>分享这篇文章</span>
      </div>
      <div class="blog-share-row">
        <input
          class="blog-share-link"
          type="text"
          readonly
          aria-label="文章链接"
          title="${escapeHtml(shareData.url)}"
          value="${escapeHtml(shareData.url)}"
        >
        <div class="blog-share-actions">
          <button class="blog-share-button" type="button" data-blog-share-action="copy">
            <i class="fa-solid fa-link" aria-hidden="true"></i>
            复制链接
          </button>
          ${typeof navigator.share === "function" ? `
            <button class="blog-share-button primary" type="button" data-blog-share-action="native">
              <i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i>
              转发
            </button>
          ` : ""}
        </div>
      </div>
      <div class="blog-share-status" role="status" aria-live="polite"></div>
    `;

    return panel;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderSharePanel() {
    document.querySelectorAll(`.${PANEL_CLASS}`).forEach((panel) => panel.remove());

    const articleContainer = document.querySelector(
      ".post-page-container .article-content-container",
    );
    const articleBody = articleContainer?.querySelector(".article-content.markdown-body");
    if (!articleContainer || !articleBody) return;

    const insertionPoint = articleContainer.querySelector(
      ".post-tags-box, .article-nav, .comment-container",
    );
    const panel = createPanel();

    if (insertionPoint) {
      articleContainer.insertBefore(panel, insertionPoint);
    } else {
      articleBody.insertAdjacentElement("afterend", panel);
    }
  }

  async function handleShareAction(event) {
    const button = event.target.closest("[data-blog-share-action]");
    if (!button) return;

    const panel = button.closest(`.${PANEL_CLASS}`);
    if (!panel) return;

    const shareData = getShareData();
    const action = button.dataset.blogShareAction;

    if (action === "copy") {
      try {
        await copyText(shareData.url, panel.querySelector(".blog-share-link"));
        setStatus(panel, "链接已复制，可以直接粘贴转发。");
      } catch {
        setStatus(panel, "复制失败，请长按上方链接手动复制。");
      }
      return;
    }

    if (action === "native" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setStatus(panel, "已打开系统分享面板。");
      } catch (error) {
        if (error?.name !== "AbortError") {
          setStatus(panel, "暂时无法转发，请使用复制链接。");
        }
      }
    }
  }

  function initialize() {
    renderSharePanel();

    if (document.documentElement.dataset.blogShareReady === "true") return;
    document.documentElement.dataset.blogShareReady = "true";
    document.addEventListener("click", handleShareAction);
    document.addEventListener("swup:contentReplaced", renderSharePanel);
    document.addEventListener("pjax:complete", renderSharePanel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
