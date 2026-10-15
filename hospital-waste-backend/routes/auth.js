const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, requireAuth } = require('../middleware/auth');

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  role: user.role,
  department: user.department,
  phone: user.phone,
  isActive: user.isActive,
  createdAt: user.createdAt
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username/Email and Password are required' });
    }

    const cleanInput = username.trim().toLowerCase();

    // Find user by username OR email
    const user = await User.findOne({
      $or: [
        { email: cleanInput },
        { username: cleanInput }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Role check if role was provided in login request
    if (role && user.role !== role) {
      return res.status(401).json({ message: `Access denied. Account role is '${user.role}', not '${role}'` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'This account has been deactivated. Please contact the administrator.' });
    }

    res.json({
      message: 'Login successful',
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me - Refresh the current user's profile from the database
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isActive === false) return res.status(403).json({ message: 'This account has been deactivated.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error during password change' });
  }
});

module.exports = router;
