// Carrinho armazenado no localStorage do navegador (persiste entre páginas)
const CART_KEY = 'doce-encanto-cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
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
      quantity: 1,
    });
  }
  saveCart(cart);
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
  const cart = getCart().filter((i) => i.productId !== productId);
  saveCart(cart);
  renderCartDrawer();
}

function cartTotalCents() {
  return getCart().reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
}

function formatBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function updateCartCount() {
  const countEl = document.getElementById('cart-count');
  if (countEl) {
    const count = getCart().reduce((sum, i) => sum + i.quantity, 0);
    countEl.textContent = count;
  }
}

function renderCartDrawer() {
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!itemsEl) return;

  const cart = getCart();
  if (cart.length === 0) {
    itemsEl.innerHTML = '<p style="color:#999; text-align:center; margin-top:30px;">Seu carrinho está vazio 🍪</p>';
  } else {
    itemsEl.innerHTML = cart.map((item) => `
      <div class="cart-item">
        <span>${item.emoji}</span>
        <span class="name">${item.name}</span>
        <div class="qty-controls">
          <button onclick="updateQuantity(${item.productId}, -1)">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity(${item.productId}, 1)">+</button>
        </div>
        <span>${formatBRL(item.priceCents * item.quantity)}</span>
        <button class="remove" onclick="removeFromCart(${item.productId})">✕</button>
      </div>
    `).join('');
  }
  if (totalEl) totalEl.textContent = formatBRL(cartTotalCents());
}

function setupCartDrawer() {
  const cartBtn = document.getElementById('cart-btn');
  const overlay = document.getElementById('cart-overlay');
  const drawer = document.getElementById('cart-drawer');
  const closeBtn = document.getElementById('close-cart');
  const continueBtn = document.getElementById('continue-shopping');
  const checkoutBtn = document.getElementById('go-checkout');

  function open() {
    renderCartDrawer();
    overlay.classList.add('open');
    drawer.classList.add('open');
  }
  function close() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
  }

  if (cartBtn) cartBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (continueBtn) continueBtn.addEventListener('click', close);
  if (overlay) overlay.addEventListener('click', close);
  if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
    if (getCart().length === 0) {
      alert('Seu carrinho está vazio!');
      return;
    }
    window.location.href = '/checkout.html';
  });

  updateCartCount();
}

document.addEventListener('DOMContentLoaded', setupCartDrawer);
