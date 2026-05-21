const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

router.use(auth);

// Search users by email (for invite autocomplete)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) return res.json([]);
    const users = await User.find({
      email: { $regex: q.toLowerCase(), $options: 'i' },
      _id: { $ne: req.user._id },
    })
      .limit(5)
      .select('name email avatarColor');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
