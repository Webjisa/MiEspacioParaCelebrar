/* Cloudflare Turnstile para los formularios de autenticación de MiEspacioParaCelebrar.
 * La Sitekey es pública. La Secret key se configura únicamente en Supabase.
 */
(function () {
  'use strict';

  const SITE_KEY = '0x4AAAAAAFoW6u_00Gyyd-Ae';
  const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  let scriptPromise = null;

  function loadApi() {
    if (window.turnstile && typeof window.turnstile.render === 'function') {
      return Promise.resolve();
    }
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.turnstile && typeof window.turnstile.render === 'function') {
          resolve();
        } else {
          scriptPromise = null;
          reject(new Error('La API de Turnstile no está disponible.'));
        }
      };
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('No se ha podido cargar la verificación de seguridad.'));
      };
      document.head.appendChild(script);
    });
    return scriptPromise;
  }

  async function render(container, onToken) {
    const target = typeof container === 'string' ? document.querySelector(container) : container;
    if (!target) throw new Error('No se encuentra el espacio para la verificación de seguridad.');
    if (typeof onToken !== 'function') throw new Error('Falta la función que recibe el token.');
    await loadApi();

    return window.turnstile.render(target, {
      sitekey: SITE_KEY,
      callback: token => onToken(String(token || '')),
      'expired-callback': () => onToken(''),
      'error-callback': () => onToken('')
    });
  }

  function reset(widgetId, onToken) {
    if (typeof onToken === 'function') onToken('');
    if (window.turnstile && widgetId !== null && widgetId !== undefined) {
      try { window.turnstile.reset(widgetId); } catch (_) {}
    }
  }

  window.MIESPACIO_TURNSTILE = { render, reset };
})();
