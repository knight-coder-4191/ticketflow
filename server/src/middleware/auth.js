const { verifyToken } = require('../utils/security');
const { User } = require('../models/User');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required. Please log in.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token. Please log in again.'
      });
    }

    const user = await User.findById(decoded.id || decoded._id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account associated with this token no longer exists.'
      });
    }

    req.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: err.message
    });
  }
}

module.exports = { authenticate };
