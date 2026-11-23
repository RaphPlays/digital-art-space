// Opens one reusable connection pool to TiDB Cloud (MySQL-compatible).
// The settings come from environment variables, never from the code itself.
const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 4000),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }, // TiDB requires TLS
      connectionLimit: 2,
      waitForConnections: true
    });
  }
  return pool;
}

module.exports = { getPool };
