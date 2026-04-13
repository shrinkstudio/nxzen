// -----------------------------------------
// READ TIME
// Calculates and displays estimated reading time.
//
// Template page (source on page):
//   [data-read-time-source]  — element containing article body text
//   [data-read-time]         — display element (receives "X min read")
//
// Cards (source on another page):
//   [data-read-time-link]    — anchor wrapping or near the card
//   [data-read-time]         — display element inside/beside the link
//
// Optional attrs:
//   data-read-time-wpm="250"       — words per minute (default 238)
//   data-read-time-suffix=" min read" — suffix (default " min read")
//   data-read-time-min="1"         — minimum minutes shown (default 1)
// -----------------------------------------

const CACHE_KEY = 'nxzen-read-times';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24h
let cleanupFns = [];

export function initReadTime(scope) {
  scope = scope || document;

  // Template page: source content is on the page
  const sources = scope.querySelectorAll('[data-read-time-source]');
  sources.forEach(source => {
    const displays = scope.querySelectorAll('[data-read-time]:not([data-read-time-link] [data-read-time])');
    const minutes = calcMinutes(source, scope);
    displays.forEach(el => setDisplay(el, minutes, scope));

    // Cache for cards on other pages
    cacheReadTime(window.location.pathname, minutes);
  });

  // Cards: fetch article pages to get read time
  const links = scope.querySelectorAll('[data-read-time-link]');
  if (links.length) initCardReadTimes(links);
}

export function destroyReadTime() {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
}

function calcMinutes(sourceEl, scope) {
  const text = sourceEl.textContent || '';
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wpm = parseInt(scope.querySelector('[data-read-time-wpm]')?.dataset.readTimeWpm) || 238;
  const min = parseInt(scope.querySelector('[data-read-time-min]')?.dataset.readTimeMin) || 1;
  return Math.max(min, Math.ceil(words / wpm));
}

function setDisplay(el, minutes, scope) {
  const suffix = el.dataset.readTimeSuffix !== undefined
    ? el.dataset.readTimeSuffix
    : ' min read';
  el.textContent = minutes + suffix;
}

function cacheReadTime(path, minutes) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[path] = { minutes, ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) { /* localStorage unavailable */ }
}

function getCachedReadTime(path) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const entry = cache[path];
    if (entry && (Date.now() - entry.ts) < CACHE_TTL) return entry.minutes;
  } catch (e) { /* ignore */ }
  return null;
}

function initCardReadTimes(links) {
  const fetchQueue = new Map(); // path → [{ display, scope }]

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    const path = new URL(href, window.location.origin).pathname;
    const display = link.querySelector('[data-read-time]')
      || link.closest('[data-read-time-link]')?.parentElement?.querySelector('[data-read-time]');
    if (!display) return;

    // Try cache first
    const cached = getCachedReadTime(path);
    if (cached !== null) {
      setDisplay(display, cached);
      return;
    }

    // Queue for fetch
    if (!fetchQueue.has(path)) fetchQueue.set(path, []);
    fetchQueue.get(path).push(display);
  });

  // Fetch uncached pages
  fetchQueue.forEach((displays, path) => {
    const controller = new AbortController();
    cleanupFns.push(() => controller.abort());

    fetch(path, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(res.status);
        return res.text();
      })
      .then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const source = doc.querySelector('[data-read-time-source]');
        if (!source) return;

        const minutes = calcMinutes(source, doc);
        cacheReadTime(path, minutes);
        displays.forEach(el => setDisplay(el, minutes));
      })
      .catch(() => { /* network error or aborted */ });
  });
}
