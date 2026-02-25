const tasksService = require('../services/tasks');

class TasksController {
  async list(req, res, next) {
    try {
      const tasks = await tasksService.list({ status: req.query.status });
      return res.status(200).json({ data: tasks });
    } catch (err) {
      return next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: 'Invalid id' });
      }

      const task = await tasksService.getById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      return res.status(200).json({ data: task });
    } catch (err) {
      return next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { title, completed } = req.body || {};
      if (typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ message: 'title is required' });
      }

      const task = await tasksService.create({
        title: title.trim(),
        completed: Boolean(completed),
      });

      return res.status(201).json({ data: task });
    } catch (err) {
      return next(err);
    }
  }

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: 'Invalid id' });
      }

      const { title, completed } = req.body || {};
      if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
        return res.status(400).json({ message: 'title must be a non-empty string' });
      }
      if (completed !== undefined && typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'completed must be a boolean' });
      }

      const updated = await tasksService.update(id, {
        title: title !== undefined ? title.trim() : undefined,
        completed,
      });

      if (!updated) {
        return res.status(404).json({ message: 'Task not found' });
      }

      return res.status(200).json({ data: updated });
    } catch (err) {
      return next(err);
    }
  }

  async patch(req, res, next) {
    // Same validation rules as update but partial is allowed already
    return this.update(req, res, next);
  }

  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: 'Invalid id' });
      }

      const removed = await tasksService.remove(id);
      if (!removed) {
        return res.status(404).json({ message: 'Task not found' });
      }

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new TasksController();

