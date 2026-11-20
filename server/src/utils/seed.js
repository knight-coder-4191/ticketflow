const { connectDB, getStore, persistData } = require('../config/db');
const { User } = require('../models/User');
const { Ticket } = require('../models/Ticket');
const { Comment } = require('../models/Comment');
const { hashPassword } = require('../utils/security');

async function seedDatabase() {
  console.log('Seeding initial TicketFlow data...');
  await connectDB();

  // Clear existing data in embedded store or collection
  const store = getStore();
  store.users = [];
  store.tickets = [];
  store.comments = [];

  // 1. Seed Users
  const adminPassword = await hashPassword('admin123');
  const agentPassword = await hashPassword('agent123');
  const customerPassword = await hashPassword('customer123');

  const admin = await User.create({
    name: 'Sarah Connor (Admin)',
    email: 'admin@ticketflow.com',
    passwordHash: adminPassword,
    role: 'admin'
  });

  const agent1 = await User.create({
    name: 'David Miller (Agent)',
    email: 'agent@ticketflow.com',
    passwordHash: agentPassword,
    role: 'agent'
  });

  const agent2 = await User.create({
    name: 'Elena Rostova (Agent)',
    email: 'agent2@ticketflow.com',
    passwordHash: agentPassword,
    role: 'agent'
  });

  const customer1 = await User.create({
    name: 'Alex Johnson (Customer)',
    email: 'customer@ticketflow.com',
    passwordHash: customerPassword,
    role: 'customer'
  });

  const customer2 = await User.create({
    name: 'Priya Sharma (Customer)',
    email: 'customer2@ticketflow.com',
    passwordHash: customerPassword,
    role: 'customer'
  });

  console.log('Users created:');
  console.log(`  Admin:    admin@ticketflow.com    / admin123`);
  console.log(`  Agent 1:  agent@ticketflow.com    / agent123`);
  console.log(`  Agent 2:  agent2@ticketflow.com   / agent123`);
  console.log(`  Customer: customer@ticketflow.com / customer123`);
  console.log(`  Cust 2:   customer2@ticketflow.com/ customer123`);

  // 2. Seed Tickets
  const now = Date.now();
  const oneHour = 3600 * 1000;
  const oneDay = 24 * oneHour;

  // Ticket 1: Open, unassigned
  const t1 = await Ticket.create({
    title: 'Unable to access billing invoice PDF',
    description: 'When I click "Download Invoice" for October, the page returns a 404 error.',
    category: 'Billing',
    priority: 'High',
    status: 'Open',
    createdBy: customer1._id,
    assignedTo: null,
    createdAt: new Date(now - 3 * oneHour),
    updatedAt: new Date(now - 3 * oneHour),
    resolvedAt: null
  });

  // Ticket 2: In Progress, assigned to agent1
  const t2 = await Ticket.create({
    title: 'VPN connection dropping intermittently',
    description: 'The internal enterprise VPN terminates connection every 15 minutes while accessing remote workstation.',
    category: 'Technical',
    priority: 'Urgent',
    status: 'In Progress',
    createdBy: customer1._id,
    assignedTo: agent1._id,
    createdAt: new Date(now - 6 * oneHour),
    updatedAt: new Date(now - 1 * oneHour),
    resolvedAt: null
  });

  // Ticket 3: Resolved, assigned to agent1
  const t3 = await Ticket.create({
    title: 'Request password reset for secondary company email',
    description: 'Need secondary portal access configured with MFA reset token.',
    category: 'Account',
    priority: 'Medium',
    status: 'Resolved',
    createdBy: customer2._id,
    assignedTo: agent1._id,
    createdAt: new Date(now - 2 * oneDay),
    updatedAt: new Date(now - 1 * oneDay),
    resolvedAt: new Date(now - 1 * oneDay) // Took 24h
  });

  // Ticket 4: Resolved, assigned to agent2
  const t4 = await Ticket.create({
    title: 'Ergonomic dual-monitor stand arm request',
    description: 'Display arm clamp mounting broke on desk 402B. Need replacement.',
    category: 'Hardware',
    priority: 'Low',
    status: 'Resolved',
    createdBy: customer2._id,
    assignedTo: agent2._id,
    createdAt: new Date(now - 3 * oneDay),
    updatedAt: new Date(now - 2 * oneDay + 4 * oneHour),
    resolvedAt: new Date(now - 2 * oneDay + 4 * oneHour) // Took 20h
  });

  // Ticket 5: Open, unassigned
  const t5 = await Ticket.create({
    title: 'Clarification regarding SLA guidelines for enterprise tier',
    description: 'Could you provide the official SLA response matrix for tier-1 incidents?',
    category: 'General',
    priority: 'Medium',
    status: 'Open',
    createdBy: customer2._id,
    assignedTo: null,
    createdAt: new Date(now - 1 * oneHour),
    updatedAt: new Date(now - 1 * oneHour),
    resolvedAt: null
  });

  // 3. Seed Comments
  await Comment.create({
    ticketId: t2._id,
    userId: customer1._id,
    message: 'Any update on this? The VPN dropped again during a client call.',
    createdAt: new Date(now - 4 * oneHour)
  });

  await Comment.create({
    ticketId: t2._id,
    userId: agent1._id,
    message: 'Hello Alex, I reviewed the gateway logs and found an MTU mismatch on the tunnel. Pushing an updated configuration profile now.',
    createdAt: new Date(now - 2 * oneHour)
  });

  await Comment.create({
    ticketId: t3._id,
    userId: agent1._id,
    message: 'MFA token reset completed. Secure link sent to registered phone number.',
    createdAt: new Date(now - 1 * oneDay)
  });

  persistData();
  console.log('Seed completed successfully: 5 tickets, 3 comments, 5 users created.');
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0)).catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
