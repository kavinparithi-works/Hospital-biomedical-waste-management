const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// GET /api/users - Get all users (with optional role, search, and status filtering)
router.get('/', async (req, res) => {
  try {
    const { role, search, status } = req.query;
    let query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status === 'active') {
      query.isActive = { $ne: false };
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
        { department: searchRegex },
        { phone: searchRegex }
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// POST /api/users - Admin adds a new user (Staff or Worker)
router.post('/', async (req, res) => {
  try {
    const { name, email, username, password, phone, role, department } = req.body;

    if (!name || (!email && !username) || !password || !role) {
      return res.status(400).json({ message: 'Name, Email/Username, Password, and Role are required' });
    }

    if (role !== 'staff' && role !== 'worker') {
      return res.status(400).json({ message: 'Only Staff and Worker users can be created from this form' });
    }

    const userEmail = (email || username).trim().toLowerCase();
    const userUsername = (username || email).trim().toLowerCase();

    // Check if user already exists
    const existing = await User.findOne({
      $or: [{ email: userEmail }, { username: userUsername }]
    });

    if (existing) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: name.trim(),
      email: userEmail,
      username: userUsername,
      password: hashedPassword,
      phone: phone ? phone.trim() : '',
      role,
      department: department || (role === 'staff' ? 'Medical Ward' : 'Logistics'),
      isActive: true
    });

    await newUser.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        phone: newUser.phone,
        role: newUser.role,
        department: newUser.department,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Admin updates existing user (name, phone, department, role, password, status)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, department, isActive, role, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (department) user.department = department.trim();
    if (role && (role === 'staff' || role === 'worker')) user.role = role;
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password.trim(), salt);
    }

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone,
        role: user.role,
        department: user.department,
        isActive: user.isActive
      }
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// PATCH /api/users/:id/toggle-active - Toggle user active/inactive status
router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin account status cannot be deactivated' });
    }

    user.isActive = user.isActive === false ? true : false;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: user.isActive
    });
  } catch (err) {
    console.error('Error toggling user active status:', err);
    res.status(500).json({ message: 'Failed to toggle user status' });
  }
});

// DELETE /api/users/:id - Admin deletes a user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be deleted' });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;
