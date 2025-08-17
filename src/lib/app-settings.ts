import prisma from "@/lib/prisma";

// Minimal settings store using raw SQL to avoid Prisma schema changes.
// It lazily creates the table `app_settings` if it does not exist.

async function ensureTable() {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );`
    );
    await prisma.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION set_updated_at()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql;`
    );
    await prisma.$executeRawUnsafe(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_trigger WHERE tgname = 'app_settings_set_updated_at'
         ) THEN
           CREATE TRIGGER app_settings_set_updated_at
           BEFORE UPDATE ON app_settings
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
         END IF;
       END $$;`
    );
  } catch (e) {
    // Do not block; log and continue. If permissions disallow DDL, reads will just 404.
    console.warn("[APP-SETTINGS] ensureTable failed (non-fatal)", e);
  }
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    await ensureTable();
    const rows: Array<{ value: string }> = await prisma.$queryRawUnsafe(
      `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
      key
    );
    if (rows && rows.length > 0) return rows[0].value;
    return null;
  } catch (e) {
    console.warn("[APP-SETTINGS] getSetting failed", e);
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureTable();
  await prisma.$executeRawUnsafe(
    `INSERT INTO app_settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    key,
    value
  );
}

export async function getSettingInt(key: string, defaultValue: number): Promise<number> {
  const v = await getSetting(key);
  if (v == null) return defaultValue;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return defaultValue;
  return Math.floor(n);
}

export async function setSettingInt(key: string, value: number): Promise<void> {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Value must be a positive integer");
  }
  await setSetting(key, String(Math.floor(value)));
}
