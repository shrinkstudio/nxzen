// -----------------------------------------
// CONTENT TRACKING — Paid-media CTA attributes (page content)
// -----------------------------------------
// Stamps the paid-media data-track-* schema onto call-to-action links
// in page content — i.e. the .btn-icon-link button component used for
// CTAs sitewide — EXCLUDING the nav and banner (those are handled by
// nav-track.js with interaction-name "navigation_interaction").
//
// Schema (paid team's spec):
//   data-track-event="ui_interaction"
//   data-track-interaction-name="content_interaction"
//   data-track-interaction-type="call_to_action"
//   data-track-interaction-value="<lowercased CTA label>"
//
// Applied to the <a> itself, replacing any legacy data-track-* it carried.
// -----------------------------------------

const EVENT = 'ui_interaction';
const NAME = 'content_interaction';
const TYPE = 'call_to_action';
const LEGACY_ATTRS = ['data-track-category', 'data-track-label', 'data-track-event'];

function toValue(text) {
  return (text || '')
    .replace(/​/g, '')      // zero-width space (Webflow rich-text artifact)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function stamp(el, value) {
  if (!el || !value) return;
  LEGACY_ATTRS.forEach((a) => el.removeAttribute(a));
  el.setAttribute('data-track-event', EVENT);
  el.setAttribute('data-track-interaction-name', NAME);
  el.setAttribute('data-track-interaction-type', TYPE);
  el.setAttribute('data-track-interaction-value', value);
}

export function initContentTrack(scope) {
  scope = scope || document;
  const nav = scope.querySelector('[data-menu-wrap]');
  const banner = scope.querySelector('.nav-banner-wrapper');

  scope.querySelectorAll('a.btn-icon-link').forEach((el) => {
    // Skip nav / banner CTAs — those are navigation_interaction (nav-track.js).
    if (nav && nav.contains(el)) return;
    if (banner && banner.contains(el)) return;
    stamp(el, toValue(el.textContent));
  });
}
