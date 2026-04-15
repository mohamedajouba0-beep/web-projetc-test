/* ============================================================
   ÉLUME — app.js
   Cart (localStorage), filters, product rendering, routing
   ============================================================ */

/* ── CartManager ─────────────────────────────────────────── */
const CartManager = {
  KEY: 'elume_cart',

  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this._updateBadges();
  },

  add(productId, colorName, size, qty = 1) {
    const items = this.get();
    const key = `${productId}_${colorName}_${size}`;
    const existing = items.find(i => i.key === key);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, 10);
    } else {
      const p = PRODUCTS.find(p => p.id === productId);
      if (!p) return;
      items.push({ key, productId, colorName, size, qty, name: p.name, price: p.price, bg: p.bg });
    }
    this.save(items);
  },

  remove(key) {
    this.save(this.get().filter(i => i.key !== key));
  },

  updateQty(key, qty) {
    const items = this.get();
    const item = items.find(i => i.key === key);
    if (item) {
      if (qty < 1) { this.remove(key); return; }
      item.qty = Math.min(qty, 10);
      this.save(items);
    }
  },

  clear() { this.save([]); },

  count() { return this.get().reduce((s, i) => s + i.qty, 0); },

  subtotal() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },

  shipping(subtotal) { return subtotal >= 80 ? 0 : 4.90; },

  total(promoDiscount = 0) {
    const sub = this.subtotal();
    return sub + this.shipping(sub) - promoDiscount;
  },

  _updateBadges() {
    const n = this.count();
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = n;
      el.classList.toggle('visible', n > 0);
    });
  }
};

/* ── Helpers ─────────────────────────────────────────────── */
const fmt = n => n.toFixed(2).replace('.', ',') + '\u202f€';

function starHTML(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let s = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) s += '★';
    else if (i === full && half) s += '½';
    else s += '☆';
  }
  return `<span class="stars" aria-label="${rating} étoiles sur 5">${s}</span>`;
}

function badgeHTML(badge) {
  if (!badge) return '';
  const cls = badge === 'Nouveau' ? 'badge--new' : 'badge--promo';
  return `<span class="badge ${cls}">${badge}</span>`;
}

function productCardHTML(p) {
  const sale = p.originalPrice !== null;
  return `
    <article class="product-card">
      <a href="product.html?id=${p.id}" aria-label="${p.name}">
        <div class="product-card__img">
          <div class="product-card__img-inner" style="background:${p.bg}"></div>
          ${p.badge ? `<div class="product-card__badge">${badgeHTML(p.badge)}</div>` : ''}
        </div>
      </a>
      <div class="product-card__info">
        <div class="product-card__cat">${p.category}</div>
        <a href="product.html?id=${p.id}"><h3 class="product-card__name">${p.name}</h3></a>
        <div class="product-card__rating">
          ${starHTML(p.rating)}
          <span>(${p.reviews})</span>
        </div>
        <div class="product-card__price">
          <span class="price-current${sale ? ' is-sale' : ''}">${fmt(p.price)}</span>
          ${sale ? `<span class="price-original">${fmt(p.originalPrice)}</span>` : ''}
        </div>
        <div class="product-card__colors">
          ${p.colors.map(c => `<span class="color-dot" style="background:${c}" title="${p.colorNames[p.colors.indexOf(c)]}"></span>`).join('')}
        </div>
      </div>
      <div class="product-card__quick">
        <button class="btn btn--dark quick-add-btn" data-id="${p.id}">
          + Ajouter au panier
        </button>
      </div>
    </article>
  `;
}

