import app from '../src/server.js';
import { connectDB } from '../src/config/db.js';

let isConnected = false;

export default async function handler(req, res) {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('[SERVERLESS DB ERROR]', err.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DB_CONNECTION_ERROR',
          message: 'Failed to connect to database',
          details: [err.message]
        }
      });
    }
  }

  return app(req, res);
}
