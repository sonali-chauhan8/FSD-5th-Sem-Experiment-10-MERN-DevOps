const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * Supports local MongoDB instance, Docker container network, and MongoDB Atlas cloud
 */
const connectDB = async (customUri) => {
  try {
    const connUri =
      customUri ||
      process.env.MONGODB_URI ||
      'mongodb://127.0.0.1:27017/student_mgmt_exp10_dev';

    // Mask credentials if present for secure logging
    const maskedUri = connUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Database] Connecting to: ${maskedUri}`);
    }

    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 5000,
    });

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Database] MongoDB Connected successfully!`);
      console.log(`[Database] Host: ${conn.connection.host}`);
      console.log(`[Database] Database Name: ${conn.connection.name}`);
    }
    return conn;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      console.error(`
---------------------------------------------------------------
Troubleshooting Tips for Experiment 10:
1. If running locally: ensure MongoDB service is active on localhost:27017.
2. If running via Docker Compose: ensure the 'mongodb' service is healthy.
3. If running on Render / Cloud: ensure MONGODB_URI in .env is valid.
---------------------------------------------------------------
`);
    }
    return null;
  }
};

const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch (err) {
    console.error('[Database Disconnect Error]:', err.message);
  }
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
