// -----------------------------------------
// PDF EMBED
// [data-pdf-embed] container
// Source: data-pdf-src="url" OR a child <a data-pdf-link> with href bound to CMS file field
// Optional: data-pdf-title (accessible label)
// -----------------------------------------

export function initPdfEmbed(scope) {
  scope = scope || document;

  scope.querySelectorAll('[data-pdf-embed]').forEach(function (container) {
    if (container.querySelector('iframe[data-pdf-iframe]')) return;

    // Try data-pdf-src first, then fall back to a child link's href
    var src = container.getAttribute('data-pdf-src');
    if (!src) {
      var link = container.querySelector('[data-pdf-link]');
      if (link) {
        src = link.getAttribute('href');
        link.style.display = 'none';
      }
    }
    if (!src) return;

    var title = container.getAttribute('data-pdf-title') || 'PDF document';

    var iframe = document.createElement('iframe');
    iframe.setAttribute('src', src);
    iframe.setAttribute('title', title);
    iframe.setAttribute('data-pdf-iframe', '');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('frameborder', '0');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.display = 'block';

    container.appendChild(iframe);
  });
}

export function destroyPdfEmbed(scope) {
  scope = scope || document;
  scope.querySelectorAll('[data-pdf-iframe]').forEach(function (iframe) {
    iframe.remove();
  });
}
