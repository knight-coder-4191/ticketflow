const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const statsController = require('../controllers/statsController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// All ticket routes require authentication
router.use(authenticate);

// Analytics: GET /api/tickets/stats (Admin only)
router.get('/stats', authorize('admin'), statsController.getStats);

// Ticket CRUD
// Customer creates ticket: POST /api/tickets
router.post('/', authorize('customer'), ticketController.createTicket);

// List tickets (Role-filtered): GET /api/tickets
router.get('/', ticketController.getTickets);

// Single ticket view: GET /api/tickets/:id
router.get('/:id', ticketController.getTicketById);

// Admin assigns ticket: PUT /api/tickets/:id/assign
router.put('/:id/assign', authorize('admin'), ticketController.assignTicket);

// Agent/Admin updates status: PUT /api/tickets/:id/status
router.put('/:id/status', authorize('agent', 'admin'), ticketController.updateTicketStatus);

// Comments
// Add comment: POST /api/tickets/:id/comments
router.post('/:id/comments', ticketController.addComment);

// List comments: GET /api/tickets/:id/comments
router.get('/:id/comments', ticketController.getComments);

module.exports = router;
