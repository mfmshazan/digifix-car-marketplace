import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import productRoutes from './routes/product.routes.js';
import categoryRoutes from './routes/category.routes.js';
import orderRoutes from './routes/order.routes.js';
import carPartRoutes from './routes/carPart.routes.js';
import cartRoutes from './routes/cart.routes.js';
import clerkRoutes from './routes/clerk.routes.js';
import adminRoutes from './routes/admin.routes.js';
import managerRoutes from './routes/manager.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import vehicleRoutes from './routes/vehicle.routes.js';
import riderPartnerRoutes from './routes/riderPartner.routes.js';
import riderJobsRoutes from './routes/riderJobs.routes.js';
import riderAdminRoutes from './routes/riderAdmin.routes.js';
import riderPerformanceRoutes from './routes/riderPerformance.routes.js';
import deliveryRequestRoutes from './routes/deliveryRequest.routes.js';
import customerTrackingRoutes from './routes/customerTracking.routes.js';
import { initializeRiderRealtimeDispatch } from './services/riderRealtimeDispatch.js';
import statsRoutes from './routes/stats.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import stripeRoutes from './routes/stripe.routes.js';
import reviewRoutes from './routes/review.routes.js';
import internalPayoutRoutes from './routes/internalPayout.routes.js';
import receiptRoutes from './routes/receipt.routes.js';

// Load environment variables
dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 3000;

// Determine current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);
// Also expose io globally so controllers without request context (e.g. riderJobs sync) can emit events
global.io = io;

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Each client joins their own room for targeted notifications (e.g. order updates)
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined room user:${userId}`);
    }
  });

  // Admins also join a shared room so we can broadcast cancellation requests to all of them
  socket.on('joinRole', (role) => {
    if (role === 'ADMIN') {
      socket.join('role:ADMIN');
      console.log(`🛡️ Socket ${socket.id} joined room role:ADMIN`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '50mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_BODY_LIMIT || '50mb' }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', clerkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/car-parts', carPartRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/vehicle', vehicleRoutes);
app.use('/api/delivery-requests', deliveryRequestRoutes);
app.use('/api/partner', riderPartnerRoutes);
app.use('/api', riderPerformanceRoutes);
app.use('/api/jobs', riderJobsRoutes);
app.use('/api/admin', riderAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/tracking', customerTrackingRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/internal', internalPayoutRoutes);
app.use('/api/wallet/receipts', receiptRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ─── Start server ───────────────────────────────────────────────────────────
initializeRiderRealtimeDispatch(httpServer).catch((error) => {
  console.warn('Rider realtime dispatch did not initialize:', error.message);
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
