// include.js - Shared Loader

const WARM_RIGHT_SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
const WARM_RIGHT_SUPABASE_KEY = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';

function loadScriptOnce(src) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadOptionalScript(src) {
  return loadScriptOnce(src).catch(error => {
    console.warn(`Optional site script could not be loaded: ${src}`, error);
  });
}

async function initPublicDatabase() {
  if (typeof supabase === 'undefined') {
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
  }

  if (!window.db && typeof supabase !== 'undefined') {
    window.db = supabase.createClient(WARM_RIGHT_SUPABASE_URL, WARM_RIGHT_SUPABASE_KEY);
  }
}

function loadHTML(id, file) {
  return fetch(file, { cache: 'no-store' })
    .then(res => {
      if (!res.ok) throw new Error(`Could not load ${file} (${res.status})`);
      return res.text();
    })
    .then(data => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = data;
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const isGitHub = window.location.hostname.includes("github.io");
  const siteRoot = isGitHub ? "/Warm-Right-Website/" : "/";
  const partialsPath = siteRoot + "partials/";

  Promise.allSettled([
    initPublicDatabase(),
    loadScriptOnce(siteRoot + "assets/js/public-image-resolver.js?v=1"),
    loadScriptOnce(siteRoot + "assets/js/sanitize-rich-html.js?v=1"),
    loadScriptOnce(siteRoot + "assets/js/site-theme.js?v=3"),
    loadScriptOnce(siteRoot + "assets/js/site-management-public.js?v=8"),
    loadScriptOnce(siteRoot + "assets/js/hero-management-public.js?v=9"),
    loadScriptOnce(siteRoot + "assets/js/content-cards.js?v=10"),
    loadScriptOnce(siteRoot + "assets/js/feature-lists.js?v=2"),
    loadScriptOnce(siteRoot + "assets/js/contact-actions.js?v=20260706buttons"),
    loadOptionalScript(siteRoot + "assets/js/site-analytics.js?v=4"),
    loadHTML("header", partialsPath + "header.html"),
    loadHTML("footer", partialsPath + "footer.html")
  ]).then(results => {
    results.filter(result => result.status === 'rejected').forEach(result => {
      console.error('A shared site resource could not be loaded.', result.reason);
    });
    if (typeof window.initSiteTheme === "function") window.initSiteTheme();
    const header = document.getElementById("header");
    if (header) {
      fixInjectedPaths(header, siteRoot);
    }
    const footer = document.getElementById("footer");
    if (footer) fixInjectedPaths(footer, siteRoot);

    // Trigger Nav Logic after fragments are loaded
    if (typeof window.initWarmRight === "function") {
      window.initWarmRight();
    }
    document.dispatchEvent(new Event("includesLoaded"));
    window.setTimeout(() => header?.querySelector(".header")?.classList.add("loaded"), 2000);
  });
});

function fixInjectedPaths(container, root) {
  container.querySelectorAll('a, img').forEach(el => {
    const attr = el.tagName === 'A' ? 'href' : 'src';
    let val = el.getAttribute(attr);
    if (val && !val.startsWith('http') && !val.startsWith('tel:') && !val.startsWith('mailto:') && !val.startsWith('#')) {
      const cleanVal = val.replace(/^(\.\.\/|\.\/|\/)+/, '');
      el.setAttribute(attr, root + cleanVal);
    }
  });
}
