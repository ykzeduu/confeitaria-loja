const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

// ---------- Bloqueio de tentativas de login (proteção por IP) ----------
// Guardado em memória do processo: 3 tentativas erradas -> bloqueia por 60s,
// mesmo recarregando a página (o controle é do servidor, não do navegador).
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 60 * 1000;
const loginAttempts = new Map(); // ip -> { count, lockedUntil }

function getAttemptState(ip) {
  return loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
}

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;
  const state = getAttemptState(ip);

  if (state.lockedUntil > Date.now()) {
    const secondsLeft = Math.ceil((state.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      error: `Muitas tentativas incorretas. Aguarde ${secondsLeft}s antes de tentar novamente.`,
      lockedSeconds: secondsLeft,
    });
  }

  if (!username || !password) return res.status(400).json({ error: 'Informe usuário e senha.' });

  try {
    const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    const match = rows.length > 0 && await bcrypt.compare(password, rows[0].password_hash);

    if (!match) {
      state.count += 1;
      if (state.count >= MAX_ATTEMPTS) {
        state.lockedUntil = Date.now() + LOCKOUT_MS;
        state.count = 0;
        loginAttempts.set(ip, state);
        return res.status(429).json({
          error: `Muitas tentativas incorretas. Aguarde 60s antes de tentar novamente.`,
          lockedSeconds: 60,
        });
      }
      loginAttempts.set(ip, state);
      return res.status(401).json({
        error: `Usuário ou senha inválidos. Tentativa ${state.count} de ${MAX_ATTEMPTS}.`,
      });
    }

    loginAttempts.delete(ip);
    req.session.adminId = rows[0].id;
    res.json({ id: rows[0].id, username: rows[0].username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao entrar.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.adminId = null;
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  if (!req.session.adminId) return res.json(null);
  try {
    const { rows } = await pool.query('SELECT id, username FROM admins WHERE id = $1', [req.session.adminId]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro.' });
  }
});

// PUT /api/admin/password - trocar a senha do admin logado
router.put('/password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }
  try {
    const { rows } = await pool.query('SELECT * FROM admins WHERE id = $1', [req.session.adminId]);
    const match = await bcrypt.compare(currentPassword || '', rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Senha atual incorreta.' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [hash, req.session.adminId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao trocar senha.' });
  }
});

// GET /api/admin/dashboard - estatísticas gerais
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const { rows: revenueRows } = await pool.query(
      `SELECT COALESCE(SUM(total_cents), 0)::bigint AS total, COUNT(*)::int AS count FROM orders`
    );
    const { rows: lowStockRows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM products WHERE active = TRUE AND stock_quantity <= 5`
    );
    const { rows: customerCountRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM customers`);
    const { rows: recentOrders } = await pool.query(
      `SELECT id, customer_name, total_cents, status, created_at FROM orders ORDER BY created_at DESC LIMIT 8`
    );
    const { rows: topProducts } = await pool.query(`
      SELECT p.name, SUM(oi.quantity)::int AS total_sold
      FROM order_items oi JOIN products p ON p.id = oi.product_id
      GROUP BY p.name ORDER BY total_sold DESC LIMIT 5
    `);

    res.json({
      totalRevenueCents: Number(revenueRows[0].total),
      totalOrders: revenueRows[0].count,
      lowStockCount: lowStockRows[0].count,
      totalCustomers: customerCountRows[0].count,
      recentOrders,
      topProducts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
});

// GET /api/admin/customers
router.get('/customers', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.name, c.email, c.cpf, c.cep, c.address, c.phone, c.created_at,
        COALESCE(SUM(o.total_cents), 0)::bigint AS total_spent_cents,
        COUNT(o.id)::int AS order_count
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar clientes.' });
  }
});

// POST /api/admin/reset-database - APENAS PARA TESTES: limpa pedidos, clientes e cupons (mantém produtos e admin)
router.post('/reset-database', requireAdmin, async (req, res) => {
  try {
    await pool.query('TRUNCATE order_items, orders, coupons RESTART IDENTITY CASCADE');
    await pool.query('DELETE FROM customers');
    res.json({ ok: true, message: 'Banco de dados resetado (pedidos, clientes e cupons apagados).' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao resetar banco de dados.' });
  }
});

module.exports = router;
