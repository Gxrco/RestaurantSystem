const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'restaurante',
    password: process.env.PGPASSWORD || 'postgres',
    port: parseInt(process.env.PGPORT || '5432', 10),
  });

module.exports = {
  query: (text, params) => pool.query(text, params)
};