/* ── Toast notifications ─────────────────────────────────── */
function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>${msg}`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    t.addEventListener('animationend', () => t.remove());
  }, 2800);
}

/* ── Reveal observer ─────────────────────────────────────── */
function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const d = el.style.getPropertyValue('--delay') || '0s';
      el.style.transitionDelay = d;
      el.classList.add('visible');
      obs.unobserve(el);
    });
  }, { rootMargin: '0px 0px -50px 0px', threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

/* ── Sticky header ───────────────────────────────────────── */
function initHeader() {
  const h = document.getElementById('site-header');
  if (!h) return;
  const fn = () => h.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', fn, { passive: true });
  fn();
}

/* ── Hamburger ───────────────────────────────────────────── */
function initHamburger() {
  const btn = document.getElementById('nav-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', e => {
    if (document.body.classList.contains('nav-open') &&
        !e.target.closest('#nav-links') &&
        !e.target.closest('#nav-toggle')) {
      document.body.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ── Footer year ─────────────────────────────────────────── */
function initFooterYear() {
  document.querySelectorAll('#footer-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

/* ── Quick add (card button) ─────────────────────────────── */
function bindQuickAdd(container) {
  container.querySelectorAll('.quick-add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const id = parseInt(btn.dataset.id, 10);
      const p = PRODUCTS.find(p => p.id === id);
      if (!p) return;
      CartManager.add(id, p.colorNames[0], p.sizes[0], 1);
      showToast(`<strong>${p.name}</strong> ajouté au panier`);
    });
  });
}

/* ── PAGE: HOME ──────────────────────────────────────────── */
function initHome() {
  const featuredGrid = document.getElementById('featured-grid');
  const newGrid = document.getElementById('new-grid');
  if (!featuredGrid) return;

  // Featured: top-rated products (sort by rating desc, take 8)
  const featured = [...PRODUCTS].sort((a, b) => b.rating - a.rating).slice(0, 8);
  featuredGrid.innerHTML = featured.map(productCardHTML).join('');
  bindQuickAdd(featuredGrid);

  // New arrivals: badge === 'Nouveau'
  if (newGrid) {
    const newProducts = PRODUCTS.filter(p => p.badge === 'Nouveau');
    newGrid.innerHTML = newProducts.map(productCardHTML).join('');
    bindQuickAdd(newGrid);
  }
}

/* ── PAGE: SHOP ──────────────────────────────────────────── */
function initShop() {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;

  let filtered = [...PRODUCTS];
  let activeCategory = '';
  let maxPrice = 300;
  let onlyPromo = false;
  let onlyNew = false;
  let sortMode = 'default';
  let searchQuery = '';

  // Read URL params
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get('cat') || '';
  if (catParam === 'promos') { onlyPromo = true; }
  else if (catParam === 'nouveautes') { onlyNew = true; }
  else if (catParam) { activeCategory = catParam; }

  function applyFilters() {
    filtered = PRODUCTS.filter(p => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (p.price > maxPrice) return false;
      if (onlyPromo && p.badge !== 'Promo') return false;
      if (onlyNew && p.badge !== 'Nouveau') return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    if (sortMode === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sortMode === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    else if (sortMode === 'rating') filtered.sort((a, b) => b.rating - a.rating);

    renderGrid();
    updateCount();
  }

  function renderGrid() {
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <h3>Aucun article trouvé</h3>
          <p>Essayez d'autres filtres ou élargissez votre recherche.</p>
        </div>`;
      return;
    }
    grid.innerHTML = filtered.map(productCardHTML).join('');
    bindQuickAdd(grid);
  }

  function updateCount() {
    const el = document.getElementById('count-num');
    if (el) el.textContent = filtered.length;
    const summary = document.getElementById('results-summary');
    if (summary) summary.textContent = `${filtered.length} article${filtered.length > 1 ? 's' : ''}`;
  }

  // Category radio buttons
  document.querySelectorAll('input[name="category"]').forEach(radio => {
    if (radio.value === activeCategory) {
      radio.checked = true;
      radio.closest('.filter-option').classList.add('is-active');
    }
    radio.addEventListener('change', () => {
      activeCategory = radio.value;
      document.querySelectorAll('.filter-option[data-cat]').forEach(el => el.classList.remove('is-active'));
      radio.closest('.filter-option').classList.add('is-active');
      onlyPromo = false;
      onlyNew = false;
      applyFilters();
    });
  });

  // Price range
  const priceRange = document.getElementById('price-range');
  const priceLabel = document.getElementById('price-label');
  if (priceRange) {
    priceRange.addEventListener('input', () => {
      maxPrice = parseInt(priceRange.value, 10);
      priceLabel.textContent = maxPrice + '€';
      applyFilters();
    });
  }

  // Promo / new checkboxes
  const cbPromo = document.getElementById('filter-promo');
  const cbNew   = document.getElementById('filter-new');
  if (cbPromo) {
    cbPromo.checked = onlyPromo;
    cbPromo.addEventListener('change', () => { onlyPromo = cbPromo.checked; applyFilters(); });
  }
  if (cbNew) {
    cbNew.checked = onlyNew;
    cbNew.addEventListener('change', () => { onlyNew = cbNew.checked; applyFilters(); });
  }

  // Sort
  const sortSel = document.getElementById('sort-select');
  if (sortSel) {
    sortSel.addEventListener('change', () => { sortMode = sortSel.value; applyFilters(); });
  }

  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        applyFilters();
      }, 250);
    });
  }

  // Clear filters
  const clearBtn = document.getElementById('clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      activeCategory = '';
      maxPrice = 300;
      onlyPromo = false;
      onlyNew = false;
      searchQuery = '';
      sortMode = 'default';
      if (priceRange) { priceRange.value = 300; priceLabel.textContent = '300€'; }
      if (cbPromo) cbPromo.checked = false;
      if (cbNew)   cbNew.checked = false;
      if (sortSel) sortSel.value = 'default';
      if (searchInput) searchInput.value = '';
      document.querySelectorAll('input[name="category"]').forEach(r => {
        r.checked = r.value === '';
        r.closest('.filter-option').classList.toggle('is-active', r.value === '');
      });
      applyFilters();
    });
  }

  // Breadcrumb label
  const bc = document.getElementById('breadcrumb-current');
  if (bc) {
    if (catParam === 'promos') bc.textContent = 'Promotions';
    else if (catParam === 'nouveautes') bc.textContent = 'Nouveautés';
    else if (catParam) bc.textContent = catParam.charAt(0).toUpperCase() + catParam.slice(1);
  }

  applyFilters();
}

