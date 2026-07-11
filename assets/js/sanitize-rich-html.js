(function () {
  if (window.WarmRightSanitize) return;

  const ALLOWED_TAGS = new Set([
    'a', 'b', 'br', 'em', 'i', 'li', 'ol', 'p', 'span', 'strong', 'u', 'ul',
  ]);

  const URL_ATTRS = new Set(['href']);

  function sanitizeRichHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');

    Array.from(template.content.querySelectorAll('*')).forEach((element) => {
      const tag = element.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value || '';

        if (name.startsWith('on') || name === 'style' || name === 'srcdoc') {
          element.removeAttribute(attribute.name);
          return;
        }

        if (name === 'target') {
          element.setAttribute('target', '_blank');
          element.setAttribute('rel', 'noopener noreferrer');
          return;
        }

        if (URL_ATTRS.has(name)) {
          if (!/^(https?:|mailto:|tel:|\/|#)/i.test(value)) {
            element.removeAttribute(attribute.name);
          } else if (name === 'href' && element.getAttribute('target') === '_blank') {
            element.setAttribute('rel', 'noopener noreferrer');
          }
          return;
        }

        if (!['class', 'aria-hidden', 'role'].includes(name)) {
          element.removeAttribute(attribute.name);
        }
      });
    });

    return template.innerHTML.trim();
  }

  window.WarmRightSanitize = { sanitizeRichHtml };
}());
