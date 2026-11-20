const path = require('path');
const fs = require('fs');

let mongoose = null;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

const dataDir = path.join(__dirname, '../../data');
const dbFile = path.join(dataDir, 'db.json');

// Ensure data folder exists for persistence
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let isUsingEmbeddedDb = false;

// Embedded In-Memory + File Persisted Document Store
const store = {
  users: [],
  tickets: [],
  comments: []
};

// Load saved data if file exists
function loadPersistedData() {
  try {
    if (fs.existsSync(dbFile)) {
      const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      store.users = data.users || [];
      store.tickets = data.tickets || [];
      store.comments = data.comments || [];
    }
  } catch (err) {
    console.error('Failed to load persisted data:', err.message);
  }
}

// Persist current state to disk
function persistData() {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist embedded database:', err.message);
  }
}

loadPersistedData();

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (mongoose && uri && !process.env.USE_EMBEDDED_DB) {
    try {
      // Connect to MongoDB with timeout
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000
      });
      console.log('Connected to MongoDB database successfully.');
      isUsingEmbeddedDb = false;
      return true;
    } catch (err) {
      console.warn('MongoDB connection failed or unavailable:', err.message);
      console.log('Falling back to built-in embedded document store.');
    }
  } else {
    console.log('Using built-in embedded document store.');
  }

  isUsingEmbeddedDb = true;
  return true;
}

function getStore() {
  return store;
}

module.exports = {
  connectDB,
  isUsingEmbeddedDb: () => isUsingEmbeddedDb,
  getStore,
  persistData,
  store
};
