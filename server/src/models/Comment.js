const crypto = require('crypto');
const { isUsingEmbeddedDb, store, persistData } = require('../config/db');
const { User } = require('./User');

let mongoose = null;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

let MongooseComment = null;

if (mongoose) {
  const commentSchema = new mongoose.Schema({
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  });

  try {
    MongooseComment = mongoose.model('Comment', commentSchema);
  } catch (e) {
    MongooseComment = mongoose.models.Comment;
  }
}

// Embedded Store Adapter for Comment
class EmbeddedComment {
  constructor(data) {
    this._id = data._id || crypto.randomBytes(12).toString('hex');
    this.ticketId = data.ticketId;
    this.userId = data.userId;
    this.message = (data.message || '').trim();
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
  }

  async save() {
    const existingIndex = store.comments.findIndex(c => c._id === this._id);
    const serialized = {
      _id: this._id,
      ticketId: this.ticketId ? (this.ticketId._id || this.ticketId) : null,
      userId: this.userId ? (this.userId._id || this.userId) : null,
      message: this.message,
      createdAt: this.createdAt
    };

    if (existingIndex >= 0) {
      store.comments[existingIndex] = serialized;
    } else {
      store.comments.push(serialized);
    }
    persistData();
    return this;
  }

  async populateUserRef() {
    if (this.userId) {
      const user = await User.findById(this.userId._id || this.userId);
      if (user) {
        this.userId = { _id: user._id, name: user.name, email: user.email, role: user.role };
      }
    }
    return this;
  }

  static async find(query = {}) {
    if (!isUsingEmbeddedDb() && MongooseComment) {
      return await MongooseComment.find(query).populate('userId', 'name email role').sort({ createdAt: 1 });
    }

    let results = [...store.comments];
    if (query.ticketId) {
      results = results.filter(c => c.ticketId && c.ticketId.toString() === query.ticketId.toString());
    }

    // Sort chronological (oldest to newest for chat/comments)
    results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const instantiated = results.map(c => new EmbeddedComment(c));
    for (const c of instantiated) {
      await c.populateUserRef();
    }
    return instantiated;
  }

  static async create(data) {
    if (!isUsingEmbeddedDb() && MongooseComment) {
      return await MongooseComment.create(data);
    }
    const comment = new EmbeddedComment(data);
    await comment.save();
    await comment.populateUserRef();
    return comment;
  }
}

module.exports = {
  Comment: EmbeddedComment,
  MongooseComment
};
