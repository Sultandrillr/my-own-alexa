import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Runs on startup. Safe to run every time.
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lights (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      topic       TEXT NOT NULL,
      power       BOOLEAN NOT NULL DEFAULT false,
      brightness  INTEGER NOT NULL DEFAULT 100 CHECK (brightness BETWEEN 0 AND 100),
      hue         INTEGER NOT NULL DEFAULT 0   CHECK (hue BETWEEN 0 AND 360),
      saturation  INTEGER NOT NULL DEFAULT 0   CHECK (saturation BETWEEN 0 AND 100),
      reported    JSONB,
      last_seen   TIMESTAMPTZ,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}
