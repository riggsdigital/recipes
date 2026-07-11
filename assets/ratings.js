// Simple localStorage-based star ratings, shared across all recipe pages.
// Each recipe page calls initStarRating('recipe-slug').
// The table of contents calls renderTocStars() to show saved ratings on tiles.

function getRating(slug) {
  const val = localStorage.getItem('rating:' + slug);
  return val ? parseInt(val, 10) : 0;
}

function setRating(slug, value) {
  localStorage.setItem('rating:' + slug, String(value));
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
      span.addEventListener('mouseenter', () => render(i));
      span.addEventListener('mouseleave', () => render());
      span.addEventListener('click', () => {
        current = i;
        setRating(slug, i);
        render();
        if (label) label.textContent = i + ' / 5 \u2014 saved on this device';
      });
      container.appendChild(span);
    }
  }
  render();
  if (label) {
    label.textContent = current > 0
      ? current + ' / 5 \u2014 saved on this device'
      : 'Tap a star to rate';
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
