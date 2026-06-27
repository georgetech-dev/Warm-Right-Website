(function () {
  const GITHUB_RAW_ROOT = 'https://raw.githubusercontent.com/s-george-dev/Warm-Right-Website/master/';

  function cleanPath(path) {
    return String(path || '').replace(/^(\.\/|\.\.\/|\/)+/, '');
  }

  function siteRoot() {
    return window.location.hostname.includes('github.io') ? '/Warm-Right-Website/' : '/';
  }

  function publicUrl(path) {
    if (!path) return '';
    if (/^(https?:|data:|blob:|tel:|mailto:|#)/i.test(path)) return path;
    return siteRoot() + cleanPath(path);
  }

  function githubRawUrl(path) {
    const cleaned = cleanPath(path);
    if (!cleaned.startsWith('assets/images/')) return '';
    return GITHUB_RAW_ROOT + cleaned.split('/').map(encodeURIComponent).join('/');
  }

  function imageUrl(path) {
    return publicUrl(path);
  }

  function withImageFallback(element, path, fallbackPath) {
    if (!element) return;
    const rawUrl = githubRawUrl(path);
    const fallbackUrl = fallbackPath ? publicUrl(fallbackPath) : '';
    element.removeAttribute('data-github-fallback-used');
    element.onerror = () => {
      if (rawUrl && element.getAttribute('data-github-fallback-used') !== 'true') {
        element.setAttribute('data-github-fallback-used', 'true');
        element.src = rawUrl;
        return;
      }
      if (fallbackUrl && element.src !== fallbackUrl) {
        element.src = fallbackUrl;
      }
    };
    element.src = imageUrl(path || fallbackPath);
  }

  function backgroundImageUrl(path) {
    const rawUrl = githubRawUrl(path);
    return rawUrl || publicUrl(path);
  }

  window.WarmRightImages = {
    cleanPath,
    publicUrl,
    githubRawUrl,
    imageUrl,
    withImageFallback,
    backgroundImageUrl,
  };
})();
