const { all, get, run, getDb } = require('./db');

/**
 * Convert DB row into API task object.
 */
function mapRowToTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Validate filter param.
 */
function normalizeStatusFilter(status) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  if (s === 'all') return null;
  if (s === 'active') return 0;
  if (s === 'completed') return 1;
  const err = new Error('Invalid status filter. Use all|active|completed.');
  err.statusCode = 400;
  throw err;
}

class TasksService {
  async list({ status }) {
    const db = getDb();
    const completedFilter = normalizeStatusFilter(status);

    if (completedFilter === null || completedFilter === undefined) {
      const rows = await all(db, 'SELECT * FROM tasks ORDER BY createdAt DESC');
      return rows.map(mapRowToTask);
    }

    const rows = await all(
      db,
      'SELECT * FROM tasks WHERE completed = ? ORDER BY createdAt DESC',
      [completedFilter]
    );
    return rows.map(mapRowToTask);
  }

  async getById(id) {
    const db = getDb();
    const row = await get(db, 'SELECT * FROM tasks WHERE id = ?', [id]);
    return mapRowToTask(row);
  }

  async create({ title, completed }) {
    const db = getDb();
    const now = new Date().toISOString();

    const completedInt = completed ? 1 : 0;
    const result = await run(
      db,
      `INSERT INTO tasks (title, completed, createdAt, updatedAt)
       VALUES (?, ?, ?, ?)`,
      [title, completedInt, now, now]
    );

    return this.getById(result.lastID);
  }

  async update(id, { title, completed }) {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return null;

    const nextTitle = title !== undefined ? title : existing.title;
    const nextCompleted =
      completed !== undefined ? (completed ? 1 : 0) : existing.completed ? 1 : 0;

    const now = new Date().toISOString();

    await run(
      db,
      `UPDATE tasks
       SET title = ?, completed = ?, updatedAt = ?
       WHERE id = ?`,
      [nextTitle, nextCompleted, now, id]
    );

    return this.getById(id);
  }

  async patch(id, patch) {
    // For this simple API, PATCH behaves like partial update (same as update)
    return this.update(id, patch);
  }

  async remove(id) {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return false;

    await run(db, 'DELETE FROM tasks WHERE id = ?', [id]);
    return true;
  }
}

module.exports = new TasksService();

