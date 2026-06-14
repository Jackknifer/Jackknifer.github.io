(() => {
  const toggle = document.querySelector(".theme-toggle");
  const storedTheme = localStorage.getItem("jackknifer-theme");

  if (storedTheme === "dark") {
    document.body.classList.add("theme-dark");
  }

  toggle?.addEventListener("click", () => {
    document.body.classList.toggle("theme-dark");
    localStorage.setItem(
      "jackknifer-theme",
      document.body.classList.contains("theme-dark") ? "dark" : "light"
    );
  });

  document.querySelector(".copy-markdown")?.addEventListener("click", async (event) => {
    const targetId = event.currentTarget.getAttribute("data-copy-target");
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target || !navigator.clipboard) return;

    const text = target.innerText.trim();
    await navigator.clipboard.writeText(text);
    const original = event.currentTarget.textContent;
    event.currentTarget.textContent = "Copied";
    setTimeout(() => {
      event.currentTarget.textContent = original;
    }, 1400);
  });
})();
