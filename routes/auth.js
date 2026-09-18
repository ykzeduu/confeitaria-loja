const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { requireCustomer } = require('../middleware/auth');

function publicCustomer(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    cpf: c.cpf,
    cep: c.cep,
    address: c.address,
    phone: c.phone,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, cpf, cep, address, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }
  try {
    const { rows: existing } = await pool.query('SELECT id FROM customers WHERE email = $1', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO customers (name, email, password_hash, cpf, cep, address, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, email.toLowerCase(), hash, cpf || null, cep || null, address || null, phone || null]
    );
    req.session.customerId = rows[0].id;
    res.status(201).json(publicCustomer(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Informe e-mail e senha.' });
  try {
    const { rows } = await pool.query('SELECT * FROM customers WHERE email = $1', [email.toLowerCase()]);
    if (rows.length === 0) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    req.session.customerId = rows[0].id;
    res.json(publicCustomer(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao entrar.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.customerId = null;
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (!req.session.customerId) return res.json(null);
  try {
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [req.session.customerId]);
    if (rows.length === 0) return res.json(null);
    res.json(publicCustomer(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

// PUT /api/auth/me - atualizar dados do cliente logado
router.put('/me', requireCustomer, async (req, res) => {
  const { name, cpf, cep, address, phone } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE customers SET name = COALESCE($1, name), cpf = $2, cep = $3, address = $4, phone = $5
       WHERE id = $6 RETURNING *`,
      [name, cpf || null, cep || null, address || null, phone || null, req.session.customerId]
    );
    res.json(publicCustomer(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// GET /api/auth/my-orders
router.get('/my-orders', requireCustomer, async (req, res) => {
  try {
    const { rows: orders } = await pool.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
      [req.session.customerId]
    );
    for (const order of orders) {
      const { rows: items } = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      order.items = items;
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pedidos.' });
  }
});

module.exports = router;
