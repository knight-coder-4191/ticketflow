const crypto = require('crypto');
const { isUsingEmbeddedDb, store, persistData } = require('../config/db');
const { User } = require('./User');

let mongoose = null;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

let MongooseTicket = null;

if (mongoose) {
  const ticketSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Technical', 'Billing', 'Account', 'Hardware', 'General'],
      default: 'General'
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved'],
      default: 'Open'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null }
  });

  try {
    MongooseTicket = mongoose.model('Ticket', ticketSchema);
  } catch (e) {
    MongooseTicket = mongoose.models.Ticket;
  }
}

// Embedded Store Adapter for Ticket
class EmbeddedTicket {
  constructor(data) {
    this._id = data._id || crypto.randomBytes(12).toString('hex');
    this.title = (data.title || '').trim();
    this.description = (data.description || '').trim();
    this.category = data.category || 'General';
    this.priority = data.priority || 'Medium';
    this.status = data.status || 'Open';
    this.createdBy = data.createdBy;
    this.assignedTo = data.assignedTo || null;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
    this.resolvedAt = data.resolvedAt ? new Date(data.resolvedAt) : null;
  }

  async save() {
    this.updatedAt = new Date();
    const existingIndex = store.tickets.findIndex(t => t._id === this._id);
    const serialized = {
      _id: this._id,
      title: this.title,
      description: this.description,
      category: this.category,
      priority: this.priority,
      status: this.status,
      createdBy: this.createdBy ? (this.createdBy._id || this.createdBy) : null,
      assignedTo: this.assignedTo ? (this.assignedTo._id || this.assignedTo) : null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      resolvedAt: this.resolvedAt
    };

    if (existingIndex >= 0) {
      store.tickets[existingIndex] = serialized;
    } else {
      store.tickets.push(serialized);
    }
    persistData();
    return this;
  }

  async populateUserRefs() {
    const creator = this.createdBy ? await User.findById(this.createdBy._id || this.createdBy) : null;
    if (creator) {
      this.createdBy = { _id: creator._id, name: creator.name, email: creator.email, role: creator.role };
    }
    if (this.assignedTo) {
      const agent = await User.findById(this.assignedTo._id || this.assignedTo);
      if (agent) {
        this.assignedTo = { _id: agent._id, name: agent.name, email: agent.email, role: agent.role };
      }
    }
    return this;
  }

  static async find(query = {}) {
    if (!isUsingEmbeddedDb() && MongooseTicket) {
      return await MongooseTicket.find(query).populate('createdBy', 'name email role').populate('assignedTo', 'name email role');
    }

    let results = [...store.tickets];

    if (query.createdBy) {
      results = results.filter(t => t.createdBy && t.createdBy.toString() === query.createdBy.toString());
    }
    if (query.assignedTo) {
      results = results.filter(t => t.assignedTo && t.assignedTo.toString() === query.assignedTo.toString());
    }
    if (query.status) {
      results = results.filter(t => t.status === query.status);
    }
    if (query.priority) {
      results = results.filter(t => t.priority === query.priority);
    }
    if (query.category) {
      results = results.filter(t => t.category === query.category);
    }
    if (query.search) {
      const term = query.search.toLowerCase();
      results = results.filter(t => 
        (t.title && t.title.toLowerCase().includes(term)) ||
        (t.description && t.description.toLowerCase().includes(term))
      );
    }

    // Sort newest first
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const instantiated = results.map(t => new EmbeddedTicket(t));
    for (const t of instantiated) {
      await t.populateUserRefs();
    }
    return instantiated;
  }

  static async findById(id) {
    if (!isUsingEmbeddedDb() && MongooseTicket) {
      return await MongooseTicket.findById(id).populate('createdBy', 'name email role').populate('assignedTo', 'name email role');
    }
    const found = store.tickets.find(t => t._id.toString() === id.toString());
    if (!found) return null;
    const ticket = new EmbeddedTicket(found);
    await ticket.populateUserRefs();
    return ticket;
  }

  static async create(data) {
    if (!isUsingEmbeddedDb() && MongooseTicket) {
      return await MongooseTicket.create(data);
    }
    const ticket = new EmbeddedTicket(data);
    await ticket.save();
    await ticket.populateUserRefs();
    return ticket;
  }

  static async countDocuments(query = {}) {
    if (!isUsingEmbeddedDb() && MongooseTicket) {
      return await MongooseTicket.countDocuments(query);
    }
    const matches = await EmbeddedTicket.find(query);
    return matches.length;
  }
}

module.exports = {
  Ticket: EmbeddedTicket,
  MongooseTicket
};
