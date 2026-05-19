const List = require('../models/List');
const Task = require('../models/Task');
const Board = require('../models/Board');

const emitToBoard = (req, event, payload) => {
  const io = req.app.get('io');
  io.to(`board:${req.board._id}`).emit(event, payload);
};

exports.create = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const count = await List.countDocuments({ board: req.board._id });
    const list = await List.create({
      board: req.board._id,
      title,
      position: count,
    });

    emitToBoard(req, 'list:created', list);
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const list = await List.findOne({ _id: req.params.id, board: req.board._id });
    if (!list) return res.status(404).json({ error: 'List not found' });

    const { title, position } = req.body;
    if (title !== undefined) list.title = title;
    if (position !== undefined) list.position = position;
    await list.save();

    emitToBoard(req, 'list:updated', list);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const list = await List.findOne({ _id: req.params.id, board: req.board._id });
    if (!list) return res.status(404).json({ error: 'List not found' });

    await Task.deleteMany({ list: list._id });
    await list.deleteOne();

    emitToBoard(req, 'list:deleted', { listId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reorder lists in bulk
exports.reorder = async (req, res) => {
  try {
    const { ordered } = req.body; // [{ id, position }]
    if (!Array.isArray(ordered)) {
      return res.status(400).json({ error: 'ordered must be an array' });
    }

    await Promise.all(
      ordered.map((item) =>
        List.updateOne(
          { _id: item.id, board: req.board._id },
          { position: item.position }
        )
      )
    );

    emitToBoard(req, 'list:reordered', { ordered });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
