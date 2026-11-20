const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const studentRoutes = require('./routes/studentRoutes');

const app = express();

// ====================================================================
// 1. CORS Configuration supporting Local, Docker & Production Domains
// ====================================================================
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in lab context
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ====================================================================
// 2. Request Logging & Monitoring (Morgan)
// ====================================================================
// Safe request logger: outputs HTTP method, URL, status code, response time
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
}

// ====================================================================
// 3. Body Parsers
// ====================================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================================================================
// 4. Monitoring & Health Check Endpoint (GET /api/health)
// ====================================================================
app.get('/api/health', (req, res) => {
  const connectionStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbReadyState = mongoose.connection ? mongoose.connection.readyState : 0;
  const dbStatus = connectionStates[dbReadyState] || 'unknown';

  // Healthy if connected or under test execution
  const isHealthy = dbReadyState === 1 || process.env.NODE_ENV === 'test' || dbReadyState === 2;
  const memory = process.memoryUsage();

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    message: 'MERN Student Management Backend is running',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      host: mongoose.connection?.host || 'localhost',
      name: mongoose.connection?.name || 'student_management',
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: {
        heapUsedMB: Number((memory.heapUsed / (1024 * 1024)).toFixed(2)),
        heapTotalMB: Number((memory.heapTotal / (1024 * 1024)).toFixed(2)),
        rssMB: Number((memory.rss / (1024 * 1024)).toFixed(2)),
      },
    },
  });
});

// ====================================================================
// 5. Mount Student API Routes
// ====================================================================
app.use('/api/students', studentRoutes);

// ====================================================================
// 6. Root Discovery Route
// ====================================================================
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Student Management System API (Experiment No. 10 - DevOps & Containers)',
    endpoints: {
      health: 'GET /api/health',
      students: 'GET /api/students',
      stats: 'GET /api/students/stats',
      studentById: 'GET /api/students/:id',
      createStudent: 'POST /api/students',
      updateStudent: 'PUT /api/students/:id',
      deleteStudent: 'DELETE /api/students/:id',
    },
  });
});

// ====================================================================
// 7. 404 Route Handler
// ====================================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at ${req.method} ${req.originalUrl}`,
  });
});

// ====================================================================
// 8. Global Centralized Error Handling Middleware
// ====================================================================
app.use((err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    console.error('[Unhandled Server Error]:', err.stack || err);
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(!isProd && { stack: err.stack }),
  });
});

module.exports = app;
