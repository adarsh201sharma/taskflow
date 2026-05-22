const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Board = require('../models/Board');

module.exports = function registerSocketHandlers(io) {
  // Auth middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name email avatarColor');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.user.name} (${socket.id})`);

    // Join a board room (validated against access)
    socket.on('board:join', async (boardId) => {
      try {
        const board = await Board.findById(boardId);
        if (!board || !board.hasAccess(socket.user._id)) {
          socket.emit('error', { message: 'Board access denied' });
          return;
        }
        socket.join(`board:${boardId}`);

        // Notify others
        socket.to(`board:${boardId}`).emit('user:joined', {
          user: socket.user,
          timestamp: Date.now(),
        });

        // Send current online users to the joining client
        const sockets = await io.in(`board:${boardId}`).fetchSockets();
        const onlineUsers = sockets.map((s) => ({
          id: s.user._id,
          name: s.user.name,
          email: s.user.email,
          avatarColor: s.user.avatarColor,
        }));
        socket.emit('board:online-users', onlineUsers);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('board:leave', (boardId) => {
      socket.leave(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('user:left', {
        userId: socket.user._id,
        name: socket.user.name,
      });
    });

    // Live cursor/typing indicator (optional UX nicety)
    socket.on('task:typing', ({ boardId, taskId }) => {
      socket.to(`board:${boardId}`).emit('task:typing', {
        taskId,
        user: { id: socket.user._id, name: socket.user.name },
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.user.name}`);
    });
  });
};
