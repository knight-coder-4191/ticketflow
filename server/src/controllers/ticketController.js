const { Ticket } = require('../models/Ticket');
const { Comment } = require('../models/Comment');
const { User } = require('../models/User');

const VALID_CATEGORIES = ['Technical', 'Billing', 'Account', 'Hardware', 'General'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const VALID_STATUSES = ['Open', 'In Progress', 'Resolved'];

/**
 * Customer creates a new ticket
 * POST /api/tickets
 */
async function createTicket(req, res) {
  try {
    const { title, description, category, priority } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Ticket title is required and cannot be empty.'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Ticket description is required.'
      });
    }

    const assignedCategory = VALID_CATEGORIES.includes(category) ? category : 'General';
    const assignedPriority = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';

    const ticket = await Ticket.create({
      title: title.trim(),
      description: description.trim(),
      category: assignedCategory,
      priority: assignedPriority,
      status: 'Open',
      createdBy: req.user._id,
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: null
    });

    return res.status(201).json({
      success: true,
      message: 'Ticket created successfully with status Open.',
      ticket
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create ticket.',
      error: err.message
    });
  }
}

/**
 * List tickets based on role and optional filters
 * GET /api/tickets
 */
async function getTickets(req, res) {
  try {
    const { status, priority, category, search } = req.query;
    const query = {};

    // Enforce role boundaries
    if (req.user.role === 'customer') {
      query.createdBy = req.user._id;
    } else if (req.user.role === 'agent') {
      query.assignedTo = req.user._id;
    }
    // Admin sees all tickets

    // Apply query filters
    if (status && VALID_STATUSES.includes(status)) {
      query.status = status;
    }
    if (priority && VALID_PRIORITIES.includes(priority)) {
      query.priority = priority;
    }
    if (category && VALID_CATEGORIES.includes(category)) {
      query.category = category;
    }
    if (search && search.trim()) {
      query.search = search.trim();
    }

    const tickets = await Ticket.find(query);

    return res.status(200).json({
      success: true,
      count: tickets.length,
      tickets
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tickets.',
      error: err.message
    });
  }
}

/**
 * View one ticket by ID (ownership checked)
 * GET /api/tickets/:id
 */
async function getTicketById(req, res) {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    // Role checks
    const creatorId = ticket.createdBy ? (ticket.createdBy._id || ticket.createdBy).toString() : null;
    const assignedId = ticket.assignedTo ? (ticket.assignedTo._id || ticket.assignedTo).toString() : null;

    if (req.user.role === 'customer' && creatorId !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view tickets created by other customers.'
      });
    }

    if (req.user.role === 'agent' && assignedId !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: This ticket is not assigned to you.'
      });
    }

    return res.status(200).json({
      success: true,
      ticket
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ticket.',
      error: err.message
    });
  }
}

/**
 * Assign ticket to an agent (Admin only)
 * PUT /api/tickets/:id/assign
 */
async function assignTicket(req, res) {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'agentId is required to assign a ticket.'
      });
    }

    // Verify targeted user exists and is an AGENT (TC-10 check)
    const targetUser = await User.findById(agentId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Assigned user does not exist.'
      });
    }

    if (targetUser.role !== 'agent') {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Tickets can only be assigned to users with the Agent role. User '${targetUser.name}' has role '${targetUser.role}'.`
      });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    ticket.assignedTo = targetUser._id;
    await ticket.save();
    await ticket.populateUserRefs();

    return res.status(200).json({
      success: true,
      message: `Ticket successfully assigned to Agent ${targetUser.name}.`,
      ticket
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to assign ticket.',
      error: err.message
    });
  }
}

/**
 * Update ticket status (Agent or Admin)
 * PUT /api/tickets/:id/status
 */
async function updateTicketStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    // If agent, verify they are assigned
    const assignedId = ticket.assignedTo ? (ticket.assignedTo._id || ticket.assignedTo).toString() : null;
    if (req.user.role === 'agent' && assignedId !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update the status of tickets assigned to you.'
      });
    }

    ticket.status = status;
    if (status === 'Resolved') {
      ticket.resolvedAt = new Date();
    } else {
      ticket.resolvedAt = null;
    }

    await ticket.save();
    await ticket.populateUserRefs();

    return res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status}.`,
      ticket
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update ticket status.',
      error: err.message
    });
  }
}

/**
 * Add comment to ticket
 * POST /api/tickets/:id/comments
 */
async function addComment(req, res) {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment message cannot be empty.'
      });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    // Role ownership verification
    const creatorId = ticket.createdBy ? (ticket.createdBy._id || ticket.createdBy).toString() : null;
    const assignedId = ticket.assignedTo ? (ticket.assignedTo._id || ticket.assignedTo).toString() : null;

    if (req.user.role === 'customer' && creatorId !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot comment on another customer\'s ticket.'
      });
    }

    if (req.user.role === 'agent' && assignedId !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot comment on tickets not assigned to you.'
      });
    }

    const comment = await Comment.create({
      ticketId: ticket._id,
      userId: req.user._id,
      message: message.trim(),
      createdAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Comment posted successfully.',
      comment
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to post comment.',
      error: err.message
    });
  }
}

/**
 * Get comments for a ticket
 * GET /api/tickets/:id/comments
 */
async function getComments(req, res) {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    // Access control
    const creatorId = ticket.createdBy ? (ticket.createdBy._id || ticket.createdBy).toString() : null;
    const assignedId = ticket.assignedTo ? (ticket.assignedTo._id || ticket.assignedTo).toString() : null;

    if (req.user.role === 'customer' && creatorId !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view comments on another customer\'s ticket.'
      });
    }

    if (req.user.role === 'agent' && assignedId !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view comments on unassigned tickets.'
      });
    }

    const comments = await Comment.find({ ticketId: ticket._id });

    return res.status(200).json({
      success: true,
      comments
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve comments.',
      error: err.message
    });
  }
}

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  addComment,
  getComments
};
