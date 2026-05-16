const router = require('express').Router();
const auth = require('../middleware/auth');
const { loadBoard } = require('../middleware/boardAccess');
const ctrl = require('../controllers/boardController');

router.use(auth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);

router.get('/:id', loadBoard(false), ctrl.get);
router.patch('/:id', loadBoard(false), ctrl.update);
router.delete('/:id', loadBoard(false), ctrl.remove);

router.post('/:id/members', loadBoard(false), ctrl.inviteMember);
router.delete('/:id/members/:userId', loadBoard(false), ctrl.removeMember);
router.patch('/:id/members/:userId', loadBoard(false), ctrl.updateMemberRole);

module.exports = router;
