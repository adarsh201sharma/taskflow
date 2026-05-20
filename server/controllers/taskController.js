const Task = require('../models/Task');
const List = require('../models/List');

const emitToBoard = (req, event, payload) => {
  const io = req.app.get('io');
  io.to(`board:${req.board._id}`).emit(event, payload);
};

const populateTask = (task) =>
  task
    .populate('assignedTo', 'name email avatarColor')
    .then((t) => t.populate('createdBy', 'name email avatarColor'))
    .then((t) => t.populate('comments.user', 'name email avatarColor'));

exports.create = async (req, res) => {
  try {
    const { listId, title, description, priority, dueDate, assignedTo, labels } = req.body;
    if (!listId || !title) {
      return res.status(400).json({ error: 'listId and title required' });
    }

    const list = await List.findOne({ _id: listId, board: req.board._id });
    if (!list) return res.status(404).json({ error: 'List not found' });

    const count = await Task.countDocuments({ list: listId });
    let task = await Task.create({
      board: req.board._id,
      list: listId,
      title,
      description: description || '',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      assignedTo: assignedTo || null,
      labels: labels || [],
      createdBy: req.user._id,
      position: count,
    });

    task = await populateTask(task);
    emitToBoard(req, 'task:created', task);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    let task = await Task.findOne({ _id: req.params.id, board: req.board._id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const allowed = ['title', 'description', 'priority', 'dueDate', 'assignedTo', 'completed', 'labels'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    await task.save();
    task = await populateTask(task);

    emitToBoard(req, 'task:updated', task);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Move task between lists or reorder within a list
exports.move = async (req, res) => {
  try {
    const { targetListId, position } = req.body;
    const task = await Task.findOne({ _id: req.params.id, board: req.board._id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (targetListId) {
      const target = await List.findOne({ _id: targetListId, board: req.board._id });
      if (!target) return res.status(404).json({ error: 'Target list not found' });
      task.list = targetListId;
    }
    if (position !== undefined) task.position = position;
    await task.save();

    const populated = await populateTask(task);
    emitToBoard(req, 'task:moved', populated);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      board: req.board._id,
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    emitToBoard(req, 'task:deleted', { taskId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add comment
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text required' });
    }

    let task = await Task.findOne({ _id: req.params.id, board: req.board._id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.comments.push({ user: req.user._id, text: text.trim() });
    await task.save();
    task = await populateTask(task);

    emitToBoard(req, 'task:comment-added', task);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete comment
exports.removeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    let task = await Task.findOne({ _id: req.params.id, board: req.board._id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const comment = task.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (!comment.user.equals(req.user._id) && !req.board.owner.equals(req.user._id)) {
      return res.status(403).json({ error: 'Cannot delete this comment' });
    }

    task.comments.pull(commentId);
    await task.save();
    task = await populateTask(task);

    emitToBoard(req, 'task:comment-removed', task);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
