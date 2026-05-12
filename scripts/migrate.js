#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS query_counts_daily (
        query TEXT NOT NULL,
        date DATE NOT NULL,
        count BIGINT NOT NULL DEFAULT 1,
        PRIMARY KEY (query, date)
      );
      CREATE INDEX IF NOT EXISTS idx_query_counts_date ON query_counts_daily(date);
    `);
    console.log('✅ Migrations applied successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
