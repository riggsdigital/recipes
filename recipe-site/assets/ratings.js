// Star ratings (persist via localStorage where available, in-memory fallback
// otherwise — e.g. some in-app browser previews block localStorage silently).
// Each recipe page calls initStarRating('recipe-slug').
// The table of contents calls renderTocStars() to show saved ratings on tiles.

const _memoryRatings = {};

function _storageAvailable() {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}
const _hasStorage = _storageAvailable();

function getRating(slug) {
  if (_hasStorage) {
    const val = localStorage.getItem('rating:' + slug);
    return val ? parseInt(val, 10) : 0;
  }
  return _memoryRatings[slug] || 0;
}

function setRating(slug, value) {
  if (_hasStorage) {
    localStorage.setItem('rating:' + slug, String(value));
  } else {
    _memoryRatings[slug] = value;
  }
}

function initStarRating(slug) {
  const container = document.getElementById('star-rating');
  if (!container) return;
  const label = document.getElementById('rating-label');
  let current = getRating(slug);

  function render(hoverValue) {
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const span = document.createElement('span');
      span.className = 'star' + (i <= (hoverValue || current) ? ' filled' : '');
      span.textContent = '\u2605';

      // Desktop hover preview
      span.addEventListener('mouseenter', () => render(i));
      span.addEventListener('mouseleave', () => render());

      // Works reliably on both mouse click and touch tap
      const selectStar = (e) => {
        e.preventDefault();
        current = i;
        setRating(slug, i);
        render();
        if (label) label.textContent = i + ' / 5' + (_hasStorage ? ' \u2014 saved on this device' : '');
      };
      span.addEventListener('click', selectStar);
      span.addEventListener('touchend', selectStar);

      container.appendChild(span);
    }
  }
  render();
  if (label) {
    label.textContent = current > 0
      ? current + ' / 5' + (_hasStorage ? ' \u2014 saved on this device' : '')
      : (_hasStorage ? 'Tap a star to rate' : 'Tap a star to rate (not saved in this view)');
  }
}

function renderTocStars() {
  document.querySelectorAll('[data-slug]').forEach((tile) => {
    const slug = tile.getAttribute('data-slug');
    const starsEl = tile.querySelector('.tile-stars');
    if (!starsEl) return;
    const rating = getRating(slug);
    if (rating > 0) {
      starsEl.textContent = '\u2605'.repeat(rating) + '\u2606'.repeat(5 - rating);
    } else {
      starsEl.textContent = 'Not yet rated';
      starsEl.style.color = '#999';
    }
  });
}

// ---------- Servings scaler ----------
// Each ingredient <li> carries data-amount / data-unit / data-name.
// initServings(baseServings) wires up the +/- buttons to rescale quantities.

function _formatAmount(n) {
  const rounded = Math.round(n * 100) / 100;
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  const fracMap = { 0.25: '\u00bc', 0.33: '\u2153', 0.5: '\u00bd', 0.67: '\u2154', 0.75: '\u00be' };
  let bestKey = null, bestDiff = 1;
  Object.keys(fracMap).forEach((key) => {
    const diff = Math.abs(frac - parseFloat(key));
    if (diff < bestDiff) { bestDiff = diff; bestKey = key; }
  });
  if (bestKey !== null && bestDiff < 0.05 && parseFloat(bestKey) !== 0) {
    return (whole > 0 ? whole + ' ' : '') + fracMap[bestKey];
  }
  return rounded % 1 === 0 ? String(rounded) : String(parseFloat(rounded.toFixed(2)));
}

function initServings(baseServings) {
  const countEl = document.getElementById('servings-count');
  const minusBtn = document.getElementById('servings-minus');
  const plusBtn = document.getElementById('servings-plus');
  const list = document.querySelectorAll('.ingredients li[data-amount]');
  if (!countEl || !list.length) return;

  let servings = baseServings;

  function render() {
    countEl.textContent = servings;
    const ratio = servings / baseServings;
    list.forEach((li) => {
      const amount = parseFloat(li.getAttribute('data-amount'));
      const unit = li.getAttribute('data-unit') || '';
      const name = li.getAttribute('data-name') || '';
      const scaled = amount * ratio;
      const amountText = _formatAmount(scaled);
      li.textContent = [amountText, unit, name].filter(Boolean).join(' ');
    });
    if (minusBtn) minusBtn.classList.toggle('disabled', servings <= 1);
  }

  if (minusBtn) minusBtn.addEventListener('click', () => {
    if (servings > 1) { servings -= 1; render(); }
  });
  if (plusBtn) plusBtn.addEventListener('click', () => {
    servings += 1; render();
  });

  render();
}

// ---------- Delete a recipe (client-side "soft delete") ----------
// A real delete of the page itself requires removing its file from the
// GitHub repo — this only hides it from the table of contents on this
// device/browser, with an easy undo, so a misclick isn't permanent.

const _memoryHidden = {};

function isHidden(slug) {
  if (_hasStorage) return localStorage.getItem('hidden:' + slug) === '1';
  return !!_memoryHidden[slug];
}

function setHidden(slug, value) {
  if (_hasStorage) {
    if (value) localStorage.setItem('hidden:' + slug, '1');
    else localStorage.removeItem('hidden:' + slug);
  } else {
    _memoryHidden[slug] = value;
  }
}

function applyHiddenTiles() {
  let hiddenCount = 0;
  document.querySelectorAll('[data-slug]').forEach((tile) => {
    if (isHidden(tile.getAttribute('data-slug'))) {
      tile.style.display = 'none';
      hiddenCount++;
    }
  });
  const banner = document.getElementById('hidden-banner');
  if (!banner) return;
  banner.innerHTML = '';
  if (hiddenCount === 0) {
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'block';
  banner.append(hiddenCount + (hiddenCount === 1 ? ' recipe hidden on this device \u2014 ' : ' recipes hidden on this device \u2014 '));
  const link = document.createElement('a');
  link.href = '#';
  link.textContent = 'show them';
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('[data-slug]').forEach((tile) => {
      setHidden(tile.getAttribute('data-slug'), false);
      tile.style.display = '';
    });
    banner.style.display = 'none';
  });
  banner.appendChild(link);
}

// Delete button on a table-of-contents tile
function confirmDeleteTile(btn) {
  const slug = btn.getAttribute('data-slug');
  const title = btn.getAttribute('data-title') || 'this recipe';
  const sure = window.confirm(
    'Delete "' + title + '"?\n\n' +
    'This removes it from your list on this device (you can undo it right after). ' +
    'To remove it from the site for good, also delete its page from the GitHub repo.'
  );
  if (!sure) return;
  setHidden(slug, true);
  applyHiddenTiles();
}

// Delete link on a recipe page itself — hides it, then returns to the list
function confirmDeleteFromRecipe(slug, title, indexUrl) {
  const sure = window.confirm(
    'Delete "' + title + '"?\n\n' +
    'This removes it from your list on this device. ' +
    'To remove it from the site for good, also delete its page from the GitHub repo.'
  );
  if (!sure) return;
  setHidden(slug, true);
  window.location.href = indexUrl;
}
