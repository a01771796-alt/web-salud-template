// Menú móvil — patrón estándar de la skill landing-negocio-general.
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");

  if (toggle && nav) {
    const closeNav = () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    };
    const openNav = () => {
      toggle.setAttribute("aria-expanded", "true");
      nav.classList.add("is-open");
    };
    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      isOpen ? closeNav() : openNav();
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));
    document.addEventListener("click", (event) => {
      const header = toggle.closest("header") || document;
      if (!header.contains(event.target)) closeNav();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNav();
    });
  }

  // Scroll manual a anclas con easing propio: el scroll-behavior:smooth
  // nativo (y scrollIntoView/scrollTo con behavior:'smooth') se puede
  // quedar congelado a medio camino en clics reales — se anima a mano.
  const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href").slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();

      // getComputedStyle nunca resuelve calc() dentro de una custom property
      // (devuelve el texto literal, parseFloat da NaN) — se mide el header
      // real en vez de leer --header-clearance desde JS.
      const header = document.querySelector(".site-header");
      const headerClearance = header ? header.getBoundingClientRect().bottom + 8 : 0;
      const startY = window.scrollY;
      const targetY = target.getBoundingClientRect().top + startY - headerClearance + 1;
      const distance = targetY - startY;
      history.pushState(null, "", "#" + id);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.scrollTo(0, targetY);
        return;
      }

      const duration = 500;
      let startTime = null;

      function step(timestamp) {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        window.scrollTo(0, startY + distance * easeInOutQuad(progress));
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  });

  // Mapa bajo demanda — nunca cargar el iframe de Google Maps directo.
  const mapTrigger = document.getElementById("map-trigger");
  mapTrigger?.addEventListener("click", () => {
    const placeholder = document.getElementById("map-placeholder");
    const lat = placeholder.dataset.lat;
    const lng = placeholder.dataset.lng;
    const title = placeholder.dataset.title || "Ubicación";
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
    iframe.width = "100%";
    iframe.height = "340";
    iframe.style.border = "0";
    iframe.loading = "lazy";
    iframe.setAttribute("title", title);
    placeholder.replaceWith(iframe);
  });
});