/* ── PAGE: PRODUCT DETAIL ────────────────────────────────── */
function initProduct() {
  const detailEl = document.getElementById('product-detail');
  if (!detailEl) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'), 10);
  const p = PRODUCTS.find(p => p.id === id);

  if (!p) {
    document.getElementById('product-not-found').style.display = 'block';
    return;
  }

  // Update page title / breadcrumb
  document.title = `${p.name} — Élume`;
  const bcName = document.getElementById('breadcrumb-name');
  if (bcName) bcName.textContent = p.name;

  // Gallery (simulate 3 "views" via tint variations)
  const tints = ['', 'brightness(1.15)', 'brightness(0.8) saturate(1.2)'];
  const mainEl = document.getElementById('gallery-main');
  mainEl.innerHTML = `<div id="gallery-active" style="width:100%;height:100%;background:${p.bg}"></div>`;

  const thumbsEl = document.getElementById('gallery-thumbs');
  thumbsEl.innerHTML = tints.map((f, i) =>
    `<div class="gallery-thumb${i === 0 ? ' active' : ''}" data-idx="${i}"
      style="background:${p.bg};filter:${f}" aria-label="Vue ${i+1}"></div>`
  ).join('');

  thumbsEl.querySelectorAll('.gallery-thumb').forEach(th => {
    th.addEventListener('click', () => {
      thumbsEl.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
      th.classList.add('active');
      const f = tints[parseInt(th.dataset.idx)];
      document.getElementById('gallery-active').style.filter = f;
    });
  });

  // Badge / cat / name / rating
  const badgeEl = document.getElementById('product-badge');
  if (p.badge) badgeEl.innerHTML = badgeHTML(p.badge);

  document.getElementById('product-cat').textContent = p.category.charAt(0).toUpperCase() + p.category.slice(1);
  document.getElementById('product-name').textContent = p.name;
  document.getElementById('product-rating').innerHTML = `${starHTML(p.rating)} <span>${p.reviews} avis</span>`;

  // Price
  const priceEl = document.getElementById('product-price');
  priceEl.innerHTML = `
    <span class="price-current${p.originalPrice ? ' is-sale' : ''}">${fmt(p.price)}</span>
    ${p.originalPrice ? `<span class="price-original">${fmt(p.originalPrice)}</span>
    <span class="badge badge--promo">-${Math.round((1 - p.price / p.originalPrice) * 100)}%</span>` : ''}
  `;

  // Description
  document.getElementById('product-desc').textContent = p.description;

  // Color swatches
  let selectedColor = p.colorNames[0];
  const colorSwatches = document.getElementById('color-swatches');
  const selectedColorEl = document.getElementById('selected-color');
  selectedColorEl.textContent = selectedColor;
  colorSwatches.innerHTML = p.colors.map((c, i) =>
    `<div class="color-swatch${i === 0 ? ' active' : ''}" style="background:${c}"
      data-name="${p.colorNames[i]}" title="${p.colorNames[i]}" role="button" tabindex="0"
      aria-label="${p.colorNames[i]}${i === 0 ? ', sélectionné' : ''}"></div>`
  ).join('');
  colorSwatches.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      colorSwatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      selectedColor = sw.dataset.name;
      selectedColorEl.textContent = selectedColor;
    });
  });

  // Size buttons
  let selectedSize = null;
  const sizeGrid = document.getElementById('size-grid');
  const selectedSizeEl = document.getElementById('selected-size');
  sizeGrid.innerHTML = p.sizes.map(s =>
    `<button class="size-btn" data-size="${s}">${s}</button>`
  ).join('');
  sizeGrid.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sizeGrid.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size;
      selectedSizeEl.textContent = selectedSize;
      document.getElementById('size-hint').style.display = 'none';
    });
  });

  // Qty
  let qty = 1;
  const qtyInput = document.getElementById('qty-input');
  document.getElementById('qty-minus').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qtyInput.value = qty;
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    qty = Math.min(10, qty + 1);
    qtyInput.value = qty;
  });

  // Add to cart
  document.getElementById('atc-btn').addEventListener('click', () => {
    if (!selectedSize && p.sizes[0] !== 'Unique') {
      document.getElementById('size-hint').style.display = 'block';
      document.getElementById('size-grid').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const size = selectedSize || p.sizes[0];
    CartManager.add(p.id, selectedColor, size, qty);
    showToast(`<strong>${p.name}</strong> (${selectedColor}, ${size}) ajouté au panier`);
  });

  // Details
  const detailsList = document.getElementById('product-details');
  detailsList.innerHTML = p.details.map(d => `<li>${d}</li>`).join('');

  // Related products
  const related = PRODUCTS.filter(r => r.category === p.category && r.id !== p.id).slice(0, 4);
  if (related.length > 0) {
    const relSection = document.getElementById('related-section');
    const relGrid = document.getElementById('related-grid');
    relSection.style.display = 'block';
    relGrid.innerHTML = related.map(productCardHTML).join('');
    bindQuickAdd(relGrid);
  }

  detailEl.style.display = 'grid';
}

