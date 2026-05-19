const router = require('express').Router({ mergeParams: true });
const auth = require('../middleware/auth');
const { loadBoard } = require('../middleware/boardAccess');
const ctrl = require('../controllers/listController');

router.use(auth);

router.post('/board/:boardId', loadBoard(true), ctrl.create);
router.patch('/board/:boardId/reorder', loadBoard(true), ctrl.reorder);
router.patch('/board/:boardId/:id', loadBoard(true), ctrl.update);
router.delete('/board/:boardId/:id', loadBoard(true), ctrl.remove);

module.exports = router;
