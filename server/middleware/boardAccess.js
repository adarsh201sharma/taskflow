const Board = require('../models/Board');

function loadBoard(requireEdit = false) {
  return async (req, res, next) => {
    try {
      const boardId = req.params.boardId || req.body.boardId || req.params.id;
      if (!boardId) return res.status(400).json({ error: 'Board ID required' });

      const board = await Board.findById(boardId);
      if (!board) return res.status(404).json({ error: 'Board not found' });

      const hasAccess = requireEdit
        ? board.canEdit(req.user._id)
        : board.hasAccess(req.user._id);

      if (!hasAccess) {
        return res.status(403).json({
          error: requireEdit ? 'You need editor access' : 'Access denied',
        });
      }

      req.board = board;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { loadBoard };
