/* Marca la página actual después de que app.js termine de inicializar la cabecera. */
(function () {
  "use strict";

  function normalizePage(value) {
    var part = String(value || "").split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop().toLowerCase();
    var page = part.replace(/\.html$/i, "");
    if (!page || page === "index") return "index";
    if (page === "espacio") return "espacios";
    if (page === "area-privada" || page === "admin") return "acceso";
    return page;
  }

  function applyCurrentNavigation() {
    var current = normalizePage(window.location.pathname || "/");
    var knownPages = ["index", "espacios", "como-funciona", "disponibilidad", "acceso"];
    if (knownPages.indexOf(current) === -1) return;

    document.querySelectorAll(".site-header nav a[href]").forEach(function (link) {
      if (link.classList.contains("nav-cta")) return;
      var target;
      try {
        target = normalizePage(new URL(link.getAttribute("href"), window.location.href).pathname);
      } catch (error) {
        return;
      }
      if (knownPages.indexOf(target) === -1) return;

      var active = current === target;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");

      /* Fuerza el mismo acabado aun si otra hoja intenta anularlo. */
      link.style.setProperty("color", active ? "#bd6348" : "#26372e", "important");
      link.style.setProperty("border-bottom", active ? "2px solid #bd6348" : "2px solid transparent", "important");
      link.style.setProperty("box-shadow", "none", "important");
      link.style.setProperty("text-decoration", "none", "important");
      link.style.setProperty("background", "transparent", "important");
      if (active) link.style.setProperty("font-weight", "750", "important");
      else link.style.removeProperty("font-weight");
    });
  }

  /* Inmediato para HTML estático y otra vez tras la inicialización de app.js. */
  applyCurrentNavigation();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyCurrentNavigation);
  } else {
    applyCurrentNavigation();
  }
  window.addEventListener("pageshow", applyCurrentNavigation);
})();
