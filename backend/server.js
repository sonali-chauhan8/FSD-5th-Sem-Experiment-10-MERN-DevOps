const dotenv = require('dotenv');
const path = require('path');

// Determine env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

let server = null;

// Connect to MongoDB and start HTTP server
const startServer = async () => {
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`
====================================================================
  🚀 Student Management API Server Running (Experiment 10)
  📡 Local URL:       http://localhost:${PORT}
  🔗 API Base:        http://localhost:${PORT}/api/students
  🩺 Health Monitor:  http://localhost:${PORT}/api/health
  🌍 Allowed Client:  ${CLIENT_URL}
  ⚙️  Environment:     ${process.env.NODE_ENV || 'development'}
====================================================================
    `);
  });
};

if (require.main === module || process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, server, startServer };
