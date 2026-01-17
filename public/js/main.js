document.addEventListener("DOMContentLoaded", () => {
  // ---------- Partials ----------
  const loadPartial = async (selector, url, callback) => {
    const el = document.querySelector(selector);
    if (!el) return;

    const res = await fetch(url);
    el.innerHTML = await res.text();

    if (callback) callback();
  };

  loadPartial("#header", "/header.html");
  loadPartial("#footer", "/footer.html", () => {
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  });

  // ---------- Portfolio Lightbox (only on portfolio page) ----------
  initPortfolioLightbox();

  initRevealOnScroll();
});

function initPortfolioLightbox() {
  const grid = document.getElementById("portfolioGrid");
  const modalEl = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");
  const modalCaption = document.getElementById("modalCaption");
  const prevBtn = document.getElementById("modalPrevBtn");
  const nextBtn = document.getElementById("modalNextBtn");

  // Not on portfolio page (or modal not present) -> exit
  if (!grid || !modalEl || !modalImage || !modalCaption || !prevBtn || !nextBtn)
    return;

  const thumbs = Array.from(grid.querySelectorAll("img[data-full]"));
  if (!thumbs.length) return;

  let currentIndex = 0;

  const showImageByIndex = (idx) => {
    currentIndex = (idx + thumbs.length) % thumbs.length;

    const t = thumbs[currentIndex];
    modalImage.src = t.getAttribute("data-full");
    modalImage.alt = t.getAttribute("alt") || "Portfolio image";
    modalCaption.textContent = t.getAttribute("data-caption") || "";
  };

  // When modal opens, set current index based on clicked thumb
  modalEl.addEventListener("show.bs.modal", (event) => {
    const trigger = event.relatedTarget;
    const idx = thumbs.indexOf(trigger);
    showImageByIndex(idx >= 0 ? idx : 0);
  });

  // Next/Prev buttons
  prevBtn.addEventListener("click", () => showImageByIndex(currentIndex - 1));
  nextBtn.addEventListener("click", () => showImageByIndex(currentIndex + 1));

  // Keyboard navigation while modal is open
  document.addEventListener("keydown", (e) => {
    const isOpen = modalEl.classList.contains("show");
    if (!isOpen) return;

    if (e.key === "ArrowLeft") showImageByIndex(currentIndex - 1);
    if (e.key === "ArrowRight") showImageByIndex(currentIndex + 1);
  });

  // ---------- Swipe support ----------
  // We attach touch handlers to the modal image for simplicity.
  let startX = 0;
  let startY = 0;
  let isTracking = false;

  const SWIPE_THRESHOLD = 40; // px
  const VERTICAL_LIMIT = 80; // allow some vertical movement

  modalImage.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      isTracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true },
  );

  modalImage.addEventListener(
    "touchmove",
    (e) => {
      // Prevent the page from scrolling horizontally while swiping on the image
      // (We keep it non-blocking unless it’s clearly a horizontal swipe.)
      if (!isTracking || !e.touches || e.touches.length !== 1) return;

      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      // If it looks like a horizontal swipe, prevent default scroll behavior
      if (Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  modalImage.addEventListener(
    "touchend",
    (e) => {
      if (!isTracking) return;
      isTracking = false;

      const touch =
        e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : null;
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      // Ignore if too vertical
      if (Math.abs(dy) > VERTICAL_LIMIT) return;

      if (dx > SWIPE_THRESHOLD) {
        // swipe right -> previous
        showImageByIndex(currentIndex - 1);
      } else if (dx < -SWIPE_THRESHOLD) {
        // swipe left -> next
        showImageByIndex(currentIndex + 1);
      }
    },
    { passive: true },
  );
}

function initRevealOnScroll() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target); // animate once
        }
      });
    },
    { threshold: 0.15 },
  );

  els.forEach((el) => io.observe(el));
}
