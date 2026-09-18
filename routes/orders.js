const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireCustomer, requireAdmin } = require('../middleware/auth');

const VALID_METHODS = ['pix', 'boleto', 'cartao'];

function randomDigits(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

// POST /api/orders - finaliza um pedido (cliente logado)
router.post('/', requireCustomer, async (req, res) => {
  const { paymentMethod, paymentDetail, items, couponCode, deliveryAddress } = req.body;

  if (!VALID_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Carrinho vazio.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: customerRows } = await client.query('SELECT * FROM customers WHERE id = $1', [req.session.customerId]);
    const customer = customerRows[0];
    const address = deliveryAddress || customer.address;
    if (!address) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Informe um endereço de entrega.' });
    }

    const productIds = items.map((i) => i.productId);
    const { rows: products } = await client.query(
      'SELECT id, name, price_cents, stock_quantity FROM products WHERE id = ANY($1::int[]) FOR UPDATE',
      [productIds]
    );
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotalCents = 0;
    const resolvedItems = [];
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      if (product.stock_quantity < quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Estoque insuficiente para "${product.name}" (disponível: ${product.stock_quantity}).` });
      }
      subtotalCents += product.price_cents * quantity;
      resolvedItems.push({ product, quantity });
    }

    if (resolvedItems.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Nenhum item válido no carrinho.' });
    }

    // Cupom
    let discountCents = 0;
    let appliedCouponCode = null;
    if (couponCode) {
      const { rows: couponRows } = await client.query(
        'SELECT * FROM coupons WHERE code = $1 AND active = TRUE FOR UPDATE',
        [couponCode.toUpperCase()]
      );
      if (couponRows.length > 0) {
        const coupon = couponRows[0];
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) >= new Date();
        const underLimit = !coupon.max_uses || coupon.used_count < coupon.max_uses;
        if (notExpired && underLimit) {
          discountCents = coupon.discount_type === 'percent'
            ? Math.round(subtotalCents * (coupon.discount_value / 100))
            : Math.min(coupon.discount_value, subtotalCents);
          appliedCouponCode = coupon.code;
          await client.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [coupon.id]);
        }
      }
    }

    const totalCents = Math.max(0, subtotalCents - discountCents);

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (customer_id, customer_name, customer_email, customer_address, payment_method, payment_detail, coupon_code, discount_cents, total_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at`,
      [customer.id, customer.name, customer.email, address, paymentMethod, paymentDetail || null, appliedCouponCode, discountCents, totalCents]
    );
    const order = orderRows[0];

    for (const { product, quantity } of resolvedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, product.id, product.name, product.price_cents, quantity]
      );
      await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [quantity, product.id]);
    }

    await client.query('COMMIT');

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
      subtotalCents,
      discountCents,
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

// GET /api/orders/:id - consulta um pedido (dono do pedido)
router.get('/:id', requireCustomer, async (req, res) => {
  try {
    const { rows: orders } = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND customer_id = $2',
      [req.params.id, req.session.customerId]
    );
    if (orders.length === 0) return res.status(404).json({ error: 'Pedido não encontrado.' });

    const { rows: items } = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    res.json({ ...orders[0], items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pedido.' });
  }
});

// ---------- Admin ----------

// GET /api/orders/admin/all
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pedidos.' });
  }
});

module.exports = router;
