const fs = require("fs");
const path = require("path");
const tls = require("tls");
const { Pool } = require("pg");
const jsonStore = require("./jsonDatabase");

const tables = {
  accounts: "fixnow_accounts",
  serviceRequests: "fixnow_service_requests",
  offers: "fixnow_offers",
  ratings: "fixnow_ratings",
  payments: "fixnow_payments",
  passwordResetTokens: "fixnow_password_reset_tokens"
};
const snapshots = new WeakMap();
let pool;
const clone = (value) => JSON.parse(JSON.stringify(value));
const storageMode = () => process.env.DATABASE_URL?.trim() ? "postgres" : "json";
const recordId = (key, record) => key === "passwordResetTokens" ? record.token : record.id;
function conflict() {
  const error = new Error("Data changed during this request. Refresh and try again.");
  error.status = 409;
  return error;
}
function getPool() {
  if (pool) return pool;
  let url;
  try {
    url = new URL(process.env.DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
  } catch { throw new Error("DATABASE_URL must be a PostgreSQL connection string."); }
  if (!url.password || /YOUR.?PASSWORD|REPLACE_WITH/i.test(decodeURIComponent(url.password))) {
    throw new Error("Replace the password placeholder in backend/.env.");
  }
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const caPath = process.env.DATABASE_SSL_CA_FILE
    ? path.resolve(__dirname, "../..", process.env.DATABASE_SSL_CA_FILE)
    : path.join(__dirname, "../../certs/supabase-ca.crt");
  const ca = fs.existsSync(caPath) ? [...tls.rootCertificates, fs.readFileSync(caPath, "utf8")] : tls.rootCertificates;
  pool = new Pool({
    connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: true, ca },
    max: 5, connectionTimeoutMillis: 10000, statement_timeout: 15000
  });
  pool.on("error", () => console.error("An idle database connection failed."));
  return pool;
}
async function initializeDatabase() {
  if (storageMode() === "json") { jsonStore.readDb(); return; }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(40105702)");
    await client.query(fs.readFileSync(path.join(__dirname, "../../sql/001-supabase.sql"), "utf8"));
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
async function readDb() {
  if (storageMode() === "json") {
    const db = jsonStore.readDb();
    snapshots.set(db, {data: clone(db)});
    return db;
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const { rows } = await client.query("SELECT revision FROM fixnow_private.storage_revision WHERE id = 1");
    if (!rows[0]) throw new Error("Database schema has not been initialized.");
    const db = {};
    for (const [key, table] of Object.entries(tables)) {
      const result = await client.query(`SELECT data FROM public.${table} ORDER BY position, id`);
      db[key] = result.rows.map((row) => row.data);
    }
    await client.query("COMMIT");
    snapshots.set(db, {revision: rows[0].revision, data: clone(db)});
    return db;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
function validateDb(db) {
  for (const key of Object.keys(tables)) {
    if (!Array.isArray(db[key])) throw new Error(`Invalid collection: ${key}`);
    const ids = new Set();
    for (const record of db[key]) {
      const id = recordId(key, record);
      if (typeof id !== "string" || !id || ids.has(id)) throw new Error(`Missing or duplicate record ID in ${key}`);
      ids.add(id);
    }
  }
}
async function writeDb(db) {
  const snapshot = snapshots.get(db);
  if (!snapshot) throw new Error("Read the database before updating it.");
  validateDb(db);
  if (storageMode() === "json") {
    if (JSON.stringify(jsonStore.readDb()) !== JSON.stringify(snapshot.data)) throw conflict();
    jsonStore.writeDb(db);
    snapshots.set(db, {data: clone(db)});
    return db;
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "UPDATE fixnow_private.storage_revision SET revision = revision + 1 WHERE id = 1 AND revision = $1 RETURNING revision", [snapshot.revision]
    );
    if (!result.rowCount) throw conflict();
    for (const [key, table] of Object.entries(tables)) {
      const oldRecords = new Map(snapshot.data[key].map((record, position) => [recordId(key, record), {record, position}]));
      for (const [position, record] of db[key].entries()) {
        const id = recordId(key, record), previous = oldRecords.get(id);
        oldRecords.delete(id);
        if (previous && previous.position === position && JSON.stringify(previous.record) === JSON.stringify(record)) continue;
        await client.query(
          `INSERT INTO public.${table} (id, data, position) VALUES ($1, $2::jsonb, $3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, position = EXCLUDED.position`,
          [id, JSON.stringify(record), position]
        );
      }
      for (const id of oldRecords.keys()) await client.query(`DELETE FROM public.${table} WHERE id = $1`, [id]);
    }
    await client.query("COMMIT");
    snapshots.set(db, {revision: result.rows[0].revision, data: clone(db)});
    return db;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
async function updateDb(updater) {
  const current = await readDb();
  const next = await updater(current);
  if (next !== current) snapshots.set(next, snapshots.get(current));
  return writeDb(next);
}
async function checkDatabase() {
  if (storageMode() === "postgres") {
    const result = await getPool().query("SELECT revision FROM fixnow_private.storage_revision WHERE id = 1");
    if (!result.rowCount) throw new Error("Database schema is missing.");
  } else jsonStore.readDb();
  return storageMode();
}
async function closeDatabase() { if (pool) await pool.end(); pool = undefined; }
module.exports = { initializeDatabase, readDb, writeDb, updateDb, checkDatabase, closeDatabase, storageMode, tables, validateDb };
