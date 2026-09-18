async function loadCatalog() {
  const container = document.getElementById('catalog');
  try {
    const res = await fetch('/api/products');
    const products = await res.json();

    if (products.length === 0) {
      container.innerHTML = '<p>Nenhum produto disponível no momento.</p>';
      return;
    }

    const byCategory = {};
    for (const p of products) {
      if (!byCategory[p.category]) byCategory[p.category] = [];
      byCategory[p.category].push(p);
    }

    container.innerHTML = Object.entries(byCategory).map(([category, items]) => `
      <h2 class="category-title">${category}</h2>
      <div class="grid">
        ${items.map((p) => `
          <div class="card">
            <div class="emoji">${p.image_emoji}</div>
            <h3>${p.name}</h3>
            <p>${p.description || ''}</p>
            <div class="price">${formatBRL(p.price_cents)}</div>
            <button onclick='addToCart(${JSON.stringify(p)})'>Adicionar ao carrinho</button>
          </div>
        `).join('')}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p>Erro ao carregar o catálogo. Tente novamente em instantes.</p>';
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', loadCatalog);
