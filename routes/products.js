const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/products - lista todos os produtos ativos
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, price_cents, category, image_emoji FROM products WHERE active = TRUE ORDER BY category, name'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos.' });
  }
});

module.exports = router;
