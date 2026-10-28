/* Resalta automáticamente la sección correspondiente, también en rutas limpias de Cloudflare. */
(function () {
  "use strict";
  var path = window.location.pathname || "/";
  var current = path.replace(/\/+$/, "").split("/").pop().replace(/\.html$/i, "");
  if (!current || current === "/") current = "index";
  var sectionNames = ["index", "espacios", "como-funciona", "disponibilidad", "acceso"];

  document.querySelectorAll(".site-header nav a[href]").forEach(function (link) {
    if (link.classList.contains("nav-cta")) return;
    var href;
    try {
      href = new URL(link.getAttribute("href"), window.location.href);
    } catch (error) {
      return;
    }
    var target = href.pathname.replace(/\/+$/, "").split("/").pop().replace(/\.html$/i, "");
    if (sectionNames.indexOf(target) === -1) return;
    var active = current === target;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
})();
