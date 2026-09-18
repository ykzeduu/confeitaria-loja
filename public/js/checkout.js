let selectedMethod = null;
let selectedCard = null;

function initCheckout() {
  const cart = getCart();
  if (cart.length === 0) {
    window.location.href = '/';
    return;
  }

  document.getElementById('order-total').textContent = formatBRL(cartTotalCents());

  document.querySelectorAll('.payment-option').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.payment-option').forEach((o) => o.classList.remove('selected'));
      el.classList.add('selected');
      selectedMethod = el.dataset.method;
      const cardSelection = document.getElementById('card-selection');
      cardSelection.classList.toggle('hidden', selectedMethod !== 'cartao');
    });
  });

  document.querySelectorAll('.fake-card').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.fake-card').forEach((o) => o.classList.remove('selected'));
      el.classList.add('selected');
      selectedCard = el.dataset.card;
    });
  });

  document.getElementById('confirm-order').addEventListener('click', submitOrder);
}

async function submitOrder() {
  const errorEl = document.getElementById('checkout-error');
  errorEl.textContent = '';

  const customerName = document.getElementById('customerName').value.trim();
  const customerEmail = document.getElementById('customerEmail').value.trim();
  const customerAddress = document.getElementById('customerAddress').value.trim();

  if (!customerName || !customerEmail || !customerAddress) {
    errorEl.textContent = 'Preencha nome, e-mail e endereço.';
    return;
  }
  if (!selectedMethod) {
    errorEl.textContent = 'Escolha uma forma de pagamento.';
    return;
  }
  if (selectedMethod === 'cartao' && !selectedCard) {
    errorEl.textContent = 'Escolha um cartão fictício.';
    return;
  }

  const items = getCart().map((i) => ({ productId: i.productId, quantity: i.quantity }));

  const btn = document.getElementById('confirm-order');
  btn.disabled = true;
  btn.textContent = 'Processando...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        customerEmail,
        customerAddress,
        paymentMethod: selectedMethod,
        paymentDetail: selectedMethod === 'cartao' ? selectedCard : null,
        items,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Erro ao processar pedido.';
      btn.disabled = false;
      btn.textContent = 'Confirmar pedido (simulado)';
      return;
    }

    localStorage.removeItem(CART_KEY);
    localStorage.setItem('doce-encanto-last-order', JSON.stringify(data));
    window.location.href = `/confirmacao.html?id=${data.orderId}`;
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Erro de conexão. Tente novamente.';
    btn.disabled = false;
    btn.textContent = 'Confirmar pedido (simulado)';
  }
}

document.addEventListener('DOMContentLoaded', initCheckout);
