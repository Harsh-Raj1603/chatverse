const express = require('express');
const router = express.Router();
const User = require('../models/User');

const familyPassword = process.env.FAMILY_PASSWORD;

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (password !== familyPassword) return res.status(401).json({ message: 'Wrong family password' });

  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username already taken' });

    const user = new User({ username });
    await user.save();

    res.json({ message: 'Registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (password !== familyPassword) return res.status(401).json({ message: 'Wrong family password' });

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: 'User not found' });

  res.json({ message: 'Login successful' });
});

router.get('/users', async (req, res) => {
  const users = await User.find({}, 'username -_id');
  res.json(users);
});

module.exports = router;
