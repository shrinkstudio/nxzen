// -----------------------------------------
// COPY LINK TO CLIPBOARD
// [data-copy-link] on an <a> element — copies its href as absolute URL
// -----------------------------------------

let handler = null;

export function initCopyLink() {
  handler = function (e) {
    var btn = e.target.closest('[data-copy-link]');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    var href = btn.getAttribute('href') || '';
    var fullUrl = new URL(href, window.location.origin).href;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl).then(function () {
        var prev = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = prev || 'Copy Campaign URL'; }, 1500);
      }).catch(function () {
        prompt('Copy this URL:', fullUrl);
      });
    } else {
      prompt('Copy this URL:', fullUrl);
    }

    return false;
  };

  document.addEventListener('click', handler, true);
}

export function destroyCopyLink() {
  if (handler) {
    document.removeEventListener('click', handler, true);
    handler = null;
  }
}
