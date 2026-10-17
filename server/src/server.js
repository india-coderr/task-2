import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === CLIENT_URL || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(morgan('dev'));
app.use(express.json());

// API health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Inventory & Sales Management API'
  });
});

// Mount all API routes under /api
app.use('/api', apiRoutes);

// Catch 404s for undefined endpoints
app.use((req, res, next) => {
  next(new NotFoundError(`Resource not found for ${req.method} ${req.originalUrl}`));
});

// Centralized error handling middleware
app.use(errorHandler);

// Start server after connecting to database
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[SERVER] Backend running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[SERVER ERROR] Port ${PORT} is already in use by another running process.`);
      process.exit(1);
    } else {
      console.error('[SERVER ERROR]', err);
    }
  });

  const handleShutdown = () => {
    console.log('\n[SERVER] Gracefully shutting down...');
    server.close(() => {
      console.log('[SERVER] Closed remaining connections.');
      process.exit(0);
    });
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
};

if (!process.env.VERCEL) {
  startServer();
}

export default app;
