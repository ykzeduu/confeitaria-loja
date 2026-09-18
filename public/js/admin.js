let allProducts = [];
let allCoupons = [];
let editingProductId = null;
let productImageMode = 'link';

function formatBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(path, {
    ...options,
    headers: isFormData ? undefined : { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || 'Erro na requisição.');
  return data;
}

let toastTimer;
function showToast(message, icon = '✅') {
  const toast = document.getElementById('admin-toast');
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ============ Login / sessão ============
async function checkAdminSession() {
  const me = await api('/api/admin/me');
  if (me) {
    document.getElementById('admin-login-screen').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
    loadDashboard();
  } else {
    document.getElementById('admin-login-screen').classList.remove('hidden');
    document.getElementById('admin-app').classList.add('hidden');
  }
}

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('admin-login-error');
  errorEl.textContent = '';
  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('admin-username').value.trim(),
        password: document.getElementById('admin-password').value,
      }),
    });
    checkAdminSession();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById('admin-logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  checkAdminSession();
});

// ============ Navegação entre painéis ============
document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(`panel-${btn.dataset.tab}`);
    panel.classList.add('active');
    if (btn.dataset.tab === 'dashboard') loadDashboard();
    if (btn.dataset.tab === 'produtos') loadProducts();
    if (btn.dataset.tab === 'clientes') loadCustomers();
    if (btn.dataset.tab === 'cupons') loadCoupons();
    if (btn.dataset.tab === 'financeiro') loadFinanceiro();
  });
});

// ============ Dashboard ============
async function loadDashboard() {
  try {
    const data = await api('/api/admin/dashboard');
    document.getElementById('stat-revenue').textContent = formatBRL(data.totalRevenueCents);
    document.getElementById('stat-orders').textContent = data.totalOrders;
    document.getElementById('stat-lowstock').textContent = data.lowStockCount;
    document.getElementById('stat-customers').textContent = data.totalCustomers;

    document.getElementById('recent-orders-list').innerHTML = data.recentOrders.length
      ? data.recentOrders.map((o) => `<div class="mini-row"><span>#${o.id} — ${o.customer_name}</span><strong>${formatBRL(o.total_cents)}</strong></div>`).join('')
      : '<p class="muted">Nenhum pedido ainda.</p>';

    document.getElementById('top-products-list').innerHTML = data.topProducts.length
      ? data.topProducts.map((p) => `<div class="mini-row"><span>${p.name}</span><strong>${p.total_sold} vendidos</strong></div>`).join('')
      : '<p class="muted">Nenhuma venda registrada ainda.</p>';
  } catch (err) {
    showToast(err.message, '⚠️');
  }
}

// ============ Produtos ============
function productImageCell(p) {
  if (p.image_url) return `<img class="thumb-img" src="${p.image_url}">`;
  if (p.has_uploaded_image) return `<img class="thumb-img" src="/api/products/${p.id}/image">`;
  return `<div class="emoji-thumb">${p.image_emoji || '🍰'}</div>`;
}

