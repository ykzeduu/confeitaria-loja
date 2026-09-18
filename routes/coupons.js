const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

// POST /api/coupons/validate - checagem pública ao aplicar cupom no checkout
router.post('/validate', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Informe um código de cupom.' });
  try {
    const { rows } = await pool.query('SELECT * FROM coupons WHERE code = $1 AND active = TRUE', [code.toUpperCase()]);
    if (rows.length === 0) return res.status(404).json({ error: 'Cupom inválido ou inativo.' });
    const coupon = rows[0];
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Este cupom expirou.' });
    }
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ error: 'Este cupom atingiu o limite de usos.' });
    }
    res.json({
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao validar cupom.' });
  }
});

// ---------- Admin ----------

router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cupons.' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { code, discountType, discountValue, maxUses, expiresAt } = req.body;
  if (!code || !discountValue) return res.status(400).json({ error: 'Código e valor de desconto são obrigatórios.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO coupons (code, discount_type, discount_value, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code.toUpperCase(), discountType || 'percent', parseInt(discountValue, 10), maxUses || null, expiresAt || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe um cupom com esse código.' });
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar cupom.' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { active } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE coupons SET active = $1 WHERE id = $2 RETURNING *',
      [active, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar cupom.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover cupom.' });
  }
});

module.exports = router;