/* ── PAGE: CART ──────────────────────────────────────────── */
function initCart() {
  const cartContent = document.getElementById('cart-content');
  if (!cartContent) return;

  let promoDiscount = 0;
  const PROMO_CODES = { 'ELUME10': 10, 'MODE20': 20, 'BIENVENUE': 15 };

  function renderCart() {
    const items = CartManager.get();
    const emptyEl = document.getElementById('empty-cart');
    const titleCount = document.getElementById('cart-count-title');

    if (titleCount) {
      const n = CartManager.count();
      titleCount.textContent = n > 0 ? `(${n} article${n > 1 ? 's' : ''})` : '';
    }

    if (items.length === 0) {
      emptyEl.style.display = 'block';
      cartContent.style.display = 'none';
      return;
    }
    emptyEl.style.display = 'none';
    cartContent.style.display = 'grid';

    const tbody = document.getElementById('cart-tbody');
    tbody.innerHTML = items.map(item => `
      <tr class="cart-row">
        <td>
          <div class="cart-product">
            <a href="product.html?id=${item.productId}" class="cart-product__img">
              <div style="width:100%;height:100%;background:${item.bg}"></div>
            </a>
            <div class="cart-product__info">
              <div class="cart-product__name">${item.name}</div>
              <div class="cart-product__meta">${item.colorName} · Taille ${item.size}</div>
              <button class="cart-remove" data-key="${item.key}" aria-label="Supprimer ${item.name}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                Supprimer
              </button>
            </div>
          </div>
        </td>
        <td style="text-align:center">
          <div class="cart-qty">
            <button class="cart-qty-btn" data-key="${item.key}" data-action="minus" aria-label="Diminuer">−</button>
            <span class="cart-qty-val">${item.qty}</span>
            <button class="cart-qty-btn" data-key="${item.key}" data-action="plus" aria-label="Augmenter">+</button>
          </div>
        </td>
        <td><strong>${fmt(item.price * item.qty)}</strong></td>
      </tr>
    `).join('');

    // Qty buttons
    tbody.querySelectorAll('.cart-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const item = CartManager.get().find(i => i.key === key);
        if (!item) return;
        const delta = btn.dataset.action === 'plus' ? 1 : -1;
        CartManager.updateQty(key, item.qty + delta);
        renderCart();
        renderSummary();
      });
    });

    // Remove
    tbody.querySelectorAll('.cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        CartManager.remove(btn.dataset.key);
        renderCart();
        renderSummary();
        showToast('Article retiré du panier');
      });
    });

    renderSummary();
  }

  function renderSummary() {
    const sub = CartManager.subtotal();
    const ship = CartManager.shipping(sub);
    const total = sub + ship - promoDiscount;

    document.getElementById('subtotal').textContent = fmt(sub);
    document.getElementById('shipping-cost').textContent = ship === 0 ? 'Offerte 🎉' : fmt(ship);
    document.getElementById('total').textContent = fmt(Math.max(0, total));

    const promoRow = document.getElementById('promo-row');
    if (promoDiscount > 0) {
      promoRow.style.display = 'flex';
      document.getElementById('promo-saving').textContent = '−' + fmt(promoDiscount);
    } else {
      promoRow.style.display = 'none';
    }
  }

  // Promo code
  document.getElementById('apply-promo').addEventListener('click', () => {
    const input = document.getElementById('promo-input');
    const msg = document.getElementById('promo-msg');
    const code = input.value.trim().toUpperCase();
    if (PROMO_CODES[code]) {
      promoDiscount = PROMO_CODES[code];
      msg.style.color = 'var(--c-success)';
      msg.textContent = `✓ Code appliqué — ${promoDiscount}€ de réduction`;
      renderSummary();
      input.disabled = true;
    } else {
      msg.style.color = 'var(--c-accent)';
      msg.textContent = 'Code invalide ou expiré.';
    }
  });

  // Clear cart
  document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
    if (confirm('Vider entièrement le panier ?')) {
      CartManager.clear();
      renderCart();
    }
  });

  renderCart();
}

