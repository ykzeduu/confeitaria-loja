const { Pool } = require('pg');
require('dotenv').config();

// Neon (e a maioria dos provedores free) exige SSL. Em desenvolvimento local
// sem SSL configurado, ajustamos automaticamente.
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

module.exports = pool;
