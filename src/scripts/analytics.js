// -----------------------------------------
// ANALYTICS — PostHog events
// -----------------------------------------
// PostHog is loaded by the site head script, only after statistics consent
// (see analytics/site-head.html). Until then every capture here is a no-op.
//
// Reads the data-track-* schema stamped by nav-track.js and content-track.js:
//   content_interaction     -> cta_clicked
//   navigation_interaction  -> nav_clicked
//
// Forms send names only, never field values:
//   form_started    first focus in a form
//   form_submitted  Webflow success state (HubSpot forms: hubspot.js)
//   form_failed     Webflow error state
// -----------------------------------------

const EVENTS = {
  content_interaction: 'cta_clicked',
  navigation_interaction: 'nav_clicked',
};

const POLL_MS = 100;
const POLL_MAX = 150; // ~15s

let bound = false;

export function capture(name, props, options) {
  const ph = window.posthog;
  if (ph && ph.__loaded) ph.capture(name, props, options);
}

function formName(form) {
  return form.getAttribute('data-name') || form.getAttribute('name') || form.id || 'unnamed';
}

function isShown(el) {
  return !!el && el.offsetParent !== null;
}

function onClick(e) {
  const el = e.target.closest('[data-track-event]');
  if (!el) return;
  const name = EVENTS[el.getAttribute('data-track-interaction-name')];
  if (!name) return;
  capture(name, {
    interaction_type: el.getAttribute('data-track-interaction-type'),
    label: el.getAttribute('data-track-interaction-value'),
  });
}

function onFocus(e) {
  const form = e.target.closest('form');
  if (!form || form.dataset.analyticsStarted) return;
  form.dataset.analyticsStarted = 'true';
  capture('form_started', { form_name: formName(form) });
}

function onSubmit(e) {
  const form = e.target;
  if (form.dataset.analyticsWatching) return;
  const wrap = form.parentElement;
  if (!wrap) return;
  form.dataset.analyticsWatching = 'true';

  let attempts = 0;
  const pollId = setInterval(() => {
    const done = isShown(wrap.querySelector('.w-form-done'));
    const failed = isShown(wrap.querySelector('.w-form-fail'));
    if (done || failed || ++attempts > POLL_MAX) {
      clearInterval(pollId);
      delete form.dataset.analyticsWatching;
      if (done) capture('form_submitted', { form_name: formName(form), form_type: 'webflow' }, { send_instantly: true });
      if (failed) capture('form_failed', { form_name: formName(form), form_type: 'webflow' });
    }
  }, POLL_MS);
}

export function initAnalytics() {
  if (bound) return;
  bound = true;
  document.addEventListener('click', onClick);
  document.addEventListener('focusin', onFocus);
  document.addEventListener('submit', onSubmit);
}
