const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * Singleton SQLite connection. We keep one connection for the process because sqlite3's
 * Database object is designed to be long-lived.
 */
let dbInstance = null;

/**
 * Resolve database path from environment variable.
 * - Uses SQLITE_DB if set.
 * - Falls back to a local file for dev if SQLITE_DB is not provided.
 */
function resolveDbPath() {
  const fromEnv = process.env.SQLITE_DB;

  // IMPORTANT: SQLITE_DB should be provided by environment (.env). We still provide a safe
  // fallback so the service can run locally without additional setup.
  if (fromEnv && String(fromEnv).trim().length > 0) {
    return fromEnv;
  }

  /**
   * Default integration path:
   * The project includes a dedicated SQLite "database" container which initializes
   * its DB at: simple-to-do-list-.../database/myapp.db
   *
   * Using a deterministic absolute-ish path (from this backend container) makes local/dev
   * end-to-end flow work without requiring extra env wiring.
   */
  return path.resolve(__dirname, '../../../../simple-to-do-list-228918-228934/database/myapp.db');
}

/**
 * Create the DB connection if not already created.
 */
function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = resolveDbPath();

  // sqlite3 will create the file if it doesn't exist.
  dbInstance = new sqlite3.Database(dbPath);

  return dbInstance;
}

/**
 * Promisified wrapper for db.run.
 */
function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        return reject(err);
      }
      return resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Promisified wrapper for db.get.
 */
function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        return reject(err);
      }
      return resolve(row);
    });
  });
}

/**
 * Promisified wrapper for db.all.
 */
function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      return resolve(rows);
    });
  });
}

/**
 * Initialize schema (idempotent).
 */
async function initDb() {
  const db = getDb();

  // Tasks table for to-do app
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`
  );

  // Helpful index for filtering/sorting
  await run(db, 'CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)');
  await run(db, 'CREATE INDEX IF NOT EXISTS idx_tasks_createdAt ON tasks(createdAt)');
}

module.exports = {
  getDb,
  initDb,
  run,
  get,
  all,
};

