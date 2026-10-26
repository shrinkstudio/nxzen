// -----------------------------------------
// LIST FILTER
// Category, location and search filtering for a CMS list (Partners page).
//
// [data-filter-list]           — Collection List (holds the items)
// [data-filter-item]           — Collection Item
//   data-category="Technology" — bound to the item's category
//   data-location="India"      — bound to the item's location
// [data-filter-category="X"]   — button; "" = all. Active gets .is-active + aria-pressed
// [data-filter-location]       — <select>; options are built from the items
// [data-filter-search]         — search <input>; matches the item's text
// [data-filter-empty]          — shown when nothing matches
// -----------------------------------------

const OPTION_ID = /^[a-f0-9]{24,32}$/i;
let cleanupFns = [];

export function initListFilter(scope) {
  scope = scope || document;
  const list = scope.querySelector('[data-filter-list]');
  if (!list) return;

  const items = [...list.querySelectorAll('[data-filter-item]')];
  const buttons = [...scope.querySelectorAll('[data-filter-category]')];
  const select = scope.querySelector('[data-filter-location]');
  const search = scope.querySelector('[data-filter-search]');
  const empty = scope.querySelector('[data-filter-empty]');

  const state = { category: '', location: '', query: '' };
  const norm = (s) => (s || '').trim().toLowerCase();

  // Option fields can bind as ids; fall back to the visible eyebrow text
  const categoryOf = (item) => {
    const value = item.dataset.category || '';
    if (value && !OPTION_ID.test(value)) return norm(value);
    return norm(item.querySelector('.eyebrow')?.textContent);
  };

  if (select) buildLocations(select, items);

  const apply = () => {
    let shown = 0;
    items.forEach((item) => {
      const match =
        (!state.category || categoryOf(item) === state.category) &&
        (!state.location || norm(item.dataset.location) === state.location) &&
        (!state.query || norm(item.textContent).includes(state.query));
      item.style.display = match ? '' : 'none';
      if (match) shown++;
    });
    if (empty) empty.style.display = shown ? 'none' : 'block';
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  };

  buttons.forEach((btn) => {
    const onClick = () => {
      state.category = norm(btn.dataset.filterCategory);
      buttons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      apply();
    };
    btn.addEventListener('click', onClick);
    cleanupFns.push(() => btn.removeEventListener('click', onClick));
  });

  if (select) {
    const onChange = () => { state.location = norm(select.value); apply(); };
    select.addEventListener('change', onChange);
    cleanupFns.push(() => select.removeEventListener('change', onChange));
  }

  if (search) {
    let timer;
    const onInput = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.query = norm(search.value); apply(); }, 150);
    };
    search.addEventListener('input', onInput);
    cleanupFns.push(() => { clearTimeout(timer); search.removeEventListener('input', onInput); });
  }

  cleanupFns.push(() => {
    items.forEach((item) => { item.style.display = ''; });
    if (empty) empty.style.display = '';
  });
}

export function destroyListFilter() {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
}

// Clone the existing "All" option for each unique location (no innerHTML)
function buildLocations(select, items) {
  const template = select.querySelector('option');
  if (!template || select.dataset.filterBuilt) return;
  const locations = [...new Set(items.map((i) => (i.dataset.location || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  locations.forEach((loc) => {
    const option = template.cloneNode(false);
    option.value = loc;
    option.textContent = loc;
    select.appendChild(option);
  });
  select.dataset.filterBuilt = 'true';
}
