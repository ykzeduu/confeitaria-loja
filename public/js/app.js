// ============ Estado global ============
const CART_KEY = 'doce-encanto-cart';
let currentUser = null;
let allProducts = [];
let activeCategory = 'Todos';
let appliedCoupon = null; // { code, discountType, discountValue }
let selectedPaymentMethod = null;
let selectedCard = null;

function formatBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ============ API helper ============
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || 'Erro na requisição.');
  return data;
}

// ============ Toast ============
let toastTimer;
function showToast(message, icon = '✅') {
  const toast = document.getElementById('toast');
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ============ Navegação ============
function setupNav() {
  const menuToggle = document.getElementById('menu-toggle');
  const mainNav = document.getElementById('main-nav');
  menuToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', () => mainNav.classList.remove('open'));
  });
}

// ============ Carrinho (localStorage) ============
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}
function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((i) => i.productId === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      priceCents: product.price_cents,
      emoji: product.image_emoji,
      hasImage: !!(product.image_url || product.has_uploaded_image),
      imageSrc: productImageSrc(product),
      quantity: 1,
    });
  }
  saveCart(cart);
  showToast(`${product.name} adicionado ao carrinho!`, '🛒');
  bumpCartIcon();
}
function updateQuantity(productId, delta) {
  const cart = getCart();
  const item = cart.find((i) => i.productId === productId);
  if (!item) return;
  item.quantity += delta;
  const filtered = item.quantity <= 0 ? cart.filter((i) => i.productId !== productId) : cart;
  saveCart(filtered);
  renderCartDrawer();
}
function removeFromCart(productId) {
  saveCart(getCart().filter((i) => i.productId !== productId));
  renderCartDrawer();
}
function cartSubtotalCents() {
  return getCart().reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
}
function cartDiscountCents() {
  if (!appliedCoupon) return 0;
  const subtotal = cartSubtotalCents();
  if (appliedCoupon.discountType === 'percent') return Math.round(subtotal * (appliedCoupon.discountValue / 100));
  return Math.min(appliedCoupon.discountValue, subtotal);
}
function cartTotalCents() {
  return Math.max(0, cartSubtotalCents() - cartDiscountCents());
}
function updateCartCount() {
  const countEl = document.getElementById('cart-count');
  countEl.textContent = getCart().reduce((sum, i) => sum + i.quantity, 0);
}
function bumpCartIcon() {
  const btn = document.getElementById('cart-btn');
  btn.classList.remove('bump');
  void btn.offsetWidth; // restart animation
  btn.classList.add('bump');
}

function renderCartDrawer() {
  const itemsEl = document.getElementById('cart-items');
  const cart = getCart();
  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="muted" style="text-align:center; margin-top:30px;">Seu carrinho está vazio 🍪</p>';
  } else {
    itemsEl.innerHTML = cart.map((item) => `
      <div class="cart-item">
        <div class="thumb">${item.imageSrc ? `<img src="${item.imageSrc}" alt="">` : (item.emoji || '🍰')}</div>
        <span class="name">${item.name}</span>
        <div class="qty-controls">
          <button onclick="updateQuantity(${item.productId}, -1)">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity(${item.productId}, 1)">+</button>
        </div>
        <span class="price-col">${formatBRL(item.priceCents * item.quantity)}</span>
        <button class="remove" onclick="removeFromCart(${item.productId})">✕</button>
      </div>
    `).join('');
  }
  document.getElementById('cart-subtotal').textContent = formatBRL(cartSubtotalCents());
  document.getElementById('cart-total').textContent = formatBRL(cartTotalCents());
  const discountLine = document.getElementById('cart-discount-line');
  if (appliedCoupon && cartDiscountCents() > 0) {
    discountLine.classList.remove('hidden');
    document.getElementById('cart-coupon-code').textContent = appliedCoupon.code;
    document.getElementById('cart-discount').textContent = `-${formatBRL(cartDiscountCents())}`;
  } else {
    discountLine.classList.add('hidden');
  }
}

