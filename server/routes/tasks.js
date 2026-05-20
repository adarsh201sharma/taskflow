const router = require('express').Router({ mergeParams: true });
const auth = require('../middleware/auth');
const { loadBoard } = require('../middleware/boardAccess');
const ctrl = require('../controllers/taskController');

router.use(auth);

router.post('/board/:boardId', loadBoard(true), ctrl.create);
router.patch('/board/:boardId/:id', loadBoard(true), ctrl.update);
router.patch('/board/:boardId/:id/move', loadBoard(true), ctrl.move);
router.delete('/board/:boardId/:id', loadBoard(true), ctrl.remove);

router.post('/board/:boardId/:id/comments', loadBoard(true), ctrl.addComment);
router.delete('/board/:boardId/:id/comments/:commentId', loadBoard(true), ctrl.removeComment);

module.exports = router;
