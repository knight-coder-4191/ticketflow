const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Public authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.get('/agents', authenticate, authorize('admin'), authController.getAgents);

module.exports = router;
