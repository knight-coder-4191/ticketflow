const { Ticket } = require('../models/Ticket');

/**
 * Return system analytics and metrics (Admin only)
 * GET /api/tickets/stats
 */
async function getStats(req, res) {
  try {
    const allTickets = await Ticket.find({});

    const total = allTickets.length;
    let openCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;

    const byCategory = {
      Technical: 0,
      Billing: 0,
      Account: 0,
      Hardware: 0,
      General: 0
    };

    const byPriority = {
      Low: 0,
      Medium: 0,
      High: 0,
      Urgent: 0
    };

    let totalResolutionTimeMs = 0;
    let resolvedWithTimestampsCount = 0;

    allTickets.forEach(ticket => {
      // Status counting
      if (ticket.status === 'Open') openCount++;
      else if (ticket.status === 'In Progress') inProgressCount++;
      else if (ticket.status === 'Resolved') resolvedCount++;

      // Category counting
      if (byCategory[ticket.category] !== undefined) {
        byCategory[ticket.category]++;
      } else {
        byCategory[ticket.category] = 1;
      }

      // Priority counting
      if (byPriority[ticket.priority] !== undefined) {
        byPriority[ticket.priority]++;
      } else {
        byPriority[ticket.priority] = 1;
      }

      // Resolution time computation: T_r - T_c
      if (ticket.status === 'Resolved' && ticket.resolvedAt && ticket.createdAt) {
        const diffMs = new Date(ticket.resolvedAt) - new Date(ticket.createdAt);
        if (diffMs >= 0) {
          totalResolutionTimeMs += diffMs;
          resolvedWithTimestampsCount++;
        }
      }
    });

    // Average resolution time
    let averageResolutionMinutes = 0;
    let averageResolutionFormatted = '0m';

    if (resolvedWithTimestampsCount > 0) {
      averageResolutionMinutes = Math.round((totalResolutionTimeMs / resolvedWithTimestampsCount) / (1000 * 60));
      if (averageResolutionMinutes >= 60) {
        const hours = (averageResolutionMinutes / 60).toFixed(1);
        averageResolutionFormatted = `${hours} hrs`;
      } else {
        averageResolutionFormatted = `${averageResolutionMinutes} mins`;
      }
    }

    return res.status(200).json({
      success: true,
      stats: {
        total,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        resolutionRatePercent: total > 0 ? Math.round((resolvedCount / total) * 100) : 0,
        averageResolutionMinutes,
        averageResolutionFormatted,
        byCategory,
        byPriority
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute analytics.',
      error: err.message
    });
  }
}

module.exports = { getStats };
