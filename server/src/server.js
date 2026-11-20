const path = require('path');
const fs = require('fs');

// Attempt loading dotenv
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  // Ignore if dotenv is not yet installed
}

const { connectDB, getStore } = require('./config/db');
const { seedDatabase } = require('./utils/seed');

let express = null;
let cors = null;

try {
  express = require('express');
  cors = require('cors');
} catch (e) {
  express = null;
  cors = null;
}

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  // Auto-seed if database is empty
  const store = getStore();
  if (!store.users || store.users.length === 0) {
    console.log('No user data detected. Initializing default seed data...');
    await seedDatabase();
  }

  if (express && cors) {
    console.log('Using Express.js framework engine.');
    const app = express();

    app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    app.use(express.json());

    // Health check
    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Routes
    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/tickets', require('./routes/ticketRoutes'));

    // Static Client Serving (Production or built SPA)
    const clientPublic = path.join(__dirname, '../../client/public');
    const clientDist = path.join(__dirname, '../../client/dist');
    const staticPath = fs.existsSync(clientDist) ? clientDist : clientPublic;

    if (fs.existsSync(staticPath)) {
      app.use(express.static(staticPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        const indexPath = path.join(staticPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          return res.sendFile(indexPath);
        }
        next();
      });
    }

    // 404 handler for API routes
    app.use((req, res) => {
      res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
    });

    // Global Error Handler
    app.use((err, req, res, next) => {
      console.error('Unhandled Server Error:', err);
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` TicketFlow Server running on http://localhost:${PORT}`);
      console.log(` Role-Based Support Ticket Management System Active`);
      console.log(`=======================================================`);
    });

    return app;
  } else {
    // Zero-dependency MiniExpress fallback
    console.log('Using built-in resilient HTTP router engine.');
    const { MiniExpress } = require('./utils/expressFallback');
    const app = new MiniExpress();

    // Health check
    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Auth routes
    const authController = require('./controllers/authController');
    const { authenticate } = require('./middleware/auth');
    const { authorize } = require('./middleware/role');

    app.post('/api/auth/register', authController.register);
    app.post('/api/auth/login', authController.login);
    app.get('/api/auth/me', authenticate, authController.getMe);
    app.get('/api/auth/agents', authenticate, authorize('admin'), authController.getAgents);

    // Ticket routes
    const ticketController = require('./controllers/ticketController');
    const statsController = require('./controllers/statsController');

    app.get('/api/tickets/stats', authenticate, authorize('admin'), statsController.getStats);
    app.post('/api/tickets', authenticate, authorize('customer'), ticketController.createTicket);
    app.get('/api/tickets', authenticate, ticketController.getTickets);
    app.get('/api/tickets/:id', authenticate, ticketController.getTicketById);
    app.put('/api/tickets/:id/assign', authenticate, authorize('admin'), ticketController.assignTicket);
    app.put('/api/tickets/:id/status', authenticate, authorize('agent', 'admin'), ticketController.updateTicketStatus);
    app.post('/api/tickets/:id/comments', authenticate, ticketController.addComment);
    app.get('/api/tickets/:id/comments', authenticate, ticketController.getComments);

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` TicketFlow Server running on http://localhost:${PORT}`);
      console.log(` Role-Based Support Ticket Management System Active`);
      console.log(`=======================================================`);
    });

    return app;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
