const Board = require('../models/Board');
const List = require('../models/List');
const Task = require('../models/Task');
const User = require('../models/User');

// Get all boards user owns or is a member of
exports.list = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      archived: false,
    })
      .populate('owner', 'name email avatarColor')
      .populate('members.user', 'name email avatarColor')
      .sort({ updatedAt: -1 });

    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single board with lists and tasks
exports.get = async (req, res) => {
  try {
    const board = req.board;
    await board.populate('owner', 'name email avatarColor');
    await board.populate('members.user', 'name email avatarColor');

    const lists = await List.find({ board: board._id }).sort({ position: 1 });
    const tasks = await Task.find({ board: board._id })
      .populate('assignedTo', 'name email avatarColor')
      .populate('createdBy', 'name email avatarColor')
      .populate('comments.user', 'name email avatarColor')
      .sort({ position: 1 });

    res.json({ board, lists, tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new board
exports.create = async (req, res) => {
  try {
    const { title, description, color } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const board = await Board.create({
      title,
      description: description || '',
      color: color || '#3B82F6',
      owner: req.user._id,
      members: [],
    });

    // Auto-create three default lists
    await List.insertMany([
      { board: board._id, title: 'To Do', position: 0 },
      { board: board._id, title: 'In Progress', position: 1 },
      { board: board._id, title: 'Done', position: 2 },
    ]);

    await board.populate('owner', 'name email avatarColor');
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update board metadata
exports.update = async (req, res) => {
  try {
    const board = req.board;
    if (!board.owner.equals(req.user._id)) {
      return res.status(403).json({ error: 'Only owner can update the board' });
    }

    const { title, description, color, archived } = req.body;
    if (title !== undefined) board.title = title;
    if (description !== undefined) board.description = description;
    if (color !== undefined) board.color = color;
    if (archived !== undefined) board.archived = archived;
    await board.save();

    const io = req.app.get('io');
    io.to(`board:${board._id}`).emit('board:updated', board);

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete board
exports.remove = async (req, res) => {
  try {
    const board = req.board;
    if (!board.owner.equals(req.user._id)) {
      return res.status(403).json({ error: 'Only owner can delete the board' });
    }

    await Task.deleteMany({ board: board._id });
    await List.deleteMany({ board: board._id });
    await board.deleteOne();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Invite a member by email
exports.inviteMember = async (req, res) => {
  try {
    const board = req.board;
    if (!board.owner.equals(req.user._id)) {
      return res.status(403).json({ error: 'Only owner can invite members' });
    }

    const { email, role = 'editor' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        error: 'No user found with that email. Ask them to sign up first.',
      });
    }

    if (user._id.equals(board.owner)) {
      return res.status(400).json({ error: 'You are already the owner' });
    }

    const existing = board.members.find((m) => m.user.equals(user._id));
    if (existing) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    board.members.push({ user: user._id, role });
    await board.save();
    await board.populate('members.user', 'name email avatarColor');

    const io = req.app.get('io');
    io.to(`board:${board._id}`).emit('board:member-added', {
      boardId: board._id,
      member: board.members[board.members.length - 1],
    });

    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove a member
exports.removeMember = async (req, res) => {
  try {
    const board = req.board;
    if (!board.owner.equals(req.user._id)) {
      return res.status(403).json({ error: 'Only owner can remove members' });
    }

    const { userId } = req.params;
    board.members = board.members.filter((m) => !m.user.equals(userId));
    await board.save();

    const io = req.app.get('io');
    io.to(`board:${board._id}`).emit('board:member-removed', {
      boardId: board._id,
      userId,
    });

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update member role
exports.updateMemberRole = async (req, res) => {
  try {
    const board = req.board;
    if (!board.owner.equals(req.user._id)) {
      return res.status(403).json({ error: 'Only owner can update roles' });
    }

    const { userId } = req.params;
    const { role } = req.body;
    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const member = board.members.find((m) => m.user.equals(userId));
    if (!member) return res.status(404).json({ error: 'Member not found' });

    member.role = role;
    await board.save();
    await board.populate('members.user', 'name email avatarColor');

    const io = req.app.get('io');
    io.to(`board:${board._id}`).emit('board:member-updated', {
      boardId: board._id,
      members: board.members,
    });

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
