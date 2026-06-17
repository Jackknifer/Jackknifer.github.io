(function () {
  const SOCIALS = [
    {
      name: "GitHub",
      className: "github",
      url: "https://github.com/Jackknifer",
      icon: "/images/social/github.svg",
    },
    {
      name: "小红书",
      className: "xiaohongshu",
      url: "https://xhslink.com/m/6yTZyG00OB4",
      icon: "/images/social/xiaohongshu.svg",
    },
    {
      name: "网易云音乐",
      className: "netease",
      url: "https://y.music.163.com/m/user?id=7896322526",
      icon: "/images/social/netease-cloud-music.svg",
    },
  ];

  function renderSocialLinks() {
    const sidebar = document.querySelector(".home-sidebar-container .sidebar-content");
    if (!sidebar || sidebar.querySelector(".blog-sidebar-socials")) return;

    const socials = document.createElement("nav");
    socials.className = "blog-sidebar-socials";
    socials.setAttribute("aria-label", "外部账号");
    socials.innerHTML = SOCIALS.map((item) => `
      <a class="blog-social-link ${item.className}" href="${item.url}" target="_blank" rel="noopener noreferrer" aria-label="${item.name}" title="${item.name}">
        <img src="${item.icon}" alt="" loading="lazy" decoding="async">
      </a>
    `).join("");

    const statistics = sidebar.querySelector(".statistics");
    if (statistics) {
      statistics.insertAdjacentElement("afterend", socials);
    } else {
      sidebar.appendChild(socials);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderSocialLinks, { once: true });
  } else {
    renderSocialLinks();
  }

  document.addEventListener("swup:contentReplaced", renderSocialLinks);
  document.addEventListener("pjax:complete", renderSocialLinks);
})();
