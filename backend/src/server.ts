import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { pool } from './config/database.js';
import { testBlockchainConnection } from './config/blockchain.js';
import { setSocketIO } from './config/socket.js';
import { startBlockchainListener } from './services/blockchainListener.js';

// Import routes
import authRoutes from './routes/auth.js';
import schoolsRoutes from './routes/schools.js';
import deliveriesRoutes from './routes/deliveries.js';
import verificationsRoutes from './routes/verifications.js';
import cateringsRoutes from './routes/caterings.js';
import issuesRoutes from './routes/issues.js';
import analyticsRoutes from './routes/analytics.js';
import blockchainRoutes from './routes/blockchain.js';
import escrowRoutes from './routes/escrow.js';
import aiAnalyticsRoutes from './routes/aiAnalytics.js';
import manualReviewRoutes from './routes/manualReview.js';
import cateringPaymentRoutes from './routes/cateringPaymentRoutes.js';
import cateringHistoryRoutes from './routes/cateringHistoryRoutes.js';
import cateringMenuRoutes from './routes/cateringMenuRoutes.js';
import cateringIssuesRoutes from './routes/cateringIssuesRoutes.js';
import schedulerRoutes from './routes/schedulerRoutes.js';

// Import scheduler service
import schedulerService from './services/schedulerService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Setup Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Set Socket.IO instance for use in other modules
setSocketIO(io);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/deliveries', deliveriesRoutes);
app.use('/api/verifications', verificationsRoutes);
app.use('/api/caterings', cateringsRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/ai-analytics', aiAnalyticsRoutes); // 🤖 AI Analytics endpoints
app.use('/api/manual-review', manualReviewRoutes); // 👨‍💼 Manual Review endpoints
app.use('/api/catering/payments', cateringPaymentRoutes);
app.use('/api/catering/history', cateringHistoryRoutes);
app.use('/api/catering/menu', cateringMenuRoutes);
app.use('/api/catering/issues', cateringIssuesRoutes);
app.use('/api/scheduler', schedulerRoutes); // 🕐 Scheduler endpoints

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Join room based on user role and ID
  socket.on('join', (data: { userId: number; role: string; schoolId?: number; cateringId?: number }) => {
    const { userId, role, schoolId, cateringId } = data;

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-specific rooms
    if (role === 'school' && schoolId) {
      socket.join(`school:${schoolId}`);
      console.log(`📚 User ${userId} joined school room ${schoolId}`);
    } else if (role === 'catering' && cateringId) {
      socket.join(`catering:${cateringId}`);
      console.log(`🍽️  User ${userId} joined catering room ${cateringId}`);
    } else if (role === 'admin') {
      socket.join('admin');
      console.log(`👑 Admin ${userId} joined admin room`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Start server
httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket server ready`);

  // Start blockchain event listener
  try {
    console.log('\n🎧 Starting blockchain event listener...');
    startBlockchainListener();
    console.log('✅ Blockchain listener started successfully!\n');
  } catch (error) {
    console.error('❌ Failed to start blockchain listener:', error);
  }

  // Start scheduler service
  try {
    console.log('🕐 Starting scheduler service...');
    schedulerService.start();
    console.log('✅ Scheduler started successfully!\n');
  } catch (error) {
    console.error('❌ Failed to start scheduler:', error);
  }
});