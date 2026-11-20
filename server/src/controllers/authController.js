const { User } = require('../models/User');
const { hashPassword, comparePassword, signToken } = require('../utils/security');

// Email regex pattern for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register new user account
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are all required fields.'
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already registered. Please log in.'
      });
    }

    const assignedRole = ['customer', 'agent', 'admin'].includes(role) ? role : 'customer';
    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: assignedRole
    });

    const token = signToken({ id: user._id.toString(), role: user.role, email: user.email });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to register user.',
      error: err.message
    });
  }
}

/**
 * Authenticate user and issue JWT
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = signToken({ id: user._id.toString(), role: user.role, email: user.email });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Login failed due to a server error.',
      error: err.message
    });
  }
}

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user
  });
}

/**
 * Get list of all agents (Admin only)
 * GET /api/auth/agents
 */
async function getAgents(req, res) {
  try {
    const agents = await User.find({ role: 'agent' });
    const formatted = agents.map(a => ({
      _id: a._id,
      name: a.name,
      email: a.email,
      role: a.role
    }));
    return res.status(200).json({
      success: true,
      agents: formatted
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent list.',
      error: err.message
    });
  }
}

module.exports = {
  register,
  login,
  getMe,
  getAgents
};
