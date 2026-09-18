const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

const VALID_METHODS = ['pix', 'boleto', 'cartao'];

function randomDigits(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

// POST /api/orders - finaliza um pedido fictício
router.post('/', async (req, res) => {
  const { customerName, customerEmail, customerAddress, paymentMethod, paymentDetail, items } = req.body;

  if (!customerName || !customerEmail || !customerAddress) {
    return res.status(400).json({ error: 'Preencha nome, e-mail e endereço.' });
  }
  if (!VALID_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Carrinho vazio.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Recalcula preços a partir do banco (nunca confia no preço vindo do cliente)
    const productIds = items.map((i) => i.productId);
    const { rows: products } = await client.query(
      'SELECT id, name, price_cents FROM products WHERE id = ANY($1::int[])',
      [productIds]
    );
    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalCents = 0;
    const resolvedItems = [];
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      totalCents += product.price_cents * quantity;
      resolvedItems.push({ product, quantity });
    }

    if (resolvedItems.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Nenhum item válido no carrinho.' });
    }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (customer_name, customer_email, customer_address, payment_method, payment_detail, total_cents)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [customerName, customerEmail, customerAddress, paymentMethod, paymentDetail || null, totalCents]
    );
    const order = orderRows[0];

    for (const { product, quantity } of resolvedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, product.id, product.name, product.price_cents, quantity]
      );
    }

    await client.query('COMMIT');

    // Gera dados fictícios de "pagamento" para exibir na tela de confirmação
    let paymentSimulation = {};
    if (paymentMethod === 'pix') {
      paymentSimulation = {
        type: 'pix',
        fakeCode: `00020126580014BR.GOV.BCB.PIX0136${randomDigits(8)}-fake-${randomDigits(4)}5204000053039865802BR5913DOCE ENCANTO6009SAO PAULO62070503***6304${randomDigits(4)}`,
        note: 'Este é um QR Code / código Pix FICTÍCIO, gerado apenas para simulação. Nenhum pagamento real é processado.',
      };
    } else if (paymentMethod === 'boleto') {
      paymentSimulation = {
        type: 'boleto',
        fakeBarcode: `${randomDigits(5)}.${randomDigits(5)} ${randomDigits(5)}.${randomDigits(6)} ${randomDigits(5)}.${randomDigits(6)} ${randomDigits(1)} ${randomDigits(14)}`,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
        note: 'Boleto FICTÍCIO gerado apenas para simulação. Não efetue pagamento real.',
      };
    } else if (paymentMethod === 'cartao') {
      paymentSimulation = {
        type: 'cartao',
        cardUsed: paymentDetail || 'Cartão fictício',
        authCode: `AUTH-${randomDigits(6)}`,
        note: 'Cobrança FICTÍCIA simulada em cartão de teste. Nenhum valor real foi cobrado.',
      };
    }

    res.status(201).json({
      orderId: order.id,
      createdAt: order.created_at,
      totalCents,
      status: 'pago (simulado)',
      paymentSimulation,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar pedido.' });
  } finally {
    client.release();
  }
});

// GET /api/orders/:id - consulta um pedido (usado na página de confirmação)
router.get('/:id', async (req, res) => {
  try {
    const { rows: orders } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Pedido não encontrado.' });

    const { rows: items } = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    res.json({ ...orders[0], items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pedido.' });
  }
});

module.exports = router;