/* ── PAGE: CHECKOUT ──────────────────────────────────────── */
function initCheckout() {
  const layout = document.getElementById('checkout-layout');
  if (!layout) return;

  const items = CartManager.get();
  const emptyEl = document.getElementById('empty-checkout');

  if (items.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  layout.style.display = 'grid';

  // Populate summary sidebar
  const coItems = document.getElementById('checkout-items');
  coItems.innerHTML = items.map(item => `
    <div class="checkout-item">
      <div class="checkout-item__img">
        <div style="width:100%;height:100%;background:${item.bg}"></div>
        <span class="checkout-item__qty-badge">${item.qty}</span>
      </div>
      <div style="flex:1">
        <div class="checkout-item__name">${item.name}</div>
        <div class="checkout-item__meta">${item.colorName} · ${item.size}</div>
      </div>
      <div class="checkout-item__price">${fmt(item.price * item.qty)}</div>
    </div>
  `).join('');

  const sub = CartManager.subtotal();
  const ship = CartManager.shipping(sub);
  document.getElementById('co-subtotal').textContent = fmt(sub);
  document.getElementById('co-shipping').textContent = ship === 0 ? 'Offerte' : fmt(ship);
  document.getElementById('co-total').textContent = fmt(sub + ship);

  // Card fields toggle
  document.querySelectorAll('input[name="payment"]').forEach(r => {
    r.addEventListener('change', () => {
      const cf = document.getElementById('card-fields');
      if (cf) cf.style.display = r.value === 'card' ? 'block' : 'none';
    });
  });

  // Card number formatting
  const cardNum = document.getElementById('card-num');
  if (cardNum) {
    cardNum.addEventListener('input', () => {
      let v = cardNum.value.replace(/\D/g, '').substring(0, 16);
      cardNum.value = v.replace(/(.{4})/g, '$1 ').trim();
    });
  }
  const cardExp = document.getElementById('card-exp');
  if (cardExp) {
    cardExp.addEventListener('input', () => {
      let v = cardExp.value.replace(/\D/g, '').substring(0, 4);
      if (v.length >= 3) v = v.substring(0, 2) + ' / ' + v.substring(2);
      cardExp.value = v;
    });
  }

  // Form validation helpers
  const fields = [
    { id: 'prenom', grp: 'grp-prenom', check: v => v.trim().length > 0 },
    { id: 'nom',    grp: 'grp-nom',    check: v => v.trim().length > 0 },
    { id: 'email',  grp: 'grp-email',  check: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
    { id: 'tel',    grp: 'grp-tel',    check: v => v.trim().length >= 8 },
    { id: 'adresse',grp: 'grp-adresse',check: v => v.trim().length > 0 },
    { id: 'cp',     grp: 'grp-cp',     check: v => v.trim().length >= 4 },
    { id: 'ville',  grp: 'grp-ville',  check: v => v.trim().length > 0 },
  ];

  fields.forEach(f => {
    const input = document.getElementById(f.id);
    if (input) {
      input.addEventListener('input', () => {
        document.getElementById(f.grp)?.classList.remove('has-error');
      });
    }
  });

  // Place order
  document.getElementById('place-order-btn').addEventListener('click', () => {
    let valid = true;
    fields.forEach(f => {
      const input = document.getElementById(f.id);
      const grp   = document.getElementById(f.grp);
      if (!input || !grp) return;
      if (!f.check(input.value)) {
        grp.classList.add('has-error');
        valid = false;
      } else {
        grp.classList.remove('has-error');
      }
    });

    if (!valid) {
      const firstErr = document.querySelector('.has-error input');
      firstErr?.focus();
      return;
    }

    // Simulate order placement
    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    btn.textContent = 'Traitement en cours…';

    setTimeout(() => {
      CartManager.clear();
      document.getElementById('checkout-form-wrapper').style.display = 'none';

      const successEl = document.getElementById('order-success');
      successEl.style.display = 'block';
      successEl.style.gridColumn = '1';

      const orderNum = 'EL' + Date.now().toString().slice(-6);
      document.getElementById('order-num').textContent = `Commande #${orderNum}`;

      const delivery = new Date();
      delivery.setDate(delivery.getDate() + 5);
      document.getElementById('delivery-date').textContent = delivery.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long'
      });

      document.getElementById('co-subtotal').textContent = '—';
      document.getElementById('co-shipping').textContent = '—';
      document.getElementById('co-total').textContent = '—';
    }, 1500);
  });
}

/* ── Init all ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  CartManager._updateBadges();
  initHeader();
  initHamburger();
  initFooterYear();
  initReveal();

  const path = window.location.pathname;
  if (path.endsWith('index.html') || path.endsWith('/ecommerce/') || path.endsWith('/ecommerce')) {
    initHome();
  } else if (path.includes('shop.html')) {
    initShop();
  } else if (path.includes('product.html')) {
    initProduct();
  } else if (path.includes('cart.html')) {
    initCart();
  } else if (path.includes('checkout.html')) {
    initCheckout();
  } else {
    // Fallback: try all
    initHome();
    initShop();
    initProduct();
    initCart();
    initCheckout();
  }
});
