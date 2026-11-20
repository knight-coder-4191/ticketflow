const crypto = require('crypto');
const { isUsingEmbeddedDb, store, persistData } = require('../config/db');

let mongoose = null;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

let MongooseUser = null;

if (mongoose) {
  const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'agent', 'admin'], default: 'customer' },
    createdAt: { type: Date, default: Date.now }
  });

  try {
    MongooseUser = mongoose.model('User', userSchema);
  } catch (e) {
    MongooseUser = mongoose.models.User;
  }
}

// Embedded Store Adapter for User
class EmbeddedUser {
  constructor(data) {
    this._id = data._id || crypto.randomBytes(12).toString('hex');
    this.name = data.name;
    this.email = (data.email || '').toLowerCase().trim();
    this.passwordHash = data.passwordHash;
    this.role = data.role || 'customer';
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
  }

  async save() {
    const existingIndex = store.users.findIndex(u => u._id === this._id);
    const serialized = {
      _id: this._id,
      name: this.name,
      email: this.email,
      passwordHash: this.passwordHash,
      role: this.role,
      createdAt: this.createdAt
    };

    if (existingIndex >= 0) {
      store.users[existingIndex] = serialized;
    } else {
      store.users.push(serialized);
    }
    persistData();
    return this;
  }

  static async find(query = {}) {
    if (!isUsingEmbeddedDb() && MongooseUser) {
      return await MongooseUser.find(query);
    }
    return store.users.filter(u => {
      for (const [key, val] of Object.entries(query)) {
        if (u[key] !== val) return false;
      }
      return true;
    }).map(u => new EmbeddedUser(u));
  }

  static async findOne(query = {}) {
    if (!isUsingEmbeddedDb() && MongooseUser) {
      return await MongooseUser.findOne(query);
    }
    const found = store.users.find(u => {
      for (const [key, val] of Object.entries(query)) {
        if (key === 'email') {
          if (u.email !== (val || '').toLowerCase().trim()) return false;
        } else if (u[key] !== val) {
          return false;
        }
      }
      return true;
    });
    return found ? new EmbeddedUser(found) : null;
  }

  static async findById(id) {
    if (!isUsingEmbeddedDb() && MongooseUser) {
      return await MongooseUser.findById(id);
    }
    const found = store.users.find(u => u._id.toString() === id.toString());
    return found ? new EmbeddedUser(found) : null;
  }

  static async create(data) {
    if (!isUsingEmbeddedDb() && MongooseUser) {
      return await MongooseUser.create(data);
    }
    const user = new EmbeddedUser(data);
    await user.save();
    return user;
  }
}

module.exports = {
  User: EmbeddedUser,
  MongooseUser
};