async function loadProducts() {
  try {
    allProducts = await api('/api/products/admin/all');
    const tbody = document.querySelector('#products-table tbody');
    tbody.innerHTML = allProducts.map((p) => `
      <tr>
        <td>${productImageCell(p)}</td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${formatBRL(p.price_cents)}</td>
        <td>${p.stock_quantity} ${p.stock_quantity <= 5 ? '<span class="badge lowstock">baixo</span>' : ''}</td>
        <td><span class="badge ${p.active ? 'active' : 'inactive'}">${p.active ? 'Ativo' : 'Inativo'}</span></td>
        <td class="row-actions">
          <button class="icon-action" onclick="openProductModal(${p.id})">Editar</button>
          <button class="icon-action danger" onclick="deleteProduct(${p.id})">Excluir</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="7" class="muted" style="text-align:center; padding:20px;">Nenhum produto cadastrado.</td></tr>';
  } catch (err) {
    showToast(err.message, '⚠️');
  }
}

function openProductModal(id) {
  editingProductId = id || null;
  const product = id ? allProducts.find((p) => p.id === id) : null;
  document.getElementById('product-modal-title').textContent = product ? 'Editar produto' : 'Novo produto';
  document.getElementById('product-id').value = id || '';
  document.getElementById('product-name').value = product ? product.name : '';
  document.getElementById('product-description').value = product ? (product.description || '') : '';
  document.getElementById('product-price').value = product ? (product.price_cents / 100).toFixed(2) : '';
  document.getElementById('product-stock').value = product ? product.stock_quantity : 0;
  document.getElementById('product-category').value = product ? product.category : '';
  document.getElementById('product-emoji').value = product ? (product.image_emoji || '') : '🍰';
  document.getElementById('product-image-url').value = product ? (product.image_url || '') : '';
  document.getElementById('product-image-file').value = '';
  document.getElementById('product-active').checked = product ? product.active : true;
  document.getElementById('product-error').textContent = '';
  setImageMode('link');
  document.getElementById('product-modal-overlay').classList.add('open');
  document.getElementById('product-modal').classList.add('open');
}
function closeProductModal() {
  document.getElementById('product-modal-overlay').classList.remove('open');
  document.getElementById('product-modal').classList.remove('open');
}
document.getElementById('new-product-btn').addEventListener('click', () => openProductModal(null));
document.getElementById('close-product-modal').addEventListener('click', closeProductModal);
document.getElementById('product-modal-overlay').addEventListener('click', closeProductModal);

function setImageMode(mode) {
  productImageMode = mode;
  document.querySelectorAll('.image-source-tabs .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.imgsrc === mode));
  document.getElementById('product-image-url').classList.toggle('hidden', mode !== 'link');
  document.getElementById('product-image-file').classList.toggle('hidden', mode !== 'upload');
}
document.querySelectorAll('.image-source-tabs .tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => setImageMode(btn.dataset.imgsrc));
});

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('product-error');
  errorEl.textContent = '';

  const formData = new FormData();
  formData.append('name', document.getElementById('product-name').value.trim());
  formData.append('description', document.getElementById('product-description').value.trim());
  formData.append('priceCents', Math.round(parseFloat(document.getElementById('product-price').value) * 100));
  formData.append('stockQuantity', document.getElementById('product-stock').value);
  formData.append('category', document.getElementById('product-category').value.trim());
  formData.append('imageEmoji', document.getElementById('product-emoji').value.trim() || '🍰');
  formData.append('active', document.getElementById('product-active').checked);

  if (productImageMode === 'link') {
    formData.append('imageUrl', document.getElementById('product-image-url').value.trim());
  } else {
    const file = document.getElementById('product-image-file').files[0];
    if (file) formData.append('image', file);
  }

  try {
    if (editingProductId) {
      await api(`/api/products/${editingProductId}`, { method: 'PUT', body: formData });
      showToast('Produto atualizado!');
    } else {
      await api('/api/products', { method: 'POST', body: formData });
      showToast('Produto criado!');
    }
    closeProductModal();
    loadProducts();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

async function deleteProduct(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;
  try {
    await api(`/api/products/${id}`, { method: 'DELETE' });
    showToast('Produto excluído.');
    loadProducts();
  } catch (err) {
    showToast(err.message, '⚠️');
  }
}

// ============ Clientes ============
async function loadCustomers() {
  try {
    const customers = await api('/api/admin/customers');
    const tbody = document.querySelector('#customers-table tbody');
    tbody.innerHTML = customers.map((c) => `
      <tr>
        <td>${c.name}</td>
        <td>${c.email}</td>
        <td>${c.phone || '—'}</td>
        <td>${c.cpf || '—'}</td>
        <td>${c.address || '—'}</td>
        <td>${c.order_count}</td>
        <td>${formatBRL(Number(c.total_spent_cents))}</td>
      </tr>
    `).join('') || '<tr><td colspan="7" class="muted" style="text-align:center; padding:20px;">Nenhum cliente cadastrado ainda.</td></tr>';
  } catch (err) {
    showToast(err.message, '⚠️');
  }
}

// ============ Cupons ============
async function loadCoupons() {
  try {
    allCoupons = await api('/api/coupons');
    const tbody = document.querySelector('#coupons-table tbody');
    tbody.innerHTML = allCoupons.map((c) => `
      <tr>
        <td><strong>${c.code}</strong></td>
        <td>${c.discount_type === 'percent' ? c.discount_value + '%' : formatBRL(c.discount_value)}</td>
        <td>${c.used_count}${c.max_uses ? ' / ' + c.max_uses : ''}</td>
        <td>${c.expires_at ? new Date(c.expires_at).toLocaleDateString('pt-BR') : 'Sem validade'}</td>
        <td><span class="badge ${c.active ? 'active' : 'inactive'}">${c.active ? 'Ativo' : 'Inativo'}</span></td>
        <td class="row-actions">
          <button class="icon-action" onclick="toggleCoupon(${c.id}, ${!c.active})">${c.active ? 'Desativar' : 'Ativar'}</button>
          <button class="icon-action danger" onclick="deleteCoupon(${c.id})">Excluir</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="muted" style="text-align:center; padding:20px;">Nenhum cupom criado ainda.</td></tr>';
  } catch (err) {
    showToast(err.message, '⚠️');
  }
}

document.getElementById('new-coupon-btn').addEventListener('click', () => {
  document.getElementById('coupon-form').reset();
  document.getElementById('coupon-form-error').textContent = '';
  document.getElementById('coupon-modal-overlay').classList.add('open');
  document.getElementById('coupon-modal').classList.add('open');
});
function closeCouponModal() {
  document.getElementById('coupon-modal-overlay').classList.remove('open');
  document.getElementById('coupon-modal').classList.remove('open');
}
document.getElementById('close-coupon-modal').addEventListener('click', closeCouponModal);
document.getElementById('coupon-modal-overlay').addEventListener('click', closeCouponModal);

document.getElementById('coupon-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('coupon-form-error');
  errorEl.textContent = '';
  try {
    await api('/api/coupons', {
      method: 'POST',
      body: JSON.stringify({
        code: document.getElementById('coupon-code').value.trim(),
        discountType: document.getElementById('coupon-type').value,
        discountValue: document.getElementById('coupon-value').value,
        maxUses: document.getElementById('coupon-maxuses').value || null,
        expiresAt: document.getElementById('coupon-expires').value || null,
      }),
    });
    showToast('Cupom criado!');
    closeCouponModal();
    loadCoupons();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

async function toggleCoupon(id, active) {
  try {
    await api(`/api/coupons/${id}`, { method: 'PUT', body: JSON.stringify({ active }) });
    loadCoupons();
  } catch (err) {
    showToast(err.message, '⚠️');
  }
}
async function deleteCoupon(id) {
  if (!confirm('Excluir este cupom?')) return;
  try {
    await api(`/api/coupons/${id}`, { method: 'DELETE' });
    showToast('Cupom excluído.');
    loadCoupons();
  } catch (err) {
    showToast(err.message, '⚠️');
  }
}

// ============ Financeiro ============
async function loadFinanceiro() {
  try {
    const dashboard = await api('/api/admin/dashboard');
    document.getElementById('fin-revenue').textContent = formatBRL(dashboard.totalRevenueCents);
    document.getElementById('fin-orders').textContent = dashboard.totalOrders;
    const avg = dashboard.totalOrders > 0 ? dashboard.totalRevenueCents / dashboard.totalOrders : 0;
    document.getElementById('fin-avg').textContent = formatBRL(avg);

    const orders = await api('/api/orders/admin/all');
    const tbody = document.querySelector('#all-orders-table tbody');
    tbody.innerHTML = orders.map((o) => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.customer_name}</td>
        <td>${formatBRL(o.total_cents)}</td>
        <td>${o.payment_method}</td>
        <td><span class="badge active">${o.status}</span></td>
        <td>${new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="muted" style="text-align:center; padding:20px;">Nenhum pedido ainda.</td></tr>';
  } catch (err) {
    showToast(err.message, '⚠️');
  }
}

// ============ Configurações ============
document.getElementById('change-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('password-error');
  const successEl = document.getElementById('password-success');
  errorEl.textContent = ''; successEl.textContent = '';
  try {
    await api('/api/admin/password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword: document.getElementById('current-password').value,
        newPassword: document.getElementById('new-password').value,
      }),
    });
    successEl.textContent = 'Senha atualizada com sucesso!';
    document.getElementById('change-password-form').reset();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById('reset-db-btn').addEventListener('click', async () => {
  const confirmText = prompt('Isso vai apagar TODOS os pedidos, clientes e cupons. Digite RESETAR para confirmar:');
  if (confirmText !== 'RESETAR') return;
  try {
    const result = await api('/api/admin/reset-database', { method: 'POST' });
    showToast(result.message, '🧹');
    loadDashboard();
  } catch (err) {
    showToast(err.message, '⚠️');
  }
});

// ============ Init ============
document.addEventListener('DOMContentLoaded', checkAdminSession);