function setupCartDrawer() {
  const cartBtn = document.getElementById('cart-btn');
  const overlay = document.getElementById('cart-overlay');
  const drawer = document.getElementById('cart-drawer');

  function open() { renderCartDrawer(); overlay.classList.add('open'); drawer.classList.add('open'); }
  function close() { overlay.classList.remove('open'); drawer.classList.remove('open'); }

  cartBtn.addEventListener('click', open);
  document.getElementById('close-cart').addEventListener('click', close);
  document.getElementById('continue-shopping').addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.getElementById('go-checkout').addEventListener('click', () => {
    if (getCart().length === 0) { showToast('Seu carrinho está vazio!', '⚠️'); return; }
    close();
    openCheckout();
  });

  updateCartCount();
}

// ============ Catálogo ============
function productImageSrc(p) {
  if (p.image_url) return p.image_url;
  if (p.has_uploaded_image) return `/api/products/${p.id}/image`;
  return null;
}

async function loadCatalog() {
  const container = document.getElementById('catalog');
  try {
    allProducts = await api('/api/products');
    renderCategoryFilters();
    renderCatalog();
  } catch (err) {
    container.innerHTML = '<p>Erro ao carregar o catálogo. Tente novamente em instantes.</p>';
    console.error(err);
  }
}

function renderCategoryFilters() {
  const categories = ['Todos', ...new Set(allProducts.map((p) => p.category))];
  const el = document.getElementById('category-filters');
  el.innerHTML = categories.map((c) => `<button class="filter-chip ${c === activeCategory ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
  el.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderCategoryFilters();
      renderCatalog();
    });
  });
}

function renderCatalog() {
  const container = document.getElementById('catalog');
  const list = activeCategory === 'Todos' ? allProducts : allProducts.filter((p) => p.category === activeCategory);

  if (list.length === 0) {
    container.innerHTML = '<p class="muted">Nenhum produto nessa categoria no momento.</p>';
    return;
  }

  container.innerHTML = list.map((p) => {
    const img = productImageSrc(p);
    const outOfStock = p.stock_quantity <= 0;
    const lowStock = !outOfStock && p.stock_quantity <= 5;
    return `
      <div class="card">
        <div class="card-image">
          ${img ? `<img src="${img}" alt="${p.name}" loading="lazy">` : (p.image_emoji || '🍰')}
          ${outOfStock ? '<span class="stock-badge out">Esgotado</span>' : (lowStock ? `<span class="stock-badge">Só ${p.stock_quantity}!</span>` : '')}
        </div>
        <div class="card-body">
          <h3>${p.name}</h3>
          <p>${p.description || ''}</p>
          <div class="card-footer">
            <span class="price">${formatBRL(p.price_cents)}</span>
            <button class="add-btn" ${outOfStock ? 'disabled' : ''} data-id="${p.id}" title="Adicionar ao carrinho">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const product = allProducts.find((p) => p.id === parseInt(btn.dataset.id, 10));
      if (product) addToCart(product);
    });
  });
}

// ============ Autenticação / Conta ============
async function refreshCurrentUser() {
  currentUser = await api('/api/auth/me');
  renderAccountArea();
}

function renderAccountArea() {
  const authArea = document.getElementById('auth-area');
  const profileArea = document.getElementById('profile-area');
  if (currentUser) {
    authArea.classList.add('hidden');
    profileArea.classList.remove('hidden');
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-form-name').value = currentUser.name || '';
    document.getElementById('profile-form-phone').value = currentUser.phone || '';
    document.getElementById('profile-form-cpf').value = currentUser.cpf || '';
    document.getElementById('profile-form-cep').value = currentUser.cep || '';
    document.getElementById('profile-form-address').value = currentUser.address || '';
  } else {
    authArea.classList.remove('hidden');
    profileArea.classList.add('hidden');
  }
}

function setupTabs(scopeSelector, dataAttr) {
  document.querySelectorAll(`${scopeSelector} .tab-btn`).forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.closest(scopeSelector === '#auth-area' ? '#auth-area' : '#profile-area');
      group.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      group.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.dataset[dataAttr];
      const panelId = dataAttr === 'tab' ? `${key}-form` : (key === 'dados' ? 'profile-form' : 'orders-panel');
      document.getElementById(panelId).classList.add('active');
      if (dataAttr === 'ptab' && key === 'pedidos') loadMyOrders();
    });
  });
}

