import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/database.js';
import { testBlockchainConnection } from './config/blockchain.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    // Test database
    await pool.query('SELECT NOW()');
    
    // Test blockchain
    const blockchainOk = await testBlockchainConnection();
    
    res.json({ 
      status: 'OK', 
      message: 'MBG NutriChain API Running',
      services: {
        database: 'connected',
        blockchain: blockchainOk ? 'connected' : 'disconnected'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Service health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database test route
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    res.json({ 
      message: 'Database connected',
      users_count: result.rows[0].count 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Blockchain test route
app.get('/api/blockchain-test', async (req, res) => {
  try {
    const isConnected = await testBlockchainConnection();
    res.json({ 
      status: isConnected ? 'connected' : 'failed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Blockchain test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});