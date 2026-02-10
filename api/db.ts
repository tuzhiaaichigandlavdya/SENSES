
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use POSTGRES_URL or DATABASE_URL from Vercel
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('WARNING: POSTGRES_URL or DATABASE_URL environment variable is not set.');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