function setupAuthForms() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';
    try {
      currentUser = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('login-email').value.trim(),
          password: document.getElementById('login-password').value,
        }),
      });
      renderAccountArea();
      showToast(`Bem-vinda(o) de volta, ${currentUser.name.split(' ')[0]}!`, '👋');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('register-error');
    errorEl.textContent = '';
    try {
      currentUser = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('reg-name').value.trim(),
          email: document.getElementById('reg-email').value.trim(),
          password: document.getElementById('reg-password').value,
          phone: document.getElementById('reg-phone').value.trim(),
          cpf: document.getElementById('reg-cpf').value.trim(),
          cep: document.getElementById('reg-cep').value.trim(),
          address: document.getElementById('reg-address').value.trim(),
        }),
      });
      renderAccountArea();
      showToast(`Conta criada! Bem-vinda(o), ${currentUser.name.split(' ')[0]}!`, '🎉');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('profile-error');
    const successEl = document.getElementById('profile-success');
    errorEl.textContent = ''; successEl.textContent = '';
    try {
      currentUser = await api('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: document.getElementById('profile-form-name').value.trim(),
          phone: document.getElementById('profile-form-phone').value.trim(),
          cpf: document.getElementById('profile-form-cpf').value.trim(),
          cep: document.getElementById('profile-form-cep').value.trim(),
          address: document.getElementById('profile-form-address').value.trim(),
        }),
      });
      renderAccountArea();
      successEl.textContent = 'Dados atualizados com sucesso!';
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    renderAccountArea();
    showToast('Você saiu da sua conta.', '👋');
  });
}

async function loadMyOrders() {
  const list = document.getElementById('orders-list');
  list.innerHTML = '<p class="muted">Carregando...</p>';
  try {
    const orders = await api('/api/auth/my-orders');
    if (orders.length === 0) {
      list.innerHTML = '<p class="muted">Você ainda não fez nenhum pedido.</p>';
      return;
    }
    list.innerHTML = orders.map((o) => `
      <div class="order-card">
        <div class="order-card-head">
          <span>Pedido #${o.id}</span>
          <span class="order-status">${o.status}</span>
        </div>
        <div class="order-card-items">${o.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')}</div>
        <div style="margin-top:8px; display:flex; justify-content:space-between; font-size:0.85rem;">
          <span class="muted">${new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
          <strong>${formatBRL(o.total_cents)}</strong>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<p class="muted">Erro ao carregar pedidos.</p>';
  }
}

// ============ Checkout (modal) ============
function openCheckout() {
  if (!currentUser) {
    document.getElementById('checkout-overlay').classList.remove('open');
    document.getElementById('checkout-modal').classList.remove('open');
    showToast('Entre ou crie sua conta para finalizar o pedido.', '🔒');
    document.getElementById('conta').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  selectedPaymentMethod = null;
  selectedCard = null;
  document.querySelectorAll('.payment-option').forEach((o) => o.classList.remove('selected'));
  document.querySelectorAll('.fake-card').forEach((o) => o.classList.remove('selected'));
  document.getElementById('card-selection').classList.add('hidden');
  document.getElementById('checkout-error').textContent = '';
  document.getElementById('coupon-error').textContent = '';
  document.getElementById('checkout-address').value = currentUser.address || '';
  document.getElementById('checkout-total').textContent = formatBRL(cartTotalCents());
  document.getElementById('checkout-overlay').classList.add('open');
  document.getElementById('checkout-modal').classList.add('open');
}
function closeCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open');
  document.getElementById('checkout-modal').classList.remove('open');
}

function setupCheckoutModal() {
  document.getElementById('checkout-overlay').addEventListener('click', closeCheckout);
  document.getElementById('close-checkout').addEventListener('click', closeCheckout);

  document.querySelectorAll('.payment-option').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.payment-option').forEach((o) => o.classList.remove('selected'));
      el.classList.add('selected');
      selectedPaymentMethod = el.dataset.method;
      document.getElementById('card-selection').classList.toggle('hidden', selectedPaymentMethod !== 'cartao');
    });
  });

  document.querySelectorAll('.fake-card').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.fake-card').forEach((o) => o.classList.remove('selected'));
      el.classList.add('selected');
      selectedCard = el.dataset.card;
    });
  });

  document.getElementById('apply-coupon-btn').addEventListener('click', async () => {
    const code = document.getElementById('coupon-input').value.trim();
    const errorEl = document.getElementById('coupon-error');
    errorEl.textContent = '';
    if (!code) return;
    try {
      appliedCoupon = await api('/api/coupons/validate', { method: 'POST', body: JSON.stringify({ code }) });
      document.getElementById('checkout-total').textContent = formatBRL(cartTotalCents());
      showToast(`Cupom ${appliedCoupon.code} aplicado!`, '🏷️');
    } catch (err) {
      appliedCoupon = null;
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('confirm-order').addEventListener('click', submitOrder);
}

async function submitOrder() {
  const errorEl = document.getElementById('checkout-error');
  errorEl.textContent = '';

  const address = document.getElementById('checkout-address').value.trim();
  if (!address) { errorEl.textContent = 'Informe um endereço de entrega.'; return; }
  if (!selectedPaymentMethod) { errorEl.textContent = 'Escolha uma forma de pagamento.'; return; }
  if (selectedPaymentMethod === 'cartao' && !selectedCard) { errorEl.textContent = 'Escolha um cartão fictício.'; return; }

  const items = getCart().map((i) => ({ productId: i.productId, quantity: i.quantity }));
  const btn = document.getElementById('confirm-order');
  btn.disabled = true;
  btn.textContent = 'Processando...';

  try {
    const data = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        paymentMethod: selectedPaymentMethod,
        paymentDetail: selectedPaymentMethod === 'cartao' ? selectedCard : null,
        items,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        deliveryAddress: address,
      }),
    });
    localStorage.removeItem(CART_KEY);
    appliedCoupon = null;
    updateCartCount();
    closeCheckout();
    showConfirmation(data);
    loadCatalog(); // atualiza estoque exibido
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirmar pedido (simulado)';
  }
}

function showConfirmation(data) {
  const sim = data.paymentSimulation || {};
  let paymentHtml = '';
  if (sim.type === 'pix') {
    paymentHtml = `<h3>Pagamento via Pix (simulado)</h3><div class="qr-fake"></div><p class="muted">Código Pix fictício:</p><div class="code-box">${sim.fakeCode}</div><div class="fake-note">${sim.note}</div>`;
  } else if (sim.type === 'boleto') {
    paymentHtml = `<h3>Boleto (simulado)</h3><p class="muted">Código de barras fictício:</p><div class="code-box">${sim.fakeBarcode}</div><p>Vencimento (fictício): <strong>${sim.dueDate}</strong></p><div class="fake-note">${sim.note}</div>`;
  } else if (sim.type === 'cartao') {
    paymentHtml = `<h3>Pagamento no cartão (simulado)</h3><p>Cartão: <strong>${sim.cardUsed}</strong></p><p>Autorização fictícia: <strong>${sim.authCode}</strong></p><div class="fake-note">${sim.note}</div>`;
  }

  document.getElementById('confirmation-body').innerHTML = `
    <div class="confirm-icon">🎉</div>
    <h2>Pedido confirmado!</h2>
    <p>Número do pedido: <strong>#${data.orderId}</strong></p>
    <p>Total: <strong>${formatBRL(data.totalCents)}</strong></p>
    ${paymentHtml}
    <button class="btn-primary full" id="close-confirmation" style="margin-top:16px;">Voltar à loja</button>
  `;
  document.getElementById('confirmation-overlay').classList.add('open');
  document.getElementById('confirmation-modal').classList.add('open');
  document.getElementById('close-confirmation').addEventListener('click', closeConfirmation);
  document.getElementById('confirmation-overlay').onclick = closeConfirmation;
}
function closeConfirmation() {
  document.getElementById('confirmation-overlay').classList.remove('open');
  document.getElementById('confirmation-modal').classList.remove('open');
}

// ============ Init ============
document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupCartDrawer();
  setupCheckoutModal();
  setupAuthForms();
  setupTabs('#auth-area', 'tab');
  setupTabs('#profile-area', 'ptab');
  await refreshCurrentUser();
  await loadCatalog();
});
